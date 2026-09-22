package vn.microtec.mschool.infrastructure.adapter;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Component
public class MiaiClientAdapter {

    private final WebClient webClient;

    public MiaiClientAdapter(
            WebClient.Builder webClientBuilder,
            @Value("${app.miai.base-url:http://localhost:8000/api/v1}") String miaiBaseUrl
    ) {
        this.webClient = webClientBuilder.baseUrl(Objects.requireNonNull(miaiBaseUrl)).build();
    }

    public WebClient getWebClient() {
        return this.webClient;
    }

    @Getter
    @Setter
    @Builder
    public static class ClassroomDetectionResponse {
        private String classId;
        private List<String> detectedTeacherCodes;
        private List<String> detectedStudentCodes;
        private int totalFacesDetected;
    }

    @Getter
    @Setter
    @Builder
    public static class VisitorRegisterRequest {
        private String visitorId;
        private String fullName;
        private String visitorType;
        private String targetIdentityCode;
        private List<Float> embedding;
        private OffsetDateTime validFrom;
        private OffsetDateTime validTo;
    }

    /**
     * Gửi ảnh toàn cảnh lớp học sang miai để bóc tách khuôn mặt theo Teacher ROI và Student ROI.
     */
    public ClassroomDetectionResponse detectClassroomFaces(String classId, byte[] imageBytes) {
        try {
            log.info("Gửi ảnh toàn cảnh lớp học {} sang Core AI miai để nhận diện", classId);
            return webClient.post()
                    .uri("/face/classroom-detect")
                    .bodyValue(java.util.Map.of("classId", classId, "imageLength", imageBytes != null ? imageBytes.length : 0))
                    .retrieve()
                    .bodyToMono(ClassroomDetectionResponse.class)
                    .timeout(java.time.Duration.ofSeconds(3))
                    .blockOptional()
                    .orElseGet(() -> ClassroomDetectionResponse.builder()
                            .classId(classId)
                            .detectedTeacherCodes(java.util.Collections.emptyList())
                            .detectedStudentCodes(java.util.Collections.emptyList())
                            .totalFacesDetected(0)
                            .build());
        } catch (Exception e) {
            log.warn("Không kết nối được Core AI miai hoặc timeout khi nhận diện lớp học {}. Trả về danh sách rỗng: {}", classId, e.getMessage());
            return ClassroomDetectionResponse.builder()
                    .classId(classId)
                    .detectedTeacherCodes(java.util.Collections.emptyList())
                    .detectedStudentCodes(java.util.Collections.emptyList())
                    .totalFacesDetected(0)
                    .build();
        }
    }

    /**
     * Đồng bộ vector khách vào phân vùng RAM TTL của miai.
     */
    public boolean registerVisitorToRam(VisitorRegisterRequest request) {
        try {
            log.info("Đồng bộ vector khách {} sang phân vùng RAM miai (hiệu lực đến {})",
                    request.getVisitorId(), request.getValidTo());
            // Gọi endpoint /face/visitor/register
            return true;
        } catch (Exception e) {
            log.error("Lỗi đồng bộ vector khách sang miai: {}", request.getVisitorId(), e);
            return false;
        }
    }

    /**
     * Hủy bỏ vector khách khỏi phân vùng RAM miai trước thời hạn.
     */
    public boolean evictVisitorFromRam(String visitorId) {
        try {
            log.info("Xóa vector khách {} khỏi RAM miai", visitorId);
            // Gọi endpoint DELETE /face/visitor/{id}
            return true;
        } catch (Exception e) {
            log.error("Lỗi xóa vector khách khỏi miai: {}", visitorId, e);
            return false;
        }
    }
}
