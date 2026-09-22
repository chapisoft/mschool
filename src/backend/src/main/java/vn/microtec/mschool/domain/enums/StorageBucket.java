package vn.microtec.mschool.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StorageBucket {
    SNAPSHOTS("mschool-snapshots"),
    BIOMETRICS("mschool-biometrics"),
    EVIDENCE("mschool-evidence");

    private final String bucketName;
}
