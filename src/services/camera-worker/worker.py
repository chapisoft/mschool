import os
# Thiết lập các biến môi trường giới hạn đơn luồng và vô hiệu hóa busy-wait spin-loop của OpenMP/OpenBLAS
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["OMP_WAIT_POLICY"] = "PASSIVE"

import sys
import time
import socket
import urllib.parse
import threading
import uvicorn
import cv2
import numpy as np

# Giới hạn OpenCV chỉ dùng 1 luồng nội bộ để triệt tiêu hiện tượng Thread Explosion
cv2.setNumThreads(1)
try:
    cv2.ocl.setUseOpenCL(False)
except Exception:
    pass

from typing import Dict, List, Optional
from config import settings, CameraConfig, CameraPurpose
from pose_engine import RTMOPoseEngine
from tracker import ByteTrackTracker, SpatialTripwire, Direction
from behavior_analyzer import BehaviorAnalysisEngine
from face_quality import FaceQualityEngine
from dispatcher import EventDispatcher
import streamer


def check_rtsp_reachability(rtsp_url: str, timeout: float = 0.8) -> bool:
    """
    Kiểm tra nhanh kết nối TCP tới cổng RTSP của camera trước khi khởi tạo VideoCapture.
    Tránh trường hợp OpenCV ffmpeg bị treo chặn luồng 30 giây và rò rỉ thread ngầm khi camera ngoại tuyến.
    """
    try:
        parsed = urllib.parse.urlparse(rtsp_url)
        host = parsed.hostname
        port = parsed.port or 554
        if not host:
            return False
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


