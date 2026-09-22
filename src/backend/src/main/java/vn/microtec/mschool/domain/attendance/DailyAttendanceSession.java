package vn.microtec.mschool.domain.attendance;

import jakarta.persistence.*;
import lombok.*;
import vn.microtec.mschool.domain.enums.AttendanceStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "daily_attendance_sessions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_session_date", columnNames = {"identity_code", "session_date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyAttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "identity_code", nullable = false, length = 50)
    private String identityCode;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "check_in_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime checkInAt;

    @Column(name = "check_out_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime checkOutAt;

    @Column(name = "last_out_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime lastOutAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", nullable = false, length = 20)
    private AttendanceStatus attendanceStatus;

    @Column(name = "total_present_minutes")
    private Integer totalPresentMinutes;

    @Column(name = "check_in_camera_id", length = 50)
    private String checkInCameraId;

    @Column(name = "check_out_camera_id", length = 50)
    private String checkOutCameraId;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
        if (attendanceStatus == null) attendanceStatus = AttendanceStatus.ABSENT;
        if (totalPresentMinutes == null) totalPresentMinutes = 0;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
