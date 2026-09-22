package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.enums.WebhookEventType;
import vn.microtec.mschool.domain.webhook.WebhookSubscription;

import java.util.List;
import java.util.UUID;

/**
 * Repository quản lý thông tin đăng ký Webhook Subscription.
 */
@Repository
public interface WebhookSubscriptionRepository extends JpaRepository<WebhookSubscription, UUID> {

    List<WebhookSubscription> findByEventTypeAndIsActiveTrue(WebhookEventType eventType);

    List<WebhookSubscription> findByIsActiveTrue();
}
