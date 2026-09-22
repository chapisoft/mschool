package vn.microtec.mschool.infrastructure.api.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.common.MasterCampus;
import vn.microtec.mschool.domain.common.MasterShift;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.MasterCampusRepository;
import vn.microtec.mschool.infrastructure.persistence.MasterShiftRepository;

import java.util.*;

@RestController
@RequestMapping("/api/v1/master-data")
@RequiredArgsConstructor
public class MasterDataController {

    private final MasterCampusRepository campusRepository;
    private final MasterShiftRepository shiftRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class CreateCampusRequest {
        @NotBlank
        private String campusCode;

        @NotBlank
        private String campusName;

        private String address;
        private String phone;
    }

    @Getter
    @Setter
    public static class CreateShiftRequest {
        @NotBlank
        private String shiftCode;

        @NotBlank
        private String shiftName;

        @NotBlank
        private String startTime;

        @NotBlank
        private String endTime;
    }

    // --- CAMPUSES ---
    @GetMapping("/campuses")
    public ResponseEntity<ApiResponse<List<MasterCampus>>> getCampuses() {
        List<MasterCampus> list = campusRepository.findAll();
        if (list.isEmpty()) {
            list = List.of(
                    MasterCampus.builder().campusCode("CAMPUS_01").campusName("Cơ sở 1 - Trụ sở chính").address("Số 1 Hoàng Đạo Thúy, Cầu Giấy, Hà Nội").phone("024-3999-8888").isActive(true).build(),
                    MasterCampus.builder().campusCode("CAMPUS_02").campusName("Cơ sở 2 - Khu liên cấp Thực nghiệm").address("Khu Đô thị Tây Hồ Tây, Hà Nội").phone("024-3999-9999").isActive(true).build()
            );
            list = campusRepository.saveAll(list);
        }
        return ResponseEntity.ok(ApiResponse.<List<MasterCampus>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("campus.list.success", "Lấy danh mục cơ sở trường học thành công"))
                .data(list)
                .build());
    }

    @PostMapping("/campuses")
    public ResponseEntity<ApiResponse<MasterCampus>> createCampus(@Valid @RequestBody CreateCampusRequest req) {
        if (campusRepository.findByCampusCode(req.getCampusCode()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<MasterCampus>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("campus.exists", "Mã cơ sở đã tồn tại"))
                    .build());
        }
        MasterCampus campus = MasterCampus.builder()
                .campusCode(req.getCampusCode())
                .campusName(req.getCampusName())
                .address(req.getAddress())
                .phone(req.getPhone())
                .isActive(true)
                .build();
        MasterCampus saved = campusRepository.save(Objects.requireNonNull(campus));
        return ResponseEntity.ok(ApiResponse.<MasterCampus>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("campus.create.success", "Thêm mới cơ sở trường học thành công"))
                .data(saved)
                .build());
    }

    @DeleteMapping("/campuses/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteCampus(@PathVariable UUID id) {
        if (campusRepository.existsById(Objects.requireNonNull(id))) {
            campusRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("campus.delete.success", "Xóa cơ sở thành công"))
                    .data(Map.of("id", id, "deleted", true))
                    .build());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                .message(i18nService.getMessage("campus.notfound", "Không tìm thấy cơ sở"))
                .build());
    }

    // --- SHIFTS ---
    @GetMapping("/shifts")
    public ResponseEntity<ApiResponse<List<MasterShift>>> getShifts() {
        List<MasterShift> list = shiftRepository.findAll();
        if (list.isEmpty()) {
            list = List.of(
                    MasterShift.builder().shiftCode("SHIFT_MORNING").shiftName("Ca Sáng (Chính khóa)").startTime("07:00").endTime("11:30").isActive(true).build(),
                    MasterShift.builder().shiftCode("SHIFT_AFTERNOON").shiftName("Ca Chiều (Bán trú & Tự chọn)").startTime("13:30").endTime("17:00").isActive(true).build()
            );
            list = shiftRepository.saveAll(list);
        }
        return ResponseEntity.ok(ApiResponse.<List<MasterShift>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("shift.list.success", "Lấy danh mục ca học thành công"))
                .data(list)
                .build());
    }

    @PostMapping("/shifts")
    public ResponseEntity<ApiResponse<MasterShift>> createShift(@Valid @RequestBody CreateShiftRequest req) {
        if (shiftRepository.findByShiftCode(req.getShiftCode()).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<MasterShift>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("shift.exists", "Mã ca học đã tồn tại"))
                    .build());
        }
        MasterShift shift = MasterShift.builder()
                .shiftCode(req.getShiftCode())
                .shiftName(req.getShiftName())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .isActive(true)
                .build();
        MasterShift saved = shiftRepository.save(Objects.requireNonNull(shift));
        return ResponseEntity.ok(ApiResponse.<MasterShift>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("shift.create.success", "Thêm mới ca học thành công"))
                .data(saved)
                .build());
    }

    @DeleteMapping("/shifts/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteShift(@PathVariable UUID id) {
        if (shiftRepository.existsById(Objects.requireNonNull(id))) {
            shiftRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("shift.delete.success", "Xóa ca học thành công"))
                    .data(Map.of("id", id, "deleted", true))
                    .build());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                .message(i18nService.getMessage("shift.notfound", "Không tìm thấy ca học"))
                .build());
    }
}
