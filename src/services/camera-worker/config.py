"""
Configuration Settings for mschool Camera Ingestion Worker.
Zero-Hardcode architecture with typed environment settings.
"""

import os
from typing import List, Tuple
from pydantic import BaseModel, Field


class CameraConfig(BaseModel):
    camera_id: str
    camera_name: str
    rtsp_url: str
    tripwire_line: Tuple[Tuple[int, int], Tuple[int, int]] = Field(
        default=((100, 300), (500, 300)),
        description="Coordinates ((x1, y1), (x2, y2)) of the virtual tripwire"
    )
    direction_in_vector: Tuple[int, int] = Field(
        default=(0, 1),
        description="Vector defining the IN direction (dx, dy)"
    )


class WorkerSettings(BaseModel):
    # Core AI Service
    MIAI_API_URL: str = os.getenv("MIAI_API_URL", "http://127.0.0.1:8000/api/v1")
    MIAI_API_KEY: str = os.getenv("MIAI_API_KEY", "miai-secret-key-prod")

    # Backend Event Dispatcher
    MSCHOOL_BACKEND_URL: str = os.getenv("MSCHOOL_BACKEND_URL", "http://127.0.0.1:8080/api/v1")

    # Algorithm Thresholds
    EDIF_FIQA_THRESHOLD: float = float(os.getenv("EDIF_FIQA_THRESHOLD", "0.85"))
    MAX_TRACK_DURATION_SEC: float = float(os.getenv("MAX_TRACK_DURATION_SEC", "0.80"))
    MIN_DETECTION_CONFIDENCE: float = float(os.getenv("MIN_DETECTION_CONFIDENCE", "0.50"))
    RTSP_BUFFER_SIZE: int = int(os.getenv("RTSP_BUFFER_SIZE", "1"))

    # Cameras
    CAMERAS: List[CameraConfig] = [
        CameraConfig(
            camera_id="cam-gate-01",
            camera_name="Cổng Chính - Làn Vào",
            rtsp_url=os.getenv("GATE_IN_RTSP_URL", "rtsp://admin:CameraPass123@192.168.10.101:554/Streaming/Channels/101"),
            tripwire_line=((150, 400), (550, 400)),
            direction_in_vector=(0, 1),
        ),
        CameraConfig(
            camera_id="cam-gate-02",
            camera_name="Cổng Chính - Làn Ra",
            rtsp_url=os.getenv("GATE_OUT_RTSP_URL", "rtsp://admin:CameraPass123@192.168.10.102:554/Streaming/Channels/101"),
            tripwire_line=((150, 400), (550, 400)),
            direction_in_vector=(0, -1),
        ),
    ]


settings = WorkerSettings()
