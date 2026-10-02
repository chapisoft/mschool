"""
Classroom & Campus Behavior Analytics Engine.
Features:
- Exam Proctoring: Head yaw peeking, torso leaning, hands hidden under desk.
- Classroom Engagement: Out-of-seat roaming, turning back, sleeping/inattention.
- Campus Safety: 5-Phase Debounced Fall Detection, violence & altercation clustering.
"""

import math
import time
from enum import Enum, unique
from typing import List, Dict, Any, Tuple, Optional
from tracker import TrackedObject
from config import settings, CameraPurpose


@unique
class IncidentType(str, Enum):
    CHEATING_HEAD_TURN = "CHEATING_HEAD_TURN"          # Quay đầu ngó bài bạn
    CHEATING_TORSO_LEAN = "CHEATING_TORSO_LEAN"        # Nghiêng người nhìn bài bàn bên
    CHEATING_HANDS_HIDDEN = "CHEATING_HANDS_HIDDEN"    # Dùng điện thoại / mở tài liệu dưới gầm bàn
    CHEATING_ITEM_PASSING = "CHEATING_ITEM_PASSING"    # Chuyền tài liệu / đồ vật
    DISRUPTIVE_ROAMING = "DISRUPTIVE_ROAMING"          # Rời khỏi chỗ ngồi trong giờ học
    DISRUPTIVE_TURNING = "DISRUPTIVE_TURNING"          # Xoay người nói chuyện với bàn sau
    DISRUPTIVE_SLEEPING = "DISRUPTIVE_SLEEPING"        # Gục mặt xuống bàn ngủ gật
    DISRUPTIVE_COMMOTION = "DISRUPTIVE_COMMOTION"      # Đứng lên bàn ghế / đùa nghịch mạnh
    VIOLENCE_ALTERCATION = "VIOLENCE_ALTERCATION"      # Xô xát, giằng co, ẩu đả
    SAFETY_FALL = "SAFETY_FALL"                        # Té ngã chấn thương trên sàn


@unique
class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@unique
class DebouncedFallState(str, Enum):
    NORMAL = "NORMAL"                                  # Pha 1: Đứng hoặc đi lại bình thường
    RAPID_DROP = "RAPID_DROP"                          # Pha 2: Gia tốc rơi nhanh
    FLOOR_LEVEL = "FLOOR_LEVEL"                        # Pha 3: Trọng tâm nằm sát sàn
    IMMOBILE_DEBOUNCE = "IMMOBILE_DEBOUNCE"            # Pha 4: Khử rung bất động chờ tự đứng dậy
    CONFIRMED_FALL = "CONFIRMED_FALL"                  # Pha 5: Xác nhận té ngã nguy hiểm


