package vn.microtec.mschool.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.microtec.mschool.domain.camera.DeviceCamera;

@Repository
public interface DeviceCameraRepository extends JpaRepository<DeviceCamera, String> {
}
