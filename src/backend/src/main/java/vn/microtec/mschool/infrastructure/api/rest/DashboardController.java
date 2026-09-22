package vn.microtec.mschool.infrastructure.api.rest;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.domain.biometric.FaceBiometricProfile;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.domain.classroom.Classroom;
import vn.microtec.mschool.domain.enums.AttendanceStatus;
import vn.microtec.mschool.domain.enums.Direction;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;
import vn.microtec.mschool.infrastructure.persistence.ClassroomRepository;
import vn.microtec.mschool.infrastructure.persistence.DeviceCameraRepository;
import vn.microtec.mschool.infrastructure.persistence.FaceBiometricProfileRepository;
import vn.microtec.mschool.infrastructure.persistence.StrangerAccessLogRepository;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ClassroomRepository classroomRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final StrangerAccessLogRepository strangerLogRepository;
    private final FaceBiometricProfileRepository biometricProfileRepository;
    private final DeviceCameraRepository cameraRepository;

    @Getter
    @Builder
    public static class DashboardStatsResponse {
        private int totalStudents;
        private int present;
        private int late;
        private int absent;
        private int strangerAlerts;
        private double rate;
    }

    @Getter
    @Builder
    public static class RecentFeedItem {
        private String id;
        private String name;
        private String code;
        private String className;
        private String time;
        private String camera;
        private Direction type;
        private AttendanceStatus status;
        private String avatar;
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats() {
        LocalDate today = LocalDate.now();
        List<Classroom> classrooms = classroomRepository.findAll();
        int totalEnrolled = classrooms.stream().mapToInt(Classroom::getTotalStudents).sum();

        List<DailyAttendanceSession> sessions = attendanceRecordRepository.findBySessionDate(today);

        long presentCount = sessions.stream()
                .filter(s -> s.getAttendanceStatus() == AttendanceStatus.PRESENT)
                .count();
        long lateCount = sessions.stream()
                .filter(s -> s.getAttendanceStatus() == AttendanceStatus.LATE)
                .count();
        long absentCount = sessions.stream()
                .filter(s -> s.getAttendanceStatus() == AttendanceStatus.ABSENT)
                .count();

        int totalAccounted = (int) (presentCount + lateCount + absentCount);
        if (totalAccounted < totalEnrolled) {
            absentCount += (totalEnrolled - totalAccounted);
        }

        long strangerAlerts = strangerLogRepository.count();

        double rate = totalEnrolled > 0 ? ((double) (presentCount + lateCount) / totalEnrolled) * 100.0 : 0.0;
        rate = Math.round(rate * 10.0) / 10.0;

        DashboardStatsResponse data = DashboardStatsResponse.builder()
                .totalStudents(totalEnrolled)
                .present((int) presentCount)
                .late((int) lateCount)
                .absent((int) absentCount)
                .strangerAlerts((int) strangerAlerts)
                .rate(rate)
                .build();

        return ResponseEntity.ok(ApiResponse.<DashboardStatsResponse>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message("Lấy thống kê bảng điều khiển thành công")
                .data(data)
                .build());
    }

    @GetMapping("/recent-feeds")
    public ResponseEntity<ApiResponse<List<RecentFeedItem>>> getRecentFeeds() {
        LocalDate today = LocalDate.now();
        List<DailyAttendanceSession> sessions = attendanceRecordRepository.findBySessionDate(today);
        List<RecentFeedItem> feeds = new ArrayList<>();
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

        Map<String, FaceBiometricProfile> profileMap = new HashMap<>();
        biometricProfileRepository.findAll().forEach(p -> profileMap.put(p.getIdentityCode(), p));

        Map<String, DeviceCamera> cameraMap = new HashMap<>();
        cameraRepository.findAll().forEach(c -> cameraMap.put(c.getId(), c));

        for (DailyAttendanceSession session : sessions) {
            if (session.getCheckInAt() == null) continue;
            FaceBiometricProfile profile = profileMap.get(session.getIdentityCode());
            String fullName = profile != null ? profile.getFullName() : session.getIdentityCode();
            String className = profile != null ? profile.getDepartmentOrClass() : "";
            
            DeviceCamera cam = session.getCheckInCameraId() != null ? cameraMap.get(session.getCheckInCameraId()) : null;
            String cameraName = cam != null ? cam.getName() : (session.getCheckInCameraId() != null ? session.getCheckInCameraId() : "");

            String initials = "";
            if (fullName != null && !fullName.isEmpty()) {
                String[] parts = fullName.trim().split("\\s+");
                if (parts.length >= 2) {
                    initials = parts[parts.length - 2].substring(0, 1) + parts[parts.length - 1].substring(0, 1);
                } else if (parts.length == 1 && !parts[0].isEmpty()) {
                    initials = parts[0].substring(0, Math.min(2, parts[0].length()));
                }
            }

            feeds.add(RecentFeedItem.builder()
                    .id(session.getId().toString())
                    .name(fullName)
                    .code(session.getIdentityCode())
                    .className(className)
                    .time(session.getCheckInAt().format(timeFormatter))
                    .camera(cameraName)
                    .type(Direction.IN)
                    .status(session.getAttendanceStatus() != null ? session.getAttendanceStatus() : AttendanceStatus.PRESENT)
                    .avatar(initials.toUpperCase())
                    .build());
        }

        feeds.sort((a, b) -> b.getTime().compareTo(a.getTime()));
        List<RecentFeedItem> result = feeds.subList(0, Math.min(feeds.size(), 10));

        return ResponseEntity.ok(ApiResponse.<List<RecentFeedItem>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message("Lấy luồng điểm danh thời gian thực thành công")
                .data(result)
                .build());
    }
}
