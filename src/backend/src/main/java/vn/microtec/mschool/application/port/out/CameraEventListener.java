package vn.microtec.mschool.application.port.out;

import vn.microtec.mschool.domain.enums.CameraEventType;

@FunctionalInterface
public interface CameraEventListener {
    void onCameraEvent(String cameraId, CameraEventType eventType);
}
