package vn.microtec.mschool.infrastructure.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.microtec.mschool.domain.enums.TripwireDirection;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickOnboardCameraRequest {
    private String name;
    private String ipAddress;
    private String rtspUrl;
    private String location;
    private Integer fps;
    private TripwireDirection tripwireDirection;
}
