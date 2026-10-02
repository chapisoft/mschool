package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.domain.common.SystemParameter;
import vn.microtec.mschool.domain.enums.*;
import vn.microtec.mschool.domain.exception.BusinessException;
import vn.microtec.mschool.infrastructure.api.dto.CameraDiscoveryRequest;
import vn.microtec.mschool.infrastructure.api.dto.DiscoveredCameraDto;
import vn.microtec.mschool.infrastructure.api.dto.QuickOnboardCameraRequest;
import vn.microtec.mschool.infrastructure.persistence.DeviceCameraRepository;
import vn.microtec.mschool.infrastructure.persistence.SystemParameterRepository;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CameraDiscoveryService {

    private final DeviceCameraRepository cameraRepository;
    private final SystemParameterRepository parameterRepository;
    private final AuditLogService auditLogService;
    private final I18nService i18nService;

    public List<DiscoveredCameraDto> discoverCameras(CameraDiscoveryRequest request) {
        String subnet = (request != null && request.getSubnet() != null && !request.getSubnet().trim().isEmpty())
                ? request.getSubnet().trim()
                : parameterRepository.findByParamKey(SystemConfigKey.CAMERA_SUBNET.name())
                        .map(SystemParameter::getParamValue)
                        .orElseThrow(() -> new BusinessException(
                                ErrorCode.ERR_PARAMETERS_INVALID,
                                i18nService.getMessage("error.parameters_invalid", "Subnet configuration missing in database")
                        ));

        String credentials = parameterRepository.findByParamKey(SystemConfigKey.CAMERA_RTSP_CREDENTIALS.name())
                .map(SystemParameter::getParamValue)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.ERR_PARAMETERS_INVALID,
                        i18nService.getMessage("error.parameters_invalid", "RTSP credentials missing in database")
                ));

        int timeoutMs = parameterRepository.findByParamKey(SystemConfigKey.CAMERA_PROBE_TIMEOUT_MS.name())
                .map(p -> {
                    try {
                        return Integer.parseInt(p.getParamValue().trim());
                    } catch (NumberFormatException e) {
                        throw new BusinessException(
                                ErrorCode.ERR_PARAMETERS_INVALID,
                                i18nService.getMessage("error.parameters_invalid", "Invalid probe timeout format in database")
                        );
                    }
                })
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.ERR_PARAMETERS_INVALID,
                        i18nService.getMessage("error.parameters_invalid", "Probe timeout parameter missing in database")
                ));

        List<Integer> probePorts = parameterRepository.findByParamKey(SystemConfigKey.CAMERA_PROBE_PORTS.name())
                .map(p -> Arrays.stream(p.getParamValue().split("[,;\\s]+"))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(Integer::parseInt)
                        .toList())
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.ERR_PARAMETERS_INVALID,
                        i18nService.getMessage("error.parameters_invalid", "Probe ports parameter missing in database")
                ));

        log.info("Initiating network camera discovery on subnet: {} with timeout: {}ms, ports: {}",
                subnet, timeoutMs, probePorts);

        List<DeviceCamera> existingCameras = cameraRepository.findAll();
        Map<String, DeviceCamera> existingByIp = existingCameras.stream()
                .collect(Collectors.toMap(DeviceCamera::getIpAddress, c -> c, (c1, c2) -> c1));

        List<DiscoveredCameraDto> results = new ArrayList<>();

        for (DeviceCamera cam : existingCameras) {
            results.add(DiscoveredCameraDto.builder()
                    .ipAddress(cam.getIpAddress())
                    .macAddress(null)
                    .vendor(null)
                    .model(cam.getName())
                    .onvifPort(null)
                    .rtspPort(null)
                    .suggestedRtspUrl(cam.getRtspUrl())
                    .suggestedName(cam.getName())
                    .declared(true)
                    .existingCameraId(cam.getId())
                    .existingLocation(cam.getLocation())
                    .resolution(null)
                    .fps(cam.getFps())
                    .discoveryProtocol(null)
                    .build());
        }

        List<DiscoveredRawDevice> scannedDevices = probeNetworkForCameraEndpoints(subnet, timeoutMs, credentials, probePorts);

        for (DiscoveredRawDevice raw : scannedDevices) {
            if (!existingByIp.containsKey(raw.ipAddress())) {
                String suggestedRtspUrl = buildRtspUrl(raw.vendor(), raw.ipAddress(), credentials);
                String suggestedName = raw.vendor().name() + " (" + raw.ipAddress() + ")";

                results.add(DiscoveredCameraDto.builder()
                        .ipAddress(raw.ipAddress())
                        .macAddress(null)
                        .vendor(raw.vendor())
                        .model(null)
                        .onvifPort(raw.onvifPort())
                        .rtspPort(raw.rtspPort())
                        .suggestedRtspUrl(suggestedRtspUrl)
                        .suggestedName(suggestedName)
                        .declared(false)
                        .existingCameraId(null)
                        .existingLocation(null)
                        .resolution(null)
                        .fps(null)
                        .discoveryProtocol(raw.protocol())
                        .build());
            }
        }

        log.info("Completed camera network discovery: total={}, declared={}, undeclared={}",
                results.size(),
                results.stream().filter(DiscoveredCameraDto::isDeclared).count(),
                results.stream().filter(c -> !c.isDeclared()).count());

        results.sort(Comparator.comparing(DiscoveredCameraDto::isDeclared));

        return results;
    }

    @Transactional
    public DeviceCamera quickOnboard(QuickOnboardCameraRequest request) {
        if (request.getIpAddress() == null || request.getIpAddress().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_CAMERA_IP_REQUIRED,
                    i18nService.getMessage("error.camera_ip_required", "Camera IP address is required")
            );
        }

        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera name is required")
            );
        }

        if (request.getLocation() == null || request.getLocation().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera installation location is required")
            );
        }

        if (request.getRtspUrl() == null || request.getRtspUrl().trim().isEmpty()) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera RTSP URL is required")
            );
        }

        if (request.getTripwireDirection() == null) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Tripwire direction is required")
            );
        }

        if (request.getFps() == null) {
            throw new BusinessException(
                    ErrorCode.ERR_PARAMETERS_INVALID,
                    i18nService.getMessage("error.parameters_invalid", "Camera FPS is required")
            );
        }

        String ip = request.getIpAddress().trim();
        if (cameraRepository.existsByIpAddress(ip)) {
            throw new BusinessException(
                    ErrorCode.ERR_CAMERA_IP_EXISTS,
                    i18nService.getMessage("error.camera_ip_exists", new Object[]{ip}, "Camera with IP address " + ip + " already registered")
            );
        }

        String id = "CAM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        DeviceCamera newCam = DeviceCamera.builder()
                .id(id)
                .name(request.getName().trim())
                .ipAddress(ip)
                .rtspUrl(request.getRtspUrl().trim())
                .location(request.getLocation().trim())
                .fps(request.getFps())
                .status(CameraStatus.ONLINE)
                .tripwireDirection(request.getTripwireDirection())
                .build();

        DeviceCamera saved = cameraRepository.save(newCam);

        auditLogService.logAction(
                null,
                null,
                UserRole.ROLE_ADMIN.name(),
                AuditActionCode.CAMERA_AUTO_DISCOVER_ONBOARD.name(),
                DeviceCamera.class.getSimpleName(),
                saved.getId(),
                null,
                saved.getName(),
                saved.getLocation(),
                saved.getIpAddress(),
                null
        );

        log.info("Successfully onboarded camera device: id={}, name={}, ip={}, location={}",
                saved.getId(), saved.getName(), saved.getIpAddress(), saved.getLocation());

        return saved;
    }

    private List<DiscoveredRawDevice> probeNetworkForCameraEndpoints(
            String subnet, int timeoutMs, String credentials, List<Integer> probePorts) {
        List<String> targetIps = generateSubnetIpRange(subnet);
        List<DiscoveredRawDevice> discovered = new CopyOnWriteArrayList<>();

        int threadPoolSize = Math.min(Math.max(targetIps.size(), 1), 50);
        ExecutorService executor = Executors.newFixedThreadPool(threadPoolSize);
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (String ip : targetIps) {
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                Set<Integer> openPorts = new HashSet<>();
                for (Integer port : probePorts) {
                    if (isPortOpen(ip, port, timeoutMs)) {
                        openPorts.add(port);
                    }
                }

                if (openPorts.isEmpty()) {
                    return;
                }

                CameraVendor matchedVendor = null;
                for (CameraVendor vendor : CameraVendor.values()) {
                    if (vendor != CameraVendor.GENERIC_ONVIF && openPorts.contains(vendor.getServicePort())) {
                        matchedVendor = vendor;
                        break;
                    }
                }

                boolean hasRtsp = openPorts.contains(CameraVendor.GENERIC_ONVIF.getRtspPort());
                if (matchedVendor == null) {
                    if (hasRtsp) {
                        matchedVendor = CameraVendor.GENERIC_ONVIF;
                    } else {
                        return;
                    }
                }

                Integer rtspPort = hasRtsp ? CameraVendor.GENERIC_ONVIF.getRtspPort() : null;
                Integer onvifPort = openPorts.contains(CameraVendor.GENERIC_ONVIF.getServicePort())
                        ? CameraVendor.GENERIC_ONVIF.getServicePort()
                        : null;

                DiscoveryProtocol protocol = hasRtsp
                        ? DiscoveryProtocol.PORT_SCAN_RTSP
                        : DiscoveryProtocol.ONVIF_WS_DISCOVERY;

                log.info("Discovered active camera endpoint at {}: vendor={}, openPorts={}",
                        ip, matchedVendor, openPorts);

                discovered.add(new DiscoveredRawDevice(
                        ip,
                        null,
                        matchedVendor,
                        null,
                        onvifPort,
                        rtspPort,
                        null,
                        null,
                        protocol
                ));
            }, executor);
            futures.add(future);
        }

        try {
            long maxWaitMs = Math.max(3000L, targetIps.size() * 30L + 2000L);
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(maxWaitMs, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.warn("Network discovery probe completed with partial timeout: {}", e.getMessage());
        } finally {
            executor.shutdownNow();
        }

        return new ArrayList<>(discovered);
    }

    private boolean isPortOpen(String ip, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(ip, port), timeoutMs);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private List<String> generateSubnetIpRange(String subnetConfig) {
        List<String> targetIps = new ArrayList<>();
        if (subnetConfig == null || subnetConfig.trim().isEmpty()) {
            return targetIps;
        }

        String[] tokens = subnetConfig.split("[,;\\s]+");
        for (String token : tokens) {
            String sub = token.trim();
            if (sub.isEmpty()) continue;

            if (!sub.contains("/")) {
                targetIps.add(sub);
                continue;
            }

            String[] parts = sub.split("/");
            String baseIp = parts[0].trim();
            int prefixLen;
            try {
                prefixLen = Integer.parseInt(parts[1].trim());
            } catch (NumberFormatException e) {
                targetIps.add(baseIp);
                continue;
            }

            int lastDot = baseIp.lastIndexOf('.');
            if (lastDot <= 0) {
                targetIps.add(baseIp);
                continue;
            }
            String prefix = baseIp.substring(0, lastDot);

            if (prefixLen == 24) {
                for (int i = 1; i <= 254; i++) {
                    targetIps.add(prefix + "." + i);
                }
            } else if (prefixLen >= 25 && prefixLen <= 30) {
                int hostCount = 1 << (32 - prefixLen);
                int lastOctet = Integer.parseInt(baseIp.substring(lastDot + 1));
                int baseHost = (lastOctet / hostCount) * hostCount;
                for (int i = 1; i < hostCount - 1; i++) {
                    int host = baseHost + i;
                    if (host >= 1 && host <= 254) {
                        targetIps.add(prefix + "." + host);
                    }
                }
            } else {
                targetIps.add(baseIp);
            }
        }
        return targetIps.stream().distinct().toList();
    }

    private String buildRtspUrl(CameraVendor vendor, String ip, String credentials) {
        String auth = (credentials != null && !credentials.trim().isEmpty())
                ? (credentials.endsWith("@") ? credentials : credentials + "@")
                : "";
        SystemConfigKey templateKey = vendor.getTemplateKey();
        String template = parameterRepository.findByParamKey(templateKey.name())
                .map(SystemParameter::getParamValue)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.ERR_PARAMETERS_INVALID,
                        i18nService.getMessage("error.parameters_invalid", "RTSP template configuration missing in database: " + templateKey.name())
                ));
        return template.replace("{auth}", auth).replace("{ip}", ip);
    }

    private record DiscoveredRawDevice(
            String ipAddress,
            String macAddress,
            CameraVendor vendor,
            String model,
            Integer onvifPort,
            Integer rtspPort,
            String resolution,
            Integer fps,
            DiscoveryProtocol protocol
    ) {}
}
