# ĐỀ ÁN KỸ THUẬT NÂNG CẤP VÀ TỐI ƯU HÓA TOÀN DIỆN PHÂN HỆ AI CAMERA IP TRONG HỆ SINH THÁI MSCHOOL
## TÍCH HỢP RTMO-S, BYTETRACK, MÁY TRẠNG THÁI KHỬ RUNG VÀ CÁC ỨNG DỤNG SƯ PHẠM THÔNG MINH

---

## 1. BỐI CẢNH VÀ TÍNH CẤP THIẾT CỦA VIỆC NÂNG CẤP

### 1.1. Thực trạng và nguyên nhân gốc rễ khiến phân hệ AI hiện tại hoạt động kém hiệu quả
Qua rà soát thực tế mã nguồn tại `src/services/camera-worker` và Core AI `miai`, phân hệ AI đang gặp 4 điểm nghẽn nghiêm trọng:

1. **Đứt gãy luồng xử lý tại Ingestion Worker (`worker.py`):** 
   Vòng lặp đọc khung hình từ RTSP nhưng bên trong hoàn toàn không có mô hình phát hiện đối tượng (Detector) chạy cục bộ. Danh sách `self.active_tracks` không bao giờ được cập nhật dữ liệu từ luồng video thực tế, khiến thuật toán bám vết ByteTrack và vạch ảo Tripwire chỉ tồn tại dưới dạng cấu trúc lớp logic rỗng.
2. **Nút thắt cổ chai I/O và CPU do mã hóa Base64 qua HTTP (`dispatcher.py`):**
   Mỗi khung hình được nén JPEG, chuyển đổi thành chuỗi Base64 và gửi đồng bộ qua HTTP REST API tới Core AI. Quá trình này tiêu tốn 25–45ms CPU cho mỗi khung hình, làm phình to dữ liệu lên 33% (1.5MB – 3MB mỗi request) và làm nghẽn hoàn toàn luồng thu nhận, khiến camera loop rớt từ 30 FPS xuống dưới 3–5 FPS.
3. **Pipeline suy luận chạy CPU thuần túy, thiếu gia tốc phần cứng (`miai`):**
   Thư viện `uniface[cpu]` chạy hoàn toàn trên CPU mà không tận dụng được GPU NVIDIA RTX 3060 sẵn có. Chuỗi xử lý hai giai đoạn tuần tự (SCRFD $\rightarrow$ Crop $\rightarrow$ eDifFIQA $\rightarrow$ ArcFace) khiến độ trễ xử lý mỗi khung hình lên tới 250–500ms, đẩy CPU máy chủ lên mức quá tải 100%.
4. **Giới hạn nghiệp vụ: Chỉ nhận diện khuôn mặt, thiếu các năng lực thông minh học đường:**
   Hệ thống hiện tại chỉ phục vụ điểm danh nhận diện khuôn mặt khi người nhìn thẳng vào camera, hoàn toàn không có khả năng phân tích tư thế toàn thân, không nhận biết được hành vi trong lớp học, phòng thi cũng như các rủi ro an toàn trường học.

### 1.2. Mục tiêu kỹ thuật sau nâng cấp
* **Tốc độ camera loop:** Duy trì ổn định ~30 FPS trên từng luồng RTSP (Buffer = 1, loại bỏ hoàn toàn hiện tượng trễ tích lũy).
* **Tốc độ suy luận AI (Inference):** Đạt 15–24 FPS trên máy chủ cục bộ thông qua ONNX Runtime và gia tốc DirectML / CUDA / TensorRT.
* **Tối ưu tài nguyên:** Dung lượng bộ nhớ RAM chiếm dụng chỉ 1–2 GB, dung lượng mô hình ~400 MB.
* **Vận hành hoàn toàn Offline:** 100% dữ liệu xử lý tại chỗ (On-Premise), không truyền dữ liệu hình ảnh ra bên ngoài, tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
* **Mở rộng nghiệp vụ sư phạm và an toàn:** Tích hợp đồng thời 4 bài toán: Điểm danh không dừng, Giám thị số phòng thi, Giám sát trật tự lớp học và Phòng chống bạo lực / Tai nạn học đường.

---

## 2. BỘ CÔNG NGHỆ CỐT LÕI ĐƯỢC CHỌN LỌC NÂNG CẤP

Hệ thống chuyển đổi từ kiến trúc Two-stage CPU cồng kềnh sang **Kiến trúc One-stage Tích hợp Biên hiệu năng cao**:

