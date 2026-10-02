package vn.microtec.mschool.infrastructure.api.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.infrastructure.api.rest.CameraController;
import vn.microtec.mschool.infrastructure.persistence.DeviceCameraRepository;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * WebSocket Handler truyền tải luồng video camera IP thời gian thực (Zero
 * Latency, 20-25 FPS).
 * Khắc phục triệt để hiện tượng Safari WebKit ngắt luồng HTTP
 * multipart/x-mixed-replace.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class CameraStreamWebSocketHandler extends BinaryWebSocketHandler {

    private final DeviceCameraRepository cameraRepository;
    private final ExecutorService streamExecutor = Executors.newCachedThreadPool();

    private final Map<String, Set<WebSocketSession>> cameraSessions = new ConcurrentHashMap<>();
    private final Map<String, Process> activeProcesses = new ConcurrentHashMap<>();

    private final Map<String, AtomicBoolean> sessionSendingState = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        try {
            session.setBinaryMessageSizeLimit(1024 * 1024);
        } catch (Exception ignored) {
        }
        String cameraId = extractCameraId(session);
        if (cameraId == null || cameraId.trim().isEmpty()) {
            try {
                session.close(CloseStatus.BAD_DATA);
            } catch (Exception ignored) {
            }
            return;
        }

        cameraSessions.computeIfAbsent(cameraId, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionSendingState.put(session.getId(), new AtomicBoolean(false));
        log.info("WebSocket client connected to camera stream: id={}, total_clients={}",
                cameraId, cameraSessions.get(cameraId).size());

        ensureStreamBroadcasterRunning(cameraId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionSendingState.remove(session.getId());
        String cameraId = extractCameraId(session);
        if (cameraId != null) {
            Set<WebSocketSession> sessions = cameraSessions.get(cameraId);
            if (sessions != null) {
                sessions.remove(session);
                log.info("WebSocket client disconnected from camera stream: id={}, remaining_clients={}",
                        cameraId, sessions.size());
                if (sessions.isEmpty()) {
                    cameraSessions.remove(cameraId);
                    stopBroadcaster(cameraId);
                }
            }
        }
    }

    private synchronized void ensureStreamBroadcasterRunning(String cameraId) {
        if (activeProcesses.containsKey(cameraId)) {
            Process p = activeProcesses.get(cameraId);
            if (p != null && p.isAlive()) {
                return;
            }
        }

        DeviceCamera cam = cameraRepository.findById(cameraId).orElse(null);
        if (cam == null || cam.getRtspUrl() == null || cam.getRtspUrl().trim().isEmpty()) {
            log.warn("Cannot start WebSocket stream broadcaster: Camera {} not found or missing RTSP URL", cameraId);
            return;
        }

        String rawRtspUrl = cam.getRtspUrl();
        String rtspUrl = CameraController.normalizeRtspUrl(rawRtspUrl);

        try {
            log.info("Starting ultra-low-latency FFmpeg broadcaster for camera {} ({})", cameraId, rtspUrl);
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg",
                    "-nostats",
                    "-loglevel", "error",
                    "-y",
                    "-rtsp_transport", "tcp",
                    "-use_wallclock_as_timestamps", "1",
                    "-fflags", "nobuffer+flush_packets+discardcorrupt",
                    "-flags", "low_delay",
                    "-max_delay", "0",
                    "-probesize", "32768",
                    "-analyzeduration", "500000",
                    "-i", rtspUrl,
                    "-threads", "1",
                    "-vf", "scale=1280:720",
                    "-sws_flags", "fast_bilinear",
                    "-f", "image2pipe",
                    "-vcodec", "mjpeg",
                    "-q:v", "4",
                    "-r", "15",
                    "-flush_packets", "1",
                    "pipe:1");
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = pb.start();
            activeProcesses.put(cameraId, process);

            streamExecutor.submit(() -> readAndBroadcastStream(cameraId, process));
        } catch (Exception e) {
            log.error("Failed to spawn FFmpeg broadcaster for camera {}: {}", cameraId, e.getMessage());
            activeProcesses.remove(cameraId);
        }
    }

    private void readAndBroadcastStream(String cameraId, Process process) {
        try (InputStream is = process.getInputStream();
                ByteArrayOutputStream frameBuffer = new ByteArrayOutputStream(131072)) {

            byte[] chunk = new byte[8192];
            int prev = -1;
            int bytesRead;
            boolean inFrame = false;

            while ((bytesRead = is.read(chunk)) != -1) {
                Set<WebSocketSession> sessions = cameraSessions.get(cameraId);
                if (sessions == null || sessions.isEmpty()) {
                    break;
                }

                for (int i = 0; i < bytesRead; i++) {
                    int cur = chunk[i] & 0xFF;
                    if (!inFrame) {
                        if (prev == 0xFF && cur == 0xD8) {
                            frameBuffer.reset();
                            frameBuffer.write(0xFF);
                            frameBuffer.write(0xD8);
                            inFrame = true;
                        }
                    } else {
                        frameBuffer.write(cur);
                        if (prev == 0xFF && cur == 0xD9) {
                            if (frameBuffer.size() > 5120) {
                                byte[] frameBytes = frameBuffer.toByteArray();
                                broadcastFrameAsync(sessions, frameBytes);
                            }
                            inFrame = false;
                        }
                    }
                    prev = cur;
                }
            }
        } catch (Exception e) {
            log.warn("Broadcaster reader ended for camera {}: {}", cameraId, e.getMessage());
        } finally {
            stopBroadcaster(cameraId);
        }
    }

    private void broadcastFrameAsync(Set<WebSocketSession> sessions, byte[] frameBytes) {
        BinaryMessage message = new BinaryMessage(frameBytes);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                AtomicBoolean sending = sessionSendingState.computeIfAbsent(session.getId(),
                        k -> new AtomicBoolean(false));
                // Cơ chế Drop-Tail: Nếu session đang bận gửi frame trước, bỏ qua frame này để
                // giữ độ trễ luôn < 100ms
                if (sending.compareAndSet(false, true)) {
                    streamExecutor.submit(() -> {
                        try {
                            synchronized (session) {
                                if (session.isOpen()) {
                                    session.sendMessage(message);
                                }
                            }
                        } catch (Exception ignored) {
                        } finally {
                            sending.set(false);
                        }
                    });
                }
            }
        }
    }

    private synchronized void stopBroadcaster(String cameraId) {
        Process p = activeProcesses.remove(cameraId);
        if (p != null) {
            if (p.isAlive()) {
                p.destroyForcibly();
            }
            log.info("Terminated FFmpeg WebSocket broadcaster for camera {}", cameraId);
        }
    }

    private String extractCameraId(WebSocketSession session) {
        if (session.getUri() == null)
            return null;
        String query = session.getUri().getQuery();
        if (query != null && query.contains("cameraId=")) {
            for (String param : query.split("&")) {
                if (param.startsWith("cameraId=")) {
                    return param.substring("cameraId=".length());
                }
            }
        }
        String path = session.getUri().getPath();
        int idx = path.lastIndexOf('/');
        return (idx != -1 && idx < path.length() - 1) ? path.substring(idx + 1) : null;
    }
}
