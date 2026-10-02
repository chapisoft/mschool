"""
mschool AI Camera Worker Daemon.
Real-Time Multi-Threaded RTSP Ingestion, RTMO-s Pose Estimation,
ByteTrack Tracking, Behavioral Analytics & FastAPI MJPEG Streaming.
"""

import sys
import time
import threading
import uvicorn
import cv2
import numpy as np
from typing import Dict, List, Optional
from config import settings, CameraConfig, CameraPurpose
from pose_engine import RTMOPoseEngine
from tracker import ByteTrackTracker, SpatialTripwire, Direction
from behavior_analyzer import BehaviorAnalysisEngine
from dispatcher import EventDispatcher
import streamer


class CameraStreamProcessor(threading.Thread):
    """Tiến trình xử lý một luồng Camera IP RTSP với AI tích hợp toàn diện."""

    def __init__(self, cam_config: CameraConfig, dispatcher: EventDispatcher, pose_engine: RTMOPoseEngine):
        super().__init__(daemon=True)
        self.cam_config = cam_config
        self.dispatcher = dispatcher
        self.pose_engine = pose_engine
        self.tracker = ByteTrackTracker(max_lost_frames=30, iou_threshold=0.30)
        self.behavior_engine = BehaviorAnalysisEngine(purpose=cam_config.purpose)
        self.tripwire = SpatialTripwire(
            line_p1=cam_config.tripwire_line[0],
            line_p2=cam_config.tripwire_line[1],
            in_vector=cam_config.direction_in_vector,
        )
        self.running = True
        self.fps: float = 30.0

    def run(self):
        """Vòng lặp thu nhận video và thực thi thị giác máy tính biên theo thời gian thực."""
        rtsp_url = self.cam_config.rtsp_url
        cap = cv2.VideoCapture(rtsp_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, settings.RTSP_BUFFER_SIZE)

        last_time = time.time()
        synthetic_mode = False

        # Kiểm tra xem có kết nối RTSP vật lý hay không
        ret, test_frame = cap.read()
        if not ret or test_frame is None:
            synthetic_mode = True

        while self.running:
            now = time.time()
            dt = max(0.001, now - last_time)
            last_time = now
            self.fps = 0.9 * self.fps + 0.1 * (1.0 / dt)

            # 1. Thu nhận khung hình
            if not synthetic_mode:
                ret, frame = cap.read()
                if not ret or frame is None:
                    time.sleep(0.03)
                    continue
            else:
                # Tạo khung hình mô phỏng chuyển động trong môi trường lab
                frame = self._generate_lab_synthetic_frame(now)
                time.sleep(0.033)  # Điều chỉnh tốc độ chuẩn 30 FPS

            # 2. Suy luận thị giác máy tính: RTMO-s Single-pass
            detections = self.pose_engine.detect(frame)

            # 3. Theo dõi đa đối tượng: ByteTrack
            active_tracks = self.tracker.update(
                detections=detections,
                frame=frame,
                timestamp=now,
                desk_surface_y=self.cam_config.desk_surface_y
            )

            # 4. Phân tích hành vi & Bộ máy trạng thái khử rung
            incidents = self.behavior_engine.process(active_tracks, now)
            for incident in incidents:
                self.dispatcher.dispatch_incident_event(incident, self.cam_config.camera_id)

            # 5. Nghiệp vụ điểm danh cổng không dừng (nếu camera có mục đích GATE)
            if self.cam_config.purpose == CameraPurpose.GATE:
                for track in active_tracks:
                    duration = now - track.start_time
                    if not track.is_sent and (track.best_score >= settings.EDIF_FIQA_THRESHOLD or duration >= settings.MAX_TRACK_DURATION_SEC):
                        direction = self.tripwire.classify_direction(track.centroids)
                        if direction == Direction.UNKNOWN:
                            direction = Direction.IN if self.cam_config.direction_in_vector[1] > 0 else Direction.OUT

                        self.dispatcher.dispatch_attendance_event(
                            tracked_obj=track,
                            camera_id=self.cam_config.camera_id,
                            direction=direction,
                        )

            # 6. Vẽ đè các lớp thông tin thị giác (Visual Overlay) và cập nhật Streamer
            recent_incidents = self.dispatcher.get_recent_incidents(self.cam_config.camera_id)
            rendered_frame = self.pose_engine.render_visual_overlay(
                frame=frame,
                tracks=active_tracks,
                active_incidents=recent_incidents,
                fps=self.fps,
                camera_title=f"{self.cam_config.camera_name} ({self.cam_config.purpose.value})"
            )
            streamer.update_latest_frame(self.cam_config.camera_id, rendered_frame)

        cap.release()

    def _generate_lab_synthetic_frame(self, now: float) -> np.ndarray:
        """Tạo khung hình lab phục vụ kiểm thử và chạy ổn định khi chưa cắm camera vật lý."""
        canvas = np.zeros((480, 640, 3), dtype=np.uint8)
        # Nền lớp học / cổng trường tối trang nhã
        canvas[:] = (32, 38, 48)

        # Lưới phối cảnh sàn
        for y in range(240, 480, 40):
            cv2.line(canvas, (0, y), (640, y), (44, 52, 64), 1)

        # Đường dẫn vạch ảo nếu có
        if self.cam_config.purpose == CameraPurpose.GATE:
            p1, p2 = self.cam_config.tripwire_line
            cv2.line(canvas, p1, p2, (255, 120, 0), 2, cv2.LINE_AA)
            cv2.putText(canvas, "VACH AO DIEM DANH", (p1[0], p1[1] - 8), cv2.FONT_HERSHEY_DUPLEX, 0.45, (255, 120, 0), 1)

        # Mặt phẳng bàn nếu có
        if self.cam_config.desk_surface_y is not None:
            dy = self.cam_config.desk_surface_y
            cv2.line(canvas, (40, dy), (600, dy), (80, 100, 120), 1, cv2.LINE_AA)
            cv2.putText(canvas, "MAT BAN PHONG THI", (50, dy - 6), cv2.FONT_HERSHEY_DUPLEX, 0.45, (140, 160, 180), 1)

        # Mô phỏng người chuyển động nhẹ nhàng
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
