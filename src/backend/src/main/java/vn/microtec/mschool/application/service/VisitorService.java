package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.domain.visitor.VisitorRegistration;
import vn.microtec.mschool.domain.enums.VisitorStatus;
import vn.microtec.mschool.domain.enums.VisitorType;
import vn.microtec.mschool.infrastructure.adapter.MiaiClientAdapter;
import vn.microtec.mschool.infrastructure.persistence.VisitorRegistrationRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Service quản lý khách vãng lai và quy trình phê duyệt ra vào cổng trường.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VisitorService {

    private final VisitorRegistrationRepository visitorRepository;
    private final MiaiClientAdapter miaiClientAdapter;

    /**
     * Đăng ký khách mới hoặc phụ huynh đến đón con kèm thời hạn hiệu lực (TTL).
     */
    @Transactional
    public VisitorRegistration registerVisitor(
            String fullName,
            String phoneNumber,
            VisitorType visitorType,
            String targetIdentityCode,
            OffsetDateTime validFrom,
            OffsetDateTime validTo,
            String approvedBy
    ) {
        String visitorCode = "VIS_" + System.currentTimeMillis();

        VisitorRegistration registration = VisitorRegistration.builder()
                .visitorCode(visitorCode)
                .fullName(fullName)
                .phoneNumber(phoneNumber)
                .visitorType(visitorType)
                .targetIdentityCode(targetIdentityCode)
                .validFrom(validFrom)
                .validTo(validTo)
                .status(VisitorStatus.APPROVED)
                .approvedBy(approvedBy)
                .createdAt(OffsetDateTime.now())
                .build();

        VisitorRegistration saved = visitorRepository.save(Objects.requireNonNull(registration));

        // Đồng bộ vector sang phân vùng RAM của Core AI miai
        MiaiClientAdapter.VisitorRegisterRequest miaiRequest = MiaiClientAdapter.VisitorRegisterRequest.builder()
                .visitorId(visitorCode)
                .fullName(fullName)
                .visitorType(visitorType.name())
                .targetIdentityCode(targetIdentityCode)
                .validFrom(validFrom)
                .validTo(validTo)
                .build();

        miaiClientAdapter.registerVisitorToRam(miaiRequest);

        log.info("Đã đăng ký và đồng bộ khách {} (Mã: {}) có hiệu lực đến {}",
                fullName, visitorCode, validTo);

        return saved;
    }

    /**
     * Thu hồi quyền ra vào của khách trước hạn.
     */
    @Transactional
    public boolean revokeVisitor(String visitorCode) {
        Optional<VisitorRegistration> opt = visitorRepository.findByVisitorCode(visitorCode);
        if (opt.isPresent()) {
            VisitorRegistration reg = opt.get();
            reg.setStatus(VisitorStatus.REVOKED);
            visitorRepository.save(Objects.requireNonNull(reg));

            miaiClientAdapter.evictVisitorFromRam(visitorCode);
            log.info("Đã thu hồi quyền ra vào của khách {}", visitorCode);
            return true;
        }
        return false;
    }

    /**
     * Lấy danh sách khách đang có hiệu lực.
     */
    public List<VisitorRegistration> getActiveVisitors() {
        return visitorRepository.findByStatus(VisitorStatus.APPROVED);
    }

    /**
     * Tự động dọn dẹp các bản ghi khách hết hạn trong CSDL mỗi 5 phút.
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void cleanupExpiredVisitors() {
        OffsetDateTime now = OffsetDateTime.now();
        List<VisitorRegistration> expiredList = visitorRepository.findByStatusAndValidToBefore(
                VisitorStatus.APPROVED, now
        );

        for (VisitorRegistration reg : expiredList) {
            reg.setStatus(VisitorStatus.EXPIRED);
            visitorRepository.save(Objects.requireNonNull(reg));
            log.info("Tự động chuyển trạng thái EXPIRED cho khách {}", reg.getVisitorCode());
        }
    }
}
