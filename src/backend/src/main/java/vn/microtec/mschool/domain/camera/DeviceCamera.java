package vn.microtec.mschool.domain.camera;

import jakarta.persistence.*;
import lombok.*;
import vn.microtec.mschool.domain.enums.CameraStatus;
import vn.microtec.mschool.domain.enums.TripwireDirection;
import java.time.OffsetDateTime;

@Entity
@Table(name = "device_cameras")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceCamera {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress;

    @Column(name = "rtsp_url", nullable = false, columnDefinition = "TEXT")
    private String rtspUrl;

    @Column(nullable = false, length = 100)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CameraStatus status;

    @Column(nullable = false)
    private Integer fps;

    @Enumerated(EnumType.STRING)
    @Column(name = "tripwire_direction", nullable = false, length = 20)
    private TripwireDirection tripwireDirection;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
        if (status == null) status = CameraStatus.ONLINE;
        if (tripwireDirection == null) tripwireDirection = TripwireDirection.CHECK_IN;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
