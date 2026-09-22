package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.security.StrangerAccessLog;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface StrangerAccessLogRepository extends JpaRepository<StrangerAccessLog, UUID> {

    List<StrangerAccessLog> findByIsResolvedFalseOrderByAppearedAtDesc();

    List<StrangerAccessLog> findByAppearedAtBefore(OffsetDateTime cutoff);
}
