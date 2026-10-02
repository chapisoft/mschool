package vn.microtec.mschool.infrastructure.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.microtec.mschool.domain.enums.CameraVendor;
import vn.microtec.mschool.domain.enums.DiscoveryProtocol;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscoveredCameraDto {
    private String ipAddress;
    private String macAddress;
    private CameraVendor vendor;
    private String model;
    private Integer onvifPort;
    private Integer rtspPort;
    private String suggestedRtspUrl;
    private String suggestedName;
    private boolean declared;
    private String existingCameraId;
    private String existingLocation;
    private String resolution;
    private Integer fps;
    private DiscoveryProtocol discoveryProtocol;
    private String thumbnailPlaceholder;
}
