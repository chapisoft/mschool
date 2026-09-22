package vn.microtec.mschool.infrastructure.api.rest;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.domain.biometric.FaceBiometricProfile;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.enums.SubjectType;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;
import vn.microtec.mschool.infrastructure.persistence.FaceBiometricProfileRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/open")
@RequiredArgsConstructor
public class OpenApiController {

    private final FaceBiometricProfileRepository biometricRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class SyncStudentProfileRequest {
        private String identityCode;
        private String fullName;
        private String className;
        private SubjectType subjectType;
    }

    /**
     * Cổng Open REST API: Đồng bộ danh mục học sinh/giáo viên từ VnEdu, SMAS, SIS nội bộ.
     */
    @PostMapping("/profiles/sync")
    public ResponseEntity<ApiResponse<FaceBiometricProfile>> syncProfile(@RequestBody SyncStudentProfileRequest request) {
        FaceBiometricProfile profile = biometricRepository.findByIdentityCode(request.getIdentityCode())
                .orElseGet(() -> FaceBiometricProfile.builder()
                        .identityCode(request.getIdentityCode())
                        .subjectType(request.getSubjectType())
                        .qualityScore(null)
                        .isActive(true)
                        .createdAt(OffsetDateTime.now())
                        .build());

        profile.setFullName(request.getFullName());
        profile.setDepartmentOrClass(request.getClassName());
        profile.setUpdatedAt(OffsetDateTime.now());

        FaceBiometricProfile saved = biometricRepository.save(Objects.requireNonNull(profile));

        return ResponseEntity.ok(ApiResponse.<FaceBiometricProfile>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("open.sync.success", "Đồng bộ hồ sơ thành công"))
                .data(saved)
                .build());
    }

    /**
     * Cổng Open REST API: Truy vấn dữ liệu chuyên cần học sinh theo ngày cho hệ thống SIS.
     */
    @GetMapping("/attendance/export")
    public ResponseEntity<ApiResponse<List<DailyAttendanceSession>>> exportDailyAttendance(@RequestParam String date) {
        LocalDate queryDate = LocalDate.parse(date);
        List<DailyAttendanceSession> records = attendanceRecordRepository.findBySessionDate(queryDate);
        return ResponseEntity.ok(ApiResponse.<List<DailyAttendanceSession>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("open.export.success", "Xuất dữ liệu chuyên cần thành công"))
                .data(records)
                .build());
    }
}
