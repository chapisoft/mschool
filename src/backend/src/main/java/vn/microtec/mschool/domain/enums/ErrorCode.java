package vn.microtec.mschool.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    SYS_SUCCESS_0000("success.default"),
    ATT_ERR_RECORD_NOT_FOUND("error.record_not_found"),
    ATT_ERR_SESSION_LOCKED("error.session_locked"),
    ERR_PARAMETERS_INVALID("error.parameters_invalid"),
    ERR_UNAUTHORIZED("error.unauthorized"),
    ERR_FORBIDDEN("error.forbidden"),
    ERR_SESSION_LOCKED("error.session_locked"),
    ERR_RECORD_NOT_FOUND("error.record_not_found"),
    ERR_CAMERA_OFFLINE("error.camera_offline"),
    ERR_SYSTEM_INTERNAL("error.system_internal");

    private final String messageKey;
}
