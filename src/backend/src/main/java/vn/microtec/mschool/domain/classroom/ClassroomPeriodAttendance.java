package vn.microtec.mschool.domain.classroom;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "classroom_period_attendances", uniqueConstraints = {
        @UniqueConstraint(name = "uk_class_period_date", columnNames = {"class_id", "period_number", "schedule_date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassroomPeriodAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "class_id", nullable = false, length = 50)
    private String classId;

    @Column(name = "period_number", nullable = false)
    private Integer periodNumber;

    @Column(name = "schedule_date", nullable = false)
    private LocalDate scheduleDate;

    @Column(name = "scheduled_teacher_code", nullable = false, length = 50)
    private String scheduledTeacherCode;

    @Column(name = "actual_teacher_code", length = 50)
    private String actualTeacherCode;

    @Column(name = "total_students_enrolled", nullable = false)
    private Integer totalStudentsEnrolled;

    @Column(name = "total_students_present", nullable = false)
    private Integer totalStudentsPresent;

    @ElementCollection
    @CollectionTable(name = "classroom_absent_students", joinColumns = @JoinColumn(name = "attendance_id"))
    @Column(name = "student_code")
    private List<String> absentStudentCodes;

    @ElementCollection
    @CollectionTable(name = "classroom_wrong_students", joinColumns = @JoinColumn(name = "attendance_id"))
    @Column(name = "student_code")
    private List<String> wrongClassStudentCodes;

    @Column(name = "snapshot_image_path")
    private String snapshotImagePath;

    @Column(name = "is_confirmed_by_teacher")
    private Boolean isConfirmedByTeacher;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.isConfirmedByTeacher == null) {
            this.isConfirmedByTeacher = false;
        }
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }
}