class ExamProctorAnalyzer:
    """Bộ phân tích giám thị số và phát hiện gian lận trong phòng thi."""

    def __init__(self):
        # Lưu trữ trạng thái tích lũy thời gian của từng thí sinh: {track_id: {...}}
        self.track_timers: Dict[int, Dict[str, float]] = {}

    def analyze(self, tracks: List[TrackedObject], now: float) -> List[Dict[str, Any]]:
        incidents: List[Dict[str, Any]] = []

        for track in tracks:
            tid = track.track_id
            if tid not in self.track_timers:
                self.track_timers[tid] = {
                    "last_time": now,
                    "yaw_dur": 0.0,
                    "lean_dur": 0.0,
                    "hands_dur": 0.0
                }

            timer = self.track_timers[tid]
            dt = max(0.01, now - timer["last_time"])
            timer["last_time"] = now

            # 1. Bẫy hành vi quay đầu ngó bài bạn (Head Yaw > 40°)
            if abs(track.head_yaw_angle) >= settings.HEAD_YAW_DEGREE_THRESHOLD:
                timer["yaw_dur"] += dt
                if timer["yaw_dur"] >= settings.HEAD_YAW_DURATION_SEC:
                    incidents.append({
                        "type": IncidentType.CHEATING_HEAD_TURN.value,
                        "track_id": tid,
                        "severity": AlertSeverity.CRITICAL.value,
                        "label": "NGO BAI BAN",
                        "description": f"Thi sinh ID:{tid} quay dau {track.head_yaw_angle:.1f}° lien tuc {timer['yaw_dur']:.1f}s",
                        "bbox": track.bbox,
                        "timestamp": now
                    })
            else:
                timer["yaw_dur"] = max(0.0, timer["yaw_dur"] - dt * 0.5)

            # 2. Bẫy hành vi nghiêng người sang bàn bên (Torso Lean > 30°)
            if track.torso_lean_angle >= settings.TORSO_LEAN_DEGREE_THRESHOLD:
                timer["lean_dur"] += dt
                if timer["lean_dur"] >= 3.0:
                    incidents.append({
                        "type": IncidentType.CHEATING_TORSO_LEAN.value,
                        "track_id": tid,
                        "severity": AlertSeverity.WARNING.value,
                        "label": "NGHIENG NGUOI",
                        "description": f"Thi sinh ID:{tid} nghieng cot song {track.torso_lean_angle:.1f}° sang ban ben",
                        "bbox": track.bbox,
                        "timestamp": now
                    })
            else:
                timer["lean_dur"] = max(0.0, timer["lean_dur"] - dt * 0.5)

            # 3. Bẫy hành vi giấu tay dưới gầm bàn mở tài liệu
            if track.is_hands_under_desk:
                timer["hands_dur"] += dt
                if timer["hands_dur"] >= settings.HANDS_HIDDEN_DURATION_SEC:
                    incidents.append({
                        "type": IncidentType.CHEATING_HANDS_HIDDEN.value,
                        "track_id": tid,
                        "severity": AlertSeverity.CRITICAL.value,
                        "label": "TAI LIEU DUOI BAN",
                        "description": f"Thi sinh ID:{tid} giau tay duoi ngan ban qua {timer['hands_dur']:.1f}s",
                        "bbox": track.bbox,
                        "timestamp": now
                    })
            else:
                timer["hands_dur"] = max(0.0, timer["hands_dur"] - dt)

        # 4. Bẫy hành vi chuyền giấy / đồ vật giữa hai thí sinh cạnh nhau
        for i in range(len(tracks)):
            for j in range(i + 1, len(tracks)):
                t1, t2 = tracks[i], tracks[j]
                # Đo khoảng cách giữa cổ tay phải t1 và cổ tay trái t2
                rw1 = t1.keypoints[10]
                lw2 = t2.keypoints[9]
                if rw1[2] > 0.3 and lw2[2] > 0.3:
                    dist = math.hypot(rw1[0] - lw2[0], rw1[1] - lw2[1])
                    if dist < 45.0:  # Khoảng cách bàn tay rất sát nhau
                        incidents.append({
                            "type": IncidentType.CHEATING_ITEM_PASSING.value,
                            "track_id": t1.track_id,
                            "severity": AlertSeverity.CRITICAL.value,
                            "label": "CHUYEN TAI LIEU",
                            "description": f"Phat hien tiep xuc truyen do vat giua ID:{t1.track_id} va ID:{t2.track_id}",
                            "bbox": t1.bbox,
                            "timestamp": now
                        })

        return incidents


