package vn.microtec.mschool.infrastructure.api.dto;

import lombok.*;
import vn.microtec.mschool.domain.enums.ResponseStatus;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiResponse<T> {
    private ResponseStatus status;
    private String code;
    private String messageCode;
    private String message;
    private T data;

    public static class ApiResponseBuilder<T> {
        public ApiResponseBuilder<T> code(String code) {
            this.code = code;
            this.messageCode = code;
            return this;
        }

        public ApiResponseBuilder<T> messageCode(String messageCode) {
            this.messageCode = messageCode;
            this.code = messageCode;
            return this;
        }
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .status(ResponseStatus.SUCCESS)
                .code("SYS_SUCCESS_0000")
                .messageCode("SYS_SUCCESS_0000")
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> error(String messageCode, String message) {
        return ApiResponse.<T>builder()
                .status(ResponseStatus.ERROR)
                .code(messageCode)
                .messageCode(messageCode)
                .message(message)
                .data(null)
                .build();
    }
}
