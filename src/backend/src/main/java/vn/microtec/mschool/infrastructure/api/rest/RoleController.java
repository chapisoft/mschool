package vn.microtec.mschool.infrastructure.api.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.security.RolePermission;
import vn.microtec.mschool.domain.security.SystemRole;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.RolePermissionRepository;
import vn.microtec.mschool.infrastructure.persistence.SystemRoleRepository;

import java.util.*;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final SystemRoleRepository roleRepository;
    private final RolePermissionRepository permissionRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class CreateRoleRequest {
        @NotBlank
        private String roleCode;

        @NotBlank
        private String roleName;

        private String description;
    }

    @Getter
    @Setter
    public static class PermissionItemDto {
        private String moduleCode;
        private boolean canView;
        private boolean canCreate;
        private boolean canEdit;
        private boolean canDelete;
        private boolean canApprove;
        private boolean canExport;
    }

    @Getter
    @Setter
    public static class SavePermissionsRequest {
        private List<PermissionItemDto> permissions;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SystemRole>>> getAllRoles() {
        List<SystemRole> list = roleRepository.findAll();
        // Nếu danh mục rỗng, khởi tạo 4 vai trò mặc định
        if (list.isEmpty()) {
            list = List.of(
                    SystemRole.builder().roleCode("ROLE_ADMIN").roleName("Quản Trị Viên").description("Toàn quyền cấu hình và quản trị hệ thống").isSystem(true).build(),
                    SystemRole.builder().roleCode("ROLE_SUPERVISOR").roleName("Ban Giám Hiệu").description("Giám sát sĩ số, duyệt giải trình và xem báo cáo").isSystem(true).build(),
                    SystemRole.builder().roleCode("ROLE_TEACHER").roleName("Giáo Viên").description("Xác nhận sĩ số tiết học, sổ đầu bài điện tử").isSystem(true).build(),
                    SystemRole.builder().roleCode("ROLE_SECURITY_GUARD").roleName("Nhân Viên Bảo Vệ").description("Quản lý bốt trực, tiếp nhận khách và xử lý cảnh báo").isSystem(true).build()
            );
            list = roleRepository.saveAll(list);
        }
        return ResponseEntity.ok(ApiResponse.<List<SystemRole>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("role.list.success", "Lấy danh mục nhóm quyền thành công"))
                .data(list)
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SystemRole>> createRole(@Valid @RequestBody CreateRoleRequest req) {
        if (roleRepository.existsByRoleCode(req.getRoleCode())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<SystemRole>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("role.exists", "Mã vai trò đã tồn tại"))
                    .build());
        }

        SystemRole role = SystemRole.builder()
                .roleCode(req.getRoleCode())
                .roleName(req.getRoleName())
                .description(req.getDescription())
                .isSystem(false)
                .build();
        SystemRole saved = roleRepository.save(Objects.requireNonNull(role));
        return ResponseEntity.ok(ApiResponse.<SystemRole>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("role.create.success", "Tạo nhóm quyền thành công"))
                .data(saved)
                .build());
    }

    @GetMapping("/{roleCode}/permissions")
    public ResponseEntity<ApiResponse<List<RolePermission>>> getRolePermissions(@PathVariable String roleCode) {
        List<RolePermission> permissions = permissionRepository.findByRoleCode(roleCode);
        return ResponseEntity.ok(ApiResponse.<List<RolePermission>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("role.perm.success", "Lấy ma trận phân quyền thành công"))
                .data(permissions)
                .build());
    }

    @PutMapping("/{roleCode}/permissions")
    @Transactional
    public ResponseEntity<ApiResponse<List<RolePermission>>> saveRolePermissions(
            @PathVariable String roleCode,
            @RequestBody SavePermissionsRequest req) {

        List<RolePermission> toSave = new ArrayList<>();
        if (req.getPermissions() != null) {
            for (PermissionItemDto dto : req.getPermissions()) {
                Optional<RolePermission> opt = permissionRepository.findByRoleCodeAndModuleCode(roleCode, dto.getModuleCode());
                RolePermission entity = opt.orElseGet(() -> RolePermission.builder()
                        .roleCode(roleCode)
                        .moduleCode(dto.getModuleCode())
                        .build());
                entity.setCanView(dto.isCanView());
                entity.setCanCreate(dto.isCanCreate());
                entity.setCanEdit(dto.isCanEdit());
                entity.setCanDelete(dto.isCanDelete());
                entity.setCanApprove(dto.isCanApprove());
                entity.setCanExport(dto.isCanExport());
                toSave.add(entity);
            }
        }
        List<RolePermission> saved = permissionRepository.saveAll(toSave);
        return ResponseEntity.ok(ApiResponse.<List<RolePermission>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("role.perm.saved", "Lưu ma trận phân quyền thành công"))
                .data(saved)
                .build());
    }
}
