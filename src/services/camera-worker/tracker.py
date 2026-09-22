"""
ByteTrack Multi-Object Tracker & Spatial Tripwire Direction Classifier.
Determines moving direction (IN vs OUT) across virtual line.
"""

import math
import time
from enum import Enum, unique
from typing import List, Dict, Any, Tuple, Optional
import numpy as np


@unique
class Direction(str, Enum):
    IN = "IN"
    OUT = "OUT"
    UNKNOWN = "UNKNOWN"


class TrackedObject:
    """Represents a human subject tracked across multiple video frames."""

    def __init__(self, track_id: int, initial_bbox: List[float], timestamp: float):
        self.track_id = track_id
        self.bboxes: List[List[float]] = [initial_bbox]
        self.timestamps: List[float] = [timestamp]
        self.centroids: List[Tuple[float, float]] = [self._compute_centroid(initial_bbox)]
        self.frames: List[np.ndarray] = []
        self.quality_scores: List[float] = []
        self.best_frame: Optional[np.ndarray] = None
        self.best_score: float = 0.0
        self.direction: Direction = Direction.UNKNOWN
        self.is_sent: bool = False
        self.start_time: float = timestamp

    @staticmethod
    def _compute_centroid(bbox: List[float]) -> Tuple[float, float]:
        # bbox format: [x1, y1, x2, y2]
        return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)

    def update(self, bbox: List[float], frame: np.ndarray, quality_score: float, timestamp: float):
        self.bboxes.append(bbox)
        self.timestamps.append(timestamp)
        self.centroids.append(self._compute_centroid(bbox))
        self.frames.append(frame)
        self.quality_scores.append(quality_score)

        if quality_score > self.best_score:
            self.best_score = quality_score
            self.best_frame = frame.copy()


class SpatialTripwire:
    """Virtual line classifier that detects crossing and direction."""

    def __init__(self, line_p1: Tuple[int, int], line_p2: Tuple[int, int], in_vector: Tuple[int, int]):
        self.p1 = np.array(line_p1, dtype=np.float32)
        self.p2 = np.array(line_p2, dtype=np.float32)
        self.in_vector = np.array(in_vector, dtype=np.float32)
        self.in_vector = self.in_vector / (np.linalg.norm(self.in_vector) + 1e-6)

    def classify_direction(self, trajectory: List[Tuple[float, float]]) -> Direction:
        """
        Classifies whether movement across the trajectory corresponds to IN or OUT.
        """
        if len(trajectory) < 2:
            return Direction.UNKNOWN

        start_pt = np.array(trajectory[0], dtype=np.float32)
        end_pt = np.array(trajectory[-1], dtype=np.float32)

        move_vec = end_pt - start_pt
        norm = np.linalg.norm(move_vec)
        if norm < 5.0:  # Minimal displacement threshold
            return Direction.UNKNOWN

        move_vec = move_vec / norm
        dot_prod = float(np.dot(move_vec, self.in_vector))

        if dot_prod > 0.3:
            return Direction.IN
        elif dot_prod < -0.3:
            return Direction.OUT
        return Direction.UNKNOWN
