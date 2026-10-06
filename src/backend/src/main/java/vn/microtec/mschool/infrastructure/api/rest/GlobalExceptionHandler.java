package vn.microtec.mschool.infrastructure.api.rest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.exception.BusinessException;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final I18nService i18nService;

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Object>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.warn("HTTP Method not supported: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(ApiResponse.builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                .message("Phương thức HTTP " + ex.getMethod() + " không được hỗ trợ cho tài nguyên này")
                .build());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Method argument type mismatch: {} = {}", ex.getName(), ex.getValue());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                .message("Tham số " + ex.getName() + " có giá trị không hợp lệ: " + ex.getValue())
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("Dữ liệu đầu vào không hợp lệ");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                .message(msg)
                .build());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Object>> handleBusiness(BusinessException ex) {
        log.warn("Business Exception: {} - {}", ex.getErrorCode(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.builder()
                .status(ResponseStatus.ERROR)
                .code(ex.getErrorCode() != null ? ex.getErrorCode().name() : ErrorCode.ERR_SYSTEM_INTERNAL.name())
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneral(Exception ex) {
        log.error("Unhandled Exception caught: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ERR_SYSTEM_INTERNAL.name())
                .message(i18nService.getMessage("error.system", "Đã xảy ra lỗi trong quá trình xử lý hệ thống"))
                .build());
    }
}
