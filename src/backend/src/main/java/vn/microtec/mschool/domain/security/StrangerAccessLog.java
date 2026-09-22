package vn.microtec.mschool.domain.security;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "stranger_access_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StrangerAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "camera_id", nullable = false, length = 50)
    private String cameraId;

    @Column(name = "captured_image_path", nullable = false)
    private String capturedImagePath;

    @Column(name = "appeared_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime appearedAt;

    @Column(name = "is_alerted")
    private Boolean isAlerted;

    @Column(name = "is_resolved")
    private Boolean isResolved;

    @PrePersist
    public void prePersist() {
        if (this.appearedAt == null) {
            this.appearedAt = OffsetDateTime.now();
        }
        if (this.isAlerted == null) {
            this.isAlerted = false;
        }
        if (this.isResolved == null) {
            this.isResolved = false;
        }
    }
}
