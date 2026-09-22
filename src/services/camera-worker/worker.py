"""
mschool Camera Ingestion Worker Daemon.
Main multi-threaded RTSP ingestion pipeline with buffer=1 and real-time dispatching.
"""

import sys
import time
import threading
import cv2
import numpy as np
from typing import Dict
from config import settings, CameraConfig
from tracker import TrackedObject, SpatialTripwire, Direction
from dispatcher import EventDispatcher


class CameraStreamProcessor(threading.Thread):
    """Worker thread processing a single RTSP camera stream."""

    def __init__(self, cam_config: CameraConfig, dispatcher: EventDispatcher):
        super().__init__(daemon=True)
        self.cam_config = cam_config
        self.dispatcher = dispatcher
        self.tripwire = SpatialTripwire(
            line_p1=cam_config.tripwire_line[0],
            line_p2=cam_config.tripwire_line[1],
            in_vector=cam_config.direction_in_vector,
        )
        self.active_tracks: Dict[int, TrackedObject] = {}
        self.running = True

    def run(self):
        """Main capture and tracking loop."""
        rtsp_url = self.cam_config.rtsp_url
        cap = cv2.VideoCapture(rtsp_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, settings.RTSP_BUFFER_SIZE)

        while self.running:
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.5)
                continue

            now = time.time()

            # Process active tracks and dispatch best frames
            completed_tracks = []
            for track_id, track_obj in self.active_tracks.items():
                duration = now - track_obj.start_time

                # Check dispatch condition: score > threshold or duration > max duration
                if not track_obj.is_sent and (track_obj.best_score >= settings.EDIF_FIQA_THRESHOLD or duration >= settings.MAX_TRACK_DURATION_SEC):
                    direction = self.tripwire.classify_direction(track_obj.centroids)
                    if direction == Direction.UNKNOWN:
                        direction = Direction.IN if self.cam_config.direction_in_vector[1] > 0 else Direction.OUT

                    self.dispatcher.process_and_dispatch(
                        tracked_obj=track_obj,
                        camera_id=self.cam_config.camera_id,
                        direction=direction,
                    )

                if duration > 2.0:  # Expire old track after 2 seconds
                    completed_tracks.append(track_id)

            for tid in completed_tracks:
                del self.active_tracks[tid]

        cap.release()

    def stop(self):
        self.running = False


def main():
    dispatcher = EventDispatcher()
    processors = []

    for cam in settings.CAMERAS:
        proc = CameraStreamProcessor(cam_config=cam, dispatcher=dispatcher)
        proc.start()
        processors.append(proc)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        for proc in processors:
            proc.stop()


if __name__ == "__main__":
    main()
