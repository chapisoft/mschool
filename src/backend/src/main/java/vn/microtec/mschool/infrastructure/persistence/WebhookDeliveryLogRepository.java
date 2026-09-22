package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.webhook.WebhookDeliveryLog;
import vn.microtec.mschool.domain.enums.WebhookStatus;

import java.util.List;
import java.util.UUID;

@Repository
public interface WebhookDeliveryLogRepository extends JpaRepository<WebhookDeliveryLog, UUID> {

    List<WebhookDeliveryLog> findByDeliveryStatus(WebhookStatus deliveryStatus);

    List<WebhookDeliveryLog> findBySubscriptionIdOrderByDeliveredAtDesc(UUID subscriptionId);
}
