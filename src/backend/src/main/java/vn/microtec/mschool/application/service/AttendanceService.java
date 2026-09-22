package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.domain.attendance.DailySessionStateMachine;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.domain.enums.Direction;
import vn.microtec.mschool.domain.enums.SubjectType;
import vn.microtec.mschool.domain.enums.WebhookEventType;
import vn.microtec.mschool.infrastructure.notification.NotificationOutboxService;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;
import vn.microtec.mschool.infrastructure.webhook.WebhookDispatcherService;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final StringRedisTemplate redisTemplate;
    private final AttendanceRecordRepository recordRepository;
    private final NotificationOutboxService outboxService;
    private final WebhookDispatcherService webhookDispatcherService;

    @Value("${app.attendance.gate-cooldown-seconds:90}")
    private long cooldownSeconds;

    /**
     * Tiếp nhận sự kiện nhận diện từ Ingestion Worker qua camera cổng bằng 100% Enums.
     */
    @Transactional
    public void processAttendanceScan(String identityCode, Direction direction, String cameraId, LocalDateTime scanTime) {
        if (SubjectType.STRANGER.name().equalsIgnoreCase(identityCode)) {
            log.warn("Cảnh báo an ninh: Phát hiện người lạ tại camera {}", cameraId);
            return;
        }

        String cooldownKey = "cooldown:gate:" + identityCode;

        // 1. Kiểm tra cửa sổ Cooldown trên Redis để khử trùng quét lặp
        Boolean isCoolingDown = redisTemplate.hasKey(cooldownKey);
        if (Boolean.TRUE.equals(isCoolingDown)) {
            log.debug("Bỏ qua quét trùng trong khoảng cooldown {}s: {}", cooldownSeconds, identityCode);
            return;
        }

        // Kích hoạt khóa cooldown
        redisTemplate.opsForValue().set(cooldownKey, "1", Objects.requireNonNull(Duration.ofSeconds(cooldownSeconds)));

        // 2. Tải hoặc khởi tạo phiên điểm danh ngày hôm nay
        LocalDate today = scanTime.toLocalDate();
        DailyAttendanceSession sessionEntity = recordRepository.findByIdentityCodeAndSessionDate(identityCode, today)
                .orElseGet(() -> DailyAttendanceSession.builder()
                        .identityCode(identityCode)
                        .sessionDate(today)
                        .attendanceStatus(AttendanceStatus.ABSENT)
                        .totalPresentMinutes(0)
                        .createdAt(OffsetDateTime.now())
                        .build());

        // 3. Khởi tạo State Machine và kích hoạt chuyển đổi trạng thái
        DailySessionStateMachine stateMachine = DailySessionStateMachine.builder()
                .id(sessionEntity.getId())
                .identityCode(sessionEntity.getIdentityCode())
                .sessionDate(sessionEntity.getSessionDate())
                .checkInTime(sessionEntity.getCheckInAt() != null ? sessionEntity.getCheckInAt().toLocalDateTime() : null)
                .checkOutTime(sessionEntity.getCheckOutAt() != null ? sessionEntity.getCheckOutAt().toLocalDateTime() : null)
                .lastOutTime(sessionEntity.getLastOutAt() != null ? sessionEntity.getLastOutAt().toLocalDateTime() : null)
                .status(sessionEntity.getAttendanceStatus() != null ? sessionEntity.getAttendanceStatus() : AttendanceStatus.ABSENT)
                .totalPresentMinutes(sessionEntity.getTotalPresentMinutes() != null ? sessionEntity.getTotalPresentMinutes() : 0)
                .build();

        boolean shouldNotify = stateMachine.processTransition(direction, scanTime);

        // 4. Đồng bộ ngược trạng thái từ State Machine vào JPA Entity
        if (stateMachine.getCheckInTime() != null) {
            sessionEntity.setCheckInAt(stateMachine.getCheckInTime().atOffset(ZoneOffset.ofHours(7)));
            sessionEntity.setCheckInCameraId(cameraId);
        }
        if (stateMachine.getCheckOutTime() != null) {
            sessionEntity.setCheckOutAt(stateMachine.getCheckOutTime().atOffset(ZoneOffset.ofHours(7)));
            sessionEntity.setCheckOutCameraId(cameraId);
        }
        if (stateMachine.getLastOutTime() != null) {
            sessionEntity.setLastOutAt(stateMachine.getLastOutTime().atOffset(ZoneOffset.ofHours(7)));
        }
        sessionEntity.setAttendanceStatus(stateMachine.getStatus());
        sessionEntity.setUpdatedAt(OffsetDateTime.now());

        recordRepository.save(Objects.requireNonNull(sessionEntity));

        // 5. Ghi nhận sự kiện vào Hàng đợi Outbox Pattern
        if (shouldNotify) {
            String eventType = (direction == Direction.IN) ? WebhookEventType.ATTENDANCE_CHECKIN.name() : WebhookEventType.ATTENDANCE_CHECKOUT.name();
            outboxService.publishParentNotification(
                    identityCode,
                    eventType,
                    scanTime,
                    cameraId
            );
            webhookDispatcherService.dispatch(
                    (direction == Direction.IN) ? WebhookEventType.ATTENDANCE_CHECKIN : WebhookEventType.ATTENDANCE_CHECKOUT,
                    String.format("{\"identityCode\": \"%s\", \"status\": \"%s\", \"cameraId\": \"%s\"}",
                            identityCode, sessionEntity.getAttendanceStatus().name(), cameraId)
            );
        }

        log.info("Xử lý quét điểm danh thành công: identity={}, direction={}, status={}",
                identityCode, direction, sessionEntity.getAttendanceStatus());
    }
}
