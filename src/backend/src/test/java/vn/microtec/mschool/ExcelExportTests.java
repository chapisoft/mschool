package vn.microtec.mschool;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.microtec.mschool.application.service.ExcelImportExportService;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;

import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExcelExportTests {

    @Mock
    private AttendanceRecordRepository recordRepository;

    @InjectMocks
    private ExcelImportExportService excelService;

    @Test
    @DisplayName("Apache POI: Xuất sổ điểm danh Excel định dạng hợp lệ")
    void testExportDailyAttendanceExcel() throws IOException {
        LocalDate today = LocalDate.now();
        List<DailyAttendanceSession> mockSessions = List.of(
                DailyAttendanceSession.builder()
                        .id(UUID.randomUUID())
                        .identityCode("HS20261001")
                        .sessionDate(today)
                        .checkInAt(OffsetDateTime.now().minusHours(4))
                        .checkOutAt(OffsetDateTime.now())
                        .totalPresentMinutes(240)
                        .attendanceStatus(AttendanceStatus.PRESENT)
                        .checkInCameraId("CAM_GATE_01")
                        .build(),
                DailyAttendanceSession.builder()
                        .id(UUID.randomUUID())
                        .identityCode("HS20261002")
                        .sessionDate(today)
                        .attendanceStatus(AttendanceStatus.ABSENT)
                        .build()
        );

        when(recordRepository.findBySessionDate(today)).thenReturn(mockSessions);

        byte[] result = excelService.exportDailyAttendanceExcel(today);

        assertNotNull(result);
        assertTrue(result.length > 1000, "Tệp Excel sinh ra phải có dung lượng lớn hơn 1000 bytes");
    }
}
