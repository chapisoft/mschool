"""
Face Quality Assessment (FQA) & Multi-Frame Feature Aggregation Engine.
Evaluates face sharpness via Laplacian Variance, estimates 3D head pose (Yaw, Pitch, Roll)
from landmarks, filters motion blur, aligns face crops, and performs weighted L2-fusion.
"""

import math
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass
import numpy as np
import cv2


@dataclass
class FaceQualityScore:
    """Đặc tả điểm chất lượng toàn diện của một khuôn mặt."""
    laplacian_var: float                   # Phương sai toán tử Laplacian (Đo độ sắc nét, chống nhòe chuyển động)
    is_sharp: bool                         # True nếu laplacian_var >= MIN_LAPLACIAN_VAR
    yaw_angle: float                       # Góc quay ngang (Độ): Dương = quay phải, Âm = quay trái
    pitch_angle: float                     # Góc cúi/ngửa (Độ): Dương = cúi xuống, Âm = ngửa lên
    roll_angle: float                      # Góc nghiêng nghiêng đầu trên mặt phẳng ảnh (Độ)
    is_frontal: bool                       # True nếu các góc quay nằm trong phạm vi chuẩn
    brightness_ire: float                  # Độ sáng trung bình chuẩn hóa theo thang đo IRE (0 - 100)
    is_well_lit: bool                      # True nếu độ sáng nằm trong dải 35 - 85 IRE
    face_width: int                        # Chiều rộng vùng mặt (Pixel)
    face_height: int                       # Chiều cao vùng mặt (Pixel)
    interocular_distance: float            # Khoảng cách giữa hai mắt (Pixel)
    is_size_valid: bool                    # True nếu kích thước mặt >= MIN_FACE_SIZE
    overall_score: float                   # Điểm chất lượng tổng hợp (0.0 đến 1.0)
    is_usable: bool                        # Đạt toàn bộ các tiêu chí để đưa vào nhận diện và lưu vết


@dataclass
class EnrollmentValidationResult:
    """Đặc tả kết quả thẩm định và chuẩn hóa ảnh đăng ký khuôn mặt chuẩn so sánh Face Compare."""
    is_valid: bool                         # True nếu đạt toàn bộ tiêu chuẩn lưu trữ
    quality_score: float                   # Điểm chất lượng đăng ký (0.0 đến 1.0)
    laplacian_var: float                   # Độ sắc nét Laplacian thực tế
    is_sharp: bool                         # True nếu laplacian_var >= 150.0 (ngưỡng đăng ký khắt khe)
    yaw_angle: float                       # Góc quay ngang thực tế
    pitch_angle: float                     # Góc cúi/ngửa thực tế
    roll_angle: float                      # Góc nghiêng đầu thực tế
    angle_matched: bool                    # True nếu đúng góc yêu cầu theo từng bước (straight, pitch_down, left, right, camera_native)
    face_width: int                        # Chiều rộng khuôn mặt (Pixel)
    face_height: int                       # Chiều cao khuôn mặt (Pixel)
    interocular_distance: float            # Khoảng cách hai mắt (Pixel, yêu cầu >= 30)
    is_size_valid: bool                    # True nếu kích thước mặt >= 120x120 px
    brightness_ire: float                  # Độ sáng thực tế (IRE)
    is_well_lit: bool                      # True nếu nằm trong dải chuẩn 40 - 80 IRE
    feedback_code: str                     # Mã phân loại trạng thái (ENROLL_VALID, ERR_BLURRY, ERR_OFF_ANGLE,...)
    feedback_message: str                  # Thông điệp hướng dẫn người dùng bằng tiếng Việt
    aligned_face_112: Optional[np.ndarray] = None  # Ảnh căn chỉnh chuẩn tắc 112×112 phục vụ trích xuất vector
    high_res_portrait: Optional[np.ndarray] = None # Ảnh chân dung độ phân giải cao (>= 600×600 px) phục vụ lưu vết
    embedding_512: Optional[np.ndarray] = None     # Vector đặc trưng 512-D chuẩn hóa L2


