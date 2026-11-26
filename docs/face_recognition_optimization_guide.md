# TÀI LIỆU KỸ THUẬT VÀ QUY TRÌNH TỐI ƯU HÓA HỆ THỐNG NHẬN DIỆN KHUÔN MẶT KHÔNG DỪNG
## GIẢI PHÁP TRIỆT TIÊU HIỆN TƯỢNG ẢNH MỜ VÀ NÂNG CAO ĐỘ CHÍNH XÁC TRÊN CAMERA HIKVISION DS-2CD1021G0-I

---

## 1. TỔNG QUAN VÀ MỤC TIÊU KỸ THUẬT

Tài liệu này chuẩn hóa toàn bộ các bước cấu hình thiết bị, quy chuẩn lắp đặt hiện trường và kiến trúc thuật toán AI nhằm giải quyết dứt điểm hai vấn đề lớn của phân hệ nhận diện khuôn mặt điểm danh tại cổng trường:
1. **Hình ảnh khuôn mặt chụp và lưu lại bị mờ nhòe:** Do hiện tượng nhòe chuyển động (Motion Blur), nén video quá mức và logic bóc tách khung hình chưa đạt chuẩn.
2. **Hiệu quả nhận diện không đạt yêu cầu:** Do nhận diện đơn khung hình trên người đi lại tự nhiên, góc camera quá cao gây khuất diện mạo và sự sai lệch miền dữ liệu giữa ảnh đăng ký và camera thực tế.

### Các chỉ số mục tiêu sau tối ưu hóa:
* **Tỷ lệ nhận diện chính xác (True Acceptance Rate - TAR):** Đạt trên **96.5%** trong cự ly nhận diện vàng từ 2.8m đến 4.8m.
* **Tỷ lệ nhận diện sai (False Acceptance Rate - FAR):** Giảm xuống dưới **0.1%**.
* **Độ sắc nét ảnh bằng chứng lưu trữ:** 100% ảnh mặt được lưu trữ có phương sai toán tử Laplace $\ge 120.0$, loại bỏ hoàn toàn các khung hình bị kéo vệt hoặc mất nét.
* **Độ trễ toàn trình (Pipeline Latency):** Dưới **250ms** trên máy chủ biên sử dụng gia tốc phần cứng.

---

## 2. NGUYÊN NHÂN GỐC RỄ CỦA HIỆN TRẠNG

### 2.1. Giới hạn vật lý của thiết bị Hikvision DS-2CD1021G0-I
* **Cảm biến và Độ phân giải:** Cảm biến CMOS 1/2.8", độ phân giải Full HD (1920×1080). Để nhận diện tin cậy, khuôn mặt cắt ra cần đạt tối thiểu 50×50 điểm ảnh (khoảng cách hai mắt IOD $\ge 22$ điểm ảnh). Với ống kính 4mm (góc nhìn ngang ~78°), "vùng nhận diện vàng" nằm trong khoảng **2.8m đến 5.0m**. Ở cự ly ngoài 6m, khuôn mặt tụt xuống dưới 35×35 điểm ảnh, dẫn đến việc dễ nhầm lẫn đặc trưng.
* **Dải tương phản DWDR:** Thiết bị chỉ hỗ trợ chống ngược sáng kỹ thuật số (Digital WDR), không có cảm biến True WDR phần cứng 120dB. Khi mặt người quay về hướng ngược sáng, khuôn mặt rất dễ bị tối sầm nếu không can thiệp thông số phơi sáng.

### 2.2. Điểm nghẽn trong cấu hình ISP camera mặc định
1. **Tốc độ màn trập quá chậm:** Mặc định camera để chế độ tự động 1/25s – 1/30s. Người đi bộ tốc độ 1.2 – 1.5 m/s sẽ di chuyển 4 – 5 cm trong suốt thời gian cảm biến phơi sáng, gây nhòe chuyển động nặng.
2. **Khử nhiễu 3D DNR tạo bóng ma:** Mức khử nhiễu mặc định 50 làm da mặt bị bệt và xuất hiện hiện tượng bóng ma kéo đuôi khi người bước nhanh.
3. **Chuẩn nén H.265 làm mất chi tiết:** Codec H.265 nén phẳng các vùng đồng nhất, làm biến dạng chi tiết mắt mũi ở các khuôn mặt kích thước nhỏ.

