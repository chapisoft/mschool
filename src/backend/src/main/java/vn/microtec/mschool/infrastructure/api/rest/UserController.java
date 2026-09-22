package vn.microtec.mschool.infrastructure.api.rest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.microtec.mschool.application.service.I18nService;
import vn.microtec.mschool.domain.enums.ErrorCode;
import vn.microtec.mschool.domain.enums.ResponseStatus;
import vn.microtec.mschool.domain.enums.UserRole;
import vn.microtec.mschool.domain.security.SystemUser;
import vn.microtec.mschool.infrastructure.api.dto.ApiResponse;
import vn.microtec.mschool.infrastructure.persistence.SystemUserRepository;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final SystemUserRepository userRepository;
    private final I18nService i18nService;

    @Getter
    @Setter
    public static class CreateUserRequest {
        @NotBlank
        private String username;

        @NotBlank
        private String fullName;

        private String email;
        private String phone;

        @NotNull
        private UserRole roleCode;

        private String password;
    }

    @Getter
    @Setter
    public static class UpdateUserRequest {
        private String fullName;
        private String email;
        private String phone;
        private UserRole roleCode;
        private Boolean isActive;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SystemUser>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role) {
        List<SystemUser> list = userRepository.findAll();
        if (role != null) {
            list = list.stream().filter(u -> u.getRoleCode() == role).toList();
        }
        if (search != null && !search.trim().isEmpty()) {
            String q = search.toLowerCase();
            list = list.stream().filter(u ->
                    u.getUsername().toLowerCase().contains(q) ||
                    u.getFullName().toLowerCase().contains(q) ||
                    (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) ||
                    (u.getPhone() != null && u.getPhone().contains(q))
            ).toList();
        }
        return ResponseEntity.ok(ApiResponse.<List<SystemUser>>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("user.list.success", "Lấy danh sách người dùng thành công"))
                .data(list)
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SystemUser>> createUser(@Valid @RequestBody CreateUserRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.<SystemUser>builder()
                    .status(ResponseStatus.ERROR)
                    .code(ErrorCode.ERR_PARAMETERS_INVALID.name())
                    .message(i18nService.getMessage("user.exists", "Tên đăng nhập đã tồn tại trong hệ thống"))
                    .build());
        }

        String initialHash = (req.getPassword() != null && !req.getPassword().trim().isEmpty())
                ? req.getPassword() : "Admin@2026";

        SystemUser user = SystemUser.builder()
                .username(req.getUsername())
                .passwordHash(initialHash)
                .fullName(req.getFullName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .roleCode(req.getRoleCode())
                .isActive(true)
                .build();

        SystemUser saved = userRepository.save(Objects.requireNonNull(user));
        return ResponseEntity.ok(ApiResponse.<SystemUser>builder()
                .status(ResponseStatus.SUCCESS)
                .code(ErrorCode.SYS_SUCCESS_0000.name())
                .message(i18nService.getMessage("user.create.success", "Tạo tài khoản người dùng thành công"))
                .data(saved)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SystemUser>> updateUser(@PathVariable UUID id, @RequestBody UpdateUserRequest req) {
        return userRepository.findById(Objects.requireNonNull(id))
                .map(user -> {
                    if (req.getFullName() != null) user.setFullName(req.getFullName());
                    if (req.getEmail() != null) user.setEmail(req.getEmail());
                    if (req.getPhone() != null) user.setPhone(req.getPhone());
                    if (req.getRoleCode() != null) user.setRoleCode(req.getRoleCode());
                    if (req.getIsActive() != null) user.setIsActive(req.getIsActive());
                    SystemUser updated = userRepository.save(user);
                    return ResponseEntity.ok(ApiResponse.<SystemUser>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(i18nService.getMessage("user.update.success", "Cập nhật thông tin người dùng thành công"))
                            .data(updated)
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<SystemUser>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                        .message(i18nService.getMessage("user.notfound", "Không tìm thấy người dùng"))
                        .build()));
    }

    @PostMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<SystemUser>> toggleStatus(@PathVariable UUID id) {
        return userRepository.findById(Objects.requireNonNull(id))
                .map(user -> {
                    user.setIsActive(!user.getIsActive());
                    SystemUser updated = userRepository.save(user);
                    return ResponseEntity.ok(ApiResponse.<SystemUser>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(i18nService.getMessage("user.status.success", "Cập nhật trạng thái người dùng thành công"))
                            .data(updated)
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<SystemUser>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                        .message(i18nService.getMessage("user.notfound", "Không tìm thấy người dùng"))
                        .build()));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resetPassword(@PathVariable UUID id) {
        return userRepository.findById(Objects.requireNonNull(id))
                .map(user -> {
                    user.setPasswordHash("Admin@2026");
                    userRepository.save(user);
                    return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                            .status(ResponseStatus.SUCCESS)
                            .code(ErrorCode.SYS_SUCCESS_0000.name())
                            .message(i18nService.getMessage("user.resetpwd.success", "Đặt lại mật khẩu về mặc định thành công"))
                            .data(Map.of("id", id, "defaultPassword", "Admin@2026"))
                            .build());
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                        .status(ResponseStatus.ERROR)
                        .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                        .message(i18nService.getMessage("user.notfound", "Không tìm thấy người dùng"))
                        .build()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteUser(@PathVariable UUID id) {
        if (userRepository.existsById(Objects.requireNonNull(id))) {
            userRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                    .status(ResponseStatus.SUCCESS)
                    .code(ErrorCode.SYS_SUCCESS_0000.name())
                    .message(i18nService.getMessage("user.delete.success", "Xóa tài khoản người dùng thành công"))
                    .data(Map.of("id", id, "deleted", true))
                    .build());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.<Map<String, Object>>builder()
                .status(ResponseStatus.ERROR)
                .code(ErrorCode.ATT_ERR_RECORD_NOT_FOUND.name())
                .message(i18nService.getMessage("user.notfound", "Không tìm thấy người dùng"))
                .build());
    }
}
