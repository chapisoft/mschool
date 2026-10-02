package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.biometric.FaceBiometricProfile;
import vn.microtec.mschool.domain.enums.SubjectType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FaceBiometricProfileRepository extends JpaRepository<FaceBiometricProfile, UUID> {

    Optional<FaceBiometricProfile> findByIdentityCode(String identityCode);

    Optional<FaceBiometricProfile> findByIdentityCodeAndIsDeletedFalse(String identityCode);

    List<FaceBiometricProfile> findByIsDeletedFalse();

    Optional<FaceBiometricProfile> findByIdAndIsDeletedFalse(UUID id);

    List<FaceBiometricProfile> findBySubjectTypeAndIsDeletedFalse(SubjectType subjectType);

    @Query("SELECT f FROM FaceBiometricProfile f WHERE f.departmentOrClass = :departmentOrClass AND (f.isDeleted = false OR f.isDeleted IS NULL)")
    List<FaceBiometricProfile> findByDepartmentOrClass(@Param("departmentOrClass") String departmentOrClass);
}