---

## 3. QUY TRÌNH THIẾT LẬP CẤU HÌNH CAMERA HIKVISION DS-2CD1021G0-I

Thao tác trực tiếp trên giao diện Web quản trị của camera (Mục `Configuration` $\rightarrow$ `Image` & `Video/Audio`):

### 3.1. Cấu hình Tham số Hình ảnh (Image Parameters Switch)

| Nhóm tham số | Tên thuộc tính | Giá trị cấu hình bắt buộc | Mục đích kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Exposure Settings** | Exposure Time (Shutter Speed) | **1/250s** (Ngoài trời)<br/>**1/150s – 1/200s** (Trong nhà) | "Đóng băng" chuyển động của người đi bộ 1.5 m/s, triệt tiêu 100% nhòe chuyển động. |
| **Exposure Settings** | Gain Limit | Giới hạn tối đa **≤ 40** | Ngăn camera tự động tăng độ nhạy sáng quá mức gây vỡ hạt khi tăng tốc màn trập. |
| **Image Enhancement**| 3D DNR | Manual: Mức **30 – 35** (Tuyệt đối không để > 40) | Triệt tiêu hoàn toàn bóng ma kéo đuôi mà vẫn giữ được độ nét cạnh viền. |
| **Image Enhancement**| BLC (Backlight Compensation) | **ON (Vùng Center)** | Bù sáng vùng trung tâm lối đi, làm rõ mặt học sinh khi bước qua cửa. |
| **Image Enhancement**| Digital WDR | Mức **40 – 50** | Cân bằng dải sáng giữa nền trời bên ngoài và bóng râm hành lang. |
| **Day/Night Switch** | Day/Night Switch | Auto (Sensitivity: Medium) | Chuyển đổi nhịp nhàng, có thể bổ sung đèn LED trợ sáng ánh sáng ấm vào sáng sớm. |

### 3.2. Cấu hình Luồng Video (Video & Audio)

| Thuộc tính | Giá trị cấu hình | Giải thích |
| :--- | :--- | :--- |
| **Stream Type** | Main Stream (Luồng chính) | Dành cho xử lý AI và lưu vết bằng chứng. |
| **Video Type** | Video Stream | Chỉ truyền hình ảnh, tắt âm thanh để giảm tải mạng. |
| **Resolution** | 1920×1080 (1080P) | Bảo đảm mật độ điểm ảnh tối đa cho vùng mặt. |
| **Bitrate Type** | **CBR (Constant Bitrate)** | Duy trì luồng truyền ổn định, không bị nén bệt bất ngờ khi có chuyển động. |
| **Video Bitrate** | **4096 Kbps – 6144 Kbps** | Giữ trọn vẹn kết cấu da mặt, lỗ chân lông và đường nét mắt. |
| **Frame Rate** | **25 FPS** | Đảm bảo thu nhận đủ 30 – 45 khung hình khi người đi qua vùng quan sát. |
| **Video Encoding** | **H.264** | Chuẩn nén chuẩn mực, giữ chi tiết cạnh tốt hơn H.265 trên khuôn mặt nhỏ. |
| **I-Frame Interval**| **25** | Cứ mỗi 1 giây phát 1 khung hình I-frame, giúp khôi phục luồng RTSP ngay khi mất gói. |

---

## 4. QUY CHUẨN BỐ TRÍ VÀ LẮP ĐẶT HIỆN TRƯỜNG

