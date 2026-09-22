package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.enums.UserRole;
import vn.microtec.mschool.domain.security.SystemUser;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SystemUserRepository extends JpaRepository<SystemUser, UUID> {
    Optional<SystemUser> findByUsername(String username);
    List<SystemUser> findByRoleCode(UserRole roleCode);
    boolean existsByUsername(String username);
}
