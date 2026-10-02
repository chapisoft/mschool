"""
Configuration Settings for mschool Camera Ingestion & AI Analytics Worker.
Zero-Hardcode architecture with typed environment settings and 100% Enum definitions.
"""

import os
from enum import Enum, unique
from typing import List, Tuple, Optional
from pydantic import BaseModel, Field


@unique
class CameraPurpose(str, Enum):
    GATE = "GATE"                                    # Điểm danh không dừng qua cổng
    CLASSROOM_EXAM = "CLASSROOM_EXAM"                # Giám thị số, phát hiện gian lận thi cử
    CLASSROOM_REGULAR = "CLASSROOM_REGULAR"          # Giám sát trật tự và mức độ tập trung
    CAMPUS_SAFETY = "CAMPUS_SAFETY"                  # An toàn học đường: xô xát, té ngã hành lang/sân trường


class CameraConfig(BaseModel):
    camera_id: str
    camera_name: str
    rtsp_url: str
    purpose: CameraPurpose = CameraPurpose.GATE
    tripwire_line: Tuple[Tuple[int, int], Tuple[int, int]] = Field(
        default=((100, 300), (500, 300)),
        description="Tọa độ ((x1, y1), (x2, y2)) của vạch ảo phân định chiều di chuyển"
    )
    direction_in_vector: Tuple[int, int] = Field(
        default=(0, 1),
        description="Vector định hướng chiều Vào (dx, dy)"
    )
    desk_surface_y: Optional[int] = Field(
        default=450,
        description="Tọa độ Y mặt phẳng bàn học sinh trong khung hình lớp học/phòng thi"
    )


class WorkerSettings(BaseModel):
    # Dịch vụ Core AI miai (Face Recognition)
    MIAI_API_URL: str = os.getenv("MIAI_API_URL", "http://127.0.0.1:8000/api/v1")
    MIAI_API_KEY: str = os.getenv("MIAI_API_KEY", "miai-secret-key-prod")

    # Dịch vụ Backend mschool
    MSCHOOL_BACKEND_URL: str = os.getenv("MSCHOOL_BACKEND_URL", "http://127.0.0.1:8080/api/v1")

    # Máy chủ Streaming nội bộ (FastAPI)
    STREAM_HOST: str = os.getenv("STREAM_HOST", "0.0.0.0")
    STREAM_PORT: int = int(os.getenv("STREAM_PORT", "8090"))
    STREAM_FPS: int = int(os.getenv("STREAM_FPS", "25"))

    # Mô hình RTMO-s & Gia tốc AI
    RTMO_MODEL_PATH: str = os.getenv("RTMO_MODEL_PATH", "models/rtmo-s.onnx")
    ONNX_EXECUTION_PROVIDER: str = os.getenv("ONNX_EXECUTION_PROVIDER", "CUDAExecutionProvider")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
    NMS_IOU_THRESHOLD: float = float(os.getenv("NMS_IOU_THRESHOLD", "0.50"))

    # Ngưỡng thuật toán Điểm danh cổng
    EDIF_FIQA_THRESHOLD: float = float(os.getenv("EDIF_FIQA_THRESHOLD", "0.85"))
    MAX_TRACK_DURATION_SEC: float = float(os.getenv("MAX_TRACK_DURATION_SEC", "0.80"))
    RTSP_BUFFER_SIZE: int = int(os.getenv("RTSP_BUFFER_SIZE", "1"))

    # Ngưỡng thuật toán Giám thị số & Gian lận phòng thi
    HEAD_YAW_DEGREE_THRESHOLD: float = float(os.getenv("HEAD_YAW_DEGREE_THRESHOLD", "40.0"))
    HEAD_YAW_DURATION_SEC: float = float(os.getenv("HEAD_YAW_DURATION_SEC", "3.0"))
    TORSO_LEAN_DEGREE_THRESHOLD: float = float(os.getenv("TORSO_LEAN_DEGREE_THRESHOLD", "30.0"))
    HANDS_HIDDEN_DURATION_SEC: float = float(os.getenv("HANDS_HIDDEN_DURATION_SEC", "5.0"))

    # Ngưỡng thuật toán Giám sát trật tự & Chỉ số tập trung lớp học
    OUT_OF_SEAT_DURATION_SEC: float = float(os.getenv("OUT_OF_SEAT_DURATION_SEC", "10.0"))
    TURNING_AROUND_DEGREE_THRESHOLD: float = float(os.getenv("TURNING_AROUND_DEGREE_THRESHOLD", "85.0"))
    TURNING_AROUND_DURATION_SEC: float = float(os.getenv("TURNING_AROUND_DURATION_SEC", "5.0"))
    SLEEPING_INATTENTION_SEC: float = float(os.getenv("SLEEPING_INATTENTION_SEC", "30.0"))

    # Ngưỡng thuật toán An toàn & Phòng chống bạo lực / Té ngã
    VIOLENCE_KINETIC_THRESHOLD: float = float(os.getenv("VIOLENCE_KINETIC_THRESHOLD", "150.0"))
    FALL_DROP_VELOCITY_THRESHOLD: float = float(os.getenv("FALL_DROP_VELOCITY_THRESHOLD", "1.8"))
    FALL_IMMOBILE_DEBOUNCE_SEC: float = float(os.getenv("FALL_IMMOBILE_DEBOUNCE_SEC", "3.0"))

    # Danh mục Camera được điều phối
    CAMERAS: List[CameraConfig] = [
        CameraConfig(
            camera_id="cam-gate-01",
            camera_name="Cổng Chính - Làn Vào",
            purpose=CameraPurpose.GATE,
            rtsp_url=os.getenv("GATE_IN_RTSP_URL", "rtsp://admin:CameraPass123@192.168.10.101:554/Streaming/Channels/101"),
            tripwire_line=((150, 400), (550, 400)),
            direction_in_vector=(0, 1),
        ),
        CameraConfig(
            camera_id="cam-gate-02",
            camera_name="Cổng Chính - Làn Ra",
            purpose=CameraPurpose.GATE,
            rtsp_url=os.getenv("GATE_OUT_RTSP_URL", "rtsp://admin:CameraPass123@192.168.10.102:554/Streaming/Channels/101"),
            tripwire_line=((150, 400), (550, 400)),
            direction_in_vector=(0, -1),
        ),
        CameraConfig(
            camera_id="cam-class-101",
            camera_name="Lớp Học 10A1 - Phòng Thi",
            purpose=CameraPurpose.CLASSROOM_EXAM,
            rtsp_url=os.getenv("CLASS_101_RTSP_URL", "rtsp://admin:CameraPass123@192.168.10.111:554/Streaming/Channels/101"),
            desk_surface_y=420,
        ),
        CameraConfig(
            camera_id="cam-corridor-01",
            camera_name="Hành Lang Tầng 2 - Dãy B",
            purpose=CameraPurpose.CAMPUS_SAFETY,
            rtsp_url=os.getenv("CORRIDOR_01_RTSP_URL", "rtsp://admin:CameraPass123@192.168.10.121:554/Streaming/Channels/101"),
        ),
    ]


settings = WorkerSettings()
