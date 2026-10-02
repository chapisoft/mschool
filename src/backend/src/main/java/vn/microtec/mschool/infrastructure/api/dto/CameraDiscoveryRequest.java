package vn.microtec.mschool.infrastructure.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.microtec.mschool.domain.enums.DiscoveryMode;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CameraDiscoveryRequest {
    private String subnet;
    private DiscoveryMode discoveryMode;
    private String defaultUsername;
    private String defaultPassword;
}
