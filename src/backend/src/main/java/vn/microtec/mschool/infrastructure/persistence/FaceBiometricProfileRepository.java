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

    List<FaceBiometricProfile> findBySubjectType(SubjectType subjectType);

    @Query("SELECT f FROM FaceBiometricProfile f WHERE f.departmentOrClass = :departmentOrClass")
    List<FaceBiometricProfile> findByDepartmentOrClass(@Param("departmentOrClass") String departmentOrClass);
}