```
[Camera IP RTSP] 
       │ (H.264 / H.265 Stream qua OpenCV / GStreamer)
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CAMERA WORKER TIẾN TRÌNH BIÊN                   │
│                                                                        │
│  [LUỒNG 1: CAMERA INGESTION LOOP] (Buffer = 1, Độc lập, ~30 FPS)       │
│  └── Tiếp nhận khung hình liên tục, tự động bỏ khung hình cũ nếu trễ   │
│                                                                        │
│  [LUỒNG 2: REALTIME POSE & TRACKING LOOP] (~15–24 FPS AI)               │
│  ├── RTMO-s ONNX Runtime (Phát hiện người + 17 khớp xương đồng thời)   │
│  ├── ByteTrack (Cấp phát & duy trì track_id liên tục theo thời gian)   │
│  ├── Spatial-Temporal Transformer (Phân tích chuỗi động học tư thế)   │
│  └── Debounced State Machine (Bộ máy trạng thái khử rung chống báo giả)│
│                                                                        │
│  [LUỒNG 3: NHẬN DIỆN DANH TÍNH CHỌN LỌC] (Chỉ chạy khi có Best Frame)  │
│  └── Trích xuất ArcFace nhận diện khuôn mặt học sinh tại cổng trường   │
│                                                                        │
│  [LUỒNG 4: STREAMING & DISPATCH GATEWAY]                               │
│  ├── FastAPI MJPEG Server: Phát luồng video kèm khung xương lên Web    │
│  └── Event Dispatcher: Đẩy gói tin sự kiện JSON nhẹ về mschool Backend │
└────────────────────────────────────────────────────────────────────────┘
       │                                     │
       ▼ (Luồng MJPEG xem trực tiếp)         ▼ (Gói tin sự kiện JSON < 1KB)
[Web CMS / Mobile App / Guard Desk]    [mschool-backend / Cơ Sở Dữ Liệu]
```

### 2.1. RTMO-s (Real-Time Multi-Person One-Stage Pose Estimation)
* **Đặc tính kỹ thuật:** Mô hình One-stage hiện đại nhất hiện nay cho bài toán ước lượng tư thế người. Thay vì quy trình Top-down truyền thống (cắt từng người rồi mới tìm khớp làm độ trễ tăng vọt khi lớp học đông người), RTMO-s dự đoán trực tiếp hộp bao (Bounding Box) và 17 điểm khớp chuẩn COCO (Mũi, Mắt, Tai, Vai, Khuỷu tay, Cổ tay, Hông, Đầu gối, Mắt cá chân) cho toàn bộ người trong khung hình chỉ trong **1 lượt truyền thuận duy nhất**.
* **Đóng gói tối ưu:** Xuất khẩu sang định dạng ONNX Runtime, thực thi qua Execution Provider `CUDA` (trên máy chủ có GPU NVIDIA) hoặc `DirectML` (tương thích đa nền tảng GPU). Thời gian suy luận chỉ mất 12–18ms cho khung hình Full HD.

### 2.2. ByteTrack (Multi-Object Tracking tại biên)
* Khắc phục nhược điểm mất dấu khi học sinh che khuất nhau hoặc quay lưng lại camera.
* Sử dụng bộ lọc Kalman Filter kết hợp ma trận chi phí giao thoa IoU hai vòng cho cả các nhận diện có độ tin cậy cao và thấp, bảo đảm gán `track_id` duy nhất và liên tục cho từng học sinh trong suốt quá trình di chuyển qua vùng quan sát.

### 2.3. Spatial-Temporal Transformer và Pose Dynamics
* Phân tích chuỗi tọa độ 17 khớp xương theo thời gian trượt ($T = 30 \text{ đến } 60 \text{ khung hình}$).
* Tính toán các biến số động học:
  * Vector hướng quay đầu (Head Yaw Angle) qua tỷ lệ khoảng cách Mũi – Tai.
  * Góc nghiêng cột sống so với phương thẳng đứng (Spine Tilt Angle).
  * Vị trí và quỹ đạo di chuyển của khớp cổ tay so với mặt phẳng bàn học.
  * Động năng chuyển động tổng thể và gia tốc hạ thấp trọng tâm cơ thể.