### 4.1. Thông số Kỹ thuật Lắp đặt
* **Chiều cao lắp đặt camera:** Đạt từ **2.1m đến 2.3m** tính từ mặt sàn (thay vì 3m – 3.5m như camera an ninh).
* **Góc chúc xuống (Pitch Angle):** Khống chế trong dải **10° đến 12°**, tuyệt đối không vượt quá **15°**. Nếu góc chúc quá lớn, khi người đi lại gần vùng nét nhất, camera chỉ nhìn thấy trán và đỉnh đầu.
* **Góc lệch ngang (Yaw Angle):** Góc giữa trục quang của ống kính và phương di chuyển của người $\le 15^\circ$.

### 4.2. Thiết kế Luồng di chuyển Hẹp (Choke-point)
* Bố trí rào chắn mềm, lan can inox hoặc luồng cửa từ sao cho bề rộng lối đi chỉ từ **1.0m đến 1.4m**.
* Ép người đi bộ phải bước thẳng hướng vào tâm ống kính camera.
* Cự ly quan sát tối ưu (Vùng vàng): Bắt đầu phát hiện từ **5.5m**, thu thập và đánh giá chất lượng trong khoảng **2.8m đến 4.8m**, hoàn tất nhận diện trước khi người vượt qua cự ly **2.2m**.

---

## 5. KIẾN TRÚC THUẬT TOÁN AI PIPELINE NÂNG CẤP

Đường ống AI biên được tái cấu trúc gồm 5 công đoạn liên hoàn:

```
[Camera DS-2CD1021G0-I: H.264 CBR 4Mbps]
                  │
                  ▼ (RTSP Ingestion Buffer = 1, OpenCV / GStreamer NVDEC)
[1. Phát hiện Toàn thân & Khớp mặt: RTMO-s ONNX]
                  │
                  ▼
[2. Bám vết Đa mục tiêu: ByteTrack] ── Gán và duy trì Track_ID liên tục
                  │
                  ▼
[3. Động cơ Đánh giá Chất lượng Khuôn mặt: FaceQualityEngine]
    ├── Cắt ảnh mặt độ phân giải gốc kèm biên độ giải phẫu
    ├── Đo độ sắc nét Laplacian Variance (Chống nhòe mờ)
    ├── Ước lượng 3D Head Pose (Yaw, Pitch, Roll) từ 5 mốc
    └── Kiểm tra độ sáng IRE (35 - 85) và kích thước (≥ 50px)
                  │
                  ▼
[4. Hợp nhất Đặc trưng Đa khung hình L2: Multi-Frame Feature Aggregation]
    ├── Lưu giữ Top 3 - 5 ảnh sắc nét nhất của mỗi Track_ID
    ├── Trích xuất vector 512 chiều AdaFace
    └── Hợp nhất trọng số: E_track = (Sum w_i * e_i) / || Sum w_i * e_i ||_2
                  │
                  ▼
[5. Đóng gói Sự kiện & Lưu vết Bằng chứng Sắc nét: EventDispatcher]
    ├── Gửi vector 512D và mã định danh về mschool-backend
    └── Lưu ảnh cắt khuôn mặt đạt Laplacian Variance cao nhất làm bằng chứng
```

### 5.1. Công thức Toán học Đo độ sắc nét (Laplacian Variance)
Ảnh khuôn mặt cắt ra được chuyển sang ảnh mức xám $I_{\text{gray}}$. Áp dụng toán tử Laplace:

$$\nabla^2 I = \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2}$$

Phương sai của ma trận kết quả:

$$\sigma_{\text{Laplace}}^2 = \frac{1}{N} \sum_{x,y} \left( \nabla^2 I(x,y) - \mu_{\nabla} \right)^2$$

* **Ngưỡng chấp thuận:** $\sigma_{\text{Laplace}}^2 \ge 120.0$. Mọi khung hình có phương sai $< 120.0$ bị loại bỏ hoàn toàn, không đưa vào danh sách ứng viên và không lưu vào cơ sở dữ liệu bằng chứng.

