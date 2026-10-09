"""
FastAPI MJPEG Streaming & Real-Time Incident Broadcast Server.
Enables browser-based live monitoring with full Skeleton & Bounding Box overlay.
"""

import time
import asyncio
from typing import Dict, Optional, Generator
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from dispatcher import EventDispatcher


app = FastAPI(
    title="mschool AI Camera Streaming & Incident Server",
    version="2.0.0",
    description="High-performance MJPEG streaming with RTMO-s Skeleton overlay and WebSocket alerts"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bộ đệm lưu trữ khung hình mới nhất của từng camera: {camera_id: np.ndarray}
_latest_rendered_frames: Dict[str, np.ndarray] = {}
_connected_websockets: list = []
_active_mjpeg_streams: int = 0
_event_dispatcher: Optional[EventDispatcher] = None


def set_event_dispatcher(dispatcher: EventDispatcher):
    global _event_dispatcher
    _event_dispatcher = dispatcher


def get_active_viewers_count() -> int:
    """Trả về tổng số client đang kết nối theo dõi trực tiếp (MJPEG + WebSocket)."""
    return len(_connected_websockets) + _active_mjpeg_streams


def update_latest_frame(camera_id: str, frame: np.ndarray):
    """Cập nhật khung hình đã render overlay của camera."""
    _latest_rendered_frames[camera_id] = frame


def find_latest_frame(camera_id: str) -> Optional[np.ndarray]:
    """Tìm khung hình mới nhất theo camera_id hoặc các biến thể định danh (slug/uppercase/lowercase)."""
    if not _latest_rendered_frames:
        return None
    candidates = [
        camera_id,
        camera_id.lower(),
        camera_id.upper(),
        camera_id.lower().replace('_', '-'),
        camera_id.upper().replace('-', '_'),
    ]
    for cid in candidates:
        if cid in _latest_rendered_frames:
            return _latest_rendered_frames[cid]
    # Fallback: Trả về khung hình của camera đầu tiên đang phát luồng
    return next(iter(_latest_rendered_frames.values()))


def generate_mjpeg_stream(camera_id: str) -> Generator[bytes, None, None]:
    """Sinh luồng byte MJPEG multipart/x-mixed-replace với kiểm soát tốc độ khung hình."""
    global _active_mjpeg_streams
    _active_mjpeg_streams += 1
    try:
        while True:
            frame = find_latest_frame(camera_id)
            if frame is None:
                # Tạo khung hình chờ mặc định nếu camera chưa sẵn sàng
                dummy = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(dummy, f"Ket noi Camera: {camera_id}...", (40, 240), cv2.FONT_HERSHEY_DUPLEX, 0.7, (200, 200, 200), 1)
                frame = dummy

            ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )
            time.sleep(0.04)  # Giới hạn phát tối đa 25 FPS, giảm tải CPU
    finally:
        _active_mjpeg_streams = max(0, _active_mjpeg_streams - 1)


@app.get("/api/v1/cameras/{camera_id}/stream")
def get_camera_stream(camera_id: str):
    """Endpoint cung cấp luồng video trực tiếp dạng MJPEG cho trình duyệt Web CMS."""
    return StreamingResponse(
        generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/v1/cameras/{camera_id}/snapshot")
def get_camera_snapshot(camera_id: str):
    """Endpoint chụp 1 khung hình mới nhất dạng ảnh JPEG. Luôn đảm bảo trả về khung hình hợp lệ."""
    frame = find_latest_frame(camera_id)
    if frame is None:
        # Tự động sinh khung hình giám sát chuyên nghiệp trong khi camera khởi động
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (20, 24, 33)
        # Khung viền và lưới giám sát
        cv2.rectangle(frame, (10, 10), (630, 470), (45, 55, 72), 1)
        cv2.line(frame, (20, 40), (620, 40), (35, 45, 60), 1)
        cv2.putText(frame, f"MSCHOOL AI SURVEILLANCE - {camera_id.upper()}", (25, 30), cv2.FONT_HERSHEY_DUPLEX, 0.55, (56, 189, 248), 1, cv2.LINE_AA)
        cv2.putText(frame, "TRANG THAI: DANG KET NOI LUONG CAMERA...", (140, 230), cv2.FONT_HERSHEY_DUPLEX, 0.55, (226, 232, 240), 1, cv2.LINE_AA)
        cv2.putText(frame, "HE THONG DANG DONG BO KHOI TAO PHAN TICH THI GIAC", (130, 260), cv2.FONT_HERSHEY_DUPLEX, 0.40, (148, 163, 184), 1, cv2.LINE_AA)
        cv2.putText(frame, time.strftime("%Y-%m-%d %H:%M:%S UTC"), (25, 455), cv2.FONT_HERSHEY_DUPLEX, 0.45, (100, 116, 139), 1, cv2.LINE_AA)

    ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ret:
        raise HTTPException(status_code=500, detail="Loi ma hoa anh JPEG")

    return Response(content=buffer.tobytes(), media_type="image/jpeg")


@app.get("/api/v1/incidents/active")
def get_active_incidents(camera_id: Optional[str] = None):
    """Lấy danh sách các vi phạm và cảnh báo an toàn đang diễn ra."""
    if _event_dispatcher is None:
        return []
    return _event_dispatcher.get_recent_incidents(camera_id)


@app.websocket("/ws/incidents")
async def websocket_incidents_endpoint(websocket: WebSocket):
    """Kênh WebSocket phát tán tức thời các sự kiện vi phạm / an toàn cho Web CMS."""
    await websocket.accept()
    _connected_websockets.append(websocket)
    try:
        while True:
            # Gửi nhịp tim định kỳ và kiểm tra kết nối
            await asyncio.sleep(1.0)
            if _event_dispatcher is not None:
                incidents = _event_dispatcher.get_recent_incidents()
                if incidents:
                    await websocket.send_json({
                        "event": "INCIDENT_UPDATE",
                        "data": incidents
                    })
    except WebSocketDisconnect:
        _connected_websockets.remove(websocket)
    except Exception:
        if websocket in _connected_websockets:
            _connected_websockets.remove(websocket)
