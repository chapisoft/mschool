package vn.microtec.mschool.infrastructure.api.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.biometric.FaceBiometricProfile;
import vn.microtec.mschool.domain.classroom.Classroom;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.ClassroomRepository;
import vn.microtec.mschool.infrastructure.persistence.FaceBiometricProfileRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomRepository classroomRepository;
    private final FaceBiometricProfileRepository biometricProfileRepository;
    private final I18nService i18nService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Classroom>>> getAllClassrooms(@RequestParam(required = false) Integer grade) {
        List<Classroom> list = (grade != null) ? classroomRepository.findByGradeLevel(grade)
                : classroomRepository.findAllByOrderByGradeLevelAscCodeAsc();
        return ResponseEntity.ok(ApiResponse.<List<Classroom>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("classroom.list.success", "Lấy danh sách lớp học thành công"))
                .data(list)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Classroom>> getClassroomById(@PathVariable String id) {
        return classroomRepository.findById(id)
                .map(cls -> ResponseEntity.ok(ApiResponse.<Classroom>builder()
                        .status(ResponseStatus.SUCCESS)
                        .code(ErrorCode.SYS_SUCCESS_0000.name())
                        .message(i18nService.getMessage("classroom.detail.success", "Lấy thông tin chi tiết lớp học thành công"))
                        .data(cls)
                        .build()))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Classroom>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                        .message(i18nService.getMessage("classroom.notfound", "Không tìm thấy lớp học"))
                        .build()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Classroom>> createClassroom(@RequestBody Classroom newClass) {
        if (newClass.getId() == null || newClass.getId().trim().isEmpty()) {
            newClass.setId(newClass.getCode());
        }
        if (newClass.getCreatedAt() == null) {
            newClass.setCreatedAt(OffsetDateTime.now());
        }
        if (newClass.getTotalStudents() == null) {
            newClass.setTotalStudents(0);
        }
        Classroom saved = classroomRepository.save(newClass);
        return ResponseEntity.ok(ApiResponse.<Classroom>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("classroom.create.success", "Thêm lớp học thành công"))
                .data(saved)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Classroom>> updateClassroom(@PathVariable String id, @RequestBody Classroom req) {
        return classroomRepository.findById(id)
                .map(cls -> {
                    if (req.getName() != null) cls.setName(req.getName());
                    if (req.getGradeLevel() != null) cls.setGradeLevel(req.getGradeLevel());
                    if (req.getRoom() != null) cls.setRoom(req.getRoom());
                    if (req.getBuilding() != null) cls.setBuilding(req.getBuilding());
                    if (req.getFloor() != null) cls.setFloor(req.getFloor());
                    if (req.getHomeroomTeacher() != null) cls.setHomeroomTeacher(req.getHomeroomTeacher());
                    if (req.getTotalStudents() != null) cls.setTotalStudents(req.getTotalStudents());
                    Classroom saved = classroomRepository.save(cls);
                    return ResponseEntity.ok(ApiResponse.<Classroom>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(i18nService.getMessage("classroom.update.success", "Cập nhật lớp học thành công"))
                            .data(saved)
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Classroom>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                        .message(i18nService.getMessage("classroom.notfound", "Không tìm thấy lớp học"))
                        .build()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteClassroom(@PathVariable String id) {
        if (classroomRepository.existsById(Objects.requireNonNull(id))) {
            classroomRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("classroom.delete.success", "Xóa lớp học thành công"))
                    .data(Map.of("id", id, "deleted", true))
                    .build());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                .message(i18nService.getMessage("classroom.notfound", "Không tìm thấy lớp học"))
                .build());
    }

    @GetMapping("/{id}/students")
    public ResponseEntity<ApiResponse<List<FaceBiometricProfile>>> getStudentsInClass(@PathVariable String id) {
        List<FaceBiometricProfile> list = biometricProfileRepository.findByDepartmentOrClass(id);
        return ResponseEntity.ok(ApiResponse.<List<FaceBiometricProfile>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("classroom.students.success", "Lấy danh sách học sinh của lớp thành công"))
                .data(list)
                .build());
    }
}
