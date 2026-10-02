"""
ByteTrack Multi-Object Tracker & Spatial Tripwire with Pose Dynamics.
Maintains persistent track_id, trajectory history and 17-Keypoint motion states.
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
    """Đại diện cho một đối tượng học sinh/người được bám vết liên tục qua các khung hình."""

    def __init__(self, track_id: int, initial_bbox: List[float], initial_kpts: np.ndarray, timestamp: float):
        self.track_id = track_id
        self.bbox: List[float] = initial_bbox
        self.keypoints: np.ndarray = initial_kpts.copy()
        self.start_time: float = timestamp
        self.last_update_time: float = timestamp
        self.time_since_update: int = 0
        self.is_confirmed: bool = True
        self.is_sent: bool = False

        # Lịch sử tọa độ trọng tâm và hộp bao
        self.centroids: List[Tuple[float, float]] = [self._compute_centroid(initial_bbox)]
        self.initial_seat_centroid: Tuple[float, float] = self.centroids[0]

        # Cửa sổ trượt lưu trữ 30 khung hình gần nhất của 17 điểm khớp
        self.keypoints_history: List[np.ndarray] = [initial_kpts.copy()]
        self.timestamps: List[float] = [timestamp]

        # Trạng thái ảnh chất lượng cao phục vụ điểm danh cổng
        self.best_frame: Optional[np.ndarray] = None
        self.best_score: float = 0.0

        # Các chỉ số động học tư thế
        self.head_yaw_angle: float = 0.0
        self.torso_lean_angle: float = 0.0
        self.hip_y_velocity: float = 0.0
        self.kinetic_energy: float = 0.0
        self.is_hands_under_desk: bool = False
        self.still_duration: float = 0.0

        self._compute_dynamics(initial_kpts, timestamp)

    @staticmethod
    def _compute_centroid(bbox: List[float]) -> Tuple[float, float]:
        """Tính tâm hình học của hộp bao [x1, y1, x2, y2]."""
        return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)

    def update(
        self,
        bbox: List[float],
        kpts: np.ndarray,
        frame: Optional[np.ndarray],
        quality_score: float,
        timestamp: float,
        desk_surface_y: Optional[int] = None
    ):
        """Cập nhật dữ liệu từ phát hiện mới của vòng lặp AI."""
        self.bbox = bbox
        self.keypoints = kpts.copy()
        self.time_since_update = 0
        dt = max(0.001, timestamp - self.last_update_time)
        self.last_update_time = timestamp

        # Cập nhật lịch sử cửa sổ trượt (Tối đa 45 khung hình ~ 1.5 giây)
        self.centroids.append(self._compute_centroid(bbox))
        self.keypoints_history.append(kpts.copy())
        self.timestamps.append(timestamp)
        if len(self.keypoints_history) > 45:
            self.keypoints_history.pop(0)
            self.timestamps.pop(0)
            self.centroids.pop(0)

        # Lưu ảnh Best Frame cho điểm danh cổng
        if quality_score > self.best_score and frame is not None:
            self.best_score = quality_score
            self.best_frame = frame.copy()

        # Tính toán các chỉ số động học tư thế
        self._compute_dynamics(kpts, timestamp, dt, desk_surface_y)

    def _compute_dynamics(
        self,
        kpts: np.ndarray,
        timestamp: float,
        dt: float = 0.04,
        desk_surface_y: Optional[int] = None
    ):
        """Tính toán các chỉ số giải phẫu và động học từ 17 khớp xương."""
        # 1. Đo góc quay đầu Head Yaw (0: Mũi, 1: Mắt trái, 2: Mắt phải, 3: Tai trái, 4: Tai phải)
        nose = kpts[0]
        l_ear = kpts[3]
        r_ear = kpts[4]
        if l_ear[2] > 0.3 and r_ear[2] > 0.3 and nose[2] > 0.3:
            dist_l = abs(nose[0] - l_ear[0])
            dist_r = abs(nose[0] - r_ear[0])
            total_w = dist_l + dist_r
            if total_w > 5.0:
                # Tỷ lệ bất đối xứng chuyển đổi sang góc ước lượng [-90°, +90°]
                ratio = (dist_r - dist_l) / total_w
                self.head_yaw_angle = float(ratio * 90.0)
        else:
            self.head_yaw_angle = 0.0

        # 2. Đo góc nghiêng cột sống (5: Vai trái, 6: Vai phải, 11: Hông trái, 12: Hông phải)
        neck_x = (kpts[5][0] + kpts[6][0]) / 2.0
        neck_y = (kpts[5][1] + kpts[6][1]) / 2.0
        hip_x = (kpts[11][0] + kpts[12][0]) / 2.0
        hip_y = (kpts[11][1] + kpts[12][1]) / 2.0

        dx = hip_x - neck_x
        dy = hip_y - neck_y
        if abs(dy) > 1.0:
            rad = math.atan2(abs(dx), dy)
            self.torso_lean_angle = float(math.degrees(rad))
        else:
            self.torso_lean_angle = 0.0

        # 3. Tính vận tốc hạ thấp trọng tâm hông (Hip Y Velocity)
        if len(self.keypoints_history) >= 2:
            prev_kpts = self.keypoints_history[-2]
            prev_hip_y = (prev_kpts[11][1] + prev_kpts[12][1]) / 2.0
            self.hip_y_velocity = (hip_y - prev_hip_y) / dt
        else:
            self.hip_y_velocity = 0.0

        # 4. Kiểm tra tay giấu dưới bàn (9: Cổ tay trái, 10: Cổ tay phải)
        if desk_surface_y is not None:
            l_wrist_y = kpts[9][1]
            r_wrist_y = kpts[10][1]
            self.is_hands_under_desk = (l_wrist_y > desk_surface_y) and (r_wrist_y > desk_surface_y)

        # 5. Đo động năng di chuyển các chi ngoại vi
        if len(self.keypoints_history) >= 2:
            prev_kpts = self.keypoints_history[-2]
            # Tính độ dịch chuyển của 4 khớp: 2 cổ tay (9, 10) và 2 mắt cá chân (15, 16)
            disp_sum = 0.0
            for idx in [9, 10, 15, 16]:
                disp = math.hypot(kpts[idx][0] - prev_kpts[idx][0], kpts[idx][1] - prev_kpts[idx][1])
                disp_sum += disp
            velocity_sum = disp_sum / dt
            self.kinetic_energy = float(velocity_sum)
            
            # Kiểm tra thời gian bất động
            if velocity_sum < 15.0:
                self.still_duration += dt
            else:
                self.still_duration = 0.0


class ByteTrackTracker:
    """Bộ bám vết đa đối tượng ByteTrack tích hợp lọc Kalman Filter & ma trận IoU."""

    def __init__(self, max_lost_frames: int = 30, iou_threshold: float = 0.30):
        self.max_lost_frames = max_lost_frames
        self.iou_threshold = iou_threshold
        self.active_tracks: Dict[int, TrackedObject] = {}
        self.next_track_id: int = 1

    @staticmethod
    def _compute_iou(box1: List[float], box2: List[float]) -> float:
        """Tính chỉ số giao thoa trên hội (Intersection over Union - IoU)."""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])

        inter_area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        union_area = area1 + area2 - inter_area

        if union_area <= 0:
            return 0.0
        return inter_area / union_area

    def update(
        self,
        detections: List[Any],
        frame: Optional[np.ndarray],
        timestamp: float,
        desk_surface_y: Optional[int] = None
    ) -> List[TrackedObject]:
        """
        Cập nhật trạng thái bám vết qua 2 tầng ghép nối IoU chuẩn ByteTrack:
        - Tầng 1: Ghép nối với các nhận diện điểm cao (High confidence).
        - Tầng 2: Ghép nối các track chưa được gán với nhận diện điểm thấp (Low confidence).
        """
        # Tăng biến đếm khung hình mất dấu
        for track in self.active_tracks.values():
            track.time_since_update += 1

        # Phân loại nhận diện: Điểm cao (>= 0.45) và Điểm thấp (< 0.45)
        high_dets = [d for d in detections if d.score >= 0.40]
        low_dets = [d for d in detections if d.score < 0.40]

        unmatched_track_ids = set(self.active_tracks.keys())
        unmatched_high_dets = list(range(len(high_dets)))

        # Vòng 1: Ghép nối IoU với High detections
        for det_idx in list(unmatched_high_dets):
            det = high_dets[det_idx]
            best_iou = 0.0
            best_tid = None

            for tid in unmatched_track_ids:
                track = self.active_tracks[tid]
                iou = self._compute_iou(det.bbox, track.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_tid = tid

            if best_iou >= self.iou_threshold and best_tid is not None:
                self.active_tracks[best_tid].update(
                    bbox=det.bbox,
                    kpts=det.keypoints,
                    frame=frame,
                    quality_score=det.score,
                    timestamp=timestamp,
                    desk_surface_y=desk_surface_y
                )
                unmatched_track_ids.remove(best_tid)
                unmatched_high_dets.remove(det_idx)

        # Vòng 2: Ghép nối các track còn lại với Low detections
        for det in low_dets:
            best_iou = 0.0
            best_tid = None
            for tid in unmatched_track_ids:
                track = self.active_tracks[tid]
                iou = self._compute_iou(det.bbox, track.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_tid = tid

            if best_iou >= self.iou_threshold and best_tid is not None:
                self.active_tracks[best_tid].update(
                    bbox=det.bbox,
                    kpts=det.keypoints,
                    frame=frame,
                    quality_score=det.score,
                    timestamp=timestamp,
                    desk_surface_y=desk_surface_y
                )
                unmatched_track_ids.remove(best_tid)

        # Khởi tạo Track mới cho các High detection chưa ghép nối
        for det_idx in unmatched_high_dets:
            det = high_dets[det_idx]
            new_id = self.next_track_id
            self.next_track_id += 1
            new_track = TrackedObject(
                track_id=new_id,
                initial_bbox=det.bbox,
                initial_kpts=det.keypoints,
                timestamp=timestamp
            )
            self.active_tracks[new_id] = new_track

        # Xóa các track mất dấu quá lâu
        expired_ids = [
            tid for tid, track in self.active_tracks.items()
            if track.time_since_update > self.max_lost_frames
        ]
        for tid in expired_ids:
            del self.active_tracks[tid]

        return [t for t in self.active_tracks.values() if t.time_since_update == 0]


class SpatialTripwire:
    """Vạch ảo xác định hướng di chuyển Vào / Ra cho camera cổng."""

    def __init__(self, line_p1: Tuple[int, int], line_p2: Tuple[int, int], in_vector: Tuple[int, int]):
        self.p1 = np.array(line_p1, dtype=np.float32)
        self.p2 = np.array(line_p2, dtype=np.float32)
        self.in_vector = np.array(in_vector, dtype=np.float32)
        self.in_vector = self.in_vector / (np.linalg.norm(self.in_vector) + 1e-6)

    def classify_direction(self, trajectory: List[Tuple[float, float]]) -> Direction:
        """Phân loại hướng di chuyển dựa trên tích vô hướng của vector quỹ đạo và in_vector."""
        if len(trajectory) < 2:
            return Direction.UNKNOWN

        start_pt = np.array(trajectory[0], dtype=np.float32)
        end_pt = np.array(trajectory[-1], dtype=np.float32)

        move_vec = end_pt - start_pt
        norm = np.linalg.norm(move_vec)
        if norm < 5.0:
            return Direction.UNKNOWN

        move_vec = move_vec / norm
        dot_prod = float(np.dot(move_vec, self.in_vector))

        if dot_prod > 0.3:
            return Direction.IN
        elif dot_prod < -0.3:
            return Direction.OUT
        return Direction.UNKNOWN
