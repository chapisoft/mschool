package vn.microtec.mschool.infrastructure.adapter;

import vn.microtec.mschool.application.port.out.CameraDevicePort;
import vn.microtec.mschool.application.port.out.CameraEventListener;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.domain.enums.CameraEventState;
import vn.microtec.mschool.domain.enums.CameraEventType;
import vn.microtec.mschool.infrastructure.api.rest.CameraController;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.Authenticator;
import java.net.HttpURLConnection;
import java.net.PasswordAuthentication;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Adapter hạ tầng kết nối thiết bị Camera ngoại vi (Outbound Adapter theo kiến
 * trúc Hexagonal).
 * Hiện thực hóa giao tiếp với phần cứng camera:
 * 1. Chụp ảnh khung hình: Ưu tiên HTTP ISAPI Digest Snapshot (<100ms, 0% CPU),
 * fallback sang ffmpeg qua RTSP.
 * 2. Lắng nghe luồng sự kiện phần cứng (ISAPI alertStream): Kênh HTTP streaming
 * thụ động (0% CPU).
 */
@Slf4j
@Component
public class CameraDeviceAdapter implements CameraDevicePort {

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, Boolean> activeListeners = new ConcurrentHashMap<>();
    private final Map<String, HttpURLConnection> activeConnections = new ConcurrentHashMap<>();

    private static final Pattern EVENT_TYPE_PATTERN = Pattern.compile("<eventType>([^<]+)</eventType>");
    private static final Pattern EVENT_STATE_PATTERN = Pattern.compile("<eventState>([^<]+)</eventState>");
    private static final int SNAPSHOT_MIN_BYTE_SIZE = 1024;
    private static final int HTTP_CONNECT_TIMEOUT_MS = 2000;
    private static final int HTTP_READ_TIMEOUT_MS = 3000;
    private static final int FFMPEG_TIMEOUT_SECONDS = 4;
    private static final int RECONNECT_DELAY_MS = 5000;

    @Override
    public byte[] captureFrame(DeviceCamera camera) {
        if (camera == null || camera.getRtspUrl() == null || camera.getRtspUrl().trim().isEmpty()) {
            return null;
        }

        // 1. Thử lấy snapshot trực tiếp qua giao thức HTTP ISAPI của camera
        byte[] snapshot = tryCaptureHttpSnapshot(camera);
        if (snapshot != null && snapshot.length > SNAPSHOT_MIN_BYTE_SIZE) {
            return snapshot;
        }

        // 2. Dự phòng: Sử dụng ffmpeg giải mã luồng RTSP
        return captureFrameViaFfmpeg(camera);
    }

    @Override
    public synchronized void startEventListener(DeviceCamera camera, CameraEventListener listener) {
        if (camera == null || camera.getId() == null) {
            return;
        }

        String cameraId = camera.getId();
        if (Boolean.TRUE.equals(activeListeners.get(cameraId))) {
            return;
        }

        activeListeners.put(cameraId, true);
        executor.submit(() -> listenAlertStreamLoop(camera, listener));
    }

    @Override
    public synchronized void stopEventListener(String cameraId) {
        if (cameraId == null) {
            return;
        }

        activeListeners.put(cameraId, false);
        HttpURLConnection conn = activeConnections.remove(cameraId);
        if (conn != null) {
            try {
                conn.disconnect();
            } catch (Exception ignored) {
            }
        }
        log.info("Đã đóng kết nối alertStream cho camera {}", cameraId);
    }

    @Override
    public boolean isEventListenerActive(String cameraId) {
        return cameraId != null && Boolean.TRUE.equals(activeListeners.get(cameraId));
    }

