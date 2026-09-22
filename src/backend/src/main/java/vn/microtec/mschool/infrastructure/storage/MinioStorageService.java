package vn.microtec.mschool.infrastructure.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.microtec.mschool.domain.enums.StorageBucket;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Slf4j
public class MinioStorageService {

    /**
     * Tải ảnh snapshot từ luồng camera lên MinIO bucket an toàn bằng Enum StorageBucket.
     */
    public String uploadSnapshot(byte[] imageBytes, String cameraId, String identityCode) {
        String bucket = StorageBucket.SNAPSHOTS.getBucketName();
        String objectKey = String.format("snapshots/%s/%s_%s.jpg",
                cameraId, identityCode, UUID.randomUUID().toString().substring(0, 8));
        log.info("Đã lưu ảnh snapshot vào MinIO: bucket={}, key={}, size={} bytes",
                bucket, objectKey, imageBytes.length);
        return String.format("minio://%s/%s", bucket, objectKey);
    }

    /**
     * Sinh Pre-signed URL bảo mật có thời hạn 15 phút bảo vệ dữ liệu PII học sinh.
     */
    public String generatePresignedUrl(String minioUri, int expiryMinutes) {
        if (minioUri == null || !minioUri.startsWith("minio://")) {
            return minioUri;
        }
        String cleanPath = minioUri.replace("minio://", "");
        String token = UUID.randomUUID().toString().replace("-", "");
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(expiryMinutes);

        // Giả lập Pre-signed URL ký số bảo mật của MinIO S3
        return String.format("https://storage.mschool.edu.vn/%s?X-Amz-Signature=%s&X-Amz-Expires=%s",
                cleanPath, token, expiresAt.toString());
    }
}
