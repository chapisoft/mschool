package vn.microtec.mschool.application.port.out;

import vn.microtec.mschool.domain.camera.DeviceCamera;

/**
 * Cổng giao tiếp thiết bị Camera ngoại vi (Outbound Port trong kiến trúc Hexagonal).
 * Định nghĩa các thao tác trích xuất hình ảnh và lắng nghe sự kiện phần cứng từ Camera.
 */
public interface CameraDevicePort {

    byte[] captureFrame(DeviceCamera camera);

    void startEventListener(DeviceCamera camera, CameraEventListener listener);

    void stopEventListener(String cameraId);

    boolean isEventListenerActive(String cameraId);
}
