package vn.microtec.mschool.application.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.microtec.mschool.application.service.ClassroomAttendanceEvaluator;
import vn.microtec.mschool.domain.classroom.ClassroomPeriodAttendance;
import vn.microtec.mschool.domain.enums.WebhookEventType;
import vn.microtec.mschool.infrastructure.adapter.MiaiClientAdapter;
import vn.microtec.mschool.infrastructure.persistence.ClassroomPeriodAttendanceRepository;
import vn.microtec.mschool.infrastructure.webhook.WebhookDispatcherService;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Component
@RequiredArgsConstructor
public class ClassroomScheduler {

    private final MiaiClientAdapter miaiClientAdapter;
    private final ClassroomAttendanceEvaluator attendanceEvaluator;
    private final ClassroomPeriodAttendanceRepository attendanceRepository;
    private final WebhookDispatcherService webhookDispatcherService;
    private final vn.microtec.mschool.infrastructure.persistence.ClassroomRepository classroomRepository;
    private final vn.microtec.mschool.infrastructure.persistence.FaceBiometricProfileRepository biometricProfileRepository;

    /**
     * Bắn tín hiệu chụp ảnh tự động các phòng học vào phút thứ 5 đầu mỗi tiết học (Sáng và Chiều).
     */
    @Scheduled(cron = "0 5 7,8,9,10,13,14,15,16 * * MON-SAT")
    @Transactional
    public void executeClassroomAttendanceSweep() {
        LocalDate today = LocalDate.now();
        int currentPeriod = determineCurrentPeriod();

        List<vn.microtec.mschool.domain.classroom.Classroom> classrooms = classroomRepository.findAll();
        log.info("Bắt đầu tiến trình chụp ảnh đối soát {} phòng học cho Tiết {} ngày {}", classrooms.size(), currentPeriod, today);

        for (vn.microtec.mschool.domain.classroom.Classroom classroom : classrooms) {
            processClassroomPeriod(classroom, currentPeriod, today);
        }

        log.info("Hoàn thành đối soát sĩ số {} phòng học cho Tiết {}", classrooms.size(), currentPeriod);
    }

    private void processClassroomPeriod(vn.microtec.mschool.domain.classroom.Classroom classroom, int periodNumber, LocalDate scheduleDate) {
        String classId = classroom.getId();
        try {
            // 1. Lấy danh sách sĩ số thật từ CSDL
            String scheduledTeacher = classroom.getHomeroomTeacher() != null ? classroom.getHomeroomTeacher() : "";
            List<String> enrolledRoster = biometricProfileRepository.findAll().stream()
                    .filter(p -> classId.equalsIgnoreCase(p.getDepartmentOrClass()) || (classroom.getCode() != null && classroom.getCode().equalsIgnoreCase(p.getDepartmentOrClass())))
                    .map(vn.microtec.mschool.domain.biometric.FaceBiometricProfile::getIdentityCode)
                    .toList();

            // 2. Chụp snapshot từ VLAN camera phòng học và gửi Core AI miai
            byte[] dummySnapshot = new byte[0];
            MiaiClientAdapter.ClassroomDetectionResponse detection = miaiClientAdapter.detectClassroomFaces(
                    classId, dummySnapshot
            );

            // 3. Đánh giá đối soát qua ClassroomAttendanceEvaluator
            ClassroomAttendanceEvaluator.ClassroomEvaluationResult result = attendanceEvaluator.evaluateClassroom(
                    classId,
                    periodNumber,
                    scheduleDate,
                    scheduledTeacher,
                    enrolledRoster,
                    detection.getDetectedTeacherCodes(),
                    detection.getDetectedStudentCodes()
            );

            // 4. Lưu kết quả vào CSDL Sổ đầu bài điện tử
            ClassroomPeriodAttendance record = ClassroomPeriodAttendance.builder()
                    .classId(classId)
                    .periodNumber(periodNumber)
                    .scheduleDate(scheduleDate)
                    .scheduledTeacherCode(scheduledTeacher)
                    .actualTeacherCode(result.getActualTeacherCode())
                    .totalStudentsEnrolled(result.getTotalEnrolled())
                    .totalStudentsPresent(result.getTotalPresent())
                    .absentStudentCodes(result.getAbsentStudentCodes())
                    .wrongClassStudentCodes(result.getWrongClassStudentCodes())
                    .snapshotImagePath("/storage/snapshots/" + scheduleDate + "/" + classId + "_P" + periodNumber + ".jpg")
                    .isConfirmedByTeacher(false)
                    .createdAt(OffsetDateTime.now())
                    .build();

            attendanceRepository.save(Objects.requireNonNull(record));

            // 5. Bắn sự kiện Webhook sang hệ thống quản lý học đường
            webhookDispatcherService.dispatch(
                    WebhookEventType.CLASSROOM_EVALUATED,
                    result
            );

        } catch (Exception e) {
            log.error("Lỗi đối soát lớp học {} Tiết {}:", classId, periodNumber, e);
        }
    }

    private int determineCurrentPeriod() {
        int hour = java.time.LocalTime.now().getHour();
        if (hour < 8) return 1;
        if (hour < 9) return 2;
        if (hour < 10) return 3;
        if (hour < 11) return 4;
        if (hour < 14) return 5;
        if (hour < 15) return 6;
        if (hour < 16) return 7;
        return 8;
    }
}