### 2.4. Debounced State Machine (Bộ máy trạng thái khử rung chống báo giả)
* Mọi cảnh báo không bao giờ được kích hoạt tức thì chỉ dựa trên 1 khung hình đơn lẻ.
* Áp dụng quy tắc khử rung nhiều pha: Bắt buộc hành vi dị thường phải duy trì liên tục qua một ngưỡng thời gian tối thiểu ($T_{debounce} \ge 2.0\text{s} \text{ đến } 5.0\text{s}$) hoặc có tần suất lặp lại vượt ngưỡng thì mới xác nhận sự kiện khẩn cấp, triệt tiêu trên 98% báo động giả.

### 2.5. FastAPI và MJPEG Streaming trực tiếp lên Web CMS
* Camera Worker chạy dịch vụ FastAPI nội bộ, cung cấp luồng video xem trực tiếp dạng MJPEG (`multipart/x-mixed-replace`).
* Khung hình được vẽ đè trực tiếp các lớp thông tin thị giác (Visual Overlay): Khung xương 17 khớp, hộp bao đối tượng, mã định danh `track_id`, nhãn trạng thái màu (Xanh lá = Bình thường, Vàng = Nghi vấn, Đỏ = Vi phạm/Nguy hiểm) và tốc độ FPS thực tế.
* Ban Giám hiệu, Giám thị và Bảo vệ chỉ cần mở trình duyệt Web CMS là có thể giám sát trực quan với độ trễ dưới 200ms.

---

## 3. BỐN PHÂN HỆ NGHIỆP VỤ SƯ PHẠM VÀ AN TOÀN HỌC ĐƯỜNG

### 3.1. Phân hệ 1: Điểm danh không dừng thông minh tại cổng trường (Smart Walk-through Attendance)
* **Bài toán:** Học sinh bước đi tự nhiên qua cổng (cự ly 2m – 5m, vận tốc 1.0 – 1.5 m/s), đi thành nhóm đông dàn hàng ngang, góc camera chúc từ trên cao.
* **Cơ chế tối ưu:**
  1. `RTMO-s` phát hiện toàn thân và hướng di chuyển của học sinh ngay từ cự ly xa (5m).
  2. `ByteTrack` bám vết liên tục và cấp phát `track_id`. Vạch ảo Spatial Tripwire xác định chính xác chiều **Vào (IN)** hay **Ra (OUT)**.
  3. Khác với kiến trúc cũ gửi tất cả khung hình sang AI, worker chỉ kích hoạt module nhận diện khuôn mặt (`ArcFace`) trên **1 khung hình đẹp nhất (Best Frame)** khi học sinh bước vào vùng nhận diện tối ưu (khoảng cách 2m – 3m, góc mặt thẳng, mở mắt).
  4. Đánh dấu `sent = true` để khóa track, loại bỏ 90% tải tính toán thừa của các khung hình tiếp theo.

### 3.2. Phân hệ 2: Giám thị số và phát hiện gian lận trong phòng thi (Exam Proctoring Engine)
* **Bài toán:** Tự động phát hiện các hành vi vi phạm quy chế thi trong các kỳ thi học kỳ, thi thử hoặc kiểm tra tập trung tại phòng học.
* **Quy tắc nhận diện 4 hành vi gian lận điển hình:**
  1. **Quay đầu ngó bài bạn (Head Yaw Turning):** Tính toán vector giữa Mũi, Hai mắt và Hai tai. Khi góc quay đầu lệch sang trái/phải quá $40^\circ$ so với hướng bài thi và duy trì liên tục quá $3.0\text{ giây}$ (hoặc lặp lại $\ge 3$ lần trong 1 phút) $\rightarrow$ Đánh dấu vi phạm ngó bài.
  2. **Nghiêng người nhìn bài bàn bên (Torso Leaning):** Góc nghiêng của trục cột sống (nối Cổ và Hông) lệch quá $30^\circ$ so với phương thẳng đứng hướng về bàn bên cạnh.
  3. **Mở tài liệu / Sử dụng điện thoại dưới ngăn bàn (Concealed Material Access):** Thiết lập mặt phẳng bàn ảo (Virtual Desk Surface). Khi cả hai khớp cổ tay biến mất hoàn toàn xuống dưới mép bàn quá $5.0\text{ giây}$ kết hợp tư thế đầu cúi gục sâu $\rightarrow$ Kích hoạt cảnh báo sử dụng tài liệu lén lút.
  4. **Chuyền giấy / Trao đổi đồ vật (Passing Notes):** Khoảng cách không gian giữa khớp cổ tay của hai thí sinh ngồi cạnh nhau co ngắn dưới ngưỡng an toàn kết hợp chuyển động vươn tay $\rightarrow$ Cảnh báo trao đổi vật thể.