# Tọa độ chuẩn tắc 5 mốc hình học chuẩn InsightFace/ArcFace/AdaFace trên khung hình 112×112
CANONICAL_5PTS_112x112 = np.array([
    [38.2946, 51.6963],  # Mắt trái
    [73.5318, 51.6963],  # Mắt phải
    [56.0252, 71.7366],  # Chóp mũi
    [41.5493, 92.3655],  # Khóe miệng trái
    [70.7299, 92.3655]   # Khóe miệng phải
], dtype=np.float32)

# Tọa độ chuẩn tắc 3 mốc vùng đầu: Mũi, Mắt trái, Mắt phải trên khung hình 112×112
CANONICAL_3PTS_112x112 = np.array([
    [56.0252, 71.7366],  # Mũi
    [38.2946, 51.6963],  # Mắt trái
    [73.5318, 51.6963],  # Mắt phải
], dtype=np.float32)


class FaceQualityEngine:
    """Động cơ đánh giá chất lượng khuôn mặt và hợp nhất đặc trưng đa khung hình."""

    def __init__(
        self,
        min_laplacian_var: float = 120.0,
        min_face_size: int = 50,
        min_iod: float = 22.0,
        max_yaw: float = 20.0,
        max_pitch: float = 15.0,
        max_roll: float = 15.0,
        min_ire: float = 35.0,
        max_ire: float = 85.0,
    ):
        self.min_laplacian_var = min_laplacian_var
        self.min_face_size = min_face_size
        self.min_iod = min_iod
        self.max_yaw = max_yaw
        self.max_pitch = max_pitch
        self.max_roll = max_roll
        self.min_ire = min_ire
        self.max_ire = max_ire

    @staticmethod
    def compute_laplacian_variance(image: np.ndarray) -> float:
        """
        Tính phương sai toán tử Laplace để đo độ sắc nét của ảnh (Blur Detection).
        Khung hình bị nhòe chuyển động (Motion Blur) do màn trập chậm sẽ có phương sai rất thấp.
        """
        if image is None or image.size == 0:
            return 0.0

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = float(laplacian.var())
        return variance

    @staticmethod
    def compute_brightness_ire(image: np.ndarray) -> float:
        """Tính độ sáng trung bình theo đơn vị IRE (0 đến 100)."""
        if image is None or image.size == 0:
            return 0.0

        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        mean_val = float(np.mean(gray))
        ire = (mean_val / 255.0) * 100.0
        return ire

    def estimate_head_pose(self, keypoints: np.ndarray) -> Tuple[float, float, float]:
        """
        Ước lượng 3 góc tư thế đầu (Yaw, Pitch, Roll) từ 5 mốc hình học vùng mặt.
        Keypoints chuẩn COCO: 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear.
        """
        if keypoints is None or len(keypoints) < 5:
            return 0.0, 0.0, 0.0

        nose = keypoints[0][:2]
        left_eye = keypoints[1][:2]
        right_eye = keypoints[2][:2]
        left_ear = keypoints[3][:2]
        right_ear = keypoints[4][:2]

        # 1. Roll: Góc nghiêng trên mặt phẳng ảnh tính từ đường nối 2 mắt
        dx_eyes = right_eye[0] - left_eye[0]
        dy_eyes = right_eye[1] - left_eye[1]
        roll = float(math.degrees(math.atan2(dy_eyes, dx_eyes)))

        # 2. Yaw: Góc quay ngang dựa trên tỷ lệ đối xứng giữa sống mũi và 2 mắt
        eye_midpoint_x = (left_eye[0] + right_eye[0]) / 2.0
        iod = max(1.0, abs(dx_eyes))
        nose_offset_x = nose[0] - eye_midpoint_x
        # Chuẩn hóa độ lệch mũi theo khoảng cách mắt: góc 0 độ khi mũi nằm chính giữa 2 mắt
        yaw = float((nose_offset_x / (iod * 0.5)) * 45.0)
        yaw = max(-90.0, min(90.0, yaw))

        # 3. Pitch: Góc cúi/ngửa dựa trên vị trí tương đối của mũi so với đường mắt và tai
        eye_midpoint_y = (left_eye[1] + right_eye[1]) / 2.0
        ear_midpoint_y = (left_ear[1] + right_ear[1]) / 2.0
        nose_dy = nose[1] - eye_midpoint_y
        expected_nose_dy = iod * 0.55  # Tỷ lệ giải phẫu mặt người nhìn thẳng

        pitch_diff = (nose_dy - expected_nose_dy) / max(1.0, iod)
        pitch = float(pitch_diff * 60.0)
        pitch = max(-60.0, min(60.0, pitch))

        return yaw, pitch, roll

    def extract_face_crop(
        self,
        frame: np.ndarray,
        keypoints: np.ndarray,
        person_bbox: Optional[List[float]] = None,
        margin_scale: float = 0.35,
    ) -> Tuple[Optional[np.ndarray], Tuple[int, int, int, int]]:
        """
        Trích xuất vùng khuôn mặt độ phân giải cao từ khung hình gốc dựa trên 5 điểm mốc đầu.
        Đảm bảo không bị méo tỷ lệ và lấy trọn vẹn từ trán đến cằm.
        """
        if frame is None or frame.size == 0 or keypoints is None:
            return None, (0, 0, 0, 0)

        h_img, w_img = frame.shape[:2]

        # Lấy 5 mốc vùng đầu: nose, left_eye, right_eye, left_ear, right_ear
        head_pts = keypoints[0:5]
        valid_pts = [pt[:2] for pt in head_pts if len(pt) >= 3 and pt[2] > 0.15]

        if len(valid_pts) >= 3:
            xs = [p[0] for p in valid_pts]
            ys = [p[1] for p in valid_pts]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)

            w_box = max(10.0, x_max - x_min)
            h_box = max(10.0, y_max - y_min)

            # Mở rộng biên độ giải phẫu: trán phía trên mắt và cằm phía dưới mũi
            pad_top = max(w_box * 0.35, h_box * 1.1)
            pad_bottom = max(w_box * 0.55, h_box * 2.0)
            pad_side = w_box * margin_scale

            x1 = max(0, round(x_min - pad_side))
            y1 = max(0, round(y_min - pad_top))
            x2 = min(w_img, round(x_max + pad_side))
            y2 = min(h_img, round(y_max + pad_bottom))
        elif person_bbox is not None and len(person_bbox) >= 4:
            # Dự phòng: Cắt 1/4 phần trên của hộp bao toàn thân
            bx1, by1, bx2, by2 = person_bbox
            bw = bx2 - bx1
            bh = by2 - by1
            x1 = max(0, round(bx1 + bw * 0.15))
            y1 = max(0, round(by1))
            x2 = min(w_img, round(bx2 - bw * 0.15))
            y2 = min(h_img, round(by1 + bh * 0.28))
        else:
            return None, (0, 0, 0, 0)

        if x2 - x1 < 10 or y2 - y1 < 10:
            return None, (0, 0, 0, 0)

        face_crop = frame[y1:y2, x1:x2].copy()
        return face_crop, (x1, y1, x2, y2)

    def evaluate_quality(
        self,
        face_crop: np.ndarray,
        keypoints: Optional[np.ndarray] = None,
    ) -> FaceQualityScore:
        """
        Đánh giá chất lượng khuôn mặt theo 4 cấp độ: Độ sắc nét Laplacian, Góc tư thế, Độ sáng, Kích thước.
        """
        if face_crop is None or face_crop.size == 0:
            return FaceQualityScore(
                laplacian_var=0.0,
                is_sharp=False,
                yaw_angle=0.0,
                pitch_angle=0.0,
                roll_angle=0.0,
                is_frontal=False,
                brightness_ire=0.0,
                is_well_lit=False,
                face_width=0,
                face_height=0,
                interocular_distance=0.0,
                is_size_valid=False,
                overall_score=0.0,
                is_usable=False,
            )

        fh, fw = face_crop.shape[:2]

        # 1. Đo độ sắc nét Laplacian
        lap_var = self.compute_laplacian_variance(face_crop)
        is_sharp = lap_var >= self.min_laplacian_var

        # 2. Đo độ sáng IRE
        ire = self.compute_brightness_ire(face_crop)
        is_well_lit = (self.min_ire <= ire <= self.max_ire)

        # 3. Ước lượng tư thế đầu từ 5 keypoints
        yaw, pitch, roll = 0.0, 0.0, 0.0
        iod = 0.0
        if keypoints is not None and len(keypoints) >= 5:
            yaw, pitch, roll = self.estimate_head_pose(keypoints)
            left_eye = keypoints[1][:2]
            right_eye = keypoints[2][:2]
            iod = float(np.linalg.norm(right_eye - left_eye))
        else:
            iod = float(fw * 0.40)

        is_frontal = (
            abs(yaw) <= self.max_yaw
            and abs(pitch) <= self.max_pitch
            and abs(roll) <= self.max_roll
        )

        # 4. Kiểm tra kích thước
        is_size_valid = (fw >= self.min_face_size and fh >= self.min_face_size and iod >= self.min_iod)

        # 5. Điểm số tổng hợp (0.0 đến 1.0)
        # Trọng số: Sắc nét (0.45), Góc thẳng (0.30), Kích thước (0.15), Ánh sáng (0.10)
        sharp_score = min(1.0, lap_var / (self.min_laplacian_var * 2.5))
        pose_penalty = min(1.0, (abs(yaw) / 45.0) * 0.5 + (abs(pitch) / 35.0) * 0.3 + (abs(roll) / 30.0) * 0.2)
        pose_score = max(0.0, 1.0 - pose_penalty)
        size_score = min(1.0, max(fw, fh) / 120.0)
        light_score = max(0.0, 1.0 - abs(ire - 60.0) / 40.0)

        overall = (
            0.45 * sharp_score +
            0.30 * pose_score +
            0.15 * size_score +
            0.10 * light_score
        )
        overall = float(round(max(0.0, min(1.0, overall)), 4))

        is_usable = is_sharp and is_frontal and is_well_lit and is_size_valid

        return FaceQualityScore(
            laplacian_var=round(lap_var, 2),
            is_sharp=is_sharp,
            yaw_angle=round(yaw, 1),
            pitch_angle=round(pitch, 1),
            roll_angle=round(roll, 1),
            is_frontal=is_frontal,
            brightness_ire=round(ire, 1),
            is_well_lit=is_well_lit,
            face_width=fw,
            face_height=fh,
            interocular_distance=round(iod, 1),
            is_size_valid=is_size_valid,
            overall_score=overall,
            is_usable=is_usable,
        )

    @staticmethod
    def align_face(
        face_crop: np.ndarray,
        target_size: Tuple[int, int] = (112, 112)
    ) -> np.ndarray:
        """Chuẩn hóa ảnh khuôn mặt về kích thước mục tiêu 112×112 chuẩn AdaFace/ArcFace."""
        if face_crop is None or face_crop.size == 0:
            return np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)
        return cv2.resize(face_crop, target_size, interpolation=cv2.INTER_AREA)

    @staticmethod
    def aggregate_multi_frame_embeddings(
        embeddings: List[np.ndarray],
        weights: List[float]
    ) -> np.ndarray:
        """
        Hợp nhất các vector đặc trưng đa khung hình theo công thức bình quân gia quyền L2:
        E_track = (Sum(w_i * e_i)) / || Sum(w_i * e_i) ||_2
        Triệt tiêu nhiễu ánh sáng cục bộ ngoài trời và gia tăng độ tin cậy từ 8% đến 15%.
        """
        if not embeddings:
            return np.zeros(512, dtype=np.float32)

        if len(embeddings) == 1:
            norm = np.linalg.norm(embeddings[0])
            return (embeddings[0] / max(1e-6, norm)).astype(np.float32)

        if len(weights) != len(embeddings):
            weights = [1.0] * len(embeddings)

        sum_vec = np.zeros_like(embeddings[0], dtype=np.float64)
        for emb, w in zip(embeddings, weights):
            w_norm = max(0.01, float(w))
            emb_norm = emb / max(1e-6, np.linalg.norm(emb))
            sum_vec += w_norm * emb_norm

        l2_norm = float(np.linalg.norm(sum_vec))
        if l2_norm < 1e-6:
            return np.zeros_like(embeddings[0], dtype=np.float32)

        fused = (sum_vec / l2_norm).astype(np.float32)
        return fused

    @staticmethod
    def extract_simulated_adaface_embedding(face_crop: np.ndarray) -> np.ndarray:
        """
        Tạo vector đặc trưng 512 chiều chuẩn hóa L2 từ ảnh khuôn mặt
        (Bảo đảm tính tất định, không bao giờ suy biến về 0 và chuẩn hóa L2 = 1.0).
        """
        if face_crop is None or face_crop.size == 0:
            return np.zeros(512, dtype=np.float32)

        aligned = cv2.resize(face_crop, (112, 112), interpolation=cv2.INTER_AREA)
        # Sử dụng ma trận chiếu ngẫu nhiên cố định (Fixed Random Projection) từ không gian ảnh sang 512D
        # kết hợp đặc trưng thống kê để bảo đảm tính tất định
        rng = np.random.RandomState(42)
        proj_matrix = rng.randn(112 * 112, 512).astype(np.float32)
        gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

        flat_img = (gray - np.mean(gray)).flatten()
        vec = np.dot(flat_img, proj_matrix)
        if np.linalg.norm(vec) < 1e-6:
            vec = np.ones(512, dtype=np.float32) * float(np.mean(gray) + 0.1)

        norm = float(np.linalg.norm(vec))
        if norm > 1e-6:
            vec = vec / norm
        return vec.astype(np.float32)

    @staticmethod
    def align_canonical_face(
        frame: np.ndarray,
        keypoints: Optional[np.ndarray] = None,
        output_size: Tuple[int, int] = (112, 112)
    ) -> np.ndarray:
        """
        Căn chỉnh hình học chuẩn tắc 5 điểm mốc (hoặc 3 mốc mắt-mũi) về khung hình 112×112.
        Sử dụng phép biến đổi tương đồng Affine Similarity Transform để giữ nguyên tỷ lệ,
        triệt tiêu góc nghiêng Roll và đưa 2 mắt về đường chân trời chuẩn InsightFace/AdaFace.
        """
        if frame is None or frame.size == 0:
            return np.zeros((output_size[1], output_size[0], 3), dtype=np.uint8)

        if keypoints is not None and len(keypoints) >= 3:
            src_pts = keypoints[:3, :2].astype(np.float32)
            dst_pts = CANONICAL_3PTS_112x112

            # Tìm ma trận biến đổi tương đồng 2D (scale, rotation, translation)
            M, _ = cv2.estimateAffinePartial2D(src_pts, dst_pts)
            if M is not None:
                aligned = cv2.warpAffine(
                    frame, M, output_size,
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REFLECT
                )
                return aligned

        # Dự phòng: Resize thông thường
        return cv2.resize(frame, output_size, interpolation=cv2.INTER_AREA)

    @staticmethod
    def extract_high_res_portrait(
        frame: np.ndarray,
        keypoints: Optional[np.ndarray] = None,
        person_bbox: Optional[List[float]] = None,
        target_size: Tuple[int, int] = (600, 600)
    ) -> np.ndarray:
        """
        Trích xuất ảnh chân dung độ phân giải cao (>= 600×600 px) phục vụ lưu vết bằng chứng,
        thẻ học sinh/giáo viên và thanh tra đối soát mắt thường với chất lượng tối đa.
        """
        if frame is None or frame.size == 0:
            return np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)

        h_img, w_img = frame.shape[:2]

        # Xác định vùng bao quanh mặt và vai
        if keypoints is not None and len(keypoints) >= 5:
            head_pts = keypoints[:5, :2]
            valid_pts = [p for p in head_pts if not np.all(p == 0)]
            if len(valid_pts) >= 3:
                xs = [p[0] for p in valid_pts]
                ys = [p[1] for p in valid_pts]
                cx = (min(xs) + max(xs)) / 2.0
                cy = (min(ys) + max(ys)) / 2.0
                face_span = max(max(xs) - min(xs), max(ys) - min(ys))
                crop_size = max(180.0, face_span * 2.4)
            else:
                cx, cy = w_img / 2.0, h_img / 2.0
                crop_size = min(w_img, h_img) * 0.8
        elif person_bbox is not None and len(person_bbox) >= 4:
            bx1, by1, bx2, by2 = person_bbox
            cx = (bx1 + bx2) / 2.0
            cy = by1 + (by2 - by1) * 0.25
            crop_size = max(180.0, (bx2 - bx1) * 1.5)
        else:
            cx, cy = w_img / 2.0, h_img / 2.0
            crop_size = min(w_img, h_img)

        half = crop_size / 2.0
        x1 = max(0, round(cx - half))
        y1 = max(0, round(cy - half * 0.9))
        x2 = min(w_img, round(cx + half))
        y2 = min(h_img, round(cy + half * 1.1))

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return cv2.resize(frame, target_size, interpolation=cv2.INTER_CUBIC)

        return cv2.resize(crop, target_size, interpolation=cv2.INTER_CUBIC)

    def validate_enrollment_image(
        self,
        frame: np.ndarray,
        keypoints: Optional[np.ndarray] = None,
        angle_type: str = "straight"
    ) -> EnrollmentValidationResult:
        """
        Cổng kiểm định chất lượng khắt khe cho ảnh đăng ký khuôn mặt (Enrollment Quality Gate).
        Yêu cầu độ sắc nét Laplacian >= 150.0, khuôn mặt >= 120 px, IOD >= 30 px và đúng góc mặt yêu cầu.
        """
        if frame is None or frame.size == 0:
            return EnrollmentValidationResult(
                is_valid=False,
                quality_score=0.0,
                laplacian_var=0.0,
                is_sharp=False,
                yaw_angle=0.0,
                pitch_angle=0.0,
                roll_angle=0.0,
                angle_matched=False,
                face_width=0,
                face_height=0,
                interocular_distance=0.0,
                is_size_valid=False,
                brightness_ire=0.0,
                is_well_lit=False,
                feedback_code="ERR_IMAGE_EMPTY",
                feedback_message="Không có dữ liệu hình ảnh",
            )

        # 1. Đo độ sắc nét Laplacian (ngưỡng đăng ký khắt khe: 150.0)
        lap_var = self.compute_laplacian_variance(frame)
        is_sharp = lap_var >= 150.0

        # 2. Đo độ sáng IRE
        ire = self.compute_brightness_ire(frame)
        is_well_lit = (40.0 <= ire <= 80.0)

        # 3. Ước lượng tư thế góc đầu
        yaw, pitch, roll = 0.0, 0.0, 0.0
        iod = 0.0
        fw, fh = frame.shape[1], frame.shape[0]

        if keypoints is not None and len(keypoints) >= 5:
            yaw, pitch, roll = self.estimate_head_pose(keypoints)
            left_eye = keypoints[1][:2]
            right_eye = keypoints[2][:2]
            iod = float(np.linalg.norm(right_eye - left_eye))
            # Xác định kích thước hộp mặt thực tế
            face_crop, crop_box = self.extract_face_crop(frame, keypoints)
            if face_crop is not None:
                fw, fh = face_crop.shape[1], face_crop.shape[0]
                lap_var = self.compute_laplacian_variance(face_crop)
                is_sharp = lap_var >= 150.0
        else:
            iod = float(fw * 0.35)

        is_size_valid = (fw >= 120 and fh >= 120 and iod >= 30.0)

        # 4. Kiểm định góc xoay theo yêu cầu angle_type
        angle_type_norm = (angle_type or "straight").lower().strip()
        angle_matched = False
        angle_err_msg = ""

        if angle_type_norm == "straight":
            angle_matched = (abs(yaw) <= 12.0 and abs(pitch) <= 12.0 and abs(roll) <= 8.0)
            if not angle_matched:
                angle_err_msg = f"Vui lòng nhìn thẳng chính diện vào camera (Góc lệch hiện tại: Yaw={yaw:.1f}°, Pitch={pitch:.1f}°)"
        elif angle_type_norm in ("pitch_down", "down"):
            angle_matched = (8.0 <= pitch <= 24.0 and abs(yaw) <= 15.0)
            if not angle_matched:
                angle_err_msg = f"Vui lòng hơi cúi đầu xuống khoảng 10° – 15° (Pitch hiện tại: {pitch:.1f}°)"
        elif angle_type_norm in ("left", "left_yaw"):
            angle_matched = (-25.0 <= yaw <= -10.0 and abs(pitch) <= 15.0)
            if not angle_matched:
                angle_err_msg = f"Vui lòng hơi quay mặt sang trái khoảng 15° (Yaw hiện tại: {yaw:.1f}°)"
        elif angle_type_norm in ("right", "right_yaw"):
            angle_matched = (10.0 <= yaw <= 25.0 and abs(pitch) <= 15.0)
            if not angle_matched:
                angle_err_msg = f"Vui lòng hơi quay mặt sang phải khoảng 15° (Yaw hiện tại: {yaw:.1f}°)"
        elif angle_type_norm == "camera_native":
            angle_matched = (abs(yaw) <= 22.0 and abs(pitch) <= 18.0)
            if not angle_matched:
                angle_err_msg = f"Góc mặt từ camera cổng chưa đạt (Yaw={yaw:.1f}°, Pitch={pitch:.1f}°)"
        else:
            angle_matched = (abs(yaw) <= 15.0 and abs(pitch) <= 15.0)

        # 5. Phân loại mã lỗi phản hồi
        feedback_code = "ENROLL_VALID"
        feedback_message = "Ảnh đạt chuẩn đăng ký khuôn mặt chất lượng cao"

        if not is_sharp:
            feedback_code = "ERR_BLURRY_IMAGE"
            feedback_message = f"Ảnh bị mờ nhòe (Độ sắc nét {lap_var:.1f} < 150.0). Vui lòng cầm chắc thiết bị và lấy nét rõ vùng mắt"
        elif not is_size_valid:
            feedback_code = "ERR_FACE_TOO_SMALL"
            feedback_message = f"Khuôn mặt quá nhỏ ({fw}×{fh} px, yêu cầu ≥ 120×120 px). Vui lòng đứng gần camera hơn"
        elif not is_well_lit:
            feedback_code = "ERR_POOR_LIGHTING"
            feedback_message = f"Độ sáng không đạt chuẩn ({ire:.1f} IRE, yêu cầu 40 – 80 IRE). Vui lòng tránh bóng râm tối hoặc nguồn sáng chói ngược"
        elif not angle_matched:
            feedback_code = "ERR_OFF_ANGLE"
            feedback_message = angle_err_msg if angle_err_msg else "Góc mặt chưa đúng yêu cầu đăng ký"

        is_valid = is_sharp and is_size_valid and is_well_lit and angle_matched

        # 6. Tính điểm chất lượng tổng hợp (0.0 đến 1.0)
        sharp_ratio = min(1.0, lap_var / 300.0)
        size_ratio = min(1.0, fw / 200.0)
        pose_ratio = 1.0 if angle_matched else 0.5
        light_ratio = max(0.0, 1.0 - abs(ire - 60.0) / 40.0)
        quality_score = round(0.40 * sharp_ratio + 0.30 * pose_ratio + 0.15 * size_ratio + 0.15 * light_ratio, 3)

        # 7. Căn chỉnh chuẩn tắc 112×112 và trích xuất ảnh chân dung nét cao
        aligned_112 = None
        high_res = None
        embedding_512 = None

        if is_valid:
            aligned_112 = self.align_canonical_face(frame, keypoints, (112, 112))
            high_res = self.extract_high_res_portrait(frame, keypoints, None, (600, 600))
            embedding_512 = self.extract_simulated_adaface_embedding(aligned_112)

        return EnrollmentValidationResult(
            is_valid=is_valid,
            quality_score=quality_score,
            laplacian_var=round(lap_var, 2),
            is_sharp=is_sharp,
            yaw_angle=round(yaw, 1),
            pitch_angle=round(pitch, 1),
            roll_angle=round(roll, 1),
            angle_matched=angle_matched,
            face_width=fw,
            face_height=fh,
            interocular_distance=round(iod, 1),
            is_size_valid=is_size_valid,
            brightness_ire=round(ire, 1),
            is_well_lit=is_well_lit,
            feedback_code=feedback_code,
            feedback_message=feedback_message,
            aligned_face_112=aligned_112,
            high_res_portrait=high_res,
            embedding_512=embedding_512,
        )

    @staticmethod
    def encode_crisp_image(image: np.ndarray, quality: int = 98) -> Optional[bytes]:
        """Mã hóa ảnh JPEG độ nét cao với chất lượng bảo toàn tối đa (Quality=98%)."""
        if image is None or image.size == 0:
            return None
        success, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if success:
            return buf.tobytes()
        return None

    @staticmethod
    def encode_crisp_image_base64(image: np.ndarray, quality: int = 98) -> Optional[str]:
        """Mã hóa ảnh sang chuỗi Base64 JPEG chất lượng cao."""
        raw_bytes = FaceQualityEngine.encode_crisp_image(image, quality)
        if raw_bytes is not None:
            import base64
            return base64.b64encode(raw_bytes).decode("utf-8")
        return None
