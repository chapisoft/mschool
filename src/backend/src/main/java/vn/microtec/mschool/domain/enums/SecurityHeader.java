package vn.microtec.mschool.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SecurityHeader {
    X_SCHOOL_ID("X-School-Id"),
    X_USER_ROLE("X-User-Role"),
    X_USER_NAME("X-User-Name"),
    X_ASSIGNED_CLASSROOM("X-Assigned-Classroom");

    private final String headerName;
}
