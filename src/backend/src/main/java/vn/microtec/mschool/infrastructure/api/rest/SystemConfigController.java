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
import vn.microtec.mschool.domain.enums.SystemConfigGroup;
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
                ? parameterRepository.findByParamGroup(group.trim())
                : parameterRepository.findAll();

        return ResponseEntity.ok(ApiResponse.<List<SystemParameter>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("sysconfig.list.success", "Configuration parameters retrieved successfully"))
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
                        .paramGroup(dto.getParamGroup() != null ? dto.getParamGroup() : SystemConfigGroup.GENERAL.name())
                        .build());
                entity.setParamValue(dto.getParamValue());
                if (dto.getDescription() != null) entity.setDescription(dto.getDescription());
                savedList.add(parameterRepository.save(entity));
            }
        }
        return ResponseEntity.ok(ApiResponse.<List<SystemParameter>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("sysconfig.update.success", "System configuration updated successfully"))
                .data(savedList)
                .build());
    }
}
