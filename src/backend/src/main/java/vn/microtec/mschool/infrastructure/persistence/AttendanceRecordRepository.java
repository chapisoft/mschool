package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<DailyAttendanceSession, UUID> {

    Optional<DailyAttendanceSession> findByIdentityCodeAndSessionDate(String identityCode, LocalDate sessionDate);

    List<DailyAttendanceSession> findBySessionDate(LocalDate sessionDate);

    long countBySessionDate(LocalDate sessionDate);
}
