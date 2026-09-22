package vn.microtec.mschool.infrastructure.api.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.AttendanceOverrideService;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.OverrideReasonCategory;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance/records")
@RequiredArgsConstructor
public class AttendanceOverrideController {

    private final AttendanceOverrideService overrideService;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class OverrideRequest {
        @NotNull(message = "Vui lòng chỉ định trạng thái điểm danh mới")
        private AttendanceStatus newStatus;

        @NotNull(message = "Vui lòng chọn danh mục lý do giải trình")
        private OverrideReasonCategory reasonCategory;

        @NotNull(message = "Chi tiết lý do không được để trống")
        @Size(min = 10, max = 256, message = "Chi tiết lý do phải từ 10 đến 256 ký tự")
        private String reasonDetail;

        private String attachmentUri;
    }

    @PostMapping("/{id}/override")
    public ResponseEntity<ApiResponse<DailyAttendanceSession>> overrideAttendance(
            @PathVariable UUID id,
            @Valid @RequestBody OverrideRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "X-User-Name", required = false) String userNameHeader) {

        UUID operatorId = userIdHeader != null ? UUID.fromString(userIdHeader) : UUID.randomUUID();
        String operatorName = userNameHeader != null ? userNameHeader : "";

        try {
            DailyAttendanceSession updated = overrideService.executeOverride(
                    id,
                    request.getNewStatus(),
                    request.getReasonCategory().name(),
                    request.getReasonDetail(),
                    request.getAttachmentUri(),
                    operatorId,
                    operatorName
            );

            return ResponseEntity.ok(ApiResponse.<DailyAttendanceSession>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("attendance.override.success", "Điều chỉnh trạng thái điểm danh thành công"))
                    .data(updated)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<DailyAttendanceSession>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                    .message(e.getMessage())
                    .build());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.<DailyAttendanceSession>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ATT_ERR_SESSION_LOCKED.name())
                    .message(e.getMessage())
                    .build());
        }
    }
}
