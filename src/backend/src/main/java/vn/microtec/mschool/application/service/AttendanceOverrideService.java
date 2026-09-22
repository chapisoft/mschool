package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.domain.enums.AuditActionCode;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceOverrideService {

        private final AttendanceRecordRepository recordRepository;
        private final AuditLogService auditLogService;

        @Transactional
        public DailyAttendanceSession executeOverride(UUID sessionId,
                        AttendanceStatus newStatus,
                        String reasonCategory, String reasonDetail, String attachmentUri,
                        UUID operatorUserId, String operatorUserName) {
                DailyAttendanceSession session = recordRepository.findById(sessionId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Không tìm thấy phiên điểm danh với ID: " + sessionId));

                // Kiểm tra xem phiên có phải ngày trong quá khứ quá 24h và bị khóa không
                if (session.getSessionDate().isBefore(LocalDate.now().minusDays(1))) {
                        throw new IllegalStateException(
                                        "ATT_ERR_SESSION_LOCKED: Phiên điểm danh đã quá hạn chỉnh sửa 24 giờ");
                }

                String oldStatus = session.getAttendanceStatus().name();
                session.setAttendanceStatus(newStatus);
                session.setUpdatedAt(OffsetDateTime.now());

                // Nếu chuyển sang có mặt và chưa có giờ check-in, gán thời điểm hiện tại
                if ((newStatus == AttendanceStatus.PRESENT
                                || newStatus == AttendanceStatus.LATE)
                                && session.getCheckInAt() == null) {
                        session.setCheckInAt(OffsetDateTime.now());
                }

                DailyAttendanceSession updated = recordRepository.save(session);

                // Ghi nhật ký kiểm toán bất biến vào bảng audit_logs
                String oldValueJson = String.format("{\"status\": \"%s\"}", oldStatus);
                String newValueJson = String.format(
                                "{\"status\": \"%s\", \"reasonCategory\": \"%s\", \"attachment\": \"%s\"}",
                                newStatus.name(), reasonCategory, attachmentUri != null ? attachmentUri : "");

                auditLogService.logAction(
                                null,
                                operatorUserId,
                                operatorUserName,
                                AuditActionCode.OVERRIDE_ATTENDANCE.name(),
                                "daily_attendance_sessions",
                                sessionId.toString(),
                                oldValueJson,
                                newValueJson,
                                reasonDetail,
                                "127.0.0.1",
                                "MSchool-WebCMS");

                log.info("Thực hiện điều chỉnh điểm danh thành công: sessionId={}, oldStatus={}, newStatus={}, operator={}",
                                sessionId, oldStatus, newStatus, operatorUserName);

                return updated;
        }
}
