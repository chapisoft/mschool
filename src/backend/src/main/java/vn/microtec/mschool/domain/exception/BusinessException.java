package vn.microtec.mschool.domain.exception;

import lombok.Getter;
import vn.microtec.mschool.domain.enums.ErrorCode;

@Getter
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
