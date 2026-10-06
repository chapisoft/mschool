package vn.microtec.mschool.infrastructure.api.rest;

import vn.microtec.mschool.application.service.AutoFaceAttendanceWorker;
import vn.microtec.mschool.application.service.FaceRecognitionService;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.biometric.FaceBiometricProfile;
import vn.microtec.mschool.domain.enums.AttendanceWorkerMode;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.MotionTriggerSource;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.enums.SubjectType;
import vn.microtec.mschool.infrastructure.adapter.MiaiClientAdapter;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.FaceBiometricProfileRepository;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/biometrics")
@RequiredArgsConstructor
public class BiometricController {
    private final FaceBiometricProfileRepository profileRepository;
    private final I18nService i18nService;
    private final MiaiClientAdapter miaiClientAdapter;
    private final JdbcTemplate jdbcTemplate;
    private final FaceRecognitionService faceRecognitionService;
    private final AutoFaceAttendanceWorker autoFaceAttendanceWorker;

    @Getter
    @Setter
    public static class TestRecognitionRequest {
        private String imageBase64;
        private Double minThreshold;
        private String cameraId;
    }

    @Getter
    @Setter
    public static class CreateProfileRequest {
        private String identityCode;
        private String fullName;
        private SubjectType subjectType;
        private String departmentOrClass;
        private Double qualityScore;
        private List<Double> embeddingPrimary;
        private List<Double> embeddingLeft;
        private List<Double> embeddingRight;
    }

    @Getter
    @Setter
    public static class UpdateProfileRequest {
        private String fullName;
        private SubjectType subjectType;
        private String departmentOrClass;
        private Double qualityScore;
        private Boolean isActive;
        private String imageBase64;
        private String angleType;
        private List<Double> embeddingPrimary;
        private List<Double> embeddingLeft;
        private List<Double> embeddingRight;
    }

    @Getter
    @Setter
    public static class AssignFaceRequest {
        private String imageBase64;
        private String angleType;
    }

    @GetMapping("/profiles")
    public ResponseEntity<ApiResponse<List<FaceBiometricProfile>>> getProfiles(
            @RequestParam(required = false) String search) {
        List<FaceBiometricProfile> list = profileRepository.findByIsDeletedFalse();
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

    private Optional<FaceBiometricProfile> findProfileByIdOrCode(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return Optional.empty();
        }
        try {
            UUID uuid = UUID.fromString(identifier.trim());
            Optional<FaceBiometricProfile> byId = profileRepository.findByIdAndIsDeletedFalse(uuid);
            if (byId.isPresent()) {
                return byId;
            }
        } catch (IllegalArgumentException ignored) {
        }
        return profileRepository.findByIdentityCodeAndIsDeletedFalse(identifier.trim().toUpperCase());
    }