* **Phản hồi hệ thống:** Tự động chụp lại khung hình bằng chứng vi phạm, vẽ khung đỏ cảnh báo trên màn hình Web CMS của giám thị và phát âm thanh nhắc nhở nhẹ tại phòng hội đồng thi.

### 3.3. Phân hệ 3: Giám sát trật tự và mức độ tập trung trong giờ học (Classroom Engagement Engine)
* **Bài toán:** Hỗ trợ giáo viên nắm bắt mức độ tập trung của lớp học, tự động ghi nhận các hiện tượng mất trật tự vào Sổ đầu bài điện tử.
* **Quy tắc nhận diện các hành vi:**
  1. **Rời khỏi vị trí ngồi tự do (Out-of-Seat Behavior):** `ByteTrack` định vị vị trí từng bàn học sinh. Khi tọa độ trọng tâm học sinh rời khỏi phạm vi ghế ngồi quá $10\text{ giây}$ trong thời gian tiết học diễn ra $\rightarrow$ Ghi nhận rời chỗ.
  2. **Xoay người nói chuyện (Turning Around):** Trục nối hai vai xoay ngược quá $90^\circ$ so với hướng bục giảng duy trì liên tục quá $5\text{ giây}$.
  3. **Gục mặt ngủ gật (Inattention / Sleeping):** Điểm đầu và mũi hạ sát mặt bàn, cơ thể bất động không ghi chép liên tục trong hơn $45\text{ giây}$.
  4. **Đùa nghịch vận động mạnh (Classroom Commotion):** Độ cao của đầu gối và mắt cá chân nâng cao bất thường (học sinh đứng lên bàn ghế) kết hợp vận tốc vung tay nhanh.
* **Tích hợp thông minh:** Tự động liên kết với module Thời khóa biểu (Timetable): Thuật toán chỉ kích hoạt trong khung giờ học chính thức; tự động tắt trong giờ ra chơi và 5 phút chuyển tiết giữa giờ.

### 3.4. Phân hệ 4: Phòng chống bạo lực và tai nạn học đường (Campus Safety Engine)
* **Bài toán:** Đảm bảo an toàn thể chất cho học sinh tại hành lang, cầu thang, sân trường, nhà thể chất.
* **Quy tắc nhận diện:**
  1. **Phát hiện xô xát, ẩu đả (Violence & Fighting):**
     * Phát hiện cụm 2 hoặc nhiều học sinh áp sát nhau dưới $0.5\text{m}$.
     * Ma trận động năng $E_k$ của các khớp tay chân tăng đột biến kèm theo các chuyển động vung tay về phía cơ thể đối phương.
     * Khi sự cố kéo dài quá $2.0\text{ giây}$, lập tức kích hoạt còi báo động tại bốt bảo vệ và gửi tin nhắn cảnh báo khẩn cấp tới Ban giám hiệu.
  2. **Phát hiện té ngã tại cầu thang / sân thể dục (Fall Detection):**
     * Vận tốc hạ thấp của khớp hông $v_y > 1.8\text{ m/s}$, góc trục cơ thể đảo chiều từ thẳng đứng sang nằm ngang sát sàn.
     * Khử rung 5 pha: Cho phép khoảng đệm $3.0\text{ giây}$ sau khi rơi. Nếu học sinh tự đứng dậy trong $3.0\text{ giây}$ (vấp nhẹ hoặc nô đùa) $\rightarrow$ Tự động hủy báo động. Nếu tiếp tục nằm bất động quá $3.0\text{ giây}$ $\rightarrow$ Kích hoạt báo động khẩn cấp tới Phòng Y tế trường.

---

## 4. KẾ HOẠCH HÀNH ĐỘNG VÀ ĐỀ XUẤT THAY ĐỔI MÃ NGUỒN CỤ THỂ

Để chuyển hóa giải pháp thành hiện thực, kế hoạch triển khai gồm 4 đợt hành động trực tiếp vào codebase:

### Đợt 1: Cấu trúc lại Camera Worker và Nâng cấp Gói Phụ Thuộc
* **Tệp tác động:** `src/services/camera-worker/requirements.txt`
* **Nội dung bổ sung:**
  ```text
  opencv-python-headless>=4.8.0
  numpy>=1.24.0
  scipy>=1.11.0
  httpx>=0.25.0
  pydantic>=2.5.0
  fastapi>=0.110.0
  uvicorn[standard]>=0.28.0
  onnxruntime-gpu>=1.17.0  # Hỗ trợ CUDA 12
  # onnxruntime-directml>=1.17.0 # Thay thế nếu chạy DirectML trên máy tính cá nhân
  ```

