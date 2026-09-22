package vn.microtec.mschool.domain.webhook;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

import vn.microtec.mschool.domain.enums.WebhookStatus;

@Entity
@Table(name = "webhook_delivery_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "subscription_id", nullable = false)
    private UUID subscriptionId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "response_status_code")
    private Integer responseStatusCode;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status", nullable = false, length = 20)
    private WebhookStatus deliveryStatus;

    @Column(name = "retry_count")
    private Integer retryCount;

    @Column(name = "delivered_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime deliveredAt;

    @PrePersist
    public void prePersist() {
        if (this.retryCount == null) {
            this.retryCount = 0;
        }
        if (this.deliveredAt == null) {
            this.deliveredAt = OffsetDateTime.now();
        }
    }
}
