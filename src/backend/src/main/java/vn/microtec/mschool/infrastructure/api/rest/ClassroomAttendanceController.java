package vn.microtec.mschool.infrastructure.api.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.classroom.ClassroomPeriodAttendance;
import vn.microtec.mschool.domain.classroom.Classroom;
import vn.microtec.mschool.domain.enums.ClassroomPeriodStatus;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.ClassroomPeriodAttendanceRepository;
import vn.microtec.mschool.infrastructure.persistence.ClassroomRepository;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/classroom-attendance")
@RequiredArgsConstructor
public class ClassroomAttendanceController {

    private final ClassroomPeriodAttendanceRepository periodAttendanceRepository;
    private final ClassroomRepository classroomRepository;
    private final I18nService i18nService;

    /**
     * Lấy danh sách điểm danh các phòng học theo ngày.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassroomPeriodAttendance>>> getClassroomAttendances(
            @RequestParam(required = false) String date
    ) {
        LocalDate queryDate = (date != null) ? LocalDate.parse(date) : LocalDate.now();
        List<ClassroomPeriodAttendance> list = periodAttendanceRepository.findByScheduleDate(queryDate);
        return ResponseEntity.ok(ApiResponse.<List<ClassroomPeriodAttendance>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("classroom.list.success", "Lấy danh sách điểm danh phòng học thành công"))
                .data(list)
                .build());
    }

    /**
     * Ma trận phòng học tổng hợp các lớp học kèm trạng thái sĩ số và điểm danh từ CSDL 100%.
     */
    @GetMapping("/matrix")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getClassroomMatrix(@RequestParam(required = false) String date) {
        LocalDate queryDate = (date != null) ? LocalDate.parse(date) : LocalDate.now();
        List<ClassroomPeriodAttendance> attendances = periodAttendanceRepository.findByScheduleDate(queryDate);
        Map<String, ClassroomPeriodAttendance> map = new HashMap<>();
        attendances.forEach(a -> map.put(a.getClassId(), a));

        List<Classroom> classrooms = classroomRepository.findAll();

        List<Map<String, Object>> matrix = new ArrayList<>();
        for (Classroom cls : classrooms) {
            ClassroomPeriodAttendance record = map.get(cls.getId());
            Map<String, Object> item = new HashMap<>();
            item.put("id", cls.getId());
            item.put("name", "Phòng " + cls.getCode());
            item.put("grade", String.valueOf(cls.getGradeLevel()));
            item.put("building", cls.getBuilding());
            item.put("floor", cls.getFloor());
            item.put("scheduledTeacher", cls.getHomeroomTeacher());
            item.put("actualTeacher", record != null && record.getActualTeacherCode() != null ? record.getActualTeacherCode() : cls.getHomeroomTeacher());
            item.put("isSubstitute", record != null && record.getActualTeacherCode() != null && !record.getActualTeacherCode().equals(cls.getHomeroomTeacher()));
            item.put("totalEnrolled", cls.getTotalStudents());
            item.put("totalPresent", record != null ? record.getTotalStudentsPresent() : 0);
            item.put("absentCount", record != null ? Math.max(0, record.getTotalStudentsEnrolled() - record.getTotalStudentsPresent()) : 0);
            
            int wrongCount = 0;
            if (record != null && record.getWrongClassStudentCodes() != null) {
                wrongCount = record.getWrongClassStudentCodes().size();
            }
            item.put("wrongClassCount", wrongCount);

            ClassroomPeriodStatus periodStatus;
            if (record == null) {
                periodStatus = ClassroomPeriodStatus.PENDING;
            } else if (wrongCount > 0) {
                periodStatus = ClassroomPeriodStatus.MISMATCH;
            } else if (record.getTotalStudentsPresent() < record.getTotalStudentsEnrolled()) {
                periodStatus = ClassroomPeriodStatus.PARTIAL;
            } else {
                periodStatus = ClassroomPeriodStatus.FULL;
            }
            item.put("status", periodStatus.name());
            item.put("lastPeriod", record != null ? record.getPeriodNumber() : null);
            item.put("isConfirmed", record != null && Boolean.TRUE.equals(record.getIsConfirmedByTeacher()));
            matrix.add(item);
        }
        return ResponseEntity.ok(ApiResponse.<List<Map<String, Object>>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("classroom.matrix.success", "Lấy ma trận phòng học thành công"))
                .data(matrix)
                .build());
    }

    /**
     * Giáo viên xác nhận Sổ đầu bài điện tử bằng 1 chạm.
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<ClassroomPeriodAttendance>> confirmClassroomPeriod(@PathVariable UUID id) {
        java.util.Optional<ClassroomPeriodAttendance> optional = periodAttendanceRepository.findById(Objects.requireNonNull(id));
        if (optional.isPresent()) {
            ClassroomPeriodAttendance record = optional.get();
            record.setIsConfirmedByTeacher(true);
            ClassroomPeriodAttendance saved = periodAttendanceRepository.save(record);
            return ResponseEntity.ok(ApiResponse.<ClassroomPeriodAttendance>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("classroom.confirm.success", "Đã xác nhận sổ đầu bài điện tử thành công"))
                    .data(saved)
                    .build());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<ClassroomPeriodAttendance>builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                .message(i18nService.getMessage("classroom.notfound", "Không tìm thấy dữ liệu đối soát phòng học"))
                .build());
    }
}
