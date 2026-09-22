package vn.microtec.mschool.infrastructure.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.domain.notification.NotificationOutbox;
import vn.microtec.mschool.domain.enums.OutboxStatus;
import vn.microtec.mschool.infrastructure.persistence.NotificationOutboxRepository;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationOutboxService {

    private final NotificationOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    /**
     * Ghi sự kiện thông báo phụ huynh vào bảng Outbox trong cùng Transaction với nghiệp vụ.
     */
    @Transactional
    public void publishParentNotification(String identityCode, String eventType, LocalDateTime scanTime, String cameraId) {
        try {
            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("identityCode", identityCode);
            payloadMap.put("eventType", eventType);
            payloadMap.put("scanTime", scanTime.toString());
            payloadMap.put("cameraId", cameraId);

            String payloadJson = objectMapper.writeValueAsString(payloadMap);

            NotificationOutbox outboxRecord = NotificationOutbox.builder()
                    .eventType(eventType)
                    .targetUserId(identityCode)
                    .payload(payloadJson)
                    .status(OutboxStatus.PENDING)
                    .retryCount(0)
                    .createdAt(OffsetDateTime.now())
                    .build();

            outboxRepository.save(Objects.requireNonNull(outboxRecord));
            log.info("Đã ghi thông báo Outbox cho đối tượng {}: loại sự kiện {}", identityCode, eventType);
        } catch (JsonProcessingException e) {
            log.error("Lỗi đóng gói JSON thông báo Outbox cho {}", identityCode, e);
        }
    }
}
