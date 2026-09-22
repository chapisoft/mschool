"""
Event Dispatcher: Evaluates Best Frame and dispatches recognition requests to miai and mschool Backend.
"""

import base64
import time
import cv2
import httpx
import numpy as np
from typing import Optional, Dict, Any
from config import settings
from tracker import TrackedObject, Direction


class EventDispatcher:
    """Dispatches face recognition requests and attendance events."""

    def __init__(self):
        self.client = httpx.Client(timeout=3.0)

    def encode_frame(self, frame: np.ndarray) -> str:
        """Encodes frame numpy array to base64 JPEG."""
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return base64.b64encode(buffer).decode("utf-8")

    def process_and_dispatch(
        self,
        tracked_obj: TrackedObject,
        camera_id: str,
        direction: Direction,
    ) -> Optional[Dict[str, Any]]:
        """
        1. Encodes best frame.
        2. Calls miai /api/v1/face/search for 1:N recognition in RAM.
        3. Posts attendance event to mschool-backend.
        4. Marks track as sent.
        """
        if tracked_obj.is_sent or tracked_obj.best_frame is None:
            return None

        tracked_obj.is_sent = True
        b64_image = self.encode_frame(tracked_obj.best_frame)

        # 1. Query miai for face recognition
        try:
            miai_resp = self.client.post(
                f"{settings.MIAI_API_URL}/face/search",
                headers={"Authorization": f"Bearer {settings.MIAI_API_KEY}"},
                json={
                    "image_base64": b64_image,
                    "top_k": 1,
                    "threshold": 0.60,
                },
            )
            if miai_resp.status_code != 200:
                return None

            result_data = miai_resp.json().get("data", {})
            top_match = result_data.get("top_match")

            identity_code = top_match.get("identity_id") if top_match else "STRANGER"
            is_stranger = top_match is None

            # 2. Dispatch event to mschool-backend
            event_payload = {
                "cameraId": camera_id,
                "trackId": tracked_obj.track_id,
                "identityCode": identity_code,
                "isStranger": is_stranger,
                "direction": direction.value,
                "similarity": top_match.get("similarity") if top_match else 0.0,
                "qualityScore": tracked_obj.best_score,
                "scannedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "imageBase64": b64_image if is_stranger else None,
            }

            self.client.post(
                f"{settings.MSCHOOL_BACKEND_URL}/attendance/scan-event",
                json=event_payload,
            )
            return event_payload

        except Exception as e:
            # Fallback error handling
            return None
