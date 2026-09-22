package vn.microtec.mschool;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.microtec.mschool.application.service.ClassroomAttendanceEvaluator;
import vn.microtec.mschool.domain.attendance.DailySessionStateMachine;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.domain.enums.Direction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class AttendanceEvaluationTests {

    private final ClassroomAttendanceEvaluator evaluator = new ClassroomAttendanceEvaluator();

    @Test
    @DisplayName("Kiểm thử State Machine: Điểm danh vào cổng đúng giờ sáng")
    void testGateCheckInOnTime() {
        DailySessionStateMachine session = DailySessionStateMachine.init("HS001", LocalDate.now());
        LocalDateTime scanTime = LocalDate.now().atTime(7, 15);

        boolean shouldNotify = session.processTransition(Direction.IN, scanTime);

        assertTrue(shouldNotify);
        assertEquals(AttendanceStatus.PRESENT, session.getStatus());
        assertEquals(scanTime, session.getCheckInTime());
    }

    @Test
    @DisplayName("Kiểm thử State Machine: Điểm danh vào cổng muộn sau 07:30")
    void testGateCheckInLate() {
        DailySessionStateMachine session = DailySessionStateMachine.init("HS002", LocalDate.now());
        LocalDateTime scanTime = LocalDate.now().atTime(7, 45);

        boolean shouldNotify = session.processTransition(Direction.IN, scanTime);

        assertTrue(shouldNotify);
        assertEquals(AttendanceStatus.LATE, session.getStatus());
    }

    @Test
    @DisplayName("Kiểm thử State Machine: Ra ngoài dưới 5 phút được xem là tạm thời")
    void testShortLeaveIgnored() {
        DailySessionStateMachine session = DailySessionStateMachine.init("HS003", LocalDate.now());
        LocalDateTime checkIn = LocalDate.now().atTime(7, 20);
        session.processTransition(Direction.IN, checkIn);

        LocalDateTime stepOut = LocalDate.now().atTime(9, 30);
        session.processTransition(Direction.OUT, stepOut);

        LocalDateTime stepIn = LocalDate.now().atTime(9, 33);
        session.processTransition(Direction.IN, stepIn);

        assertNull(session.getLastOutTime());
    }

    @Test
    @DisplayName("Kiểm thử Đối soát Lớp học: Phát hiện học sinh vắng, nhầm lớp và giáo viên dạy thay")
    void testClassroomEvaluation() {
        String classId = "10A1";
        int period = 2;
        LocalDate today = LocalDate.now();
        String scheduledTeacher = "GV_TOAN";

        List<String> roster = List.of("HS01", "HS02", "HS03", "HS04", "HS05");
        List<String> detectedTeachers = List.of("GV_LY"); // Dạy thay
        List<String> detectedStudents = List.of("HS01", "HS02", "HS03", "HS99"); // HS04, HS05 vắng; HS99 nhầm lớp

        ClassroomAttendanceEvaluator.ClassroomEvaluationResult result = evaluator.evaluateClassroom(
                classId, period, today, scheduledTeacher, roster, detectedTeachers, detectedStudents
        );

        assertTrue(result.isSubstituteTeacher());
        assertEquals("GV_LY", result.getActualTeacherCode());
        assertEquals(3, result.getTotalPresent());
        assertEquals(5, result.getTotalEnrolled());
        assertTrue(result.getAbsentStudentCodes().containsAll(List.of("HS04", "HS05")));
        assertTrue(result.getWrongClassStudentCodes().contains("HS99"));
    }
}