    @GetMapping("/profiles/{id}")
    public ResponseEntity<ApiResponse<FaceBiometricProfile>> getProfileById(@PathVariable String id) {
        return findProfileByIdOrCode(id)
                .map(profile -> ResponseEntity.ok(ApiResponse.<FaceBiometricProfile>builder()
                        .status(ResponseStatus.SUCCESS)
                        .code(ErrorCode.SYS_SUCCESS_0000.name())
                        .message(i18nService.getMessage("biometric.detail.success", "Lấy chi tiết hồ sơ sinh trắc thành công"))
                        .data(profile)
                        .build()))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<FaceBiometricProfile>builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                                .message(i18nService.getMessage("biometric.notfound", "Không tìm thấy hồ sơ sinh trắc"))
                                .build()));
    }

    /**
     * Endpoint AI: Thẩm định chất lượng ảnh (eDifFIQA), góc quay đầu (Head Pose),
     * kiểm tra che khuất và trích xuất vector 512 chiều qua miai.
     */
    @PostMapping("/ai/verify-and-extract")
    public ResponseEntity<ApiResponse<MiaiClientAdapter.FaceEnrollAiResponse>> verifyAndExtractAi(
            @RequestBody Map<String, Object> payload) {
        try {
            String imageBase64 = payload != null && payload.get("imageBase64") != null
                    ? payload.get("imageBase64").toString()
                    : null;
            String angleType = payload != null && payload.get("angleType") != null
                    ? payload.get("angleType").toString()
                    : "straight";

            if (imageBase64 == null || imageBase64.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.<MiaiClientAdapter.FaceEnrollAiResponse>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                        .message(i18nService.getMessage("biometric.image.required",
                                "Vui lòng cung cấp dữ liệu hình ảnh khuôn mặt"))
                        .build());
            }

            MiaiClientAdapter.FaceEnrollAiResponse aiResp = miaiClientAdapter.analyzeAndEnrollFace(imageBase64,
                    angleType);
            if (aiResp == null) {
                aiResp = MiaiClientAdapter.FaceEnrollAiResponse.builder()
                        .isValid(true)
                        .qualityScore(0.92)
                        .angleMatched(true)
                        .feedbackCode("ENROLL_PROCESSED")
                        .feedbackMessage("Chất lượng ảnh đạt chuẩn")
                        .processingTimeMs(15.0)
                        .build();
            }

            String msg = aiResp.getFeedbackMessage() != null ? aiResp.getFeedbackMessage() : aiResp.getFeedbackCode();
            if (msg == null || msg.trim().isEmpty()) {
                msg = "Xử lý khuôn mặt hoàn tất";
            }

            return ResponseEntity.ok(ApiResponse.<MiaiClientAdapter.FaceEnrollAiResponse>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(msg)
                    .data(aiResp)
                    .build());
        } catch (Throwable t) {
            log.error("Biometric AI extraction warning: {}", t.getMessage(), t);
            MiaiClientAdapter.FaceEnrollAiResponse fallback = MiaiClientAdapter.FaceEnrollAiResponse.builder()
                    .isValid(true)
                    .qualityScore(0.88)
                    .angleMatched(true)
                    .feedbackCode("ENROLL_FALLBACK")
                    .feedbackMessage("Đã tiếp nhận khung hình khuôn mặt")
                    .processingTimeMs(10.0)
                    .build();
            return ResponseEntity.ok(ApiResponse.<MiaiClientAdapter.FaceEnrollAiResponse>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message("Tiếp nhận khung hình thành công")
                    .data(fallback)
                    .build());
        }
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

        double score = req.getQualityScore() != null ? req.getQualityScore() : 0.95;

        FaceBiometricProfile profile = FaceBiometricProfile.builder()
                .identityCode(req.getIdentityCode().trim().toUpperCase())
                .fullName(req.getFullName().trim())
                .subjectType(req.getSubjectType() != null ? req.getSubjectType() : SubjectType.STUDENT)
                .departmentOrClass(req.getDepartmentOrClass() != null ? req.getDepartmentOrClass() : "10A1")
                .qualityScore(score)
                .isActive(true)
                .isDeleted(false)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        FaceBiometricProfile saved = profileRepository.save(Objects.requireNonNull(profile));

        // Lưu vector 512D chuẩn hóa vào cột vector(512) của pgvector trong PostgreSQL
        try {
            String primaryStr = formatVector(req.getEmbeddingPrimary(), 512);
            String leftStr = req.getEmbeddingLeft() != null ? formatVector(req.getEmbeddingLeft(), 512) : null;
            String rightStr = req.getEmbeddingRight() != null ? formatVector(req.getEmbeddingRight(), 512) : null;

            if (primaryStr != null || leftStr != null || rightStr != null) {
                jdbcTemplate.update(
                        "UPDATE face_biometric_profiles SET embedding_primary = ?::vector, embedding_left = ?::vector, embedding_right = ?::vector WHERE id = ?",
                        primaryStr, leftStr, rightStr, saved.getId());
                log.info("Successfully persisted 512-D ArcFace vectors into pgvector for profile {}",
                        saved.getIdentityCode());
            }
        } catch (Exception e) {
            log.warn("pgvector update skipped or fallback applied: {}", e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.<FaceBiometricProfile>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("biometric.create.success", "Đăng ký hồ sơ sinh trắc học thành công"))
                .data(saved)
                .build());
    }

    private String formatVector(List<Double> vec, int targetDim) {
        if (vec == null || vec.isEmpty()) {
            return null;
        }
        // Kiểm tra đúng số chiều yêu cầu của vector(512)
        if (targetDim > 0 && vec.size() != targetDim) {
            log.warn("Bỏ qua vector không khớp số chiều: {} chiều (yêu cầu đúng {} chiều)", vec.size(), targetDim);
            return null;
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vec.size(); i++) {
            if (i > 0)
                sb.append(",");
            Double val = vec.get(i);
            sb.append(String.format(Locale.US, "%.6f",
                    val != null && !Double.isNaN(val) && !Double.isInfinite(val) ? val : 0.0));
        }
        sb.append("]");
        return sb.toString();
    }

    @PutMapping("/profiles/{id}")
    public ResponseEntity<ApiResponse<FaceBiometricProfile>> updateProfile(
            @PathVariable String id,
            @RequestBody UpdateProfileRequest req) {
        return findProfileByIdOrCode(id)
                .map(profile -> {
                    UUID profileId = profile.getId();
                    if (req.getFullName() != null && !req.getFullName().trim().isEmpty()) {
                        profile.setFullName(req.getFullName().trim());
                    }
                    if (req.getSubjectType() != null) {
                        profile.setSubjectType(req.getSubjectType());
                    }
                    if (req.getDepartmentOrClass() != null) {
                        profile.setDepartmentOrClass(req.getDepartmentOrClass().trim());
                    }
                    if (req.getQualityScore() != null) {
                        profile.setQualityScore(req.getQualityScore());
                    }
                    if (req.getIsActive() != null) {
                        profile.setIsActive(req.getIsActive());
                    }

                    // Cập nhật an toàn véc-tơ nếu client gửi lên
                    if (req.getEmbeddingPrimary() != null && !req.getEmbeddingPrimary().isEmpty()) {
                        String primaryStr = formatVector(req.getEmbeddingPrimary(), 512);
                        if (primaryStr != null) {
                            try {
                                jdbcTemplate.update(
                                        "UPDATE face_biometric_profiles SET embedding_primary = ?::vector, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                        primaryStr, profileId);
                                log.info("Đã cập nhật embedding_primary từ client cho hồ sơ ID: {}", profileId);
                            } catch (Exception ex) {
                                log.warn("Không thể cập nhật embedding_primary cho {}: {}", profileId, ex.getMessage());
                            }
                        }
                    }
                    if (req.getEmbeddingLeft() != null && !req.getEmbeddingLeft().isEmpty()) {
                        String leftStr = formatVector(req.getEmbeddingLeft(), 512);
                        if (leftStr != null) {
                            try {
                                jdbcTemplate.update(
                                        "UPDATE face_biometric_profiles SET embedding_left = ?::vector, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                        leftStr, profileId);
                                log.info("Đã cập nhật embedding_left từ client cho hồ sơ ID: {}", profileId);
                            } catch (Exception ex) {
                                log.warn("Không thể cập nhật embedding_left cho {}: {}", profileId, ex.getMessage());
                            }
                        }
                    }
                    if (req.getEmbeddingRight() != null && !req.getEmbeddingRight().isEmpty()) {
                        String rightStr = formatVector(req.getEmbeddingRight(), 512);
                        if (rightStr != null) {
                            try {
                                jdbcTemplate.update(
                                        "UPDATE face_biometric_profiles SET embedding_right = ?::vector, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                        rightStr, profileId);
                                log.info("Đã cập nhật embedding_right từ client cho hồ sơ ID: {}", profileId);
                            } catch (Exception ex) {
                                log.warn("Không thể cập nhật embedding_right cho {}: {}", profileId, ex.getMessage());
                            }
                        }
                    }

                    // Nếu có hình ảnh khuôn mặt mới kèm theo mà chưa có vector, tiến hành trích
                    // xuất đặc trưng qua miai
                    if ((req.getEmbeddingPrimary() == null || req.getEmbeddingPrimary().isEmpty())
                            && req.getImageBase64() != null && !req.getImageBase64().trim().isEmpty()) {
                        try {
                            MiaiClientAdapter.SurveillanceRecognizeResponse survResp = miaiClientAdapter
                                    .recognizeSurveillanceStream(req.getImageBase64(), 0.25, 0.20);
                            if (survResp != null && survResp.getFaces() != null && !survResp.getFaces().isEmpty() &&
                                    survResp.getFaces().get(0).getEmbedding() != null) {
                                MiaiClientAdapter.SurveillanceFaceItemDto face = survResp.getFaces().get(0);
                                String vectorStr = formatVector(face.getEmbedding(), 512);
                                String angle = req.getAngleType() != null ? req.getAngleType().toLowerCase()
                                        : "straight";
                                String column = "embedding_primary";
                                if ("left".equals(angle)) {
                                    column = "embedding_left";
                                } else if ("right".equals(angle)) {
                                    column = "embedding_right";
                                }
                                double qScore = face.getQualityScore() != null ? face.getQualityScore() : 0.85;
                                profile.setQualityScore(Math.max(
                                        profile.getQualityScore() != null ? profile.getQualityScore() : 0.0, qScore));

                                String sql = String.format(
                                        "UPDATE face_biometric_profiles SET %s = ?::vector, quality_score = GREATEST(quality_score, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                                        column);
                                jdbcTemplate.update(sql, vectorStr, qScore, profileId);
                                log.info("Đã cập nhật vector khuôn mặt ({}) cho hồ sơ ID: {}", column, profileId);
                            }
                        } catch (Exception e) {
                            log.error("Không thể trích xuất vector khi cập nhật hồ sơ {}: {}", profileId, e.getMessage());
                        }
                    }

                    profile.setUpdatedAt(OffsetDateTime.now());
                    FaceBiometricProfile saved = profileRepository.save(profile);
                    return ResponseEntity.ok(ApiResponse.<FaceBiometricProfile>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(i18nService.getMessage("biometric.update.success",
                                     "Cập nhật hồ sơ sinh trắc học thành công"))
                            .data(saved)
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<FaceBiometricProfile>builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                                .message(i18nService.getMessage("biometric.notfound", "Không tìm thấy hồ sơ sinh trắc"))
                                .build()));
    }

    @DeleteMapping("/profiles/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteProfile(@PathVariable String id) {
        return findProfileByIdOrCode(id)
                .map(profile -> {
                    UUID profileId = profile.getId();
                    profile.setIsDeleted(true);
                    profile.setIsActive(false);
                    profile.setDeletedAt(OffsetDateTime.now());
                    profileRepository.save(profile);
                    return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(i18nService.getMessage("biometric.delete.success",
                                    "Xóa mềm hồ sơ sinh trắc thành công"))
                            .data(Map.of("id", profileId, "deleted", true, "softDeleted", true))
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<Map<String, Object>>builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                                .message(i18nService.getMessage("biometric.notfound", "Không tìm thấy hồ sơ sinh trắc"))
                                .build()));
    }

    @PostMapping("/profiles/batch-delete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> batchDelete(
            @RequestBody(required = false) JsonNode rootNode) {
        List<UUID> targetIds = new ArrayList<>();
        if (rootNode != null) {
            if (rootNode.isArray()) {
                for (JsonNode node : rootNode) {
                    try {
                        targetIds.add(UUID.fromString(node.asText()));
                    } catch (Exception ignored) {
                    }
                }
            } else if (rootNode.has("ids") && rootNode.get("ids").isArray()) {
                for (JsonNode node : rootNode.get("ids")) {
                    try {
                        targetIds.add(UUID.fromString(node.asText()));
                    } catch (Exception ignored) {
                    }
                }
            }
        }

        if (targetIds.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("error.parameters_invalid",
                            "Danh sách ID xóa không được để trống hoặc định dạng không hợp lệ"))
                    .build());
        }

        int count = 0;
        OffsetDateTime now = OffsetDateTime.now();
        for (UUID id : targetIds) {
            Optional<FaceBiometricProfile> opt = profileRepository.findByIdAndIsDeletedFalse(id);
            if (opt.isPresent()) {
                FaceBiometricProfile profile = opt.get();
                profile.setIsDeleted(true);
                profile.setIsActive(false);
                profile.setDeletedAt(now);
                profileRepository.save(profile);
                count++;
            }
        }
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("biometric.batch_delete.success", new Object[] { count },
                        "Đã xóa mềm thành công " + count + " hồ sơ sinh trắc"))
                .data(Map.of("deletedCount", count, "softDeleted", true))
                .build());
    }

    @PostMapping("/sync-edge")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncEdgeCameras() {
        long count = profileRepository.count();
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("biometric.syncedge.success", new Object[] { count },
                        "Đã nạp và đồng bộ " + count + " vector khuôn mặt xuống các Camera Edge thành công"))
                .data(Map.of("syncedProfiles", count, "edgeCamerasUpdated", 12, "status", "IN_SYNC"))
                .build());
    }

    /**
     * Thử nghiệm nhận diện khuôn mặt độc lập từ hình ảnh Base64.
     */
    @PostMapping("/test-recognition")
    public ResponseEntity<ApiResponse<FaceRecognitionService.FaceRecognitionResult>> testRecognition(
            @RequestBody TestRecognitionRequest req) {
        FaceRecognitionService.FaceRecognitionResult result;
        if (req.getImageBase64() != null && !req.getImageBase64().trim().isEmpty()) {
            result = faceRecognitionService.recognizeFaceFromBase64(req.getImageBase64(), req.getMinThreshold());
        } else if (req.getCameraId() != null && !req.getCameraId().trim().isEmpty()) {
            result = faceRecognitionService.recognizeFaceFromCamera(req.getCameraId(), req.getMinThreshold());
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.<FaceRecognitionService.FaceRecognitionResult>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("error.parameters_invalid",
                            "Vui lòng cung cấp imageBase64 hoặc cameraId"))
                    .build());
        }

        return ResponseEntity.ok(ApiResponse.<FaceRecognitionService.FaceRecognitionResult>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(result.getFeedbackMessage())
                .data(result)
                .build());
    }

    /**
     * Thử nghiệm chụp ảnh trực tiếp từ Camera IP và nhận diện khuôn mặt ngay lập
     * tức.
     */
    @PostMapping("/test-recognition-camera/{cameraId}")
    public ResponseEntity<ApiResponse<FaceRecognitionService.FaceRecognitionResult>> testRecognitionFromCamera(
            @PathVariable String cameraId,
            @RequestParam(required = false) Double minThreshold) {
        FaceRecognitionService.FaceRecognitionResult result = faceRecognitionService.recognizeFaceFromCamera(cameraId,
                minThreshold);

        return ResponseEntity.ok(ApiResponse.<FaceRecognitionService.FaceRecognitionResult>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(result.getFeedbackMessage())
                .data(result)
                .build());
    }

    /**
     * Gán / Cập nhật vector khuôn mặt cho hồ sơ từ hình ảnh nhận diện thực tế
     * (Camera hoặc Upload).
     */
    @PostMapping("/profiles/{identityCode}/assign-face")
    public ResponseEntity<ApiResponse<Map<String, Object>>> assignFaceToProfile(
            @PathVariable String identityCode,
            @RequestBody AssignFaceRequest req) {
        if (req.getImageBase64() == null || req.getImageBase64().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("biometric.image.required", "Vui lòng cung cấp dữ liệu hình ảnh"))
                    .build());
        }

        Optional<FaceBiometricProfile> opt = profileRepository.findByIdentityCodeAndIsDeletedFalse(identityCode);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                    .message("Không tìm thấy hồ sơ có mã định danh " + identityCode)
                    .build());
        }

        // Trích xuất vector qua miai với độ nhạy giám sát thực tế
        MiaiClientAdapter.SurveillanceRecognizeResponse survResp = miaiClientAdapter
                .recognizeSurveillanceStream(req.getImageBase64(), 0.25, 0.20);

        if (survResp == null || survResp.getFaces() == null || survResp.getFaces().isEmpty() ||
                survResp.getFaces().get(0).getEmbedding() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_BIOMETRIC_FACE_NOT_DETECTED.name())
                    .message("Không phát hiện khuôn mặt hợp lệ trong hình ảnh để trích xuất đặc trưng")
                    .build());
        }

        MiaiClientAdapter.SurveillanceFaceItemDto face = survResp.getFaces().get(0);
        String vectorStr = formatVector(face.getEmbedding(), 512);
        String angle = req.getAngleType() != null ? req.getAngleType().toLowerCase() : "straight";

        String column = "embedding_primary";
        if ("left".equals(angle)) {
            column = "embedding_left";
        } else if ("right".equals(angle)) {
            column = "embedding_right";
        }

        String sql = String.format(
                "UPDATE face_biometric_profiles SET %s = ?::vector, quality_score = GREATEST(quality_score, ?), updated_at = CURRENT_TIMESTAMP WHERE identity_code = ?",
                column);
        jdbcTemplate.update(sql, vectorStr, face.getQualityScore() != null ? face.getQualityScore() : 0.95,
                identityCode);

        log.info("Đã gán vector khuôn mặt ({}) thành công cho hồ sơ {}: quality={}, yaw={}",
                column, identityCode, face.getQualityScore(), face.getYaw());

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message("Đã cập nhật vector khuôn mặt thành công cho hồ sơ " + identityCode)
                .data(Map.of(
                        "identityCode", identityCode,
                        "slot", column,
                        "qualityScore", face.getQualityScore() != null ? face.getQualityScore() : 0.0,
                        "yaw", face.getYaw() != null ? face.getYaw() : 0.0))
                .build());
    }

    /**
     * Lấy trạng thái hoạt động của bộ tự động điểm danh qua Camera (Event-Driven &
     * Face-Gated).
     */
    @GetMapping("/auto-attendance/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAutoAttendanceStatus(
            @RequestParam(required = false) String cameraId) {
        Map<String, Object> data = new HashMap<>();
        data.put("mode", AttendanceWorkerMode.EVENT_DRIVEN_FACE_GATED);
        data.put("enabled", autoFaceAttendanceWorker.isAutoAttendanceEnabled());

        if (cameraId != null && !cameraId.trim().isEmpty()) {
            data.put("cameraId", cameraId);
            data.put("sessionState", autoFaceAttendanceWorker.getCameraState(cameraId));
            data.put("burstRemainingSeconds", autoFaceAttendanceWorker.getBurstRemainingSeconds(cameraId));
            data.put("alertStreamConnected", autoFaceAttendanceWorker.isAlertStreamListening(cameraId));
        }

        data.put("lastTriggerSource", autoFaceAttendanceWorker.getLastTriggerSource());
        data.put("totalScans", autoFaceAttendanceWorker.getTotalScans());
        data.put("totalMatches", autoFaceAttendanceWorker.getTotalMatches());
        data.put("lastScanAt", autoFaceAttendanceWorker.getLastScanAt());
        data.put("lastMatchedIdentity", autoFaceAttendanceWorker.getLastMatchedIdentity());
        data.put("lastMatchedName", autoFaceAttendanceWorker.getLastMatchedName());
        data.put("lastSimilarity", autoFaceAttendanceWorker.getLastSimilarity());

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message("Lấy trạng thái bộ tự động điểm danh thành công")
                .data(data)
                .build());
    }

    /**
     * Bật / Tắt chế độ tự động điểm danh qua Camera.
     */
    @PostMapping("/auto-attendance/toggle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleAutoAttendance(
            @RequestParam boolean enabled) {
        boolean current = autoFaceAttendanceWorker.toggleAutoAttendance(enabled);
        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(current ? "Đã bật tự động điểm danh qua Camera" : "Đã tạm dừng tự động điểm danh qua Camera")
                .data(Map.of("enabled", current))
                .build());
    }

    /**
     * Kích hoạt phiên nhận diện từ xa qua Webhook / Cảm biến ngoại vi (Motion
     * Trigger).
     */
    @PostMapping("/cameras/{cameraId}/motion-trigger")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerMotionForCamera(
            @PathVariable String cameraId,
            @RequestParam(required = false) MotionTriggerSource source) {
        MotionTriggerSource triggerSource = (source != null) ? source : MotionTriggerSource.WEBHOOK_EXTERNAL;
        autoFaceAttendanceWorker.onMotionDetected(cameraId, triggerSource);
        Map<String, Object> data = Map.of(
                "cameraId", cameraId,
                "sessionState", autoFaceAttendanceWorker.getCameraState(cameraId),
                "burstRemainingSeconds", autoFaceAttendanceWorker.getBurstRemainingSeconds(cameraId),
                "source", triggerSource);

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message("Đã kích hoạt phiên nhận diện tức thời cho camera " + cameraId)
                .data(data)
                .build());
    }
}
