package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.classroom.ClassroomPeriodAttendance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassroomPeriodAttendanceRepository extends JpaRepository<ClassroomPeriodAttendance, UUID> {

    Optional<ClassroomPeriodAttendance> findByClassIdAndPeriodNumberAndScheduleDate(
            String classId, Integer periodNumber, LocalDate scheduleDate
    );

    List<ClassroomPeriodAttendance> findByScheduleDate(LocalDate scheduleDate);

    List<ClassroomPeriodAttendance> findByClassIdAndScheduleDate(String classId, LocalDate scheduleDate);
}
