package vn.microtec.mschool.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TenantScope {
    DEFAULT_SCHOOL("a1000000-0000-0000-0000-000000000001"),
    SYSTEM_ADMIN("00000000-0000-0000-0000-000000000000");

    private final String tenantId;
}
