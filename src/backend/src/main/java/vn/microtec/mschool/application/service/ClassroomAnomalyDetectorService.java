package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import vn.microtec.mschool.domain.enums.AnomalyType;
import vn.microtec.mschool.domain.enums.SeverityLevel;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClassroomAnomalyDetectorService {

    private final MessageSource messageSource;

    // Default constructor for unit tests
    public ClassroomAnomalyDetectorService() {
        this.messageSource = null;
    }

    private String getMessage(String code, Object[] args, String fallbackPattern) {
        if (messageSource != null) {
            try {
                return messageSource.getMessage(code, args, LocaleContextHolder.getLocale());
            } catch (Exception ignored) {
            }
        }
        return java.text.MessageFormat.format(fallbackPattern, args);
    }

    /**
     * Đánh giá và phát hiện bất thường của phòng học dựa trên kết quả quét AI.
     */
    public List<Map<String, Object>> evaluateClassroomAnomalies(
            String classroomCode,
            int totalEnrolled,
            int presentCount,
            boolean hasTeacher,
            int strangerCount) {

        List<Map<String, Object>> anomalies = new ArrayList<>();

        // 1. Kiểm tra tỷ lệ vắng mặt đột biến (> 20%)
        if (totalEnrolled > 0) {
            double absenceRate = (double) (totalEnrolled - presentCount) / totalEnrolled;
            if (absenceRate > 0.20) {
                String localizedMsg = getMessage(
                        "anomaly.high_absence",
                        new Object[]{classroomCode, (totalEnrolled - presentCount), totalEnrolled, String.format("%.1f", absenceRate * 100)},
                        "Class {0}: {1}/{2} students absent ({3}% exceeds threshold)"
                );
                anomalies.add(Map.of(
                        "type", AnomalyType.HIGH_ABSENCE_RATE.name(),
                        "severity", SeverityLevel.HIGH.name(),
                        "classroom", classroomCode,
                        "message", localizedMsg
                ));
            }
        }

        // 2. Kiểm tra giáo viên vắng mặt
        if (!hasTeacher) {
            String localizedMsg = getMessage(
                    "anomaly.teacher_missing",
                    new Object[]{classroomCode},
                    "Class {0}: Instructor not present at podium"
            );
            anomalies.add(Map.of(
                    "type", AnomalyType.TEACHER_MISSING.name(),
                    "severity", SeverityLevel.CRITICAL.name(),
                    "classroom", classroomCode,
                    "message", localizedMsg
            ));
        }

        // 3. Kiểm tra người lạ trong phòng học
        if (strangerCount > 0) {
            String localizedMsg = getMessage(
                    "anomaly.stranger_detected",
                    new Object[]{strangerCount, classroomCode},
                    "Detected {0} unidentified faces in classroom {1}"
            );
            anomalies.add(Map.of(
                    "type", AnomalyType.STRANGER_IN_CLASSROOM.name(),
                    "severity", SeverityLevel.HIGH.name(),
                    "classroom", classroomCode,
                    "message", localizedMsg
            ));
        }

        if (!anomalies.isEmpty()) {
            log.warn("Detected {} classroom anomalies for room {}: {}", anomalies.size(), classroomCode, anomalies);
        }

        return anomalies;
    }
}
