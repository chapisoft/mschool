package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.classroom.Classroom;
import java.util.List;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, String> {
    List<Classroom> findAllByOrderByGradeLevelAscCodeAsc();
    List<Classroom> findByGradeLevel(Integer gradeLevel);
}
