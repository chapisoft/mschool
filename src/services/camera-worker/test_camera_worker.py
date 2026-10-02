"""
Comprehensive Unit Tests for mschool AI Camera Worker Engine.
Verifies RTMO-s Pose Engine, ByteTrack, Behavior Analytics (Proctoring, Engagement, Safety)
and FastAPI Streaming Endpoints.
"""

import time
import numpy as np
from config import CameraConfig, CameraPurpose, settings
from pose_engine import RTMOPoseEngine, PoseDetection
from tracker import ByteTrackTracker, TrackedObject, SpatialTripwire, Direction
from behavior_analyzer import (
    BehaviorAnalysisEngine,
    ExamProctorAnalyzer,
    ClassroomEngagementAnalyzer,
    CampusSafetyAnalyzer,
    IncidentType,
    DebouncedFallState,
    AlertSeverity
)
from dispatcher import EventDispatcher
import streamer


def test_rtmo_pose_engine_detection_and_overlay():
    """Kiểm tra mô hình RTMO-s bóc tách 17 keypoints và vẽ lớp thông tin thị giác."""
    engine = RTMOPoseEngine(confidence_threshold=0.30)
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    dummy_frame[100:350, 200:350] = 180  # Tạo khối chuyển động

    detections = engine.detect(dummy_frame)
    assert len(detections) >= 1
    det = detections[0]
    assert len(det.bbox) == 4
    assert det.keypoints.shape == (17, 3)
    assert det.score > 0.0

    # Kiểm tra vẽ visual overlay
    track = TrackedObject(
        track_id=1,
        initial_bbox=det.bbox,
        initial_kpts=det.keypoints,
        timestamp=time.time()
    )
    rendered = RTMOPoseEngine.render_visual_overlay(
        frame=dummy_frame,
        tracks=[track],
        active_incidents=[{"type": "CHEATING_HEAD_TURN", "track_id": 1, "severity": "CRITICAL", "label": "NGO BAI"}],
        fps=28.5,
        camera_title="Camera Phong Thi"
    )
    assert rendered.shape == dummy_frame.shape
    assert rendered is not None


def test_bytetrack_tracker_multi_object():
    """Kiểm tra bộ theo dõi ByteTrack cấp phát ID và duy trì lịch sử quỹ đạo."""
    tracker = ByteTrackTracker(max_lost_frames=5, iou_threshold=0.20)
    now = time.time()

    kpts = np.zeros((17, 3), dtype=np.float32)
    kpts[11] = [150, 300, 0.9]  # Hông trái
    kpts[12] = [170, 300, 0.9]  # Hông phải

    det1 = PoseDetection(bbox=[100, 100, 200, 400], score=0.85, keypoints=kpts)
    det2 = PoseDetection(bbox=[300, 100, 400, 400], score=0.82, keypoints=kpts)

    # Frame 1: Cấp phát 2 track ID riêng biệt
    tracks = tracker.update([det1, det2], frame=None, timestamp=now)
    assert len(tracks) == 2
    tids = [t.track_id for t in tracks]
    assert 1 in tids and 2 in tids

    # Frame 2: Di chuyển nhẹ, kiểm tra ID không bị nhảy
    det1_moved = PoseDetection(bbox=[105, 105, 205, 405], score=0.83, keypoints=kpts)
    tracks2 = tracker.update([det1_moved], frame=None, timestamp=now + 0.04)
    assert len(tracks2) == 1
    assert tracks2[0].track_id == 1
    assert len(tracks2[0].centroids) == 2


def test_spatial_tripwire_classification():
    """Kiểm tra vạch ảo phân định chiều Vào / Ra."""
    tripwire = SpatialTripwire(line_p1=(100, 300), line_p2=(500, 300), in_vector=(0, 1))

    # Quỹ đạo đi xuống (Y tăng): Vào (IN)
    traj_in = [(300, 250), (300, 350)]
    assert tripwire.classify_direction(traj_in) == Direction.IN

    # Quỹ đạo đi lên (Y giảm): Ra (OUT)
    traj_out = [(300, 350), (300, 250)]
    assert tripwire.classify_direction(traj_out) == Direction.OUT


def test_exam_proctoring_cheating_detection():
    """Kiểm tra các bẫy gian lận thi cử: Quay đầu ngó bài, nghiêng người, tay giấu dưới bàn."""
    proctor = ExamProctorAnalyzer()
    now = time.time()

    kpts = np.zeros((17, 3), dtype=np.float32)
    track = TrackedObject(track_id=10, initial_bbox=[100, 100, 200, 350], initial_kpts=kpts, timestamp=now)

    # 1. Giả lập quay đầu góc 50° duy trì 3.5 giây
    track.head_yaw_angle = 50.0
    for step in range(35):
        incidents = proctor.analyze([track], now=now + step * 0.1)

    cheating_types = [inc["type"] for inc in incidents]
    assert IncidentType.CHEATING_HEAD_TURN.value in cheating_types

    # 2. Giả lập giấu tay dưới ngăn bàn > 5 giây
    track.head_yaw_angle = 0.0
    track.is_hands_under_desk = True
    for step in range(55):
        incidents = proctor.analyze([track], now=now + 5.0 + step * 0.1)

    cheating_types = [inc["type"] for inc in incidents]
    assert IncidentType.CHEATING_HANDS_HIDDEN.value in cheating_types


