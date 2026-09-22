package vn.microtec.mschool.infrastructure.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import vn.microtec.mschool.domain.webhook.*;
import vn.microtec.mschool.domain.enums.WebhookEventType;
import vn.microtec.mschool.domain.enums.WebhookStatus;
import vn.microtec.mschool.infrastructure.persistence.WebhookDeliveryLogRepository;
import vn.microtec.mschool.infrastructure.persistence.WebhookSubscriptionRepository;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookDispatcherService {

    private final WebhookSubscriptionRepository subscriptionRepository;
    private final WebhookDeliveryLogRepository deliveryLogRepository;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;

    /**
     * Bắn sự kiện Webhook bất đồng bộ tới tất cả đối tác đăng ký.
     */
    @Async
    public void dispatch(WebhookEventType eventType, Object payloadObject) {
        List<WebhookSubscription> subscriptions = subscriptionRepository.findByEventTypeAndIsActiveTrue(eventType);
        if (subscriptions.isEmpty()) {
            return;
        }

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payloadObject);
        } catch (Exception e) {
            log.error("Lỗi tuần tự hóa JSON payload cho sự kiện Webhook {}", eventType, e);
            return;
        }

        for (WebhookSubscription sub : subscriptions) {
            deliverToSubscriber(sub, eventType, payloadJson);
        }
    }

    private void deliverToSubscriber(WebhookSubscription subscription, WebhookEventType eventType, String payloadJson) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String signature = calculateHmacSha256(payloadJson + "." + timestamp, subscription.getSecretKey());

        WebhookDeliveryLog deliveryLog = WebhookDeliveryLog.builder()
                .subscriptionId(subscription.getId())
                .eventType(eventType.name())
                .payload(payloadJson)
                .deliveryStatus(WebhookStatus.RETRYING)
                .retryCount(0)
                .deliveredAt(OffsetDateTime.now())
                .build();

        try {
            WebClient client = webClientBuilder.build();
            String response = client.post()
                    .uri(Objects.requireNonNull(subscription.getTargetUrl()))
                    .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                    .header("X-MSchool-Signature", signature)
                    .header("X-MSchool-Event", eventType.name())
                    .header("X-MSchool-Timestamp", timestamp)
                    .bodyValue(Objects.requireNonNull(payloadJson))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            deliveryLog.setResponseStatusCode(200);
            deliveryLog.setResponseBody(response != null ? response : "OK");
            deliveryLog.setDeliveryStatus(WebhookStatus.SUCCESS);
            log.info("Giao vận Webhook thành công tới đối tác {} ({})",
                    subscription.getSubscriberName(), subscription.getTargetUrl());

        } catch (Exception e) {
            deliveryLog.setResponseStatusCode(500);
            deliveryLog.setResponseBody(e.getMessage());
            deliveryLog.setDeliveryStatus(WebhookStatus.FAILED);
            log.warn("Giao vận Webhook thất bại tới đối tác {}: {}",
                    subscription.getSubscriberName(), e.getMessage());
        }

        deliveryLogRepository.save(Objects.requireNonNull(deliveryLog));
    }

    private String calculateHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmac);
        } catch (Exception e) {
            log.error("Lỗi tính toán chữ ký HMAC-SHA256", e);
            return "";
        }
    }
}
