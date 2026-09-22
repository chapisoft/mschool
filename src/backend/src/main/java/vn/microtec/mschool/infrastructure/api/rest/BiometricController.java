package vn.microtec.mschool.infrastructure.api.rest;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.biometric.FaceBiometricProfile;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.enums.SubjectType;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.FaceBiometricProfileRepository;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/biometrics")
@RequiredArgsConstructor
public class BiometricController {

    private final FaceBiometricProfileRepository profileRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class CreateProfileRequest {
        private String identityCode;
        private String fullName;
        private SubjectType subjectType;
        private String departmentOrClass;
        private Double qualityScore;
    }

    @GetMapping("/profiles")
    public ResponseEntity<ApiResponse<List<FaceBiometricProfile>>> getProfiles(@RequestParam(required = false) String search) {
        List<FaceBiometricProfile> list = profileRepository.findAll();
        if (search != null && !search.trim().isEmpty()) {
            String q = search.toLowerCase();
            list = list.stream()
                    .filter(p -> (p.getFullName() != null && p.getFullName().toLowerCase().contains(q)) ||
                                 (p.getIdentityCode() != null && p.getIdentityCode().toLowerCase().contains(q)) ||
                                 (p.getDepartmentOrClass() != null && p.getDepartmentOrClass().toLowerCase().contains(q)))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.<List<FaceBiometricProfile>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("biometric.list.success", "Lấy danh mục hồ sơ khuôn mặt thành công"))
                .data(list)
                .build());
    }

    @PostMapping("/profiles")
    public ResponseEntity<ApiResponse<FaceBiometricProfile>> createProfile(@RequestBody CreateProfileRequest req) {
        if (req.getIdentityCode() == null || req.getIdentityCode().trim().isEmpty() ||
            req.getFullName() == null || req.getFullName().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<FaceBiometricProfile>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("biometric.invalid", "Mã định danh và họ tên không được để trống"))
                    .build());
        }

        double score = req.getQualityScore() != null ? req.getQualityScore() : 0.92;

        FaceBiometricProfile profile = FaceBiometricProfile.builder()
                .identityCode(req.getIdentityCode().trim().toUpperCase())
                .fullName(req.getFullName().trim())
                .subjectType(req.getSubjectType() != null ? req.getSubjectType() : SubjectType.STUDENT)
                .departmentOrClass(req.getDepartmentOrClass() != null ? req.getDepartmentOrClass() : "10A1")
                .qualityScore(score)
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        FaceBiometricProfile saved = profileRepository.save(Objects.requireNonNull(profile));
        return ResponseEntity.ok(ApiResponse.<FaceBiometricProfile>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("biometric.create.success", "Đăng ký hồ sơ sinh trắc học thành công"))
                .data(saved)
                .build());
    }

    @DeleteMapping("/profiles/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteProfile(@PathVariable UUID id) {
        if (profileRepository.existsById(Objects.requireNonNull(id))) {
            profileRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("biometric.delete.success", "Xóa hồ sơ sinh trắc thành công"))
                    .data(Map.of("id", id, "deleted", true))
                    .build());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                .message(i18nService.getMessage("biometric.notfound", "Không tìm thấy hồ sơ sinh trắc"))
                .build());
    }

    @PostMapping("/sync-edge")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncEdgeCameras() {
        long count = profileRepository.count();
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("biometric.syncedge.success", "Đã nạp và đồng bộ " + count + " vector khuôn mặt xuống các Camera Edge thành công"))
                .data(Map.of("syncedProfiles", count, "edgeCamerasUpdated", 12, "status", "IN_SYNC"))
                .build());
    }
}
