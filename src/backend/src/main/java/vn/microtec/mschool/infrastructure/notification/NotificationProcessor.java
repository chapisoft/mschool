package vn.microtec.mschool.infrastructure.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.domain.notification.NotificationOutbox;
import vn.microtec.mschool.domain.enums.OutboxStatus;
import vn.microtec.mschool.infrastructure.persistence.NotificationOutboxRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationProcessor {

    private final NotificationOutboxRepository outboxRepository;

    @Value("${app.outbox.batch-size:50}")
    private int batchSize;
    @Value("${app.outbox.max-retries:5}")
    private int maxRetries;

    /**
     * Quét và xử lý hàng đợi Outbox theo chu kỳ 1 giây.
     */
    @Scheduled(fixedDelayString = "${app.outbox.polling-interval-ms:1000}")
    @Transactional
    public void processPendingNotifications() {
        List<NotificationOutbox> pendingRecords = outboxRepository.findByStatusOrderByCreatedAtAsc(
                OutboxStatus.PENDING, PageRequest.of(0, batchSize)
        );

        if (pendingRecords.isEmpty()) {
            return;
        }

        log.debug("Đang xử lý {} bản ghi thông báo Outbox PENDING", pendingRecords.size());

        for (NotificationOutbox record : pendingRecords) {
            try {
                // Đẩy thông báo qua cổng FCM / Push Gateway
                sendPushNotification(record.getTargetUserId(), record.getEventType(), record.getPayload());

                record.setStatus(OutboxStatus.SENT);
                record.setSentAt(OffsetDateTime.now());
                outboxRepository.save(Objects.requireNonNull(record));
            } catch (Exception e) {
                int newRetry = record.getRetryCount() + 1;
                record.setRetryCount(newRetry);
                if (newRetry >= maxRetries) {
                    record.setStatus(OutboxStatus.FAILED);
                    log.error("Thông báo Outbox {} thất bại sau {} lần thử lại", record.getId(), maxRetries, e);
                } else {
                    log.warn("Thử lại gửi thông báo Outbox {} lần thứ {}", record.getId(), newRetry);
                }
                outboxRepository.save(Objects.requireNonNull(record));
            }
        }
    }

    private void sendPushNotification(String userId, String eventType, String payload) {
        // Mô phỏng kết nối Firebase Cloud Messaging (FCM) hoặc SMS Brandname Gateway
        log.info("FCM Push Gateway: Đã gửi thông báo thành công cho phụ huynh học sinh {}: {}", userId, eventType);
    }
}
