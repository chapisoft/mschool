package vn.microtec.mschool.infrastructure.api.rest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import vn.microtec.mschool.application.service.CameraDiscoveryService;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.application.port.out.CameraDevicePort;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.domain.enums.CameraStatus;
import vn.microtec.mschool.domain.enums.ConnectionStatus;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.exception.BusinessException;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.api.dto.CameraDiscoveryRequest;
import vn.microtec.mschool.infrastructure.api.dto.DiscoveredCameraDto;
import vn.microtec.mschool.infrastructure.api.dto.QuickOnboardCameraRequest;
import vn.microtec.mschool.infrastructure.persistence.DeviceCameraRepository;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/cameras")
@RequiredArgsConstructor
@Slf4j
public class CameraController {

    private static final java.util.Set<Process> ACTIVE_STREAM_PROCESSES = java.util.concurrent.ConcurrentHashMap
            .newKeySet();

    static {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            for (Process p : ACTIVE_STREAM_PROCESSES) {
                try {
                    if (p.isAlive()) {
                        p.destroyForcibly();
                    }
                } catch (Exception ignored) {
                }
            }
        }));
    }

    private final DeviceCameraRepository cameraRepository;
    private final CameraDiscoveryService cameraDiscoveryService;
    private final CameraDevicePort cameraDevicePort;
    private final I18nService i18nService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeviceCamera>>> getAllCameras() {
        List<DeviceCamera> list = cameraRepository.findAll();
        checkLiveCameraStatus(list);
        return ResponseEntity.ok(ApiResponse.<List<DeviceCamera>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("camera.list.success", "Lấy danh sách thiết bị camera thành công"))
                .data(list)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DeviceCamera>> getCameraById(@PathVariable String id) {
        return cameraRepository.findById(id)
                .map(cam -> ResponseEntity.ok(ApiResponse.<DeviceCamera>builder()
                        .status(ResponseStatus.SUCCESS)
                        .code(ErrorCode.SYS_SUCCESS_0000.name())
                        .message(i18nService.getMessage("camera.detail.success", "Lấy thông tin camera thành công"))
                        .data(cam)
                        .build()))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<DeviceCamera>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                        .message(i18nService.getMessage("camera.notfound", "Không tìm thấy thiết bị camera"))
                        .build()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DeviceCamera>> createCamera(@RequestBody DeviceCamera newCam) {
        if (newCam.getName() == null || newCam.getName().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera name is required"));
        }
        if (newCam.getIpAddress() == null || newCam.getIpAddress().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_CAMERA_IP_REQUIRED,
                    i18nService.getMessage("error.camera_ip_required", "Camera IP address is required"));
        }
        if (newCam.getRtspUrl() == null || newCam.getRtspUrl().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera RTSP URL is required"));
        }
        if (newCam.getLocation() == null || newCam.getLocation().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera location is required"));
        }
        if (newCam.getTripwireDirection() == null) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Tripwire direction is required"));
        }
        if (newCam.getFps() == null) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera FPS is required"));
        }

        if (newCam.getId() == null || newCam.getId().trim().isEmpty()) {
            newCam.setId("CAM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        boolean reachable = false;
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(newCam.getIpAddress().trim(), 554), 250);
            reachable = true;
        } catch (IOException ignored) {
        }
        newCam.setStatus(reachable ? CameraStatus.ONLINE : CameraStatus.OFFLINE);

        DeviceCamera saved = cameraRepository.save(newCam);
        return ResponseEntity.ok(ApiResponse.<DeviceCamera>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("camera.create.success", "Thêm mới thiết bị camera thành công"))
                .data(saved)
                .build());
    }

    private void checkLiveCameraStatus(List<DeviceCamera> cameras) {
        if (cameras == null || cameras.isEmpty())
            return;

        ExecutorService executor = Executors.newFixedThreadPool(Math.min(cameras.size(), 10));
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (DeviceCamera cam : cameras) {
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                String ip = cam.getIpAddress();
                boolean reachable = false;
                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(ip, 554), 250);
                    reachable = true;
                } catch (IOException ignored) {
                }

                CameraStatus liveStatus = reachable ? CameraStatus.ONLINE : CameraStatus.OFFLINE;
                if (cam.getStatus() != liveStatus) {
                    cam.setStatus(liveStatus);
                    cameraRepository.save(cam);
                    log.info("Live status check updated camera {} ({}): {}", cam.getId(), ip, liveStatus);
                }
            }, executor);
            futures.add(future);
        }

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(1000L, TimeUnit.MILLISECONDS);
        } catch (Exception ignored) {
        } finally {
            executor.shutdownNow();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DeviceCamera>> updateCamera(@PathVariable String id,
            @RequestBody DeviceCamera updateReq) {
        return cameraRepository.findById(id)
                .map(cam -> {
                    if (updateReq.getName() != null)
                        cam.setName(updateReq.getName());
                    if (updateReq.getIpAddress() != null)
                        cam.setIpAddress(updateReq.getIpAddress());
                    if (updateReq.getRtspUrl() != null)
                        cam.setRtspUrl(updateReq.getRtspUrl());
                    if (updateReq.getLocation() != null)
                        cam.setLocation(updateReq.getLocation());
                    if (updateReq.getStatus() != null)
                        cam.setStatus(updateReq.getStatus());
                    if (updateReq.getFps() != null)
                        cam.setFps(updateReq.getFps());
                    if (updateReq.getTripwireDirection() != null)
                        cam.setTripwireDirection(updateReq.getTripwireDirection());
                    DeviceCamera saved = cameraRepository.save(cam);
                    return ResponseEntity.ok(ApiResponse.<DeviceCamera>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(i18nService.getMessage("camera.update.success",
                                    "Cập nhật thông số camera thành công"))
                            .data(saved)
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<DeviceCamera>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                        .message(i18nService.getMessage("camera.notfound", "Không tìm thấy thiết bị camera"))
                        .build()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteCamera(@PathVariable String id) {
        if (cameraRepository.existsById(Objects.requireNonNull(id))) {
            cameraRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("camera.delete.success", "Xóa thiết bị camera thành công"))
                    .data(Map.of("id", id, "deleted", true))
                    .build());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                .message(i18nService.getMessage("camera.notfound", "Không tìm thấy thiết bị camera"))
                .build());
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testRtsp(@PathVariable String id) {
        return cameraRepository.findById(id)
                .map(cam -> {
                    String ip = cam.getIpAddress();
                    int port = 554;
                    long start = System.currentTimeMillis();
                    ConnectionStatus status;
                    long latencyMs = 0;
                    try (Socket socket = new Socket()) {
                        socket.connect(new InetSocketAddress(ip, port), 2000);
                        latencyMs = System.currentTimeMillis() - start;
                        status = ConnectionStatus.CONNECTED;
                        cam.setStatus(CameraStatus.ONLINE);
                        cameraRepository.save(cam);
                        log.info("RTSP socket probe succeeded for camera {} ({}:{}): latency={}ms", id, ip, port,
                                latencyMs);
                    } catch (IOException e) {
                        status = ConnectionStatus.DISCONNECTED;
                        cam.setStatus(CameraStatus.OFFLINE);
                        cameraRepository.save(cam);
                        log.warn("RTSP socket probe failed for camera {} ({}:{}): {}", id, ip, port, e.getMessage());
                    }

                    Map<String, Object> data = Map.of(
                            "cameraId", id,
                            "ipAddress", ip,
                            "status", status.name(),
                            "latencyMs", latencyMs,
                            "fps", cam.getFps() != null ? cam.getFps() : 0);

                    String msgKey = (status == ConnectionStatus.CONNECTED) ? "camera.test.success"
                            : "camera.test.failed";
                    return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                            .status(status == ConnectionStatus.CONNECTED ? ResponseStatus.SUCCESS
                                    : ResponseStatus.ERROR)
                            .code(status == ConnectionStatus.CONNECTED ? ErrorCode.SYS_SUCCESS_0000.name()
                                    : ErrorCode.ERR_CAMERA_OFFLINE.name())
                            .message(i18nService.getMessage(msgKey,
                                    status == ConnectionStatus.CONNECTED ? "RTSP stream connection established"
                                            : "RTSP stream unreachable"))
                            .data(data)
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<Map<String, Object>>builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                                .message(i18nService.getMessage("camera.notfound", "Không tìm thấy thiết bị camera"))
                                .build()));
    }

    @lombok.Getter
    @lombok.Setter
    public static class ProbeCameraRequest {
        private String ipAddress;
        private String rtspUrl;
        private Integer port;
    }

    @PostMapping("/probe")
    public ResponseEntity<ApiResponse<Map<String, Object>>> probeCamera(@RequestBody ProbeCameraRequest req) {
        String ip = req.getIpAddress() != null ? req.getIpAddress().trim() : "";
        int port = (req.getPort() != null && req.getPort() > 0) ? req.getPort() : 554;
        if (ip.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_CAMERA_IP_REQUIRED.name())
                    .message(i18nService.getMessage("error.camera_ip_required", "IP address is required"))
                    .build());
        }

        long start = System.currentTimeMillis();
        ConnectionStatus status;
        long latencyMs = 0;
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(ip, port), 2000);
            latencyMs = System.currentTimeMillis() - start;
            status = ConnectionStatus.CONNECTED;
            log.info("Ad-hoc RTSP socket probe succeeded for {}:{} latency={}ms", ip, port, latencyMs);
        } catch (IOException e) {
            status = ConnectionStatus.DISCONNECTED;
            log.warn("Ad-hoc RTSP socket probe failed for {}:{} : {}", ip, port, e.getMessage());
        }

        Map<String, Object> data = Map.of(
                "ipAddress", ip,
                "port", port,
                "status", status.name(),
                "latencyMs", latencyMs);

        String msgKey = (status == ConnectionStatus.CONNECTED) ? "camera.test.success" : "camera.test.failed";
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(status == ConnectionStatus.CONNECTED ? ResponseStatus.SUCCESS : ResponseStatus.ERROR)
                .code(status == ConnectionStatus.CONNECTED ? ErrorCode.SYS_SUCCESS_0000.name()
                        : ErrorCode.ERR_CAMERA_OFFLINE.name())
                .message(i18nService.getMessage(msgKey,
                        status == ConnectionStatus.CONNECTED ? "RTSP stream connection established"
                                : "RTSP stream unreachable"))
                .data(data)
                .build());
    }

    @PostMapping("/discover")
    public ResponseEntity<ApiResponse<List<DiscoveredCameraDto>>> discoverCameras(
            @RequestBody(required = false) CameraDiscoveryRequest request) {
        List<DiscoveredCameraDto> list = cameraDiscoveryService.discoverCameras(request);
        long undeclaredCount = list.stream().filter(c -> !c.isDeclared()).count();
        String msg = i18nService.getMessage(
                "success.camera_discovered",
                new Object[] { list.size(), undeclaredCount },
                "Network discovery completed: Found " + list.size() + " devices (" + undeclaredCount + " undeclared)");
        return ResponseEntity.ok(ApiResponse.<List<DiscoveredCameraDto>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(msg)
                .data(list)
                .build());
    }

    @PostMapping("/quick-onboard")
    public ResponseEntity<ApiResponse<DeviceCamera>> quickOnboard(
            @RequestBody QuickOnboardCameraRequest request) {
        try {
            DeviceCamera saved = cameraDiscoveryService.quickOnboard(request);
            String msg = i18nService.getMessage(
                    "success.camera_onboarded",
                    "Successfully onboarded undeclared camera into the system");
            return ResponseEntity.ok(ApiResponse.<DeviceCamera>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(msg)
                    .data(saved)
                    .build());
        } catch (BusinessException e) {
            return ResponseEntity.badRequest().body(ApiResponse.<DeviceCamera>builder()
                    .status(ResponseStatus.ERROR)
                    .code(e.getErrorCode().name())
                    .message(e.getMessage())
                    .build());
        }
    }

    @GetMapping(value = "/{id}/snapshot")
    public ResponseEntity<?> getCameraSnapshot(@PathVariable String id) {
        DeviceCamera cam = cameraRepository.findById(id).orElse(null);
        if (cam == null) {
            cam = cameraRepository.findAll().stream()
                    .filter(c -> c.getId().equalsIgnoreCase(id)
                            || c.getId().replace('_', '-').equalsIgnoreCase(id.replace('_', '-')))
                    .findFirst().orElse(null);
        }
        if (cam == null) {
            cam = DeviceCamera.builder()
                    .id(id)
                    .name(id)
                    .rtspUrl("")
                    .build();
        }

        // 1. Ưu tiên trích xuất khung hình qua Camera Ingestion Worker
        byte[] workerFrame = cameraDevicePort.captureFrame(cam);
        if (workerFrame != null && workerFrame.length > 0) {
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .contentType(org.springframework.http.MediaType.IMAGE_JPEG)
                    .body(workerFrame);
        }

        String rawRtspUrl = cam.getRtspUrl();
        if (rawRtspUrl == null || rawRtspUrl.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.builder()
                            .status(ResponseStatus.ERROR)
                            .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                            .message(i18nService.getMessage("error.parameters_invalid", "Thiếu địa chỉ RTSP"))
                            .build());
        }
        String rtspUrl = normalizeRtspUrl(rawRtspUrl);

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "ffmpeg",
                    "-nostats",
                    "-loglevel", "error",
                    "-y",
                    "-rtsp_transport", "tcp",
                    "-timeout", "3000000",
                    "-i", rtspUrl,
                    "-vframes", "1",
                    "-q:v", "2",
                    "-f", "image2",
                    "-c:v", "mjpeg",
                    "pipe:1");
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = pb.start();

            byte[] imageBytes;
            try (var is = process.getInputStream()) {
                imageBytes = is.readAllBytes();
            }

            boolean finished = process.waitFor(4, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("FFmpeg timeout capturing snapshot from camera {} ({})", id, rtspUrl);
                return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)
                        .body(ApiResponse.builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ERR_CAMERA_STREAM_FAILED.name())
                                .message(i18nService.getMessage("error.camera_stream_failed",
                                        "Hết thời gian kết nối luồng camera"))
                                .build());
            }

            int exitCode = process.exitValue();
            if (exitCode == 0 && imageBytes != null && imageBytes.length > 0) {
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CACHE_CONTROL,
                                "no-cache, no-store, must-revalidate")
                        .contentType(org.springframework.http.MediaType.IMAGE_JPEG)
                        .body(imageBytes);
            }

            String errorMsg = "";
            try (var es = process.getErrorStream()) {
                errorMsg = new String(es.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            }
            log.warn("FFmpeg snapshot failed for camera {} (exit={}): {}", id, exitCode, errorMsg);

            if (errorMsg.contains("401") || errorMsg.contains("Unauthorized")
                    || errorMsg.contains("authorization failed")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ERR_CAMERA_RTSP_UNAUTHORIZED.name())
                                .message(i18nService.getMessage("error.camera_rtsp_unauthorized",
                                        "Lỗi xác thực RTSP: Sai tài khoản hoặc mật khẩu camera"))
                                .build());
            }

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiResponse.builder()
                            .status(ResponseStatus.ERROR)
                            .code(ErrorCode.ERR_CAMERA_STREAM_FAILED.name())
                            .message(i18nService.getMessage("error.camera_stream_failed",
                                    "Không thể trích xuất khung hình từ luồng camera"))
                            .build());

        } catch (Exception e) {
            log.error("Failed to capture snapshot from camera {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.builder()
                            .status(ResponseStatus.ERROR)
                            .code(ErrorCode.ERR_SYSTEM_INTERNAL.name())
                            .message(i18nService.getMessage("error.system_internal",
                                    "Lỗi nội bộ khi trích xuất khung hình"))
                            .build());
        }
    }

    @GetMapping(value = "/{id}/stream")
    public ResponseEntity<StreamingResponseBody> streamCamera(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "false") boolean hd) {

        // 1. Thử chuyển tiếp (proxy) trực tiếp từ AI Camera Ingestion Worker
        String[] candidateUrls = {
                "http://mschool-camera-worker:8090/api/v1/cameras/" + id + "/stream",
                "http://mschool-camera-worker:8090/api/v1/cameras/" + id.toLowerCase().replace('_', '-') + "/stream",
                "http://127.0.0.1:8090/api/v1/cameras/" + id + "/stream"
        };
        for (String cUrl : candidateUrls) {
            try {
                URL u = new URL(cUrl);
                HttpURLConnection c = (HttpURLConnection) u.openConnection();
                c.setConnectTimeout(800);
                c.setReadTimeout(15000);
                c.setRequestMethod("GET");
                if (c.getResponseCode() == HttpURLConnection.HTTP_OK) {
                    return ResponseEntity.ok()
                            .contentType(org.springframework.http.MediaType
                                    .parseMediaType("multipart/x-mixed-replace; boundary=frame"))
                            .body(outputStream -> {
                                try (InputStream is = c.getInputStream()) {
                                    byte[] buf = new byte[16384];
                                    int n;
                                    while ((n = is.read(buf)) != -1) {
                                        outputStream.write(buf, 0, n);
                                        outputStream.flush();
                                    }
                                } catch (Exception ignored) {
                                } finally {
                                    c.disconnect();
                                }
                            });
                }
            } catch (Exception ignored) {
            }
        }

        // 2. Dự phòng: Sử dụng ffmpeg giải mã RTSP trực tiếp
        DeviceCamera cam = cameraRepository.findById(id).orElse(null);
        if (cam == null) {
            return ResponseEntity.notFound().build();
        }

        String rawRtspUrl = cam.getRtspUrl();
        if (rawRtspUrl == null || rawRtspUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String rtspUrl = normalizeRtspUrl(rawRtspUrl);
        if (!hd && rtspUrl.contains("/Channels/101")) {
            rtspUrl = rtspUrl.replace("/Channels/101", "/Channels/102");
        }

        final String finalRtspUrl = rtspUrl;
        StreamingResponseBody responseBody = outputStream -> {
            log.info("Starting live camera stream for id={} ({})", id, finalRtspUrl);
            Process process = null;
            try {
                ProcessBuilder pb = new ProcessBuilder(
                        "ffmpeg",
                        "-nostats",
                        "-loglevel", "error",
                        "-y",
                        "-rtsp_transport", "tcp",
                        "-timeout", "5000000",
                        "-i", finalRtspUrl,
                        "-fflags", "nobuffer",
                        "-f", "mpjpeg",
                        "-q:v", "3",
                        "-r", "20",
                        "pipe:1");
                pb.redirectError(ProcessBuilder.Redirect.DISCARD);
                process = pb.start();
                ACTIVE_STREAM_PROCESSES.add(process);

                try (var is = process.getInputStream()) {
                    byte[] buffer = new byte[16384];
                    int bytesRead;
                    while ((bytesRead = is.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                        outputStream.flush();
                    }
                }
            } catch (IOException e) {
                log.info("Client disconnected from live stream for camera {}: {}", id, e.getMessage());
            } catch (Exception e) {
                log.warn("Error streaming camera {}: {}", id, e.getMessage());
            } finally {
                if (process != null) {
                    ACTIVE_STREAM_PROCESSES.remove(process);
                    if (process.isAlive()) {
                        process.destroyForcibly();
                    }
                }
            }
        };

        return ResponseEntity.ok()
                .contentType(
                        org.springframework.http.MediaType.parseMediaType("multipart/x-mixed-replace; boundary=ffmpeg"))
                .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header(org.springframework.http.HttpHeaders.PRAGMA, "no-cache")
                .header(org.springframework.http.HttpHeaders.EXPIRES, "0")
                .header(org.springframework.http.HttpHeaders.CONNECTION, "keep-alive")
                .body(responseBody);
    }

    public static String normalizeRtspUrl(String rtspUrl) {
        if (rtspUrl == null || !rtspUrl.startsWith("rtsp://")) {
            return rtspUrl;
        }
        try {
            int schemeLen = "rtsp://".length();
            int slashIdx = rtspUrl.indexOf('/', schemeLen);
            String authority = (slashIdx == -1) ? rtspUrl.substring(schemeLen) : rtspUrl.substring(schemeLen, slashIdx);
            String path = (slashIdx == -1) ? "" : rtspUrl.substring(slashIdx);

            int atIdx = authority.lastIndexOf('@');
            if (atIdx == -1) {
                return rtspUrl;
            }

            String userInfo = authority.substring(0, atIdx);
            String hostPort = authority.substring(atIdx + 1);

            int colonIdx = userInfo.indexOf(':');
            if (colonIdx == -1) {
                return rtspUrl;
            }

            String username = userInfo.substring(0, colonIdx);
            String rawPassword = userInfo.substring(colonIdx + 1);

            if (rawPassword.contains("@")) {
                rawPassword = rawPassword.replace("@", "%40");
            }

            return "rtsp://" + username + ":" + rawPassword + "@" + hostPort + path;
        } catch (Exception e) {
            return rtspUrl;
        }
    }
}
