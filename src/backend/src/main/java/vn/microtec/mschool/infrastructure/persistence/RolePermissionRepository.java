package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.security.RolePermission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {
    List<RolePermission> findByRoleCode(String roleCode);
    Optional<RolePermission> findByRoleCodeAndModuleCode(String roleCode, String moduleCode);
    void deleteByRoleCode(String roleCode);
}