### 5.2. Công thức Hợp nhất Vector Đặc trưng Đa khung hình
Với tập hợp $k$ khung hình tốt nhất ($k \le 5$) của cùng một đối tượng:

$$E_{\text{track}} = \frac{\sum_{i=1}^{k} q_i \cdot e_i}{\left\Vert \sum_{i=1}^{k} q_i \cdot e_i \right\Vert_2}$$

Trong đó:
* $e_i$: Vector đặc trưng 512 chiều từ mô hình AdaFace cho khung hình thứ $i$.
* $q_i$: Điểm chất lượng FQA kết hợp giữa phương sai Laplacian, độ thẳng góc và kích thước khuôn mặt.
* Phép chia cho chuẩn $L_2$ ở mẫu số bảo đảm vector đại diện luôn nằm trên mặt cầu đơn vị 512 chiều, tối ưu hóa cho phép tính khoảng cách Cosine.

---

## 6. QUY TRÌNH THU THẬP VÀ ĐĂNG KÝ HỒ SƠ ĐA GÓC MẶT

Nhằm triệt tiêu hiện tượng lệch miền dữ liệu (Domain Shift), quy trình đăng ký hồ sơ học sinh và giáo viên áp dụng tiêu chuẩn 4 góc ảnh:

1. **Ảnh 1 — Ảnh chính diện Studio:** Chụp bằng điện thoại/máy ảnh đủ sáng, góc nhìn thẳng, mắt mở to, phông nền sáng màu.
2. **Ảnh 2 — Ảnh cúi nhẹ 10° – 15°:** Mô phỏng góc nhìn thực tế khi camera lắp cao 2.2m quan sát người đang bước chân tới.
3. **Ảnh 3 — Ảnh nghiêng 15°:** Quay sang trái hoặc phải nhẹ 15°.
4. **Ảnh 4 — Ảnh chụp thực địa từ chính camera DS-2CD1021G0-I:** Trích xuất trực tiếp 1 khung hình đạt chuẩn FQA của người đi qua cổng trường trong buổi thử nghiệm đầu tiên. Ảnh này giúp hệ thống thích nghi chính xác với độ tương phản, cảm biến CMOS và màu sắc thực địa của camera.

Toàn bộ 4 vector đặc trưng được lưu trữ trong Vector Database (Milvus / RAM Index). Khi người đi qua, hệ thống so khớp vector $E_{\text{track}}$ với toàn bộ các góc và lấy điểm tương đồng Cosine lớn nhất:

$$\text{Score} = \max_{j \in \{1..4\}} \left( E_{\text{track}} \cdot E_{\text{gallery}, j} \right)$$

Ngưỡng nhận diện thành công: **Score ≥ 0.74** (với AdaFace).

---

## 6. YÊU CẦU KỸ THUẬT XỬ LÝ VÀ LƯU TRỮ ẢNH ĐĂNG KÝ GƯƠNG MẶT ĐẠT CHUẨN FACE COMPARE

Hiệu quả của phép so sánh khuôn mặt (Face Compare) phụ thuộc đồng thời vào 2 đầu dữ liệu:
* **Ảnh Probe:** Ảnh thực tế cắt từ luồng video của camera cổng trường (đã được tối ưu qua FQA và hợp nhất đa khung hình).
* **Ảnh Gallery:** Ảnh mẫu đăng ký lưu trữ trong cơ sở dữ liệu. Nếu ảnh mẫu đầu vào bị mờ, méo, tối, sai góc độ hoặc bị nén nát chi tiết, mọi thuật toán so khớp Cosine Similarity đều sẽ thất bại hoặc cho độ tin cậy thấp.

Hệ thống chuẩn hóa toàn diện quy trình kiểm định, căn chỉnh chuẩn tắc và chiến lược lưu trữ ảnh đăng ký như sau:

### 6.1. Tiêu chuẩn Đầu vào Ảnh Đăng ký (Enrollment Intake Standards)

