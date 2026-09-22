package vn.microtec.mschool;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.microtec.mschool.application.service.AttendanceOverrideService;
import vn.microtec.mschool.application.service.AuditLogService;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceOverrideTests {

    @Mock
    private AttendanceRecordRepository recordRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AttendanceOverrideService overrideService;

    @Test
    @DisplayName("Maker-Checker: Điều chỉnh điểm danh thành công từ Vắng sang Có mặt")
    void testOverrideSuccess() {
        UUID sessionId = UUID.randomUUID();
        DailyAttendanceSession mockSession = DailyAttendanceSession.builder()
                .id(sessionId)
                .identityCode("HS20260001")
                .sessionDate(LocalDate.now())
                .attendanceStatus(AttendanceStatus.ABSENT)
                .build();

        when(recordRepository.findById(sessionId)).thenReturn(Optional.of(mockSession));
        when(recordRepository.save(any(DailyAttendanceSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DailyAttendanceSession result = overrideService.executeOverride(
                sessionId,
                AttendanceStatus.PRESENT,
                "MEDICAL_NOTE",
                "Phụ huynh nộp giấy khám bệnh của viện nhi",
                "minio://docs/giay_kham.pdf",
                UUID.randomUUID(),
                "GiamThi.Nguyen"
        );

        assertNotNull(result);
        assertEquals(AttendanceStatus.PRESENT, result.getAttendanceStatus());
        assertNotNull(result.getCheckInAt());

        // Kiểm tra audit log được gọi ghi vết
        verify(auditLogService, times(1)).logAction(
                any(), any(), any(), eq("OVERRIDE_ATTENDANCE"),
                eq("daily_attendance_sessions"), eq(sessionId.toString()),
                any(), any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("Maker-Checker: Bị chặn khi cố sửa phiên đã bị khóa sau 24h")
    void testOverrideLockedSession() {
        UUID sessionId = UUID.randomUUID();
        // Phiên diễn ra từ 3 ngày trước (quá 24h)
        DailyAttendanceSession oldSession = DailyAttendanceSession.builder()
                .id(sessionId)
                .identityCode("HS20260002")
                .sessionDate(LocalDate.now().minusDays(3))
                .attendanceStatus(AttendanceStatus.ABSENT)
                .build();

        when(recordRepository.findById(sessionId)).thenReturn(Optional.of(oldSession));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            overrideService.executeOverride(
                    sessionId,
                    AttendanceStatus.PRESENT,
                    "OTHER",
                    "Sửa điểm danh tuần trước",
                    null,
                    UUID.randomUUID(),
                    "GiamThi.Nguyen"
            );
        });

        assertTrue(ex.getMessage().contains("ATT_ERR_SESSION_LOCKED"));
        verify(recordRepository, never()).save(any());
    }
}
