package vn.microtec.mschool.application.service;

import vn.microtec.mschool.application.port.out.CameraDevicePort;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.domain.enums.AttendanceWorkerMode;
import vn.microtec.mschool.domain.enums.CameraEventType;
import vn.microtec.mschool.domain.enums.CameraSessionState;
import vn.microtec.mschool.domain.enums.CameraStatus;
import vn.microtec.mschool.domain.enums.Direction;
import vn.microtec.mschool.domain.enums.MotionTriggerSource;
import vn.microtec.mschool.domain.enums.TripwireDirection;
import vn.microtec.mschool.infrastructure.persistence.DeviceCameraRepository;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Bộ điều phối Điểm danh Khuôn mặt Thông minh Kích hoạt theo Sự kiện (Event-Driven & Face-Gated Attendance Engine).
 * 
 * Nguyên lý vận hành:
 * 1. Chế độ Ngủ sâu (Deep Sleep / Idle): Khi không có người, hệ thống ở trạng thái thụ động, 0% CPU, quạt máy chủ êm ru.
 * 2. Kích hoạt khi có Chuyển động (Motion Trigger): Lắng nghe luồng sự kiện phần cứng alertStream qua CameraDevicePort.
 *    Ngay khi camera phát hiện có người bước vào khung hình (VMD/FACEDETECTION), hệ thống kích hoạt phiên nhận diện tức thời (BURST_ACTIVE).
 * 3. Cổng Xác thực Khuôn mặt (Face Verification Gate): Chụp nhanh ảnh snapshot ISAPI (<100ms) và gọi AI SCRFD.
 *    - Nếu KHÔNG có khuôn mặt người: Tự động hết hạn và trở về chế độ ngủ sâu.
 *    - Nếu CÓ khuôn mặt người: So khớp pgvector AdaFace 512-D, tự động điểm danh và gia hạn phiên làm việc thêm thời gian quy định.
 * 4. Tự động đóng tiến trình và Ngủ sâu: Sau khi người đi qua hết và không còn khuôn mặt nào, hệ thống tự động tắt và ngủ sâu.
 *    Hoàn toàn không chạy liên tục cả ngày và không yêu cầu con người bật/tắt thủ công.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AutoFaceAttendanceWorker {

    private static final long MAX_BURST_WINDOW_MS = 12000L;
    private static final int CHECKSUM_STEP_DIVISOR = 256;

    private final DeviceCameraRepository cameraRepository;
    private final FaceRecognitionService faceRecognitionService;
    private final AttendanceService attendanceService;
    private final CameraDevicePort cameraDevicePort;

    @Value("${app.attendance.auto-camera-scan-enabled:false}")
    private boolean defaultEnabled;

    @Value("${app.attendance.face-similarity-threshold:0.65}")
    private double faceSimilarityThreshold;

    @Value("${app.attendance.burst-duration-ms:8000}")
    private long burstDurationMs;

    @Value("${app.attendance.burst-extend-ms:5000}")
    private long burstExtendMs;

    private final AtomicBoolean isEnabled = new AtomicBoolean(false);
    private final AtomicLong totalScanCount = new AtomicLong(0);
    private final AtomicLong totalMatchCount = new AtomicLong(0);

    private final Map<String, CameraSessionState> cameraStates = new ConcurrentHashMap<>();
    private final Map<String, Long> burstStartTimes = new ConcurrentHashMap<>();
    private final Map<String, Long> burstExpiryTimes = new ConcurrentHashMap<>();
    private final Map<String, Integer> lastFrameChecksums = new ConcurrentHashMap<>();
    private final Map<String, Integer> consecutiveNoFaceCounts = new ConcurrentHashMap<>();
    private final Map<String, Integer> emptyStreakCounts = new ConcurrentHashMap<>();
    private final Map<String, Long> cooldownUntilTimes = new ConcurrentHashMap<>();

    @Getter
    @Setter
    private OffsetDateTime lastScanAt;

    @Getter
    @Setter
    private String lastMatchedIdentity;

    @Getter
    @Setter
    private String lastMatchedName;

    @Getter
    @Setter
    private Double lastSimilarity;

    @Getter
    @Setter
    private MotionTriggerSource lastTriggerSource;

    @EventListener(ApplicationReadyEvent.class)
    public void initEventListeners() {
        isEnabled.set(defaultEnabled);
        log.info("Khởi động Event-Driven Attendance Engine: mode={}, enabled={}, burstDurationMs={}, threshold={}",
                AttendanceWorkerMode.EVENT_DRIVEN_FACE_GATED, defaultEnabled, burstDurationMs, faceSimilarityThreshold);

        connectAllCameraListeners();
    }

    public void connectAllCameraListeners() {
        List<DeviceCamera> onlineCameras = cameraRepository.findByStatus(CameraStatus.ONLINE);
        if (onlineCameras == null || onlineCameras.isEmpty()) {
            return;
        }

        for (DeviceCamera cam : onlineCameras) {
            cameraStates.putIfAbsent(cam.getId(), CameraSessionState.IDLE);
            if (cam.getIpAddress() != null && !cam.getIpAddress().trim().isEmpty()) {
                cameraDevicePort.startEventListener(cam, (cameraId, eventType) -> {
                    if (eventType == CameraEventType.VMD || eventType == CameraEventType.FACEDETECTION) {
                        onMotionDetected(cameraId, MotionTriggerSource.HIKVISION_ALERT_STREAM);
                    }
                });
            }
        }
    }

    public void onMotionDetected(String cameraId, MotionTriggerSource source) {
        if (!isEnabled.get()) {
            return;
        }

        long now = System.currentTimeMillis();
        // Kiểm tra thời gian làm mát sau khi kết thúc phiên quét trước
        if (cooldownUntilTimes.getOrDefault(cameraId, 0L) > now) {
            return;
        }

        CameraSessionState currentState = cameraStates.getOrDefault(cameraId, CameraSessionState.IDLE);
        if (currentState == CameraSessionState.BURST_ACTIVE) {
            Long startTime = burstStartTimes.get(cameraId);
            if (startTime != null && (now - startTime) >= MAX_BURST_WINDOW_MS) {
                // Đã đạt trần thời gian burst window tối đa, không gia hạn thêm nữa để tránh CPU loop
                return;
            }
            long currentExpiry = burstExpiryTimes.getOrDefault(cameraId, 0L);
            long newExpiry = Math.min(Math.max(now + 2000L, currentExpiry), (startTime != null ? startTime + MAX_BURST_WINDOW_MS : now + MAX_BURST_WINDOW_MS));
            burstExpiryTimes.put(cameraId, newExpiry);
            return;
        }

        // Bắt đầu phiên quét mới
        burstStartTimes.put(cameraId, now);
        burstExpiryTimes.put(cameraId, now + burstDurationMs);
        cameraStates.put(cameraId, CameraSessionState.BURST_ACTIVE);
        this.lastTriggerSource = source;
        consecutiveNoFaceCounts.remove(cameraId);
        log.info("KHỞI ĐỘNG TIẾN TRÌNH NHẬN DIỆN: Camera {} phát hiện chuyển động từ nguồn [{}] -> Chuyển sang BURST_ACTIVE ({}ms)",
                cameraId, source, burstDurationMs);
    }

    @Scheduled(fixedDelay = 1800)
    public void activeBurstScanLoop() {
        if (!isEnabled.get()) {
            return;
        }

        long now = System.currentTimeMillis();

        for (Map.Entry<String, CameraSessionState> entry : cameraStates.entrySet()) {
            String cameraId = entry.getKey();
            CameraSessionState state = entry.getValue();

            if (state != CameraSessionState.BURST_ACTIVE) {
                continue;
            }

            Long expiry = burstExpiryTimes.get(cameraId);
            if (expiry == null || now >= expiry) {
                int streak = emptyStreakCounts.getOrDefault(cameraId, 0) + 1;
                emptyStreakCounts.put(cameraId, streak);
                long cooldownMs = Math.max(30000L, Math.min(120000L, 15000L * streak));
                cooldownUntilTimes.put(cameraId, now + cooldownMs);
                cameraStates.put(cameraId, CameraSessionState.IDLE);
                burstExpiryTimes.remove(cameraId);
                burstStartTimes.remove(cameraId);
                consecutiveNoFaceCounts.remove(cameraId);
                log.info("KẾT THÚC PHIÊN NHẬN DIỆN: Camera {} không còn người/chuyển động (streak={}) -> Tự động trở về NGỦ SÂU làm mát {}s (IDLE, 0% CPU)",
                        cameraId, streak, cooldownMs / 1000L);
                continue;
            }

            DeviceCamera cam = cameraRepository.findById(cameraId).orElse(null);
            if (cam != null && cam.getStatus() == CameraStatus.ONLINE) {
                try {
                    processActiveBurstCamera(cam);
                } catch (Exception e) {
                    log.warn("Lỗi trong phiên quét nhận diện camera {}: {}", cameraId, e.getMessage());
                }
            }
        }
    }

    @Scheduled(fixedDelay = 6000, initialDelay = 10000)
    public void fallbackSentryWatch() {
        if (!isEnabled.get()) {
            return;
        }

        List<DeviceCamera> onlineCameras = cameraRepository.findByStatus(CameraStatus.ONLINE);
        if (onlineCameras == null || onlineCameras.isEmpty()) {
            return;
        }

        for (DeviceCamera cam : onlineCameras) {
            String camId = cam.getId();
            if (cameraDevicePort.isEventListenerActive(camId)) {
                continue;
            }

            if (cameraStates.getOrDefault(camId, CameraSessionState.IDLE) == CameraSessionState.BURST_ACTIVE) {
                continue;
            }

            byte[] frameBytes = cameraDevicePort.captureFrame(cam);
            if (frameBytes != null && frameBytes.length > 0) {
                if (hasSignificantMotion(camId, frameBytes)) {
                    log.info("Bộ cảnh giới Sentry phát hiện chuyển động tại camera {} -> Đánh thức nhận diện", camId);
                    onMotionDetected(camId, MotionTriggerSource.SENTRY_MOTION_GATE);
                }
            }
        }
    }

    private void processActiveBurstCamera(DeviceCamera cam) {
        byte[] frameBytes = cameraDevicePort.captureFrame(cam);
        if (frameBytes == null || frameBytes.length == 0) {
            return;
        }

        // 1. Kiểm tra khung hình có thay đổi thực tế hay không trước khi đẩy sang AI
        if (!hasSignificantMotion(cam.getId(), frameBytes)) {
            int noFace = consecutiveNoFaceCounts.getOrDefault(cam.getId(), 0) + 1;
            consecutiveNoFaceCounts.put(cam.getId(), noFace);
            if (noFace >= 2) {
                int streak = emptyStreakCounts.getOrDefault(cam.getId(), 0) + 1;
                emptyStreakCounts.put(cam.getId(), streak);
                long cooldownMs = Math.max(30000L, Math.min(120000L, 15000L * streak));
                cooldownUntilTimes.put(cam.getId(), System.currentTimeMillis() + cooldownMs);
                cameraStates.put(cam.getId(), CameraSessionState.IDLE);
                burstExpiryTimes.remove(cam.getId());
                burstStartTimes.remove(cam.getId());
                consecutiveNoFaceCounts.remove(cam.getId());
                log.info("KẾT THÚC PHIÊN NHẬN DIỆN SỚM: Camera {} khung hình tĩnh liên tiếp 2 chu kỳ (streak={}) -> Trở về NGỦ SÂU làm mát {}s (0% CPU)",
                        cam.getId(), streak, cooldownMs / 1000L);
            }
            return;
        }

        totalScanCount.incrementAndGet();
        this.lastScanAt = OffsetDateTime.now();

        String base64 = Base64.getEncoder().encodeToString(frameBytes);
        FaceRecognitionService.FaceRecognitionResult result =
                faceRecognitionService.recognizeFaceFromBase64(base64, faceSimilarityThreshold);

        if (result == null || result.getFeedbackCode() == null || result.getFeedbackCode().equals("FACE_NOT_DETECTED")) {
            int noFace = consecutiveNoFaceCounts.getOrDefault(cam.getId(), 0) + 1;
            consecutiveNoFaceCounts.put(cam.getId(), noFace);
            if (noFace >= 2) {
                int streak = emptyStreakCounts.getOrDefault(cam.getId(), 0) + 1;
                emptyStreakCounts.put(cam.getId(), streak);
                long cooldownMs = Math.max(30000L, Math.min(120000L, 15000L * streak));
                cooldownUntilTimes.put(cam.getId(), System.currentTimeMillis() + cooldownMs);
                cameraStates.put(cam.getId(), CameraSessionState.IDLE);
                burstExpiryTimes.remove(cam.getId());
                burstStartTimes.remove(cam.getId());
                consecutiveNoFaceCounts.remove(cam.getId());
                log.info("KẾT THÚC PHIÊN NHẬN DIỆN SỚM: Camera {} liên tiếp 2 chu kỳ không phát hiện khuôn mặt (streak={}) -> Trở về NGỦ SÂU làm mát {}s (0% CPU)",
                        cam.getId(), streak, cooldownMs / 1000L);
            }
            return;
        }

        // Đã phát hiện khuôn mặt hợp lệ -> Reset toàn bộ bộ đếm rỗng
        consecutiveNoFaceCounts.remove(cam.getId());
        emptyStreakCounts.remove(cam.getId());
        cooldownUntilTimes.remove(cam.getId());

        if (result.getNormBbox() != null) {
            long now = System.currentTimeMillis();
            long newExpiry = Math.min(now + burstExtendMs, now + MAX_BURST_WINDOW_MS);
            burstExpiryTimes.put(cam.getId(), newExpiry);

            if (result.isMatched()) {
                totalMatchCount.incrementAndGet();
                this.lastMatchedIdentity = result.getIdentityCode();
                this.lastMatchedName = result.getFullName();
                this.lastSimilarity = result.getSimilarity();

                Direction direction = Direction.IN;
                if (cam.getTripwireDirection() == TripwireDirection.CHECK_OUT) {
                    direction = Direction.OUT;
                }

                log.info("TỰ ĐỘNG ĐIỂM DANH THÀNH CÔNG: Học sinh {} ({}) tại camera {} ({}) với độ tương đồng {:.1f}%",
                        result.getFullName(), result.getIdentityCode(), cam.getName(), direction, result.getSimilarity() * 100);

                attendanceService.processAttendanceScan(
                        result.getIdentityCode(),
                        direction,
                        cam.getId(),
                        LocalDateTime.now()
                );
            }
        }
    }

    private boolean hasSignificantMotion(String cameraId, byte[] frameBytes) {
        int checksum = 0;
        int step = Math.max(1, frameBytes.length / CHECKSUM_STEP_DIVISOR);
        for (int i = 0; i < frameBytes.length; i += step) {
            checksum = 31 * checksum + frameBytes[i];
        }

        Integer last = lastFrameChecksums.put(cameraId, checksum);
        if (last == null) {
            return true;
        }

        return last != checksum;
    }

    public boolean isAutoAttendanceEnabled() {
        return isEnabled.get();
    }

    public boolean toggleAutoAttendance(boolean enabled) {
        isEnabled.set(enabled);
        log.info("Chế độ tự động điểm danh đã chuyển sang: {}", enabled ? "BẬT" : "TẮT");
        return isEnabled.get();
    }

    public long getTotalScans() {
        return totalScanCount.get();
    }

    public long getTotalMatches() {
        return totalMatchCount.get();
    }

    public CameraSessionState getCameraState(String cameraId) {
        return cameraStates.getOrDefault(cameraId, CameraSessionState.IDLE);
    }

    public long getBurstRemainingSeconds(String cameraId) {
        Long expiry = burstExpiryTimes.get(cameraId);
        if (expiry == null) {
            return 0L;
        }
        long diff = expiry - System.currentTimeMillis();
        return Math.max(0L, diff / 1000L);
    }

    public boolean isAlertStreamListening(String cameraId) {
        return cameraDevicePort.isEventListenerActive(cameraId);
    }
}
