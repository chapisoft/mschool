package vn.microtec.mschool.domain.classroom;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "classrooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "grade_level", nullable = false)
    private Integer gradeLevel;

    @Column(nullable = false, length = 50)
    private String room;

    @Column(nullable = false, length = 50)
    private String building;

    @Column(nullable = false)
    private Integer floor;

    @Column(name = "homeroom_teacher", nullable = false)
    private String homeroomTeacher;

    @Column(name = "total_students", nullable = false)
    private Integer totalStudents;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
