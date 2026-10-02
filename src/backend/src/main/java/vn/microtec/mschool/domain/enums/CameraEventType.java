package vn.microtec.mschool.domain.enums;

public enum CameraEventType {
    VMD,
    FACEDETECTION,
    LINECROSSING,
    INTRUSION,
    VIDEOLOSS,
    UNKNOWN;

    public static CameraEventType fromCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            return UNKNOWN;
        }
        for (CameraEventType type : values()) {
            if (type.name().equalsIgnoreCase(code.trim())) {
                return type;
            }
        }
        return UNKNOWN;
    }
}
