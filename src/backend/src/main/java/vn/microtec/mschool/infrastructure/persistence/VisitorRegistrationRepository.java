package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.visitor.VisitorRegistration;
import vn.microtec.mschool.domain.enums.VisitorStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisitorRegistrationRepository extends JpaRepository<VisitorRegistration, UUID> {

    Optional<VisitorRegistration> findByVisitorCode(String visitorCode);

    List<VisitorRegistration> findByStatus(VisitorStatus status);

    List<VisitorRegistration> findByStatusAndValidToBefore(VisitorStatus status, OffsetDateTime now);
}