def test_classroom_engagement_disruptive_detection():
    """Kiểm tra phát hiện học sinh rời ghế, xoay người nói chuyện, ngủ gật."""
    engagement = ClassroomEngagementAnalyzer()
    now = time.time()

    kpts = np.zeros((17, 3), dtype=np.float32)
    track = TrackedObject(track_id=20, initial_bbox=[100, 100, 200, 350], initial_kpts=kpts, timestamp=now)

    # 1. Giả lập rời khỏi chỗ ngồi (> 120px) duy trì 11 giây
    track.centroids.append((350.0, 100.0))  # Dịch chuyển 200px
    for step in range(110):
        incidents = engagement.analyze([track], now=now + step * 0.1)

    inc_types = [inc["type"] for inc in incidents]
    assert IncidentType.DISRUPTIVE_ROAMING.value in inc_types

    # 2. Giả lập gục đầu ngủ gật (Bất động > 30s)
    track.still_duration = 35.0
    track.torso_lean_angle = 55.0
    incidents = engagement.analyze([track], now=now + 20.0)
    inc_types = [inc["type"] for inc in incidents]
    assert IncidentType.DISRUPTIVE_SLEEPING.value in inc_types


def test_campus_safety_5phase_debounced_fall():
    """Kiểm tra máy trạng thái khử rung té ngã 5 pha: Phân biệt ngã thật với tự đứng dậy."""
    safety = CampusSafetyAnalyzer()
    now = time.time()

    kpts = np.zeros((17, 3), dtype=np.float32)
    # Khởi tạo đối tượng đang đứng bình thường (chiều cao 300, chiều rộng 100, tỷ lệ = 3.0)
    track = TrackedObject(track_id=30, initial_bbox=[100, 50, 200, 350], initial_kpts=kpts, timestamp=now)

    # Tình huống 1: Ngã giả (Học sinh cúi nhặt đồ hoặc vấp nhẹ rồi tự đứng dậy trong 1.5s)
    track.hip_y_velocity = 120.0  # Vận tốc rơi nhanh
    safety.analyze([track], now=now + 0.1)
    fsm = safety.fall_state_machine[30]
    assert fsm["state"] == DebouncedFallState.RAPID_DROP

    # Rơi xuống sàn (Tỷ lệ < 0.9)
    track.bbox = [100, 300, 350, 370]  # Nằm sàn
    safety.analyze([track], now=now + 0.3)
    assert fsm["state"] == DebouncedFallState.FLOOR_LEVEL

    # Tự đứng dậy ngay (Tỷ lệ trở lại > 1.2) -> Tự hủy cảnh báo về NORMAL
    track.bbox = [100, 50, 200, 350]
    incidents = safety.analyze([track], now=now + 1.2)
    assert fsm["state"] == DebouncedFallState.NORMAL
    assert len(incidents) == 0

    # Tình huống 2: Ngã thật và bất động > 3.0 giây -> XÁC NHẬN TÉ NGÃ NGUY CẤP
    track.hip_y_velocity = 130.0
    safety.analyze([track], now=now + 2.0)
    track.bbox = [100, 300, 350, 370]
    safety.analyze([track], now=now + 2.2)  # Vào FLOOR_LEVEL
    safety.analyze([track], now=now + 2.4)  # Vào IMMOBILE_DEBOUNCE

    # Duy trì nằm bất động 3.5 giây
    confirmed_incidents = []
    for step in range(35):
        confirmed_incidents = safety.analyze([track], now=now + 2.4 + step * 0.1)

    assert fsm["state"] == DebouncedFallState.CONFIRMED_FALL
    assert len(confirmed_incidents) >= 1
    assert confirmed_incidents[0]["type"] == IncidentType.SAFETY_FALL.value
    assert confirmed_incidents[0]["severity"] == AlertSeverity.CRITICAL.value


def test_fastapi_streamer_and_dispatcher():
    """Kiểm tra dịch vụ FastAPI streaming và EventDispatcher."""
    dispatcher = EventDispatcher()
    streamer.set_event_dispatcher(dispatcher)

    # Cập nhật 1 khung hình thử nghiệm
    test_frame = np.full((240, 320, 3), 100, dtype=np.uint8)
    streamer.update_latest_frame("cam-test-01", test_frame)

    # Đẩy 1 sự kiện vi phạm
    dispatcher.dispatch_incident_event({
        "type": "CHEATING_HEAD_TURN",
        "track_id": 99,
        "severity": "CRITICAL",
        "label": "NGO BAI",
        "timestamp": time.time()
    }, camera_id="cam-test-01")

    # Kiểm tra API lấy sự kiện
    active_incidents = streamer.get_active_incidents("cam-test-01")
    assert len(active_incidents) >= 1
    assert active_incidents[0]["track_id"] == 99

    dispatcher.stop()


if __name__ == "__main__":
    print("Executing mschool Camera Worker Unit Tests...")
    test_rtmo_pose_engine_detection_and_overlay()
    print("1/7 test_rtmo_pose_engine_detection_and_overlay: PASSED")
    test_bytetrack_tracker_multi_object()
    print("2/7 test_bytetrack_tracker_multi_object: PASSED")
    test_spatial_tripwire_classification()
    print("3/7 test_spatial_tripwire_classification: PASSED")
    test_exam_proctoring_cheating_detection()
    print("4/7 test_exam_proctoring_cheating_detection: PASSED")
    test_classroom_engagement_disruptive_detection()
    print("5/7 test_classroom_engagement_disruptive_detection: PASSED")
    test_campus_safety_5phase_debounced_fall()
    print("6/7 test_campus_safety_5phase_debounced_fall: PASSED")
    test_fastapi_streamer_and_dispatcher()
    print("7/7 test_fastapi_streamer_and_dispatcher: PASSED")
    print("All 7/7 Unit Tests PASSED successfully!")
