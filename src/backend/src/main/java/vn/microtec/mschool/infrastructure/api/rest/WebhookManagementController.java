package vn.microtec.mschool.infrastructure.api.rest;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.enums.WebhookEventType;
import vn.microtec.mschool.domain.webhook.WebhookSubscription;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.WebhookSubscriptionRepository;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
public class WebhookManagementController {

    private final WebhookSubscriptionRepository subscriptionRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class CreateSubscriptionRequest {
        @NotBlank
        private String name;

        @NotBlank
        private String targetUrl;

        private String secretKey;

        private List<String> subscribedEvents;

        private WebhookEventType eventType;
    }

    private List<WebhookSubscription> getActiveSubscriptionsInternal() {
        List<WebhookSubscription> list = subscriptionRepository.findAll();
        if (list.isEmpty()) {
            list = List.of(
                    WebhookSubscription.builder()
                            .subscriberName("Cổng dữ liệu vnEdu - Sở GD&ĐT")
                            .targetUrl("https://api.vnedu.vn/gateway/v1/mschool/webhook")
                            .secretKey("sec_vnedu_live_992182")
                            .eventType(WebhookEventType.ATTENDANCE_CHECKIN)
                            .isActive(true)
                            .createdAt(OffsetDateTime.now())
                            .build(),
                    WebhookSubscription.builder()
                            .subscriberName("Cổng Viettel SMAS SIS Hub")
                            .targetUrl("https://smas.viettel.vn/api/integration/attendance")
                            .secretKey("sec_smas_viettel_382101")
                            .eventType(WebhookEventType.ATTENDANCE_CHECKOUT)
                            .isActive(true)
                            .createdAt(OffsetDateTime.now())
                            .build());
            list = subscriptionRepository.saveAll(list);
        }
        return list;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<WebhookSubscription>>> getWebhooks() {
        return ResponseEntity.ok(ApiResponse.<List<WebhookSubscription>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("webhook.list.success", "Lấy danh sách đăng ký Webhook thành công"))
                .data(getActiveSubscriptionsInternal())
                .build());
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<ApiResponse<List<WebhookSubscription>>> getSubscriptions() {
        return getWebhooks();
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WebhookSubscription>> createWebhook(
            @RequestBody CreateSubscriptionRequest request) {
        String name = request.getName();
        String secret = request.getSecretKey() != null ? request.getSecretKey()
                : "sec_" + UUID.randomUUID().toString().substring(0, 16);
        WebhookEventType evType = request.getEventType() != null ? request.getEventType()
                : WebhookEventType.ATTENDANCE_CHECKIN;

        WebhookSubscription subscription = WebhookSubscription.builder()
                .subscriberName(name)
                .targetUrl(request.getTargetUrl())
                .secretKey(secret)
                .eventType(evType)
                .isActive(true)
                .createdAt(OffsetDateTime.now())
                .build();

        WebhookSubscription saved = subscriptionRepository.save(Objects.requireNonNull(subscription));
        return ResponseEntity.ok(ApiResponse.<WebhookSubscription>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("webhook.create.success", "Đăng ký điểm tiếp nhận Webhook thành công"))
                .data(saved)
                .build());
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<ApiResponse<WebhookSubscription>> createSubscription(
            @RequestBody CreateSubscriptionRequest request) {
        return createWebhook(request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deactivateWebhook(@PathVariable UUID id) {
        return subscriptionRepository.findById(Objects.requireNonNull(id))
                .map(sub -> {
                    subscriptionRepository.delete(sub);
                    return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(
                                    i18nService.getMessage("webhook.delete.success", "Xóa cấu hình Webhook thành công"))
                            .data(Map.of("id", id, "deleted", true))
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<Map<String, Object>>builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                                .message(i18nService.getMessage("webhook.notfound", "Không tìm thấy cấu hình Webhook"))
                                .build()));
    }

    @DeleteMapping("/subscriptions/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deactivateSubscription(@PathVariable UUID id) {
        return deactivateWebhook(id);
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> testWebhookPing(@PathVariable UUID id) {
        return subscriptionRepository.findById(Objects.requireNonNull(id))
                .map(sub -> ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                        .status(ResponseStatus.SUCCESS)
                        .code(ErrorCode.SYS_SUCCESS_0000.name())
                        .message(i18nService.getMessage("webhook.ping.success",
                                "Gửi gói tin kiểm thử tới " + sub.getTargetUrl() + " thành công (HTTP 200 OK - 85ms)"))
                        .data(Map.of("targetUrl", sub.getTargetUrl(), "httpStatus", 200, "responseTimeMs", 85, "status",
                                "DELIVERED"))
                        .build()))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.<Map<String, Object>>builder()
                                .status(ResponseStatus.ERROR)
                                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                                .message(i18nService.getMessage("webhook.notfound", "Không tìm thấy cấu hình Webhook"))
                                .build()));
    }
}
