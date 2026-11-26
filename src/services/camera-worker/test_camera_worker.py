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
    traj_in = [(300.0, 250.0), (300.0, 350.0)]
    assert tripwire.classify_direction(traj_in) == Direction.IN

    # Quỹ đạo đi lên (Y giảm): Ra (OUT)
    traj_out = [(300.0, 350.0), (300.0, 250.0)]
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


def test_face_quality_engine_laplacian_and_pose():
    """Kiểm tra FaceQualityEngine: đo độ sắc nét Laplacian, lọc nhòe chuyển động và ước lượng góc đầu 3D."""
    import cv2
    from face_quality import FaceQualityEngine

    fqa = FaceQualityEngine(min_laplacian_var=120.0, min_face_size=50)

    # 1. Tạo ảnh sắc nét (nhiều biên cạnh sắc nét)
    sharp_img = np.zeros((80, 80, 3), dtype=np.uint8)
    for i in range(0, 80, 6):
        sharp_img[i:i+3, :] = 220
        sharp_img[:, i:i+3] = 220

    # 2. Tạo ảnh mờ bằng cách áp dụng GaussianBlur mạnh
    blurry_img = cv2.GaussianBlur(sharp_img, (21, 21), 0)

    sharp_var = fqa.compute_laplacian_variance(sharp_img)
    blurry_var = fqa.compute_laplacian_variance(blurry_img)

    assert sharp_var > 500.0, f"Expected sharp variance > 500, got {sharp_var}"
    assert blurry_var < 50.0, f"Expected blurry variance < 50, got {blurry_var}"
    assert sharp_var > blurry_var * 10, "Độ sắc nét ảnh gốc phải vượt trội hoàn toàn ảnh bị nhòe"

    # 3. Kiểm tra ước lượng góc đầu từ 5 keypoints
    # Mũi chính giữa 2 mắt -> Nhìn thẳng (Yaw gần 0)
    frontal_kpts = np.array([
        [40.0, 45.0, 0.9],   # nose
        [28.0, 32.0, 0.9],   # left_eye
        [52.0, 32.0, 0.9],   # right_eye
        [15.0, 40.0, 0.8],   # left_ear
        [65.0, 40.0, 0.8],   # right_ear
    ], dtype=np.float32)

    yaw, pitch, roll = fqa.estimate_head_pose(frontal_kpts)
    assert abs(yaw) < 5.0, f"Mặt nhìn thẳng thì Yaw phải < 5°, thực tế: {yaw}"
    assert abs(roll) < 5.0, f"Mặt không nghiêng thì Roll phải < 5°, thực tế: {roll}"

    # Đánh giá chất lượng khuôn mặt nhìn thẳng sắc nét
    score = fqa.evaluate_quality(sharp_img, frontal_kpts)
    assert score.is_sharp is True
    assert score.is_frontal is True
    assert score.is_usable is True
    assert score.overall_score > 0.65


def test_multi_frame_feature_fusion_and_candidates():
    """Kiểm tra cơ chế lưu trữ Top-K Best-shots và hợp nhất đặc trưng đa khung hình L2."""
    from face_quality import FaceQualityEngine, FaceQualityScore

    fqa = FaceQualityEngine()
    now = time.time()
    track = TrackedObject(track_id=10, initial_bbox=[100, 100, 200, 300], initial_kpts=np.zeros((17, 3)), timestamp=now)

    # Thêm 4 ứng viên khuôn mặt với độ sắc nét khác nhau
    for idx, lap_score in enumerate([80.0, 240.0, 150.0, 310.0]):
        crop = np.full((64, 64, 3), 100 + idx * 20, dtype=np.uint8)
        frame = np.full((480, 640, 3), 50, dtype=np.uint8)
        q_score = FaceQualityScore(
            laplacian_var=lap_score,
            is_sharp=lap_score >= 120.0,
            yaw_angle=5.0,
            pitch_angle=2.0,
            roll_angle=1.0,
            is_frontal=True,
            brightness_ire=55.0,
            is_well_lit=True,
            face_width=64,
            face_height=64,
            interocular_distance=26.0,
            is_size_valid=True,
            overall_score=round(lap_score / 400.0, 3),
            is_usable=lap_score >= 120.0,
        )
        emb = fqa.extract_simulated_adaface_embedding(crop)
        track.add_face_candidate(crop, frame, q_score, timestamp=now + idx * 0.1, embedding=emb, max_candidates=5)

    assert len(track.best_face_candidates) == 4
    # Ứng viên đứng đầu phải là ứng viên có điểm cao nhất (lap_score = 310.0)
    assert track.best_laplacian_var == 310.0
    assert track.has_usable_face() is True

    # Kiểm tra ảnh bằng chứng sắc nét nhất
    crisp_img = track.get_crisp_evidence_image()
    assert crisp_img is not None
    assert crisp_img.shape == (64, 64, 3)

    # Kiểm tra vector hợp nhất đa khung hình L2
    fused_vec = track.get_fused_embedding()
    assert fused_vec is not None
    assert len(fused_vec) == 512
    l2_norm = float(np.linalg.norm(fused_vec))
    assert abs(l2_norm - 1.0) < 1e-4, f"Vector sau hợp nhất bắt buộc phải chuẩn hóa L2 = 1.0, thực tế: {l2_norm}"


