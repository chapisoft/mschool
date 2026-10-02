package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.camera.DeviceCamera;
import vn.microtec.mschool.domain.enums.CameraStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceCameraRepository extends JpaRepository<DeviceCamera, String> {
    Optional<DeviceCamera> findByIpAddress(String ipAddress);
    boolean existsByIpAddress(String ipAddress);
    List<DeviceCamera> findByStatus(CameraStatus status);
}

