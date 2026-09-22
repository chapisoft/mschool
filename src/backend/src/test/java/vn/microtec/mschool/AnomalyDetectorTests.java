package vn.microtec.mschool;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.microtec.mschool.application.service.ClassroomAnomalyDetectorService;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AnomalyDetectorTests {

    private final ClassroomAnomalyDetectorService detectorService = new ClassroomAnomalyDetectorService();

    @Test
    @DisplayName("Anomaly Detector: Phát hiện vắng đột biến > 20% và giáo viên vắng mặt")
    void testDetectHighAbsenceAndMissingTeacher() {
        // Lớp 10A1 sĩ số 40, chỉ có 25 học sinh (vắng 15 em = 37.5%), không có giáo viên
        List<Map<String, Object>> anomalies = detectorService.evaluateClassroomAnomalies(
                "10A1", 40, 25, false, 2
        );

        assertEquals(3, anomalies.size());

        boolean hasHighAbsence = anomalies.stream()
                .anyMatch(a -> ClassroomAnomalyDetectorService.AnomalyType.HIGH_ABSENCE_RATE.name().equals(a.get("type")));
        boolean hasTeacherMissing = anomalies.stream()
                .anyMatch(a -> ClassroomAnomalyDetectorService.AnomalyType.TEACHER_MISSING.name().equals(a.get("type")));
        boolean hasStranger = anomalies.stream()
                .anyMatch(a -> ClassroomAnomalyDetectorService.AnomalyType.STRANGER_IN_CLASSROOM.name().equals(a.get("type")));

        assertTrue(hasHighAbsence);
        assertTrue(hasTeacherMissing);
        assertTrue(hasStranger);
    }
}
