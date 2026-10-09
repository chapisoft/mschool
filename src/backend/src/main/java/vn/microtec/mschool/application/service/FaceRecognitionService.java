package vn.microtec.mschool.application.service;

import vn.microtec.mschool.application.port.out.CameraDevicePort;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.domain.enums.SubjectType;
import vn.microtec.mschool.infrastructure.adapter.MiaiClientAdapter;
import vn.microtec.mschool.infrastructure.persistence.DeviceCameraRepository;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Dịch vụ nhận diện khuôn mặt cốt lõi (Core Face Recognition Engine).
 * Kết hợp mô hình UniFace/ArcFace 512-D của MIAI và tìm kiếm siêu tốc trên
 * pgvector PostgreSQL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FaceRecognitionService {

    private final MiaiClientAdapter miaiClientAdapter;
    private final JdbcTemplate jdbcTemplate;
    private final DeviceCameraRepository cameraRepository;
    private final CameraDevicePort cameraDevicePort;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateMatch {
        private String identityCode;
        private String fullName;
        private String departmentOrClass;
        private SubjectType subjectType;
        private Double similarity;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceRecognitionResult {
        private boolean matched;
        private String identityCode;
        private String fullName;
        private String departmentOrClass;
        private SubjectType subjectType;
        private Double similarity;
        private Double threshold;
        private Double qualityScore;
        private Double yaw;
        private Double pitch;
        private Map<String, Object> bbox;
        private Map<String, Object> normBbox;
        private List<Map<String, Object>> landmarks;
        private String feedbackCode;
        private String feedbackMessage;
        private List<CandidateMatch> topCandidates;
        private Double processingTimeMs;
        private String capturedImageBase64;
    }

    /**
     * Nhận diện khuôn mặt từ chuỗi hình ảnh Base64 theo luồng giám sát camera CCTV.
     * Chấp nhận khuôn mặt chuyển động nhanh, góc nghiêng đầu (Yaw lên tới 45 độ),
     * sử dụng mô hình AdaFace IR-50 trích xuất vector 512-D và so khớp trên PostgreSQL pgvector.
     *
     * @param imageBase64  Chuỗi ảnh Base64
     * @param minThreshold Ngưỡng tương đồng tối thiểu (mặc định 0.50 cho camera giám sát)
     * @return FaceRecognitionResult Kết quả nhận diện chi tiết kèm tọa độ chuẩn hóa và góc xoay
     */
    public FaceRecognitionResult recognizeFaceFromBase64(String imageBase64, Double minThreshold) {
        long startTime = System.currentTimeMillis();
        double threshold = (minThreshold != null && minThreshold > 0.1 && minThreshold < 1.0) ? minThreshold : 0.50;

        if (imageBase64 == null || imageBase64.trim().isEmpty()) {
            return FaceRecognitionResult.builder()
                    .matched(false)
                    .feedbackCode("IMAGE_EMPTY")
                    .feedbackMessage("Hình ảnh không được để trống")
                    .threshold(threshold)
                    .processingTimeMs(0.0)
                    .build();
        }

        // 1. Trích xuất đặc trưng và khuôn mặt qua pipeline giám sát CCTV (AdaFace + SCRFD)
        // Độ nhạy conf 0.25, chất lượng tối thiểu 0.15, hỗ trợ người bước nhanh không nhìn thẳng vào camera
        MiaiClientAdapter.SurveillanceRecognizeResponse aiResp =
                miaiClientAdapter.recognizeSurveillanceStream(imageBase64, 0.25, 0.15);

        if (aiResp == null || aiResp.getFaces() == null || aiResp.getFaces().isEmpty()) {
            double elapsed = System.currentTimeMillis() - startTime;
            return FaceRecognitionResult.builder()
                    .matched(false)
                    .qualityScore(0.0)
                    .feedbackCode("FACE_NOT_DETECTED")
                    .feedbackMessage("Không phát hiện khuôn mặt hợp lệ trong khung hình")
                    .threshold(threshold)
                    .processingTimeMs(elapsed)
                    .build();
        }

        // Ưu tiên khuôn mặt lớn nhất (gần camera nhất / trung tâm luồng di chuyển)
        MiaiClientAdapter.SurveillanceFaceItemDto primaryFace = aiResp.getFaces().get(0);

        Map<String, Object> normBbox = Map.of(
                "x1", primaryFace.getNormX1() != null ? primaryFace.getNormX1() : 0.0,
                "y1", primaryFace.getNormY1() != null ? primaryFace.getNormY1() : 0.0,
                "x2", primaryFace.getNormX2() != null ? primaryFace.getNormX2() : 0.0,
                "y2", primaryFace.getNormY2() != null ? primaryFace.getNormY2() : 0.0,
                "width", primaryFace.getNormW() != null ? primaryFace.getNormW() : 0.0,
                "height", primaryFace.getNormH() != null ? primaryFace.getNormH() : 0.0
        );

        if (primaryFace.getEmbedding() == null || primaryFace.getEmbedding().isEmpty()) {
            double elapsed = System.currentTimeMillis() - startTime;
            return FaceRecognitionResult.builder()
                    .matched(false)
                    .qualityScore(primaryFace.getQualityScore())
                    .yaw(primaryFace.getYaw())
                    .pitch(primaryFace.getPitch())
                    .bbox(primaryFace.getBbox())
                    .normBbox(normBbox)
                    .landmarks(primaryFace.getLandmarks())
                    .feedbackCode("FACE_TOO_BLURRED")
                    .feedbackMessage(String.format("Khuôn mặt quá mờ để nhận diện (chất lượng %.0f%%)", primaryFace.getQualityScore() * 100))
                    .threshold(threshold)
                    .processingTimeMs(elapsed)
                    .build();
        }

        // 2. Định dạng vector 512-D cho pgvector PostgreSQL
        String vectorStr = formatVector(primaryFace.getEmbedding(), 512);

        // 3. Thực thi tìm kiếm Cosine Similarity trên pgvector đa góc (Primary, Left, Right)
        List<CandidateMatch> candidates = new ArrayList<>();
        try {
            String sql = "SELECT identity_code, full_name, department_or_class, subject_type, quality_score, " +
                    "       GREATEST( " +
                    "           1.0 - (embedding_primary <=> ?::vector), " +
                    "           CASE WHEN embedding_left IS NOT NULL THEN (1.0 - (embedding_left <=> ?::vector)) ELSE -1.0 END, " +
                    "           CASE WHEN embedding_right IS NOT NULL THEN (1.0 - (embedding_right <=> ?::vector)) ELSE -1.0 END " +
                    "       ) as similarity " +
                    "FROM face_biometric_profiles " +
                    "WHERE (is_active = true OR is_active IS NULL) " +
                    "  AND (is_deleted = false OR is_deleted IS NULL) " +
                    "  AND (embedding_primary IS NOT NULL OR embedding_left IS NOT NULL OR embedding_right IS NOT NULL) " +
                    "ORDER BY similarity DESC " +
                    "LIMIT 5";

            candidates = jdbcTemplate.query(sql, (rs, rowNum) -> {
                String subTypeStr = rs.getString("subject_type");
                SubjectType subType = SubjectType.STUDENT;
                if (subTypeStr != null) {
                    try {
                        subType = SubjectType.valueOf(subTypeStr);
                    } catch (Exception ignored) {
                    }
                }
                return CandidateMatch.builder()
                        .identityCode(rs.getString("identity_code"))
                        .fullName(rs.getString("full_name"))
                        .departmentOrClass(rs.getString("department_or_class"))
                        .subjectType(subType)
                        .similarity(rs.getDouble("similarity"))
                        .build();
            }, vectorStr, vectorStr, vectorStr);

            if (!candidates.isEmpty()) {
                log.info("KẾT QUẢ SO KHỚP PGVECTOR: Tìm thấy {} ứng viên (Ứng viên số 1: {} - {:.1f}%)",
                        candidates.size(),
                        candidates.get(0).getFullName(),
                        candidates.get(0).getSimilarity() * 100);
            }

        } catch (Exception e) {
            log.error("Lỗi truy vấn tìm kiếm vector trong pgvector: {}", e.getMessage(), e);
        }

        double totalElapsed = System.currentTimeMillis() - startTime;

        // 4. Đánh giá ứng viên tốt nhất so với ngưỡng threshold
        if (!candidates.isEmpty()) {
            CandidateMatch best = candidates.get(0);
            double bestSim = best.getSimilarity() != null ? best.getSimilarity() : 0.0;

            if (bestSim >= threshold) {
                // Tự động thích ứng học đa góc (Adaptive Multi-Pose Auto Enrollment)
                try {
                    double yaw = primaryFace.getYaw() != null ? primaryFace.getYaw() : 0.0;
                    double faceQuality = primaryFace.getQualityScore() != null ? primaryFace.getQualityScore() : 0.0;
                    if (faceQuality >= 0.25) {
                        if (yaw < -8.0) {
                            jdbcTemplate.update(
                                    "UPDATE face_biometric_profiles SET embedding_left = ?::vector, updated_at = CURRENT_TIMESTAMP " +
                                            "WHERE identity_code = ? AND (embedding_left IS NULL OR ? > quality_score)",
                                    vectorStr, best.getIdentityCode(), faceQuality);
                        } else if (yaw > 8.0) {
                            jdbcTemplate.update(
                                    "UPDATE face_biometric_profiles SET embedding_right = ?::vector, updated_at = CURRENT_TIMESTAMP " +
                                            "WHERE identity_code = ? AND (embedding_right IS NULL OR ? > quality_score)",
                                    vectorStr, best.getIdentityCode(), faceQuality);
                        } else {
                            String cleanBase64 = imageBase64;
                            if (cleanBase64.contains(",")) {
                                cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                            }
                            jdbcTemplate.update(
                                    "UPDATE face_biometric_profiles SET photo_straight = COALESCE(NULLIF(photo_straight, ''), ?), " +
                                            "quality_score = GREATEST(quality_score, ?), updated_at = CURRENT_TIMESTAMP " +
                                            "WHERE identity_code = ? AND (photo_straight IS NULL OR length(photo_straight) < 10000)",
                                    cleanBase64, faceQuality, best.getIdentityCode());
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Lỗi cập nhật học đa góc tự động cho hồ sơ {}: {}", best.getIdentityCode(), ex.getMessage());
                }

                return FaceRecognitionResult.builder()
                        .matched(true)
                        .identityCode(best.getIdentityCode())
                        .fullName(best.getFullName())
                        .departmentOrClass(best.getDepartmentOrClass())
                        .subjectType(best.getSubjectType())
                        .similarity(bestSim)
                        .threshold(threshold)
                        .qualityScore(primaryFace.getQualityScore())
                        .yaw(primaryFace.getYaw())
                        .pitch(primaryFace.getPitch())
                        .bbox(primaryFace.getBbox())
                        .normBbox(normBbox)
                        .landmarks(primaryFace.getLandmarks())
                        .feedbackCode("MATCH_SUCCESS")
                        .feedbackMessage(String.format("Xác thực thành công: %s (%s) · Lớp: %s · Tương đồng: %.1f%%",
                                best.getFullName(), best.getIdentityCode(), best.getDepartmentOrClass(), bestSim * 100))
                        .topCandidates(candidates)
                        .processingTimeMs(totalElapsed)
                        .build();
            } else {
                return FaceRecognitionResult.builder()
                        .matched(false)
                        .identityCode(null)
                        .fullName("Người lạ / Chưa đăng ký")
                        .departmentOrClass("--")
                        .subjectType(SubjectType.STRANGER)
                        .similarity(bestSim)
                        .threshold(threshold)
                        .qualityScore(primaryFace.getQualityScore())
                        .yaw(primaryFace.getYaw())
                        .pitch(primaryFace.getPitch())
                        .bbox(primaryFace.getBbox())
                        .normBbox(normBbox)
                        .landmarks(primaryFace.getLandmarks())
                        .feedbackCode("STRANGER_DETECTED")
                        .feedbackMessage(String.format(
                                "Chưa khớp hồ sơ nào đạt ngưỡng %.0f%% (Gần nhất: %s với %.1f%% · Góc quay: %.1f°)",
                                threshold * 100, best.getFullName(), bestSim * 100, primaryFace.getYaw()))
                        .topCandidates(candidates)
                        .processingTimeMs(totalElapsed)
                        .build();
            }
        }

        return FaceRecognitionResult.builder()
                .matched(false)
                .subjectType(SubjectType.STRANGER)
                .threshold(threshold)
                .qualityScore(primaryFace.getQualityScore())
                .yaw(primaryFace.getYaw())
                .pitch(primaryFace.getPitch())
                .bbox(primaryFace.getBbox())
                .normBbox(normBbox)
                .landmarks(primaryFace.getLandmarks())
                .feedbackCode("NO_PROFILES_AVAILABLE")
                .feedbackMessage("Chưa có hồ sơ sinh trắc học nào trong cơ sở dữ liệu")
                .topCandidates(Collections.emptyList())
                .processingTimeMs(totalElapsed)
                .build();
    }

    /**
     * Bắt khung hình trực tiếp từ Camera IP và tiến hành nhận diện.
     */
    public FaceRecognitionResult recognizeFaceFromCamera(String cameraId, Double minThreshold) {
        byte[] frameBytes = captureCameraFrame(cameraId);
        if (frameBytes == null || frameBytes.length == 0) {
            return FaceRecognitionResult.builder()
                    .matched(false)
                    .feedbackCode("CAMERA_CAPTURE_FAILED")
                    .feedbackMessage("Không thể trích xuất khung hình từ camera " + cameraId)
                    .threshold(minThreshold != null ? minThreshold : 0.50)
                    .processingTimeMs(0.0)
                    .build();
        }

        String base64Image = Base64.getEncoder().encodeToString(frameBytes);
        FaceRecognitionResult result = recognizeFaceFromBase64(base64Image, minThreshold);
        result.setCapturedImageBase64("data:image/jpeg;base64," + base64Image);
        return result;
    }

    /**
     * Trích xuất khung hình JPEG từ Camera qua CameraDevicePort.
     */
    public byte[] captureCameraFrame(String cameraId) {
        DeviceCamera cam = cameraRepository.findById(cameraId).orElse(null);
        if (cam == null) {
            log.warn("Không thể chụp ảnh: Camera {} không tồn tại trong hệ thống", cameraId);
            return null;
        }
        return cameraDevicePort.captureFrame(cam);
    }

    private String formatVector(List<Double> list, int expectedDimension) {
        if (list == null || list.isEmpty()) {
            return "[" + String.join(",", Collections.nCopies(expectedDimension, "0.0")) + "]";
        }
        List<Double> sub = new ArrayList<>(list);
        while (sub.size() < expectedDimension) {
            sub.add(0.0);
        }
        if (sub.size() > expectedDimension) {
            sub = sub.subList(0, expectedDimension);
        }
        return "[" + sub.stream().map(Objects::toString).collect(Collectors.joining(",")) + "]";
    }
}
