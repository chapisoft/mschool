package vn.microtec.mschool.infrastructure.api.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.AttendanceService;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.attendance.DailyAttendanceSession;
import vn.microtec.mschool.domain.enums.Direction;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.AttendanceRecordRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * REST Controller tiếp nhận sự kiện quẹt thẻ/nhận diện khuôn mặt điểm danh cổng trường.
 */
@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceRecordRepository recordRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class AttendanceScanRequest {
        @NotBlank
        private String identityCode;

        @NotNull
        private Direction direction; // Bắt buộc 100% sử dụng Enum

        @NotBlank
        private String cameraId;

        private LocalDateTime scanTime;
    }

    /**
     * Endpoint tiếp nhận sự kiện nhận diện từ Ingestion Worker.
     */
    @PostMapping("/scan")
    public ResponseEntity<ApiResponse<String>> ingestScanEvent(@Valid @RequestBody AttendanceScanRequest request) {
        LocalDateTime scanTime = request.getScanTime() != null ? request.getScanTime() : LocalDateTime.now();
        attendanceService.processAttendanceScan(
                request.getIdentityCode(),
                request.getDirection(),
                request.getCameraId(),
                scanTime
        );
        String msg = i18nService.getMessage("success.attendance_ingested");
        return ResponseEntity.ok(ApiResponse.success(msg, request.getIdentityCode()));
    }

    /**
     * Lấy danh sách điểm danh theo ngày cho Live Dashboard.
     */
    @GetMapping("/daily")
    public ResponseEntity<List<DailyAttendanceSession>> getDailyAttendance(
            @RequestParam(required = false) String date
    ) {
        LocalDate queryDate = (date != null) ? LocalDate.parse(date) : LocalDate.now();
        List<DailyAttendanceSession> records = recordRepository.findBySessionDate(queryDate);
        return ResponseEntity.ok(records);
    }
}
