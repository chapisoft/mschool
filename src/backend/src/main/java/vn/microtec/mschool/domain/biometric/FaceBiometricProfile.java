package vn.microtec.mschool.domain.biometric;

import jakarta.persistence.*;
import lombok.*;
import vn.microtec.mschool.domain.enums.SubjectType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "face_biometric_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceBiometricProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "identity_code", nullable = false, unique = true, length = 50)
    private String identityCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_type", nullable = false, length = 20)
    private SubjectType subjectType;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "department_or_class", nullable = false, length = 100)
    private String departmentOrClass;

    @Column(name = "quality_score", nullable = false)
    private Double qualityScore;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "photo_straight", columnDefinition = "TEXT")
    private String photoStraight;

    @Column(name = "photo_left", columnDefinition = "TEXT")
    private String photoLeft;

    @Column(name = "photo_right", columnDefinition = "TEXT")
    private String photoRight;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime deletedAt;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
        if (isActive == null) isActive = true;
        if (isDeleted == null) isDeleted = false;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
