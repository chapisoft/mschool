package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.domain.audit.AuditLog;
import vn.microtec.mschool.infrastructure.persistence.AuditLogRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public AuditLog logAction(UUID schoolId, UUID userId, String userName, String actionCode,
                             String entityName, String entityId, String oldValue, String newValue,
                             String reason, String ipAddress, String userAgent) {
        AuditLog auditLog = AuditLog.builder()
                .schoolId(schoolId)
                .userId(userId)
                .userName(userName)
                .actionCode(actionCode)
                .entityName(entityName)
                .entityId(entityId)
                .oldValue(oldValue)
                .newValue(newValue)
                .reason(reason)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .createdAt(OffsetDateTime.now())
                .build();

        AuditLog saved = auditLogRepository.save(auditLog);
        log.info("Audit log recorded: action={}, entity={}, entityId={}, user={}",
                actionCode, entityName, entityId, userName);
        return saved;
    }

    public List<AuditLog> getAuditLogsBySchool(UUID schoolId) {
        if (schoolId == null) {
            return auditLogRepository.findAllByOrderByCreatedAtDesc();
        }
        return auditLogRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId);
    }

    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