def test_crisp_attendance_event_dispatching():
    """Kiểm tra đóng gói sự kiện điểm danh với ảnh bằng chứng sắc nét và vector L2."""
    from face_quality import FaceQualityScore

    dispatcher = EventDispatcher()
    now = time.time()
    track = TrackedObject(track_id=42, initial_bbox=[100, 100, 200, 300], initial_kpts=np.zeros((17, 3)), timestamp=now)

    # Thêm 1 ảnh sắc nét
    face_crop = np.full((70, 70, 3), 180, dtype=np.uint8)
    full_frame = np.full((480, 640, 3), 120, dtype=np.uint8)
    q_score = FaceQualityScore(
        laplacian_var=260.0,
        is_sharp=True,
        yaw_angle=4.0,
        pitch_angle=3.0,
        roll_angle=0.0,
        is_frontal=True,
        brightness_ire=60.0,
        is_well_lit=True,
        face_width=70,
        face_height=70,
        interocular_distance=28.0,
        is_size_valid=True,
        overall_score=0.88,
        is_usable=True,
    )
    track.add_face_candidate(face_crop, full_frame, q_score, timestamp=now, embedding=np.ones(512, dtype=np.float32) / np.sqrt(512))

    payload = dispatcher.dispatch_attendance_event(track, camera_id="cam-gate-01", direction=Direction.IN)
    assert payload is not None
    assert payload["identityCode"] == "HS0042"
    assert payload["direction"] == "IN"
    assert payload["laplacianVariance"] == 260.0
    assert payload["hasUsableFace"] is True
    assert payload["fusedVector"] is not None
    assert len(payload["fusedVector"]) == 512
    assert payload["evidenceImage"] is not None
    assert len(payload["evidenceImage"]) > 50  # Chuỗi base64 ảnh hợp lệ

    dispatcher.stop()


def test_enrollment_validation_gate_sharpness_and_pose():
    """Kiểm tra cổng thẩm định đăng ký khuôn mặt (Enrollment Quality Gate): lọc mờ và kiểm tra góc quay."""
    import cv2
    from face_quality import FaceQualityEngine

    fqa = FaceQualityEngine()

    # 1. Ảnh sắc nét chuẩn đăng ký
    sharp_face = np.zeros((300, 300, 3), dtype=np.uint8)
    for i in range(0, 300, 10):
        sharp_face[i:i+4, :] = 200
        sharp_face[:, i:i+4] = 200

    # Keypoints nhìn thẳng
    frontal_kpts = np.array([
        [150.0, 160.0, 0.95],  # nose
        [110.0, 115.0, 0.95],  # left_eye
        [190.0, 115.0, 0.95],  # right_eye
        [70.0, 130.0, 0.90],   # left_ear
        [230.0, 130.0, 0.90],  # right_ear
    ], dtype=np.float32)

    # Thử nghiệm ảnh sắc nét nhìn thẳng -> Phải hợp lệ
    res_valid = fqa.validate_enrollment_image(sharp_face, frontal_kpts, angle_type="straight")
    assert res_valid.is_valid is True, f"Expected valid enrollment, got code={res_valid.feedback_code}: {res_valid.feedback_message}"
    assert res_valid.is_sharp is True
    assert res_valid.aligned_face_112 is not None
    assert res_valid.aligned_face_112.shape == (112, 112, 3)
    assert res_valid.high_res_portrait is not None
    assert res_valid.high_res_portrait.shape == (600, 600, 3)
    assert res_valid.embedding_512 is not None
    assert len(res_valid.embedding_512) == 512

    # 2. Thử nghiệm ảnh bị nhòe mờ -> Bị từ chối ERR_BLURRY_IMAGE
    blurry_face = cv2.GaussianBlur(sharp_face, (31, 31), 0)
    res_blurry = fqa.validate_enrollment_image(blurry_face, frontal_kpts, angle_type="straight")
    assert res_blurry.is_valid is False
    assert res_blurry.feedback_code == "ERR_BLURRY_IMAGE"
    assert "mờ nhòe" in res_blurry.feedback_message

    # 3. Thử nghiệm góc quay đầu bị lệch (Yaw lớn) khi yêu cầu nhìn thẳng -> Bị từ chối ERR_OFF_ANGLE
    turned_kpts = np.array([
        [185.0, 160.0, 0.95],  # nose lệch hẳn sang phải
        [110.0, 115.0, 0.95],  # left_eye
        [190.0, 115.0, 0.95],  # right_eye
        [70.0, 130.0, 0.90],   # left_ear
        [230.0, 130.0, 0.90],  # right_ear
    ], dtype=np.float32)
    res_off_angle = fqa.validate_enrollment_image(sharp_face, turned_kpts, angle_type="straight")
    assert res_off_angle.is_valid is False
    assert res_off_angle.feedback_code == "ERR_OFF_ANGLE"


