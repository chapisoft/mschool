package vn.microtec.mschool.infrastructure.api.rest;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.common.SystemParameter;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.SystemParameterRepository;

import java.util.*;

@RestController
@RequestMapping("/api/v1/system-configs")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemParameterRepository parameterRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class ConfigItemDto {
        private String paramKey;
        private String paramValue;
        private String paramGroup;
        private String description;
    }

    @Getter
    @Setter
    public static class UpdateConfigsRequest {
        private List<ConfigItemDto> configs;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SystemParameter>>> getAllConfigs(@RequestParam(required = false) String group) {
        List<SystemParameter> list = (group != null && !group.trim().isEmpty())
                ? parameterRepository.findByParamGroup(group)
                : parameterRepository.findAll();

        if (list.isEmpty()) {
            // Khởi tạo các tham số mặc định chuẩn
            List<SystemParameter> defaults = List.of(
                    SystemParameter.builder().paramKey("AI_FIQA_MIN_SCORE").paramValue("0.85").paramGroup("AI").description("Ngưỡng điểm chất lượng ảnh khuôn mặt tối thiểu FIQA").build(),
                    SystemParameter.builder().paramKey("AI_SIMILARITY_THRESHOLD").paramValue("0.78").paramGroup("AI").description("Ngưỡng tương đồng véc-tơ cosine khuôn mặt").build(),
                    SystemParameter.builder().paramKey("GATE_COOLDOWN_SECONDS").paramValue("90").paramGroup("ATTENDANCE").description("Thời gian giãn cách chống quét lặp tại cổng").build(),
                    SystemParameter.builder().paramKey("MORNING_LATE_CUTOFF").paramValue("07:30").paramGroup("ATTENDANCE").description("Mốc thời gian giới hạn điểm danh muộn buổi sáng").build(),
                    SystemParameter.builder().paramKey("AFTERNOON_DEPARTURE_START").paramValue("16:00").paramGroup("ATTENDANCE").description("Mốc thời gian bắt đầu quét ra về buổi chiều").build(),
                    SystemParameter.builder().paramKey("NOTIF_ZNS_ENABLED").paramValue("true").paramGroup("NOTIFICATION").description("Bật gửi thông báo qua Zalo ZNS").build(),
                    SystemParameter.builder().paramKey("NOTIF_SMS_ENABLED").paramValue("false").paramGroup("NOTIFICATION").description("Bật gửi tin nhắn SMS Brandname dự phòng").build(),
                    SystemParameter.builder().paramKey("NOTIF_APP_PUSH_ENABLED").paramValue("true").paramGroup("NOTIFICATION").description("Bật đẩy thông báo tức thời qua App Push (FCM)").build(),
                    SystemParameter.builder().paramKey("SNAPSHOT_RETENTION_DAYS").paramValue("90").paramGroup("STORAGE").description("Thời hạn lưu trữ ảnh chụp điểm danh (ngày)").build(),
                    SystemParameter.builder().paramKey("STRANGER_RETENTION_HOURS").paramValue("24").paramGroup("STORAGE").description("Thời hạn tự hủy ảnh người lạ theo Nghị định 13 (giờ)").build()
            );
            list = parameterRepository.saveAll(defaults);
        }

        return ResponseEntity.ok(ApiResponse.<List<SystemParameter>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("sysconfig.list.success", "Lấy danh mục tham số cấu hình thành công"))
                .data(list)
                .build());
    }

    @PutMapping
    @Transactional
    public ResponseEntity<ApiResponse<List<SystemParameter>>> updateConfigs(@RequestBody UpdateConfigsRequest req) {
        List<SystemParameter> savedList = new ArrayList<>();
        if (req.getConfigs() != null) {
            for (ConfigItemDto dto : req.getConfigs()) {
                Optional<SystemParameter> opt = parameterRepository.findByParamKey(dto.getParamKey());
                SystemParameter entity = opt.orElseGet(() -> SystemParameter.builder()
                        .paramKey(dto.getParamKey())
                        .paramGroup(dto.getParamGroup() != null ? dto.getParamGroup() : "GENERAL")
                        .build());
                entity.setParamValue(dto.getParamValue());
                if (dto.getDescription() != null) entity.setDescription(dto.getDescription());
                savedList.add(parameterRepository.save(entity));
            }
        }
        return ResponseEntity.ok(ApiResponse.<List<SystemParameter>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("sysconfig.update.success", "Cập nhật tham số hệ thống thành công"))
                .data(savedList)
                .build());
    }
}