| Thuộc tính | Ngưỡng bắt buộc | Mục đích kỹ thuật |
| :--- | :--- | :--- |
| **Độ sắc nét (Laplacian Variance)** | $\sigma_{\text{Laplace}}^2 \ge \mathbf{150.0}$ | Ngưỡng đăng ký khắt khe hơn camera giám sát (120.0), loại bỏ 100% ảnh rung tay, nhòe ống kính. |
| **Kích thước khuôn mặt (Face Size)** | $\ge \mathbf{150\times 150}$ điểm ảnh | Đảm bảo mật độ điểm ảnh chi tiết cho vùng mắt, sống mũi và cánh mũi. |
| **Khoảng cách hai mắt (IOD)** | $\ge \mathbf{30.0}$ điểm ảnh | Chuẩn mực tối thiểu để mô hình nhận diện phân tách được nét mặt người Á Đông. |
| **Độ sáng trung bình (IRE)** | **40 đến 80 IRE** | Tránh hiện tượng cháy sáng do đèn flash điện thoại hoặc bóng tối sầm vùng hốc mắt. |
| **Góc quay đầu (Head Pose)** | Nhìn thẳng: $|\text{Yaw}| \le 10^\circ, |\text{Pitch}| \le 10^\circ, |\text{Roll}| \le 8^\circ$ | Giữ khuôn mặt ở góc nhìn trực diện tối ưu. |
| **Che khuất & Phụ kiện** | Không khẩu trang, không kính râm/kính màu, mắt mở to | Đảm bảo không bị che mất 5 mốc nhận diện quan trọng. |
| **Số lượng người trong ảnh** | Duy nhất **1 khuôn mặt** | Tự động từ chối ảnh chụp tập thể hoặc có người đứng lọt vào hậu cảnh. |

### 6.2. Thuật toán Căn chỉnh Chuẩn tắc 5 Điểm mốc (5-Point Canonical Affine Alignment 112×112)

Khuôn mặt chụp từ điện thoại hoặc webcam khi tải lên không bao giờ được lưu dưới dạng cắt vuông tự do. Toàn bộ ảnh đăng ký bắt buộc phải đi qua công đoạn căn chỉnh chuẩn tắc (Canonical Alignment):

1. **Hệ tọa độ chuẩn tắc 112×112 chuẩn InsightFace / AdaFace:**
   * Mắt trái (Left Eye): `(38.2946, 51.6963)`
   * Mắt phải (Right Eye): `(73.5318, 51.6963)`
   * Chóp mũi (Nose Tip): `(56.0252, 71.7366)`
   * Khóe miệng trái (Left Mouth): `(41.5493, 92.3655)`
   * Khóe miệng phải (Right Mouth): `(70.7299, 92.3655)`
2. **Phép biến đổi tương đồng 2D (Similarity Transform):**
   * Sử dụng hàm `cv2.estimateAffinePartial2D` tìm ma trận biến đổi $M$ (bao gồm góc quay, tỷ lệ co giãn đồng dạng và độ tịnh tiến) ánh xạ 5 mốc thực tế về 5 mốc chuẩn tắc:
     
     $$\begin{bmatrix} x_{\text{dst}} \\ y_{\text{dst}} \end{bmatrix} = \begin{bmatrix} s \cos\theta & -s \sin\theta \\ s \sin\theta & s \cos\theta \end{bmatrix} \begin{bmatrix} x_{\text{src}} \\ y_{\text{src}} \end{bmatrix} + \begin{bmatrix} t_x \\ t_y \end{bmatrix}$$
     
   * **Ý nghĩa cốt lõi:** Phép biến đổi này triệt tiêu hoàn toàn góc nghiêng Roll (đầu nghiêng một bên), đưa trục nối 2 mắt nằm ngang tuyệt đối tại cao độ $y = 51.7$, cố định tỷ lệ khoảng cách từ mắt đến cằm. Nhờ đó, vector đặc trưng 512 chiều trích xuất ra đạt độ tập trung và phân tách cao nhất.