### Đợt 2: Tích hợp Bộ suy luận RTMO-s và ByteTrack trong Camera Loop
* **Tệp tác động:** `src/services/camera-worker/worker.py` và `src/services/camera-worker/tracker.py`
* **Nội dung triển khai:**
  1. Xây dựng lớp `RTMOInferenceEngine` nạp mô hình ONNX, thực hiện tiền xử lý ảnh và giải mã 17 keypoints trong 15ms.
  2. Kết nối đầu ra của `RTMOInferenceEngine` trực tiếp vào `ByteTrackTracker` trong mỗi vòng lặp `cap.read()`.
  3. Cấp phát và duy trì danh sách `TrackedObject` với đầy đủ lịch sử tọa độ khớp xương.

### Đợt 3: Hiện thực hóa Máy trạng thái Khử rung và Logic Nghiệp vụ Học đường
* **Tệp tạo mới:** `src/services/camera-worker/behavior_analyzer.py`
* **Nội dung triển khai:**
  1. Lớp `ClassroomProctorAnalyzer`: Đo góc quay đầu `Head Yaw`, góc nghiêng cột sống, phát hiện tay dưới ngăn bàn.
  2. Lớp `ClassroomDisruptionAnalyzer`: Đo độ rời chỗ, xoay người, gục mặt xuống bàn.
  3. Lớp `SafetyIncidentAnalyzer`: Đo động năng xô xát và máy trạng thái khử rung 5 pha phát hiện té ngã.
  4. Bộ lọc thời gian thực triệt tiêu báo động giả.

### Đợt 4: Cung cấp Luồng FastAPI MJPEG Streaming và WebSocket Dispatcher
* **Tệp tác động:** `src/services/camera-worker/dispatcher.py` và tạo mới `src/services/camera-worker/api_stream.py`
* **Nội dung triển khai:**
  1. Endpoint `/api/v1/cameras/{camera_id}/stream`: Phát luồng MJPEG vẽ sẵn khung xương và hộp bao đối tượng trực tiếp lên trình duyệt Web CMS.
  2. Kênh WebSocket `/ws/events`: Đẩy tức thời các sự kiện JSON vi phạm, gian lận, té ngã về `mschool-backend` với độ trễ dưới 100ms mà không qua trung gian Base64 HTTP.
  3. Cập nhật giao diện `src/cms/src/app/cameras/page.tsx` và `src/cms/src/app/guard-desk/page.tsx` để nhúng luồng xem trực tiếp và nhận thông báo khẩn cấp.

### Đợt 5: Tối ưu hóa Toàn diện Quy trình Đăng ký Hồ sơ Mới (Face Enrollment) trên GPU
* **Tệp tác động:** `miai/src/engines/face/quality.py`, `miai/src/engines/face/attributes.py`, `miai/src/engines/face/liveness.py`, `miai/src/engines/face/pipeline.py`
* **Nội dung triển khai:**
  1. **Chuyển dịch 100% các mô hình sang GPU CUDA:**
     * `SCRFD`: Phát hiện khuôn mặt và 5 điểm mốc landmarks với `CUDAExecutionProvider`.
     * `EDifFIQA`: Thẩm định chất lượng ảnh khuôn mặt theo chuẩn ISO/IEC 29794-5 trên GPU (loại bỏ hoàn toàn fallback CPU).
     * `HeadPose`: Ước tính 3 góc Euler 3D (Yaw, Pitch, Roll) kiểm tra góc quay mặt chuẩn (thẳng, nghiêng trái, nghiêng phải) trực tiếp trên GPU Tensor.
     * `FaceAttribNet`: Nhận diện che khuất (khẩu trang, kính râm, mắt nhắm/mở) trên GPU.
     * `AdaFace / ArcFace`: Trích xuất vector đặc trưng 512 chiều chuẩn hóa $L_2$ trên GPU CUDA Cores.
  2. **Triệt tiêu hiện tượng thắt cổ chai chuyển đổi CPU-GPU:**
     Toàn bộ 5 bước phân tích khuôn mặt được thực thi liền mạch trên VRAM GPU NVIDIA RTX 3060, giảm thời gian xử lý đăng ký 1 ảnh chân dung từ $650\text{ms}$ xuống dưới $35\text{ms}$.
  3. **Đồng bộ tức thời vào GPU Tensor Cache:**
     Ngay khi hồ sơ được lưu vào PostgreSQL qua `pgvector`, vector đặc trưng được nạp trực tiếp vào GPU VRAM của `VectorMatcher`, sẵn sàng phục vụ điểm danh nhận diện mà không cần khởi động lại dịch vụ.