class CameraStreamProcessor(threading.Thread):
    """Tiến trình xử lý một luồng Camera IP RTSP với AI tích hợp toàn diện và kiểm soát tải thông minh."""

    def __init__(self, cam_config: CameraConfig, dispatcher: EventDispatcher, pose_engine: RTMOPoseEngine):
        super().__init__(daemon=True)
        self.cam_config = cam_config
        self.dispatcher = dispatcher
        self.pose_engine = pose_engine
        self.tracker = ByteTrackTracker(max_lost_frames=30, iou_threshold=0.30)
        self.behavior_engine = BehaviorAnalysisEngine(purpose=cam_config.purpose)
        self.fqa_engine = FaceQualityEngine(
            min_laplacian_var=settings.MIN_LAPLACIAN_VAR,
            min_face_size=settings.MIN_FACE_SIZE,
            min_iod=settings.MIN_IOD,
            max_yaw=settings.MAX_FACE_YAW_DEGREE,
            max_pitch=settings.MAX_FACE_PITCH_DEGREE,
            max_roll=settings.MAX_FACE_ROLL_DEGREE,
            min_ire=settings.MIN_FACE_BRIGHTNESS_IRE,
            max_ire=settings.MAX_FACE_BRIGHTNESS_IRE,
        )
        self.tripwire = SpatialTripwire(
            line_p1=cam_config.tripwire_line[0],
            line_p2=cam_config.tripwire_line[1],
            in_vector=cam_config.direction_in_vector,
        )
        self.running = True
        self.fps: float = 30.0
        self.synthetic_mode = True
        self.cap: Optional[cv2.VideoCapture] = None

    def run(self):
        """Vòng lặp thu nhận video và thực thi thị giác máy tính biên theo thời gian thực."""
        rtsp_url = self.cam_config.rtsp_url
        last_time = time.time()
        last_reconnect_check = 0.0
        reconnect_interval = 60.0  # Chu kỳ kiểm tra kết nối lại camera vật lý (giây)

        while self.running:
            now = time.time()
            dt = max(0.001, now - last_time)
            last_time = now
            self.fps = 0.9 * self.fps + 0.1 * (1.0 / dt)

            # 1. Quản lý kết nối camera vật lý: Kiểm tra TCP trước, chỉ mở VideoCapture khi kết nối thành công
            if self.cap is None and (now - last_reconnect_check >= reconnect_interval):
                last_reconnect_check = now
                if check_rtsp_reachability(rtsp_url, timeout=0.8):
                    try:
                        temp_cap = cv2.VideoCapture(rtsp_url)
                        temp_cap.set(cv2.CAP_PROP_BUFFERSIZE, settings.RTSP_BUFFER_SIZE)
                        ret, test_frame = temp_cap.read()
                        if ret and test_frame is not None:
                            self.cap = temp_cap
                            self.synthetic_mode = False
                        else:
                            temp_cap.release()
                            self.cap = None
                            self.synthetic_mode = True
                    except Exception:
                        self.cap = None
                        self.synthetic_mode = True
                else:
                    self.synthetic_mode = True

            # 2. Thu nhận khung hình theo chế độ hoạt động
            frame = None
            if not self.synthetic_mode and self.cap is not None:
                ret, frame = self.cap.read()
                if not ret or frame is None:
                    # Mất kết nối RTSP đột ngột: giải phóng ngay VideoCapture để tránh rò rỉ luồng ffmpeg
                    try:
                        self.cap.release()
                    except Exception:
                        pass
                    self.cap = None
                    self.synthetic_mode = True
                    last_reconnect_check = now
                    time.sleep(1.0)
                    continue
            else:
                # Chế độ mô phỏng / camera chờ: Kiểm tra xem có người xem trực tiếp qua Web CMS hay không
                viewers = streamer.get_active_viewers_count() if hasattr(streamer, "get_active_viewers_count") else 0
                if viewers == 0:
                    # Chế độ ngủ tiết kiệm tài nguyên tuyệt đối (Idle Eco Mode):
                    # Khi không có người xem và chưa có camera vật lý, tạm dừng 1.5 giây và chỉ tạo khung hình chờ
                    time.sleep(1.5)
                    rendered_frame = self._generate_idle_placeholder_frame(now)
                    streamer.update_latest_frame(self.cam_config.camera_id, rendered_frame)
                    continue
                else:
                    # Có người xem trực tiếp qua Web CMS: Duy trì 10 FPS và dựng khung hình mô phỏng lab
                    time.sleep(0.100)
                    frame = self._generate_lab_synthetic_frame(now)

            if frame is None:
                continue

            # 3. Suy luận thị giác máy tính: RTMO-s Single-pass
            detections = self.pose_engine.detect(frame)

            # 4. Theo dõi đa đối tượng: ByteTrack
            active_tracks = self.tracker.update(
                detections=detections,
                frame=frame,
                timestamp=now,
                desk_surface_y=self.cam_config.desk_surface_y
            )

            # 5. Đánh giá chất lượng khuôn mặt (FQA) & Trích xuất Best-Shots đa khung hình
            for track in active_tracks:
                face_crop, _ = self.fqa_engine.extract_face_crop(
                    frame=frame,
                    keypoints=track.keypoints,
                    person_bbox=track.bbox
                )
                if face_crop is not None and face_crop.size > 0:
                    quality = self.fqa_engine.evaluate_quality(face_crop, track.keypoints)
                    embedding = self.fqa_engine.extract_simulated_adaface_embedding(face_crop)
                    track.add_face_candidate(
                        face_crop=face_crop,
                        full_frame=frame,
                        quality=quality,
                        timestamp=now,
                        embedding=embedding,
                        max_candidates=settings.MULTI_FRAME_FUSION_COUNT
                    )

            # 6. Phân tích hành vi & Bộ máy trạng thái khử rung
            incidents = self.behavior_engine.process(active_tracks, now)
            for incident in incidents:
                self.dispatcher.dispatch_incident_event(incident, self.cam_config.camera_id)

            # 7. Nghiệp vụ điểm danh cổng không dừng (khi có camera vật lý kết nối thực tế)
            if self.cam_config.purpose == CameraPurpose.GATE and not self.synthetic_mode:
                for track in active_tracks:
                    duration = now - track.start_time
                    should_dispatch = not track.is_sent and (
                        track.has_usable_face()
                        or track.best_score >= 0.50
                        or duration >= settings.MAX_TRACK_DURATION_SEC
                    )
                    if should_dispatch and (track.best_frame is not None or track.best_face_crop is not None):
                        direction = self.tripwire.classify_direction(track.centroids)
                        if direction == Direction.UNKNOWN:
                            direction = Direction.IN if self.cam_config.direction_in_vector[1] > 0 else Direction.OUT

                        self.dispatcher.dispatch_attendance_event(
                            tracked_obj=track,
                            camera_id=self.cam_config.camera_id,
                            direction=direction,
                        )

            # 8. Vẽ đè các lớp thông tin thị giác (Visual Overlay) và cập nhật Streamer
            recent_incidents = self.dispatcher.get_recent_incidents(self.cam_config.camera_id)
            rendered_frame = self.pose_engine.render_visual_overlay(
                frame=frame,
                tracks=active_tracks,
                active_incidents=recent_incidents,
                fps=self.fps,
                camera_title=f"{self.cam_config.camera_name} ({self.cam_config.purpose.value})"
            )
            streamer.update_latest_frame(self.cam_config.camera_id, rendered_frame)

        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def _generate_idle_placeholder_frame(self, now: float) -> np.ndarray:
        """Tạo khung hình chờ tiết kiệm tài nguyên khi camera ngoại tuyến và không có người xem trực tiếp."""
        canvas = np.zeros((480, 640, 3), dtype=np.uint8)
        canvas[:] = (24, 28, 36)
        cv2.rectangle(canvas, (10, 10), (630, 470), (45, 55, 72), 1)
        cv2.line(canvas, (20, 42), (620, 42), (40, 50, 65), 1)
        title = f"{self.cam_config.camera_name} [{self.cam_config.camera_id}]"
        cv2.putText(canvas, title, (25, 30), cv2.FONT_HERSHEY_DUPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
        status_text = "CHE DO CHO (CAMERA NGOAI TUYEN - TIET KIEM TAI NGUYEN)"
        cv2.putText(canvas, status_text, (65, 240), cv2.FONT_HERSHEY_DUPLEX, 0.45, (148, 163, 184), 1, cv2.LINE_AA)
        time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))
        cv2.putText(canvas, f"Thoi gian: {time_str}", (25, 455), cv2.FONT_HERSHEY_DUPLEX, 0.45, (100, 116, 139), 1, cv2.LINE_AA)
        return canvas

    def _generate_lab_synthetic_frame(self, now: float) -> np.ndarray:
        """Tạo khung hình lab phục vụ kiểm thử và chạy ổn định khi chưa cắm camera vật lý."""
        canvas = np.zeros((480, 640, 3), dtype=np.uint8)
        canvas[:] = (32, 38, 48)

        for y in range(240, 480, 40):
            cv2.line(canvas, (0, y), (640, y), (44, 52, 64), 1)

        if self.cam_config.purpose == CameraPurpose.GATE:
            p1, p2 = self.cam_config.tripwire_line
            cv2.line(canvas, p1, p2, (255, 120, 0), 2, cv2.LINE_AA)
            cv2.putText(canvas, "VACH AO DIEM DANH", (p1[0], p1[1] - 8), cv2.FONT_HERSHEY_DUPLEX, 0.45, (255, 120, 0), 1)

        if self.cam_config.desk_surface_y is not None:
            dy = self.cam_config.desk_surface_y
            cv2.line(canvas, (40, dy), (600, dy), (80, 100, 120), 1, cv2.LINE_AA)
            cv2.putText(canvas, "MAT BAN PHONG THI", (50, dy - 6), cv2.FONT_HERSHEY_DUPLEX, 0.45, (140, 160, 180), 1)

        phase = now * 0.8
        cx = int(320 + 80 * np.sin(phase))
        cy = int(260 + 20 * np.cos(phase))
        cv2.rectangle(canvas, (cx - 40, cy - 80), (cx + 40, cy + 100), (60, 70, 85), -1)

        return canvas

    def stop(self):
        self.running = False


def main():
    dispatcher = EventDispatcher()
    streamer.set_event_dispatcher(dispatcher)

    pose_engine = RTMOPoseEngine(
        model_path=settings.RTMO_MODEL_PATH,
        provider=settings.ONNX_EXECUTION_PROVIDER,
        confidence_threshold=settings.CONFIDENCE_THRESHOLD,
    )

    processors: List[CameraStreamProcessor] = []
    for cam in settings.CAMERAS:
        proc = CameraStreamProcessor(cam_config=cam, dispatcher=dispatcher, pose_engine=pose_engine)
        proc.start()
        processors.append(proc)

    # Khởi chạy FastAPI Streaming Server trên cổng cấu hình (mặc định 8090)
    config = uvicorn.Config(
        app=streamer.app,
        host=settings.STREAM_HOST,
        port=settings.STREAM_PORT,
        log_level="warning"
    )
    server = uvicorn.Server(config)

    try:
        server.run()
    except KeyboardInterrupt:
        for proc in processors:
            proc.stop()
        dispatcher.stop()


if __name__ == "__main__":
    main()