### 6.3. Chiến lược Lưu trữ Kép Bảo toàn Độ nét (Dual-Tier Storage Strategy)

Hệ thống áp dụng kiến trúc lưu trữ 3 tầng độc lập cho mỗi mẫu đăng ký:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CHIẾN LƯỢC LƯU TRỮ ẢNH ĐĂNG KÝ 3 TẦNG                │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 1: ẢNH CHÂN DUNG NÉT CAO (HIGH-RES PORTRAIT CROP ≥ 600×600 PX)    │
│ • Định dạng: JPEG nén chất lượng cao (Quality = 98%) hoặc WebP Lossless │
│ • Nội dung: Ảnh chân dung cắt mở rộng 45% (trọn vẹn trán, tai, cằm)    │
│ • Mục đích: Hiển thị giao diện Web CMS, in Thẻ học sinh/giáo viên,     │
│   và phục vụ đối soát mắt thường của Ban giám hiệu khi cần hậu kiểm.  │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 2: ẢNH CHUẨN TẮC CĂN CHỈNH (CANONICAL ALIGNED 112×112 PX)        │
│ • Định dạng: WebP Lossless hoặc PNG nén không suy hao                  │
│ • Nội dung: Vùng mặt đã xoay thẳng trục và căn chỉnh 5 mốc hình học    │
│ • Mục đích: Tái trích xuất vector (Re-indexing) khi nâng cấp mô hình AI│
│   trong tương lai mà không cần triệu tập học sinh chụp lại ảnh.        │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 3: VECTOR ĐẶC TRƯNG 512 CHIỀU (L2-NORMALIZED EMBEDDING)           │
│ • Lưu trữ: Cột VECTOR(512) trong PostgreSQL (phần mở rộng pgvector)    │
│ • Đồng bộ: Nạp sẵn vào RAM Index (FAISS Flat L2 / Cosine Matrix)       │
│ • Mục đích: Đối soát 1:N siêu tốc dưới 0.25ms trong quá trình quét.    │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.4. Danh mục 5 Mẫu Ảnh Đa góc và Mẫu Thực địa Bắt buộc

Để bảo đảm tỷ lệ nhận diện thành công vượt trội trên người đi bộ tự nhiên và triệt tiêu hoàn toàn hiện tượng lệch miền dữ liệu (Domain Shift):

1. **Mẫu 1 (`photo_straight`):** Ảnh nhìn thẳng chính diện chuẩn studio hoặc ảnh thẻ chất lượng cao (Yaw $\le 8^\circ$, Pitch $\le 8^\circ$).
2. **Mẫu 2 (`photo_pitch`):** Ảnh hơi cúi đầu xuống **10° – 15°** (Yaw $\le 12^\circ$). Đây là mẫu quyết định để so khớp với người đi bộ đang sải bước qua cổng trường có camera treo cao 2.2m nhìn chếch xuống.
3. **Mẫu 3 (`photo_left`):** Ảnh hơi quay sang trái **15°** (Yaw từ $-20^\circ$ đến $-10^\circ$).
4. **Mẫu 4 (`photo_right`):** Ảnh hơi quay sang phải **15°** (Yaw từ $+10^\circ$ đến $+20^\circ$).
5. **Mẫu 5 (`photo_camera_native`):** Ảnh trích xuất trực tiếp từ chính luồng camera Hikvision DS-2CD1021G0-I tại cổng trường. Giúp hệ thống học được dải màu quang học và độ tương phản đặc thù của cảm biến CMOS 1/2.8".

### 6.5. Cổng Phản hồi Hướng dẫn Thời gian thực (Real-time Enrollment Feedback)

Khi người dùng chụp hoặc tải ảnh đăng ký qua Web CMS hay Mobile App, hệ thống thực hiện kiểm định FQA và trả về thông điệp phản hồi cụ thể:

