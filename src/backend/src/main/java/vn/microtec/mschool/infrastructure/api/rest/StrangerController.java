package vn.microtec.mschool.infrastructure.api.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.security.StrangerAccessLog;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.StrangerAccessLogRepository;

import java.util.List;

@RestController
@RequestMapping("/api/v1/strangers")
@RequiredArgsConstructor
public class StrangerController {

    private final StrangerAccessLogRepository strangerLogRepository;
    private final I18nService i18nService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StrangerAccessLog>>> getAllStrangers() {
        List<StrangerAccessLog> list = strangerLogRepository.findAll();
        return ResponseEntity.ok(ApiResponse.<List<StrangerAccessLog>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("stranger.list.success", "Lấy danh sách cảnh báo người lạ thành công"))
                .data(list)
                .build());
    }
}