    private byte[] tryCaptureHttpSnapshot(DeviceCamera camera) {
        String ip = camera.getIpAddress();
        if (ip == null || ip.trim().isEmpty()) {
            return null;
        }

        CameraCredentials creds = extractCredentialsFromRtsp(camera.getRtspUrl());
        if (creds == null) {
            return null;
        }

        String[] endpoints = {
                "http://" + ip + "/ISAPI/Streaming/channels/1/picture",
                "http://" + ip + "/ISAPI/Streaming/channels/101/picture"
        };

        for (String snapshotUrl : endpoints) {
            try {
                Authenticator.setDefault(new Authenticator() {
                    @Override
                    protected PasswordAuthentication getPasswordAuthentication() {
                        return new PasswordAuthentication(creds.username(), creds.password().toCharArray());
                    }
                });

                URL url = new URL(snapshotUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
                conn.setReadTimeout(HTTP_READ_TIMEOUT_MS);
                conn.setRequestMethod("GET");

                int statusCode = conn.getResponseCode();
                if (statusCode == HttpURLConnection.HTTP_OK) {
                    try (InputStream is = conn.getInputStream()) {
                        byte[] data = is.readAllBytes();
                        if (data != null && data.length > SNAPSHOT_MIN_BYTE_SIZE) {
                            return data;
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private byte[] captureFrameViaFfmpeg(DeviceCamera camera) {
        String rtspUrl = CameraController.normalizeRtspUrl(camera.getRtspUrl());
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg",
                    "-nostats",
                    "-loglevel", "error",
                    "-y",
                    "-rtsp_transport", "tcp",
                    "-i", rtspUrl,
                    "-vframes", "1",
                    "-vf", "scale='min(1280,iw)':-2",
                    "-q:v", "3",
                    "-f", "image2",
                    "-c:v", "mjpeg",
                    "pipe:1");
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = pb.start();

            byte[] imageBytes;
            try (InputStream is = process.getInputStream()) {
                imageBytes = is.readAllBytes();
            }

            boolean finished = process.waitFor(FFMPEG_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Timeout chụp khung hình qua ffmpeg từ camera {}", camera.getId());
                return null;
            }

            if (process.exitValue() == 0 && imageBytes != null && imageBytes.length > SNAPSHOT_MIN_BYTE_SIZE) {
                return imageBytes;
            }
        } catch (Exception e) {
            log.error("Lỗi khi giải mã ffmpeg camera {}: {}", camera.getId(), e.getMessage());
        }
        return null;
    }

    private void listenAlertStreamLoop(DeviceCamera camera, CameraEventListener listener) {
        String cameraId = camera.getId();
        String ip = camera.getIpAddress();
        CameraCredentials creds = extractCredentialsFromRtsp(camera.getRtspUrl());

        if (ip == null || ip.trim().isEmpty() || creds == null) {
            log.warn("Camera {} thiếu thông tin IP hoặc thông tin xác thực để mở alertStream", cameraId);
            activeListeners.put(cameraId, false);
            return;
        }

        String streamUrl = "http://" + ip + "/ISAPI/Event/notification/alertStream";
        log.info("Mở kết nối alertStream cho camera {} ({})", cameraId, streamUrl);

        while (Boolean.TRUE.equals(activeListeners.get(cameraId))) {
            HttpURLConnection conn = null;
            try {
                Authenticator.setDefault(new Authenticator() {
                    @Override
                    protected PasswordAuthentication getPasswordAuthentication() {
                        return new PasswordAuthentication(creds.username(), creds.password().toCharArray());
                    }
                });

                URL url = new URL(streamUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
                conn.setReadTimeout(0);
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Connection", "keep-alive");

                int statusCode = conn.getResponseCode();
                if (statusCode != HttpURLConnection.HTTP_OK) {
                    log.warn("Kết nối alertStream camera {} trả về mã HTTP {}. Thử lại sau {}ms...",
                            cameraId, statusCode, RECONNECT_DELAY_MS);
                    Thread.sleep(RECONNECT_DELAY_MS);
                    continue;
                }

                activeConnections.put(cameraId, conn);
                log.info("Kênh sự kiện alertStream camera {} đã KẾT NỐI THÀNH CÔNG (0% CPU)", cameraId);

                try (InputStream is = conn.getInputStream();
                        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {

                    String line;
                    CameraEventType currentEventType = CameraEventType.UNKNOWN;

                    while (Boolean.TRUE.equals(activeListeners.get(cameraId)) && (line = reader.readLine()) != null) {
                        Matcher typeMatcher = EVENT_TYPE_PATTERN.matcher(line);
                        if (typeMatcher.find()) {
                            currentEventType = CameraEventType.fromCode(typeMatcher.group(1));
                        }

                        Matcher stateMatcher = EVENT_STATE_PATTERN.matcher(line);
                        if (stateMatcher.find()) {
                            CameraEventState state = CameraEventState.fromCode(stateMatcher.group(1));
                            if (state == CameraEventState.ACTIVE && currentEventType != CameraEventType.UNKNOWN) {
                                if (currentEventType != CameraEventType.VIDEOLOSS) {
                                    log.info("SỰ KIỆN PHẦN CỨNG CAMERA {}: eventType={}, state=ACTIVE",
                                            cameraId, currentEventType);
                                    try {
                                        listener.onCameraEvent(cameraId, currentEventType);
                                    } catch (Exception ex) {
                                        log.error("Lỗi xử lý sự kiện camera {}: {}", cameraId, ex.getMessage());
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                if (Boolean.TRUE.equals(activeListeners.get(cameraId))) {
                    log.warn("Gián đoạn kênh alertStream camera {} ({}). Tự động kết nối lại...",
                            cameraId, e.getMessage());
                    try {
                        Thread.sleep(RECONNECT_DELAY_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            } finally {
                if (conn != null) {
                    try {
                        conn.disconnect();
                    } catch (Exception ignored) {
                    }
                }
                activeConnections.remove(cameraId);
            }
        }
    }

    private CameraCredentials extractCredentialsFromRtsp(String rtspUrl) {
        if (rtspUrl == null || !rtspUrl.contains("@")) {
            return null;
        }

        try {
            int schemeIdx = rtspUrl.indexOf("://");
            int atIdx = rtspUrl.indexOf("@");
            if (schemeIdx >= 0 && atIdx > schemeIdx) {
                String userPass = rtspUrl.substring(schemeIdx + 3, atIdx);
                if (userPass.contains(":")) {
                    String[] parts = userPass.split(":", 2);
                    return new CameraCredentials(parts[0], parts[1]);
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private record CameraCredentials(String username, String password) {
    }
}