| Mã phản hồi | Thông điệp hướng dẫn người dùng | Hành động của giao diện |
| :--- | :--- | :--- |
| `ENROLL_VALID` | "Ảnh đạt chuẩn đăng ký khuôn mặt chất lượng cao." | Hiển thị viền xanh lá, kích hoạt nút Lưu hồ sơ. |
| `ERR_BLURRY_IMAGE` | "Ảnh bị mờ nhòe (Độ sắc nét < 150). Vui lòng cầm chắc thiết bị và lấy nét rõ mắt." | Viền đỏ cảnh báo, yêu cầu chụp lại. |
| `ERR_FACE_TOO_SMALL` | "Khuôn mặt quá nhỏ (Yêu cầu $\ge 150\times 150$ px). Vui lòng tiến lại gần camera hơn." | Hiển thị khung oval hướng dẫn căn chỉnh tỷ lệ mặt. |
| `ERR_OFF_ANGLE` | "Góc mặt chưa đúng yêu cầu (Vui lòng nhìn thẳng hoặc cúi nhẹ theo hướng dẫn)." | Hiển thị mũi tên chỉ dẫn góc quay đầu. |
| `ERR_POOR_LIGHTING` | "Ánh sáng không đạt chuẩn (Quá tối hoặc bị chói lóa). Vui lòng chuyển vị trí sáng đều." | Nhắc nhở bật đèn trợ sáng hoặc tránh đèn rọi ngược. |

---

## 7. MÃ NGUỒN VÀ KIỂM ĐỊNH THỰC TẾ TRONG CODEBASE

Các thành phần kỹ thuật đã được tích hợp hoàn chỉnh trong thư mục `src/services/camera-worker`:

1. **`face_quality.py`:** Triển khai lớp `FaceQualityEngine` với:
   * Đo độ sắc nét Laplacian ($\sigma_{\text{Laplace}}^2 \ge 120.0$ cho giám sát, $\ge 150.0$ cho đăng ký).
   * Ước lượng góc đầu 3D (Yaw, Pitch, Roll) từ 5 mốc hình học.
   * Căn chỉnh chuẩn tắc 5 điểm mốc 112×112 bằng phép biến đổi tương đồng `align_canonical_face()`.
   * Trích xuất ảnh chân dung nét cao `extract_high_res_portrait()` (chuẩn 600×600 px).
   * Cổng thẩm định đăng ký khắt khe `validate_enrollment_image()` với mã lỗi và thông điệp chuẩn hóa.
   * Thuật toán hợp nhất vector đặc trưng đa khung hình bình quân gia quyền $L_2$.
2. **`config.py`:** Khai báo đầy đủ các ngưỡng FQA: `MIN_LAPLACIAN_VAR = 120.0`, `MIN_FACE_SIZE = 50`, `MULTI_FRAME_FUSION_COUNT = 5`, `ADAFACE_SIMILARITY_THRESHOLD = 0.74`.
3. **`tracker.py`:** Cập nhật lớp `TrackedObject` duy trì danh sách Top-5 ứng viên khuôn mặt chất lượng cao (`best_face_candidates`), hàm `get_fused_embedding()` và hàm `get_crisp_evidence_image()`.
4. **`dispatcher.py`:** Đóng gói ảnh bằng chứng sắc nét nhất theo chuẩn JPEG chất lượng 95% cùng vector đặc trưng hợp nhất gửi về `mschool-backend`.
5. **`test_camera_worker.py`:** Bộ 12 bài kiểm thử đơn vị tự động, bao gồm đo kiểm độ sắc nét ảnh mờ vs ảnh nét, ước lượng góc quay đầu, hợp nhất vector đa khung hình, đóng gói ảnh bằng chứng, cổng kiểm định đăng ký FQA và căn chỉnh hình học chuẩn tắc 112×112. Kết quả đo kiểm: **12/12 bài kiểm thử vượt qua tuyệt đối (PASSED)**.
