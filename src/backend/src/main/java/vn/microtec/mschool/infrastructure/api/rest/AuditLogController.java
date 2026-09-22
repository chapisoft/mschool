package vn.microtec.mschool.infrastructure.api.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.AuditLogService;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.audit.AuditLog;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final I18nService i18nService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs(
            @RequestParam(required = false) String schoolId) {
        UUID sId = (schoolId != null && !schoolId.trim().isEmpty()) ? UUID.fromString(schoolId) : null;
        List<AuditLog> logs = (sId != null) ? auditLogService.getAuditLogsBySchool(sId) : auditLogService.getAllAuditLogs();
        return ResponseEntity.ok(ApiResponse.<List<AuditLog>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("audit.list.success", "Tra cứu nhật ký kiểm toán thành công"))
                .data(logs)
                .build());
    }
}