class ClassroomEngagementAnalyzer:
    """Bộ phân tích trật tự và mức độ tập trung trong giờ học."""

    def __init__(self):
        self.roaming_timers: Dict[int, float] = {}
        self.turning_timers: Dict[int, float] = {}
        self.sleeping_timers: Dict[int, float] = {}

    def analyze(self, tracks: List[TrackedObject], now: float) -> List[Dict[str, Any]]:
        incidents: List[Dict[str, Any]] = []

        for track in tracks:
            tid = track.track_id
            cur_centroid = track.centroids[-1]
            init_seat = track.initial_seat_centroid

            # 1. Bẫy rời chỗ ngồi tự do (> 120px dịch chuyển so với ban đầu)
            displacement = math.hypot(cur_centroid[0] - init_seat[0], cur_centroid[1] - init_seat[1])
            if displacement > 120.0:
                self.roaming_timers[tid] = self.roaming_timers.get(tid, 0.0) + 0.1
                if self.roaming_timers[tid] >= settings.OUT_OF_SEAT_DURATION_SEC:
                    incidents.append({
                        "type": IncidentType.DISRUPTIVE_ROAMING.value,
                        "track_id": tid,
                        "severity": AlertSeverity.WARNING.value,
                        "label": "ROI CHO NGOI",
                        "description": f"Hoc sinh ID:{tid} roi khoi vi tri ban hoc {self.roaming_timers[tid]:.0f}s",
                        "bbox": track.bbox,
                        "timestamp": now
                    })
            else:
                self.roaming_timers[tid] = 0.0

            # 2. Bẫy xoay người xuống bàn sau nói chuyện (Góc quay đầu hoặc vai > 85°)
            if abs(track.head_yaw_angle) >= settings.TURNING_AROUND_DEGREE_THRESHOLD:
                self.turning_timers[tid] = self.turning_timers.get(tid, 0.0) + 0.1
                if self.turning_timers[tid] >= settings.TURNING_AROUND_DURATION_SEC:
                    incidents.append({
                        "type": IncidentType.DISRUPTIVE_TURNING.value,
                        "track_id": tid,
                        "severity": AlertSeverity.WARNING.value,
                        "label": "XOAY NGUOI NOI CHUYEN",
                        "description": f"Hoc sinh ID:{tid} quay nguoi xuong ban sau {self.turning_timers[tid]:.0f}s",
                        "bbox": track.bbox,
                        "timestamp": now
                    })
            else:
                self.turning_timers[tid] = 0.0

            # 3. Bẫy gục đầu ngủ gật trong giờ học (Mũi cúi thấp và bất động > 30s)
            if track.still_duration >= settings.SLEEPING_INATTENTION_SEC and track.torso_lean_angle > 45.0:
                incidents.append({
                    "type": IncidentType.DISRUPTIVE_SLEEPING.value,
                    "track_id": tid,
                    "severity": AlertSeverity.INFO.value,
                    "label": "GUC MAT NGU GAT",
                    "description": f"Hoc sinh ID:{tid} guc mat xuong ban bat dong {track.still_duration:.0f}s",
                    "bbox": track.bbox,
                    "timestamp": now
                })

        return incidents


