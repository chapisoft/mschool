package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.security.SystemRole;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SystemRoleRepository extends JpaRepository<SystemRole, UUID> {
    Optional<SystemRole> findByRoleCode(String roleCode);
    boolean existsByRoleCode(String roleCode);
}
