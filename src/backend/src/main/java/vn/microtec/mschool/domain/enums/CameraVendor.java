package vn.microtec.mschool.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CameraVendor {
    HIKVISION(8000, 554, SystemConfigKey.RTSP_TEMPLATE_HIKVISION),
    DAHUA(37777, 554, SystemConfigKey.RTSP_TEMPLATE_DAHUA),
    UNIVIEW(82, 554, SystemConfigKey.RTSP_TEMPLATE_UNIVIEW),
    TIANDY(3000, 554, SystemConfigKey.RTSP_TEMPLATE_TIANDY),
    GENERIC_ONVIF(80, 554, SystemConfigKey.RTSP_TEMPLATE_GENERIC_ONVIF);

    private final int servicePort;
    private final int rtspPort;
    private final SystemConfigKey templateKey;
}
