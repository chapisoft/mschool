package vn.microtec.mschool.application.service;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClassroomAttendanceEvaluator {

    @Getter
    @Builder
    public static class ClassroomEvaluationResult {
        private String classId;
        private int periodNumber;
        private LocalDate scheduleDate;
        private String scheduledTeacherCode;
        private String actualTeacherCode;
        private boolean isTeacherPresent;
        private boolean isSubstituteTeacher;
        private int totalEnrolled;
        private int totalPresent;
        private List<String> presentStudentCodes;
        private List<String> absentStudentCodes;
        private List<String> wrongClassStudentCodes;
    }

    /**
     * Evaluates classroom panoramic recognition results against the class schedule and roster.
     */
    @Transactional
    public ClassroomEvaluationResult evaluateClassroom(
            String classId,
            int periodNumber,
            LocalDate scheduleDate,
            String scheduledTeacherCode,
            List<String> enrolledStudentRoster,
            List<String> detectedTeacherCodes,
            List<String> detectedStudentCodes
    ) {
        // 1. Teacher Evaluation
        String actualTeacher = null;
        boolean isTeacherPresent = false;
        boolean isSubstitute = false;

        if (!detectedTeacherCodes.isEmpty()) {
            actualTeacher = detectedTeacherCodes.get(0);
            isTeacherPresent = true;
            if (!actualTeacher.equalsIgnoreCase(scheduledTeacherCode)) {
                isSubstitute = true;
                log.info("Lớp {} Tiết {}: Phát hiện giáo viên dạy thay {}", classId, periodNumber, actualTeacher);
            }
        }

        // 2. Student Roster Evaluation
        Set<String> enrolledSet = new HashSet<>(enrolledStudentRoster);
        Set<String> presentSet = new HashSet<>();
        List<String> wrongClassList = new ArrayList<>();

        for (String code : detectedStudentCodes) {
            if (enrolledSet.contains(code)) {
                presentSet.add(code);
            } else {
                wrongClassList.add(code);
                log.warn("Cảnh báo học sinh ngồi nhầm lớp {} Tiết {}: Mã {}", classId, periodNumber, code);
            }
        }

        List<String> absentList = new ArrayList<>();
        for (String enrolledCode : enrolledStudentRoster) {
            if (!presentSet.contains(enrolledCode)) {
                absentList.add(enrolledCode);
            }
        }

        return ClassroomEvaluationResult.builder()
                .classId(classId)
                .periodNumber(periodNumber)
                .scheduleDate(scheduleDate)
                .scheduledTeacherCode(scheduledTeacherCode)
                .actualTeacherCode(actualTeacher)
                .isTeacherPresent(isTeacherPresent)
                .isSubstituteTeacher(isSubstitute)
                .totalEnrolled(enrolledStudentRoster.size())
                .totalPresent(presentSet.size())
                .presentStudentCodes(new ArrayList<>(presentSet))
                .absentStudentCodes(absentList)
                .wrongClassStudentCodes(wrongClassList)
                .build();
    }
}