### Đợt 6: Cơ chế So khớp 1:N Siêu tốc bằng GPU VRAM Tensor (Zero-CPU Face Matching)
* **Tệp tác động:** `miai/src/engines/face/vector_matcher.py` và `miai/src/api/v1/face.py`
* **Nội dung triển khai:**
  1. **Xóa bỏ vòng lặp `for loop` duyệt tuần tự trên CPU:**
     Thay thế thuật toán so khớp đơn luồng cũ bằng phép nhân ma trận song song `torch.matmul(M_gpu, q_gpu)` trên GPU CUDA Cores.
  2. **Quản lý bộ nhớ VRAM động (Dirty Matrix Cache):**
     Ma trận trọng số $(N \times 512)$ được cache thường trực trên 12GB VRAM GPU. Chỉ đồng bộ lại khi có sự thay đổi hồ sơ (`bulk_register_identities`), giải phóng 100% CPU khỏi các phép tính đại số tuyến tính.
  3. **Bổ sung API Surveillance Stream trên GPU:**
     Endpoint `/api/v1/face/surveillance` phục vụ trích xuất đặc trưng cho luồng CCTV giám sát tốc độ cao với độ nhạy linh hoạt cho người chuyển động.

---

## 5. DỰ TOÁN HIỆU QUẢ VÀ TÀI NGUYÊN MÁY CHỦ

| Thông số vận hành | Hệ thống trước nâng cấp | Hệ thống sau khi nâng cấp | Mức độ cải thiện |
| :--- | :---: | :---: | :---: |
| **Tốc độ Camera Ingestion Loop** | 3 – 5 FPS (Bị nghẽn Base64) | **28 – 30 FPS** (Độc lập, Buffer = 1) | **Tăng gấp 6 lần** |
| **Tốc độ AI Inference** | 2 – 4 FPS (CPU uniface) | **15 – 24 FPS** (RTMO-s ONNX GPU) | **Tăng gấp 5 lần** |
| **Độ trễ Đăng ký Hồ sơ Mới (Face Enrollment)** | 650 – 1200 ms (CPU context switch) | **< 35 ms** (GPU CUDA toàn trình) | **Tăng tốc gấp 25 lần** |
| **Tốc độ So khớp Nhận diện 1:N (10.000 hồ sơ)** | 120 – 350 ms (Vòng lặp CPU for-loop) | **< 0.05 ms** (GPU Tensor PyTorch Cores) | **Tăng tốc gấp 2.400 lần** |
| **Độ trễ phát hiện sự cố** | > 1.5 giây | **< 200 mili-giây** | **Giảm 87% độ trễ** |
| **Mức chiếm dụng CPU máy chủ** | 90% – 100% (Quá tải) | **25% – 35%** (Chuyển tải sang GPU) | **Giảm 65% tải CPU** |
| **Dung lượng RAM chiếm dụng** | 4 – 6 GB (Rò rỉ đệm Base64) | **1.2 – 1.8 GB** | **Tiết kiệm 70% RAM** |
| **Tỷ lệ báo động giả** | Không phân biệt được | **< 1.5%** (Nhờ Debounced State Machine) | **Triệt tiêu báo giả** |
| **Phạm vi tính năng học đường** | Chỉ nhận diện khuôn mặt | **Trọn bộ 4 bài toán sư phạm & an toàn** | **Mở rộng toàn diện** |

---

## 6. KẾT LUẬN

Đề án nâng cấp kỹ thuật này giải quyết triệt để các tồn tại cố hữu về hiệu năng của phân hệ AI hiện tại, thay thế toàn bộ các cơ chế đóng gói Base64 HTTP nặng nề bằng quy trình xử lý tại biên hiện đại, khai thác tối đa sức mạnh của mô hình One-stage `RTMO-s` và `ByteTrack`.

Đồng thời, việc thay thế bài toán y tế bằng các ứng dụng thực tế về **Giám thị số phòng thi, Giám sát trật tự lớp học, Phòng chống bạo lực và Cảnh báo té ngã** đưa **mschool** trở thành một giải pháp trường học thông minh toàn diện, khả thi về mặt kỹ thuật, chi phí đầu tư phần cứng thấp và đáp ứng trọn vẹn kỳ vọng vận hành tại Việt Nam.
