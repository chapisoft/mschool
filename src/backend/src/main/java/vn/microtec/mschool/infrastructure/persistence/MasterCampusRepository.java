package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.common.MasterCampus;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MasterCampusRepository extends JpaRepository<MasterCampus, UUID> {
    Optional<MasterCampus> findByCampusCode(String campusCode);
}
