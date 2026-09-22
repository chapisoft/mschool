package vn.microtec.mschool.infrastructure.api.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.application.service.VisitorService;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.enums.VisitorType;
import vn.microtec.mschool.domain.visitor.VisitorRegistration;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/visitors")
@RequiredArgsConstructor
public class VisitorController {

    private final VisitorService visitorService;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class CreateVisitorRequest {
        @NotBlank
        private String fullName;

        private String phoneNumber;

        @NotNull
        private VisitorType visitorType;

        private String targetIdentityCode;

        @NotNull
        private OffsetDateTime validFrom;

        @NotNull
        private OffsetDateTime validTo;

        private String approvedBy;
    }

    /**
     * Đăng ký khách mới hoặc phụ huynh đón học sinh kèm TTL.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<VisitorRegistration>> registerVisitor(@Valid @RequestBody CreateVisitorRequest request) {
        VisitorRegistration registration = visitorService.registerVisitor(
                request.getFullName(),
                request.getPhoneNumber(),
                request.getVisitorType(),
                request.getTargetIdentityCode(),
                request.getValidFrom(),
                request.getValidTo(),
                request.getApprovedBy()
        );
        return ResponseEntity.ok(ApiResponse.<VisitorRegistration>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("visitor.register.success", "Đăng ký thông tin khách thành công"))
                .data(registration)
                .build());
    }

    /**
     * Lấy danh sách khách đang có hiệu lực phục vụ Portal Bốt Bảo vệ.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<VisitorRegistration>>> getActiveVisitors() {
        List<VisitorRegistration> visitors = visitorService.getActiveVisitors();
        return ResponseEntity.ok(ApiResponse.<List<VisitorRegistration>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("visitor.list.success", "Lấy danh sách khách hiệu lực thành công"))
                .data(visitors)
                .build());
    }

    /**
     * Thu hồi quyền ra vào của khách trước hạn.
     */
    @PostMapping("/{code}/revoke")
    public ResponseEntity<ApiResponse<Map<String, Object>>> revokeVisitor(@PathVariable String code) {
        boolean success = visitorService.revokeVisitor(code);
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("visitor.revoke.success", "Thu hồi quyền ra vào thành công"))
                .data(Map.of("visitorCode", code, "revoked", success))
                .build());
    }
}