class CampusSafetyAnalyzer:
    """Bộ phân tích an toàn học đường: Khử rung té ngã 5 pha & Phòng chống xô xát."""

    def __init__(self):
        # Lưu trạng thái máy trạng thái khử rung té ngã theo track_id:
        # {track_id: {"state": DebouncedFallState, "fall_start_time": float, "immobile_sec": float}}
        self.fall_state_machine: Dict[int, Dict[str, Any]] = {}

    def analyze(self, tracks: List[TrackedObject], now: float) -> List[Dict[str, Any]]:
        incidents: List[Dict[str, Any]] = []

        # 1. Phát hiện té ngã qua Máy trạng thái khử rung 5 pha
        for track in tracks:
            tid = track.track_id
            if tid not in self.fall_state_machine:
                self.fall_state_machine[tid] = {
                    "state": DebouncedFallState.NORMAL,
                    "drop_time": 0.0,
                    "immobile_sec": 0.0
                }

            fsm = self.fall_state_machine[tid]
            bbox = track.bbox
            bw = bbox[2] - bbox[0]
            bh = bbox[3] - bbox[1]
            aspect_ratio = bh / max(1.0, bw)

            # Pha 1 sang Pha 2: Gia tốc rơi nhanh
            if fsm["state"] == DebouncedFallState.NORMAL:
                if track.hip_y_velocity > settings.FALL_DROP_VELOCITY_THRESHOLD * 50.0:
                    fsm["state"] = DebouncedFallState.RAPID_DROP
                    fsm["drop_time"] = now

            # Pha 2 sang Pha 3: Trọng tâm nằm sàn, trục cơ thể nằm ngang (Aspect Ratio < 0.9)
            elif fsm["state"] == DebouncedFallState.RAPID_DROP:
                if aspect_ratio < 0.95 or (now - fsm["drop_time"] < 1.0 and track.torso_lean_angle > 65.0):
                    fsm["state"] = DebouncedFallState.FLOOR_LEVEL
                    fsm["immobile_sec"] = 0.0
                elif now - fsm["drop_time"] > 1.5:
                    fsm["state"] = DebouncedFallState.NORMAL  # Rơi giả hoặc lấy lại thăng bằng

            # Pha 3 sang Pha 4: Khử rung (Chờ xem học sinh tự đứng dậy hay bất động)
            elif fsm["state"] == DebouncedFallState.FLOOR_LEVEL:
                if aspect_ratio > 1.2:
                    # Học sinh tự đứng dậy trong khoảng đệm -> Hủy báo động
                    fsm["state"] = DebouncedFallState.NORMAL
                else:
                    fsm["state"] = DebouncedFallState.IMMOBILE_DEBOUNCE
                    fsm["immobile_sec"] = 0.0

            # Pha 4 sang Pha 5: Bất động quá 3 giây -> XÁC NHẬN TÉ NGÃ NGUY CẤP
            elif fsm["state"] == DebouncedFallState.IMMOBILE_DEBOUNCE:
                if aspect_ratio > 1.2:
                    fsm["state"] = DebouncedFallState.NORMAL
                else:
                    fsm["immobile_sec"] += 0.1
                    if fsm["immobile_sec"] >= settings.FALL_IMMOBILE_DEBOUNCE_SEC:
                        fsm["state"] = DebouncedFallState.CONFIRMED_FALL
                        incidents.append({
                            "type": IncidentType.SAFETY_FALL.value,
                            "track_id": tid,
                            "severity": AlertSeverity.CRITICAL.value,
                            "label": "TE NGA NGUY HIEM",
                            "description": f"Phat hien hoc sinh ID:{tid} te nga va nam bat dong tren san {fsm['immobile_sec']:.1f}s",
                            "bbox": track.bbox,
                            "timestamp": now
                        })

            elif fsm["state"] == DebouncedFallState.CONFIRMED_FALL:
                if aspect_ratio > 1.2:
                    fsm["state"] = DebouncedFallState.NORMAL
                else:
                    incidents.append({
                        "type": IncidentType.SAFETY_FALL.value,
                        "track_id": tid,
                        "severity": AlertSeverity.CRITICAL.value,
                        "label": "TE NGA NGUY HIEM",
                        "description": f"Hoc sinh ID:{tid} van dang nam bat dong can ho tro y te khan cap",
                        "bbox": track.bbox,
                        "timestamp": now
                    })

        # 2. Phát hiện xô xát, bạo lực học đường (Khoảng cách sát nhau + Động năng cao)
        for i in range(len(tracks)):
            for j in range(i + 1, len(tracks)):
                t1, t2 = tracks[i], tracks[j]
                c1 = t1.centroids[-1]
                c2 = t2.centroids[-1]
                dist = math.hypot(c1[0] - c2[0], c1[1] - c2[1])

                if dist < 85.0:  # Áp sát rất gần
                    total_energy = t1.kinetic_energy + t2.kinetic_energy
                    if total_energy >= settings.VIOLENCE_KINETIC_THRESHOLD:
                        incidents.append({
                            "type": IncidentType.VIOLENCE_ALTERCATION.value,
                            "track_id": t1.track_id,
                            "severity": AlertSeverity.CRITICAL.value,
                            "label": "XO XAT ẨU ĐẢ",
                            "description": f"Canh bao xo xat va cham giua ID:{t1.track_id} va ID:{t2.track_id} (Dong nang {total_energy:.0f})",
                            "bbox": t1.bbox,
                            "timestamp": now
                        })

        return incidents


class BehaviorAnalysisEngine:
    """Bộ điều phối toàn diện phân tích hành vi theo mục đích vị trí camera."""

    def __init__(self, purpose: CameraPurpose):
        self.purpose = purpose
        self.proctor_analyzer = ExamProctorAnalyzer()
        self.engagement_analyzer = ClassroomEngagementAnalyzer()
        self.safety_analyzer = CampusSafetyAnalyzer()

    def process(self, tracks: List[TrackedObject], now: float) -> List[Dict[str, Any]]:
        """Phân tích hành vi theo cấu hình mục đích của camera."""
        if self.purpose == CameraPurpose.CLASSROOM_EXAM:
            return self.proctor_analyzer.analyze(tracks, now)
        elif self.purpose == CameraPurpose.CLASSROOM_REGULAR:
            return self.engagement_analyzer.analyze(tracks, now)
        elif self.purpose == CameraPurpose.CAMPUS_SAFETY:
            return self.safety_analyzer.analyze(tracks, now)
        elif self.purpose == CameraPurpose.GATE:
            # Camera cổng chỉ kiểm tra an toàn té ngã nếu có va chạm
            return self.safety_analyzer.analyze(tracks, now)
        return []
