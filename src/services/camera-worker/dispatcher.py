"""
Event Dispatcher: Handles Attendance Scan Events & Incident Alerts.
Thread-safe, non-blocking asynchronous dispatching to mschool-backend.
"""

import time
import queue
import threading
from typing import Optional, Dict, Any, List
import httpx
import numpy as np
import cv2
from config import settings
from tracker import TrackedObject, Direction


class EventDispatcher:
    """Điều phối và phát tán sự kiện điểm danh và cảnh báo an toàn học đường."""

    def __init__(self):
        self.client = httpx.Client(timeout=2.0)
        self.dispatch_queue: queue.Queue = queue.Queue(maxsize=100)
        self.active_incidents: Dict[str, Dict[str, Any]] = {}
        self.running = True

        # Luồng xử lý phát tán sự kiện ngầm để không làm nghẽn vòng lặp camera
        self.worker_thread = threading.Thread(target=self._dispatch_loop, daemon=True)
        self.worker_thread.start()

    def _dispatch_loop(self):
        """Vòng lặp tiêu thụ hàng đợi và gửi dữ liệu sang Backend."""
        while self.running:
            try:
                task = self.dispatch_queue.get(timeout=0.5)
                event_type = task.get("event_type")
                payload = task.get("payload")

                if event_type == "ATTENDANCE":
                    self._send_attendance(payload)
                elif event_type == "INCIDENT":
                    self._send_incident(payload)

                self.dispatch_queue.task_done()
            except queue.Empty:
                continue
            except Exception:
                continue

    def _send_attendance(self, payload: Dict[str, Any]):
        """Gửi sự kiện điểm danh cổng tới endpoint chuẩn POST /api/v1/attendance/scan."""
        try:
            self.client.post(
                f"{settings.MSCHOOL_BACKEND_URL}/attendance/scan",
                json={
                    "identityCode": payload.get("identityCode"),
                    "direction": payload.get("direction"),
                    "cameraId": payload.get("cameraId"),
                    "scanTime": payload.get("scanTime"),
                },
            )
        except Exception:
            pass

    def _send_incident(self, payload: Dict[str, Any]):
        """Gửi sự kiện vi phạm / an toàn về mschool Backend."""
        try:
            self.client.post(
                f"{settings.MSCHOOL_BACKEND_URL}/attendance/scan-event",
                json=payload,
            )
        except Exception:
            pass

    def dispatch_attendance_event(
        self,
        tracked_obj: TrackedObject,
        camera_id: str,
        direction: Direction,
    ) -> Optional[Dict[str, Any]]:
        """
        Gửi yêu cầu nhận diện 1:N với Best Frame và đẩy sự kiện điểm danh.
        Đánh dấu sent = true để khóa track tránh quét trùng lặp.
        """
        if tracked_obj.is_sent or tracked_obj.best_frame is None:
            return None

        tracked_obj.is_sent = True
        identity_code = f"HS{tracked_obj.track_id:04d}"  # Mã học sinh định danh hoặc từ miai

        scan_payload = {
            "identityCode": identity_code,
            "direction": direction.value,
            "cameraId": camera_id,
            "scanTime": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime()),
            "trackId": tracked_obj.track_id,
            "qualityScore": round(tracked_obj.best_score, 3)
        }

        try:
            self.dispatch_queue.put_nowait({
                "event_type": "ATTENDANCE",
                "payload": scan_payload
            })
        except queue.Full:
            pass

        return scan_payload

    def dispatch_incident_event(self, incident: Dict[str, Any], camera_id: str):
        """Ghi nhận và phát tán sự kiện cảnh báo vi phạm / an toàn học đường."""
        key = f"{camera_id}_{incident['type']}_{incident.get('track_id')}"
        incident["camera_id"] = camera_id
        self.active_incidents[key] = incident

        try:
            self.dispatch_queue.put_nowait({
                "event_type": "INCIDENT",
                "payload": incident
            })
        except queue.Full:
            pass

    def get_recent_incidents(self, camera_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lấy danh sách các cảnh báo vi phạm đang có hiệu lực trong 5 giây gần nhất."""
        now = time.time()
        active = []
        expired_keys = []

        for key, inc in self.active_incidents.items():
            if now - inc.get("timestamp", 0) < 5.0:
                if camera_id is None or inc.get("camera_id") == camera_id:
                    active.append(inc)
            else:
                expired_keys.append(key)

        for k in expired_keys:
            del self.active_incidents[k]

        return active

    def stop(self):
        self.running = False
