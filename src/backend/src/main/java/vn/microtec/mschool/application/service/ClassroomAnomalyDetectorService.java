package vn.microtec.mschool.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClassroomAnomalyDetectorService {

    public enum AnomalyType {
        HIGH_ABSENCE_RATE,    // Vắng mặt đột biến > 20% sĩ số
        TEACHER_MISSING,      // Không có giáo viên sau 10 phút đầu tiết
        STRANGER_IN_CLASSROOM // Phát hiện đối tượng lạ không có trong danh sách trường
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
                anomalies.add(Map.of(
                        "type", AnomalyType.HIGH_ABSENCE_RATE.name(),
                        "severity", "HIGH",
                        "classroom", classroomCode,
                        "message", String.format("Lớp %s vắng %d/%d học sinh (tỷ lệ %.1f%% vượt ngưỡng 20%%)",
                                classroomCode, (totalEnrolled - presentCount), totalEnrolled, absenceRate * 100)
                ));
            }
        }

        // 2. Kiểm tra giáo viên vắng mặt
        if (!hasTeacher) {
            anomalies.add(Map.of(
                    "type", AnomalyType.TEACHER_MISSING.name(),
                    "severity", "CRITICAL",
                    "classroom", classroomCode,
                    "message", String.format("Lớp %s chưa có giáo viên tại bục giảng", classroomCode)
            ));
        }

        // 3. Kiểm tra người lạ trong phòng học
        if (strangerCount > 0) {
            anomalies.add(Map.of(
                    "type", AnomalyType.STRANGER_IN_CLASSROOM.name(),
                    "severity", "HIGH",
                    "classroom", classroomCode,
                    "message", String.format("Phát hiện %d khuôn mặt lạ tại lớp %s", strangerCount, classroomCode)
            ));
        }

        if (!anomalies.isEmpty()) {
            log.warn("Phát hiện {} bất thường tại phòng học {}: {}", anomalies.size(), classroomCode, anomalies);
        }

        return anomalies;
    }
}
