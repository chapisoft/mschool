package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.common.MasterShift;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MasterShiftRepository extends JpaRepository<MasterShift, UUID> {
    Optional<MasterShift> findByShiftCode(String shiftCode);
}
