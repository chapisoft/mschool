package vn.microtec.mschool.domain.enums;

public enum CameraEventState {
    ACTIVE,
    INACTIVE;

    public static CameraEventState fromCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            return INACTIVE;
        }
        for (CameraEventState state : values()) {
            if (state.name().equalsIgnoreCase(code.trim())) {
                return state;
            }
        }
        return INACTIVE;
    }
}