def test_canonical_face_affine_alignment_5pt():
    """Kiểm tra căn chỉnh chuẩn tắc 112×112 bằng phép biến đổi tương đồng Affine."""
    from face_quality import FaceQualityEngine

    # Tạo khung hình với 2 mắt bị nghiêng góc 15 độ (Roll)
    frame = np.full((400, 400, 3), 150, dtype=np.uint8)
    tilted_kpts = np.array([
        [200.0, 220.0, 0.9],   # nose
        [140.0, 160.0, 0.9],   # left_eye (thấp hơn)
        [260.0, 190.0, 0.9],   # right_eye (cao hơn)
    ], dtype=np.float32)

    aligned = FaceQualityEngine.align_canonical_face(frame, tilted_kpts, (112, 112))
    assert aligned is not None
    assert aligned.shape == (112, 112, 3)

    # Kiểm tra mã hóa ảnh độ nét cao JPEG Quality 98%
    raw_jpg = FaceQualityEngine.encode_crisp_image(aligned, quality=98)
    assert raw_jpg is not None
    assert len(raw_jpg) > 500

    b64_str = FaceQualityEngine.encode_crisp_image_base64(aligned, quality=98)
    assert b64_str is not None
    assert len(b64_str) > 700


if __name__ == "__main__":
    print("Executing mschool Camera Worker Unit Tests...")
    test_rtmo_pose_engine_detection_and_overlay()
    print("1/12 test_rtmo_pose_engine_detection_and_overlay: PASSED")
    test_bytetrack_tracker_multi_object()
    print("2/12 test_bytetrack_tracker_multi_object: PASSED")
    test_spatial_tripwire_classification()
    print("3/12 test_spatial_tripwire_classification: PASSED")
    test_exam_proctoring_cheating_detection()
    print("4/12 test_exam_proctoring_cheating_detection: PASSED")
    test_classroom_engagement_disruptive_detection()
    print("5/12 test_classroom_engagement_disruptive_detection: PASSED")
    test_campus_safety_5phase_debounced_fall()
    print("6/12 test_campus_safety_5phase_debounced_fall: PASSED")
    test_fastapi_streamer_and_dispatcher()
    print("7/12 test_fastapi_streamer_and_dispatcher: PASSED")
    test_face_quality_engine_laplacian_and_pose()
    print("8/12 test_face_quality_engine_laplacian_and_pose: PASSED")
    test_multi_frame_feature_fusion_and_candidates()
    print("9/12 test_multi_frame_feature_fusion_and_candidates: PASSED")
    test_crisp_attendance_event_dispatching()
    print("10/12 test_crisp_attendance_event_dispatching: PASSED")
    test_enrollment_validation_gate_sharpness_and_pose()
    print("11/12 test_enrollment_validation_gate_sharpness_and_pose: PASSED")
    test_canonical_face_affine_alignment_5pt()
    print("12/12 test_canonical_face_affine_alignment_5pt: PASSED")
    print("All 12/12 Unit Tests PASSED successfully!")
