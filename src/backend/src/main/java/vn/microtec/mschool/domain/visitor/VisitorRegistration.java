package vn.microtec.mschool.domain.visitor;

import jakarta.persistence.*;
import lombok.*;
import vn.microtec.mschool.domain.enums.VisitorStatus;
import vn.microtec.mschool.domain.enums.VisitorType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "visitor_registrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VisitorRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "visitor_code", nullable = false, unique = true, length = 50)
    private String visitorCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "visitor_type", nullable = false, length = 20)
    private VisitorType visitorType;

    @Column(name = "target_identity_code", length = 50)
    private String targetIdentityCode;

    @Column(name = "valid_from", nullable = false)
    private OffsetDateTime validFrom;

    @Column(name = "valid_to", nullable = false)
    private OffsetDateTime validTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VisitorStatus status;

    @Column(name = "approved_by", length = 50)
    private String approvedBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = VisitorStatus.APPROVED;
    }
}
