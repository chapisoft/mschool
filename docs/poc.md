# KẾ HOẠCH VÀ MA TRẬN ĐỐI SOÁT ĐIỀU KIỆN TRIỂN KHAI THỬ NGHIỆM QUY MÔ NHỎ (POC) HỆ THỐNG MSCHOOL

---

## 1. MỤC TIÊU VÀ PHẠM VI THỬ NGHIỆM

### 1.1. Mục tiêu cốt lõi của giai đoạn thử nghiệm
Giai đoạn thử nghiệm quy mô nhỏ nhằm kiểm chứng thực tế năng lực vận hành của hệ thống trường học thông minh **mschool** trong môi trường học đường thực tế, tập trung vào 4 chỉ số đo lường then chốt:
* **Độ chính xác nhận diện khuôn mặt:** Đạt tỷ lệ nhận diện đúng ≥ 99.2% trong điều kiện học sinh di chuyển tự nhiên (đi bộ, đi xe đạp, đi thành nhóm 2 - 3 người) qua cổng trường.
* **Hiệu lực bẫy chống quét lặp Cooldown 90 giây:** Đảm bảo cơ chế khóa phân tán 90 giây trên Redis hoạt động chuẩn xác, không ghi nhận trùng lặp dữ liệu điểm danh khi học sinh đứng chờ hoặc di chuyển qua lại trước ống kính camera.
* **Thời gian chuyển phát thông báo:** Đảm bảo thời gian từ lúc camera ghi nhận vạch ảo Spatial Tripwire đến khi phụ huynh nhận được thông báo (qua Zalo ZNS / App Push FCM) đạt dưới 3 giây.
* **Mức độ tiện dụng cho cán bộ nhà trường:** Giáo viên chủ nhiệm thao tác xác nhận sĩ số một chạm trên Sổ đầu bài điện tử dưới 10 giây; nhân viên bảo vệ xử lý tiếp nhận khách và cảnh báo người lạ trực quan, thuận tiện.

### 1.2. Quy mô giới hạn thử nghiệm
* **Địa điểm thí điểm:** 1 Cổng trường chính (bố trí 1 - 2 làn quét ra/vào).
* **Quy mô lớp học:** 2 đến 4 Lớp học (tương đương khoảng **80 - 160 học sinh**).
* **Nhân sự tham gia:** 
  * 1 Đại diện Ban giám hiệu nhà trường (phụ trách giám sát sĩ số toàn trường).
  * 2 - 4 Giáo viên chủ nhiệm các lớp thí điểm.
  * 1 - 2 Nhân viên bảo vệ trực tại bốt cổng trường.
  * Phụ huynh của toàn bộ học sinh thuộc các lớp thí điểm.

---

## 2. KIẾN TRÚC VẬN HÀNH THỬ NGHIỆM

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 8, 'rankSpacing': 140, 'padding': 3, 'curve': 'basis'}}}%%
flowchart LR
    subgraph S_FIELD ["HIỆN TRƯỜNG THỰC ĐỊA TẠI TRƯỜNG HỌC"]
        direction TB
        CAM_GATE["Camera IP Giám Sát Cổng (1-2 Thiết bị)<br/>• Luồng RTSP Full HD 1080p, 25 FPS<br/>• Vạch ảo Spatial Tripwire chiều Vào / Ra"]
        GUARD_DESK["Bốt Bảo Vệ Cổng Trường<br/>• Máy tính / Tablet mở màn hình /guard-desk<br/>• Tiếp nhận khách, xử lý cảnh báo người lạ"]
        CLASSROOM_ENV["Lớp Học & Giáo Viên Chủ Nhiệm<br/>• Sổ đầu bài điện tử /attendance-ledger<br/>• Ma trận phòng học /classes"]
        CAM_GATE --> GUARD_DESK
        GUARD_DESK --> CLASSROOM_ENV
    end

    subgraph S_EDGE_SERVER ["MÁY CHỦ BIÊN VÀ DỊCH VỤ NỀN TẢNG (35.247.156.176)"]
        direction TB
        SERVER_CORE["Cụm Dịch Vụ Lõi Đã Sẵn Sàng 100%<br/>• Backend Spring Boot 3.3 & CMS Next.js 14<br/>• Cổng Nginx Reverse Proxy (mschool.microtec.vn)"]
        DATA_AI_STORAGE["CSDL & Lõi Xử Lý Trí Tuệ Nhân Tạo<br/>• CSDL PostgreSQL 16 pgvector (mschool_db)<br/>• Redis khóa 90s, MinIO S3 lưu ảnh khuôn mặt<br/>• GPU NVIDIA RTX 3060 trống 4.5 GB VRAM"]
        NOTIFICATION_HUB["Cổng Điều Phối Thông Báo Ra Bên Ngoài<br/>• Gửi tin nhắn Zalo ZNS / SMS Brandname<br/>• Đẩy thông báo tức thời Firebase (FCM)"]
        SERVER_CORE --> DATA_AI_STORAGE
        DATA_AI_STORAGE --> NOTIFICATION_HUB
    end

    S_FIELD --> S_EDGE_SERVER
```

---

## 3. BẢNG MA TRẬN ĐỐI SOÁT TỔNG THỂ CÁC ĐIỀU KIỆN THỬ NGHIỆM

Bảng đối soát phân định rõ ràng giữa **những hạng mục hệ thống đã có sẵn (đã cấu hình & đã nạp dữ liệu khởi tạo seed)** và **những hạng mục bắt buộc phải triển khai hoặc thu thập thực tế tại hiện trường trường học**:

| STT | Nhóm Điều Kiện | Hạng Mục Chi Tiết | Trạng Thái Hệ Thống | Bằng Chứng / Dữ Liệu Khởi Tạo Seed | Công Việc Cần Thực Hiện Tại Hiện Trường Thực Tế |
|:---:|:---|:---|:---:|:---|:---|
| **I** | **HẠ TẦNG & DỊCH VỤ NỀN TẢNG** | | | | |
| 1 | Máy chủ biên & GPU | Ubuntu 22.04 LTS, GPU NVIDIA RTX 3060 | **ĐÃ HOÀN TẤT** | VRAM trống 4.5 GB dành riêng cho AI Worker trên máy chủ 35.247.156.176 | Đảm bảo kết nối mạng giữa trường và máy chủ biên ổn định |
| 2 | Cơ sở dữ liệu quan hệ | PostgreSQL 16 kèm pgvector 0.8.0 | **ĐÃ HOÀN TẤT** | Instance `mschool_db`, 19 bảng nghiệp vụ, chỉ mục HNSW/IVFFlat | Không cần can thiệp |
| 3 | Bộ đệm & Khóa phân tán | Redis 7 (`mschool-redis:16387`) | **ĐÃ HOÀN TẤT** | Chống quét lặp Cooldown 90 giây (`GATE_COOLDOWN_SECONDS`) | Không cần can thiệp |
| 4 | Kho lưu trữ đối tượng S3 | MinIO (`mibid-minio:19008`) | **ĐÃ HOÀN TẤT** | Bucket `mschool-storage` lưu ảnh đăng ký và bằng chứng | Không cần can thiệp |
| 5 | Cổng Gateway & Tên miền | Nginx Reverse Proxy (SSL/TLS 1.3) | **ĐÃ HOÀN TẤT** | `https://mschool.microtec.vn`, đã bật CORS và chống lưu cache | Mở tường lửa mạng trường cho phép truy cập cổng 443 |
| 6 | Tiến trình thu nhận video | Worker Camera (Python + OpenCV) | **ĐÃ HOÀN TẤT** | Chạy chế độ mạng Host Network kết nối trực tiếp RTSP | Không cần can thiệp |
| **II** | **THAM SỐ & MA TRẬN PHÂN QUYỀN** | | | | |
| 7 | Ngưỡng đánh giá ảnh FIQA | Tham số `AI_FIQA_MIN_SCORE` | **ĐÃ CẤU HÌNH** | Giá trị seed: `0.85` (chấp nhận ảnh đủ độ nét và góc nhìn) | Tinh chỉnh nếu ánh sáng cổng trường biến động |
| 8 | Ngưỡng so khớp khuôn mặt | Tham số `AI_SIMILARITY_THRESHOLD` | **ĐÃ CẤU HÌNH** | Giá trị seed: `0.78` (ngưỡng tương đồng cosine ArcFace) | Tinh chỉnh theo kết quả đo kiểm thực tế 5-10 học sinh |
| 9 | Thời gian chống quét lặp | Tham số `GATE_COOLDOWN_SECONDS` | **ĐÃ CẤU HÌNH** | Giá trị seed: `90` giây khóa phân tán trên Redis | Điều chỉnh tăng/giảm tùy theo mật độ ùn tắc tại cổng |
| 10 | Mốc giờ ca học & Đi muộn | `MORNING_LATE_CUTOFF`, `AFTERNOON_DEPARTURE_START` | **ĐÃ CẤU HÌNH** | Sáng đi muộn sau `07:30`, Chiều bắt đầu về từ `16:00` | Điều chỉnh theo thời khóa biểu thực tế của trường thí điểm |
| 11 | Cờ bật/tắt kênh thông báo | `NOTIF_ZNS_ENABLED`, `NOTIF_APP_PUSH_ENABLED`, `NOTIF_SMS_ENABLED` | **ĐÃ CẤU HÌNH** | ZNS: `true`, App Push: `true`, SMS: `false` | Bật/tắt theo kênh đăng ký của phụ huynh |
| 12 | Vai trò và nhóm quyền | Bảng `system_roles` & `role_permissions` | **ĐÃ NẠP SEED** | 4 Nhóm vai trò chuẩn: Quản Trị Viên, Ban Giám Hiệu, Giáo Viên, Bảo Vệ | Không cần can thiệp |
| 13 | Tài khoản người dùng | Bảng `system_users` | **ĐÃ NẠP SEED** | 5 Tài khoản mẫu: `admin`, `principal`, `gv_nam`, `guard_gate1`, `gv_hoa` | Đổi mật khẩu hoặc tạo thêm tài khoản cho giáo viên thật |
| **III** | **DỮ LIỆU DANH MỤC DÙNG CHUNG** | | | | |
| 14 | Danh mục cơ sở trường | Bảng `master_campuses` | **ĐÃ NẠP SEED** | 2 Cơ sở mẫu: `CAMPUS_01` (Trụ sở chính), `CAMPUS_02` (Thực nghiệm) | Cập nhật tên trường và địa chỉ trường học thí điểm |
| 15 | Danh mục ca học | Bảng `master_shifts` | **ĐÃ NẠP SEED** | 2 Ca mẫu: `SHIFT_MORNING` (07:00-11:30), `SHIFT_AFTERNOON` (13:30-17:00) | Điều chỉnh giờ vào/ra phù hợp với trường thí điểm |
| 16 | Danh mục lớp học | Bảng `classrooms` | **ĐÃ NẠP SEED** | 7 Lớp học mẫu: `10A1`, `10A2`, `10A3`, `11A1`, `11A2`, `12A1`, `12A2` | Nhập danh mục 2 - 4 lớp học thí điểm thực tế |
| 17 | Cấu hình Camera IP | Bảng `device_cameras` | **ĐÃ NẠP SEED** | 5 Camera mẫu: `CAM_GATE_01` (Vào), `CAM_GATE_02` (Ra), `CAM_GATE_03` (Cổng phụ), `CAM_CLASS_10A1` | **Cập nhật URL RTSP và địa chỉ IP của camera thật tại trường** |
| 18 | Hồ sơ sinh trắc học mẫu | Bảng `face_biometric_profiles` | **ĐÃ NẠP SEED** | 10 Hồ sơ mẫu (7 học sinh, 2 giáo viên, 1 bảo vệ) với vector 512 chiều | **Thu thập ảnh và đăng ký cho 80 - 160 học sinh thật** |
| 19 | Hồ sơ đón tiếp khách | Bảng `visitor_registrations` | **ĐÃ NẠP SEED** | 3 Khách mẫu: `VIS_092201` (Phụ huynh), `VIS_092202`, `VIS_092203` (Nhà thầu) | Sử dụng giao diện bốt bảo vệ tiếp nhận khách thực tế |
| 20 | Webhook tích hợp ngoài | Bảng `webhook_subscriptions` | **ĐÃ NẠP SEED** | 3 Webhook mẫu: `VnEdu Cloud`, `SMAS Viettel`, `SIS Nội bộ` | Nhập Endpoint Webhook thật nếu trường có phần mềm thứ ba |
| **IV** | **GIAO DIỆN VẬN HÀNH WEB CMS** | | | | |
| 21 | Bàn trực bốt bảo vệ | Giao diện `/guard-desk` | **ĐÃ HOÀN TẤT** | Chặn người lạ, tiếp nhận khách, hiển thị luồng học sinh vào/ra | Mở trình duyệt trên máy tính/tablet tại bốt cổng |
| 22 | Sổ đầu bài điện tử | Giao diện `/attendance-ledger` | **ĐÃ HOÀN TẤT** | Xác nhận sĩ số một chạm, đối chiếu vắng có phép/không phép | Giáo viên chủ nhiệm đăng nhập thao tác đầu giờ |
| 23 | Quản lý người dùng & phân quyền | Giao diện `/users`, `/roles` | **ĐÃ HOÀN TẤT** | Đầy đủ Modal tạo mới, sửa, xóa, khóa tài khoản, phân quyền | Quản trị viên nhà trường sử dụng để cấp tài khoản |
| 24 | Quản lý tham số & danh mục | Giao diện `/system-config`, `/master-data` | **ĐÃ HOÀN TẤT** | Đầy đủ Modal thêm sửa xóa ca học, cơ sở trường, tinh chỉnh tham số | Quản trị viên sử dụng khi cần thay đổi thời gian ca học |
| 25 | Đăng xuất & Đa ngôn ngữ | Nút Đăng xuất bám đáy sidebar | **ĐÃ HOÀN TẤT** | Nút Đăng xuất tiện dụng, hỗ trợ 5 thứ tiếng (Việt, Anh, Trung, Nhật, Hàn) | Không cần can thiệp |
| **V** | **HIỆN TRƯỜNG & THIẾT BỊ VẬT LÝ** | | | | |
| 26 | Camera IP ngoài trời | Chuẩn IP67, RTSP, 25 FPS, WDR ≥ 120dB | **CẦN HIỆN TRƯỜNG** | Chưa có phần cứng tại trường thí điểm | **Lắp đặt 1 đến 2 camera tại cổng chính của trường** |
| 27 | Cột gắn camera & Góc quay | Độ cao 2.2m - 2.5m, nghiêng 15 - 20° | **CẦN HIỆN TRƯỜNG** | Đã quy hoạch thông số kỹ thuật | **Khảo sát hướng nắng và thi công giá treo camera** |
| 28 | Cáp mạng LAN & Nguồn PoE | Cáp Cat6, Switch PoE, băng thông ≥ 100Mbps | **CẦN HIỆN TRƯỜNG** | Đã quy hoạch thông số mạng | **Kéo cáp từ Switch PoE bốt bảo vệ về tủ mạng trường** |
| 29 | Máy tính/Tablet bốt bảo vệ | Màn hình ≥ 10 inch, chạy trình duyệt | **CẦN HIỆN TRƯỜNG** | Chưa bố trí tại cổng trường thí điểm | **Trang bị 1 thiết bị đặt cố định tại bốt bảo vệ cổng** |
| **VI** | **DỮ LIỆU HỌC SINH THỰC TẾ & KÊNH THÔNG BÁO** | | | | |
| 30 | Danh sách học sinh thí điểm | 80 - 160 học sinh thuộc 2 - 4 lớp | **CẦN THU THẬP** | Đang có 7 học sinh mẫu trong cơ sở dữ liệu | **Thu thập danh sách học sinh từ giáo viên chủ nhiệm** |
| 31 | Ảnh chụp chân dung đăng ký | 1 đến 3 ảnh/học sinh, chuẩn FIQA ≥ 0.85 | **CẦN THU THẬP** | Đang có 10 vector mẫu trong cơ sở dữ liệu | **Chụp ảnh trực diện học sinh hoặc lấy từ hồ sơ học bạ** |
| 32 | Kênh Zalo OA / FCM thật | Tài khoản Zalo OA xác thực của trường | **CẦN CUNG CẤP** | Đang ở chế độ mô phỏng kiểm thử | **Cung cấp khóa API Zalo OA hoặc tệp chứng chỉ FCM** |

---

## 4. CHI TIẾT CÁC HẠNG MỤC ĐÃ CẤU HÌNH VÀ NẠP DỮ LIỆU SEED

### 4.1. Cấu hình 10 tham số hệ thống đã nạp sẵn (`system_parameters`)

Toàn bộ các tham số điều khiển thuật toán trí tuệ nhân tạo, quy tắc điểm danh và kênh thông báo đã được lưu trữ trong bảng `system_parameters` và có thể tinh chỉnh trực tiếp qua giao diện `/system-config`:

```sql
-- Dữ liệu tham số đã nạp và đang áp dụng trên hệ thống mschool:
AI_FIQA_MIN_SCORE         = '0.85'  (Ngưỡng chất lượng ảnh khuôn mặt tối thiểu)
AI_SIMILARITY_THRESHOLD   = '0.78'  (Ngưỡng tương đồng cosine ArcFace để nhận diện)
GATE_COOLDOWN_SECONDS     = '90'    (Thời gian khóa chống quét lặp tại cổng trường)
MORNING_LATE_CUTOFF       = '07:30' (Mốc giờ bắt đầu tính đi muộn buổi sáng)
AFTERNOON_DEPARTURE_START = '16:00' (Mốc giờ bắt đầu cho phép quét ra về buổi chiều)
NOTIF_ZNS_ENABLED         = 'true'  (Kênh thông báo Zalo Official Account)
NOTIF_SMS_ENABLED         = 'false' (Kênh tin nhắn SMS Brandname dự phòng)
NOTIF_APP_PUSH_ENABLED    = 'true'  (Kênh đẩy thông báo ứng dụng di động Firebase)
SNAPSHOT_RETENTION_DAYS   = '90'    (Thời gian lưu trữ ảnh bằng chứng điểm danh)
STRANGER_RETENTION_HOURS  = '24'    (Thời gian lưu ảnh khuôn mặt người lạ)
```

### 4.2. Danh mục vai trò và 5 tài khoản thử nghiệm đã khởi tạo (`system_users`)

Hệ thống đã nạp sẵn 5 tài khoản tương ứng với các vai trò trong trường học để phục vụ kiểm thử ngay:

| Tên Đăng Nhập | Họ Và Tên | Mã Vai Trò | Trách Nhiệm Vận Hành | Mật Khẩu Mặc Định |
|:---|:---|:---:|:---|:---:|
| `admin` | Quản Trị Viên Hệ Thống | `ROLE_ADMIN` | Cấu hình tham số, quản lý camera, phân quyền cán bộ | `Admin@2026` |
| `principal` | Thầy Nguyễn Văn Hiệu - Hiệu Trưởng | `ROLE_SUPERVISOR` | Theo dõi sĩ số toàn trường, duyệt báo cáo tổng hợp | `Admin@2026` |
| `gv_nam` | Thầy Nguyễn Hoàng Nam - GVCN 10A1 | `ROLE_TEACHER` | Điểm danh lớp 10A1, xác nhận Sổ đầu bài điện tử | `Admin@2026` |
| `gv_hoa` | Cô Nguyễn Thị Hoa | `ROLE_TEACHER` | Điểm danh và theo dõi học sinh | `Admin@2026` |
| `guard_gate1` | Bác Trần Văn Quý - Trực Bốt Cổng 1 | `ROLE_SECURITY_GUARD` | Giám sát bàn trực bốt bảo vệ, tiếp đón khách | `Admin@2026` |

### 4.3. Danh mục cơ sở trường học và ca học mẫu (`master_campuses`, `master_shifts`)

* **Cơ sở trường học (`master_campuses`):**
  * `CAMPUS_01`: Cơ sở 1 - Trụ sở chính (Địa chỉ: Số 1 Đường Thí Nghiệm, Quận Cầu Giấy, Hà Nội - Điện thoại: 024-3999-8888).
  * `CAMPUS_02`: Cơ sở 2 - Khu liên cấp Thực nghiệm (Địa chỉ: Số 10 Đại lộ Khoa Học, Thành phố Thủ Đức, TP. Hồ Chí Minh - Điện thoại: 024-3999-9999).
* **Ca học trong ngày (`master_shifts`):**
  * `SHIFT_MORNING`: Ca Sáng (Chính khóa) từ 07:00 đến 11:30.
  * `SHIFT_AFTERNOON`: Ca Chiều (Bán trú & Tự chọn) từ 13:30 đến 17:00.

### 4.4. Danh mục 7 lớp học và 5 thiết bị Camera IP mẫu (`classrooms`, `device_cameras`)

* **Danh mục lớp học:**
  * Khối 10: Lớp `10A1` (Chuyên Toán, 40 học sinh), `10A2` (Chuyên Lý, 42 học sinh), `10A3` (Chuyên Toán, 38 học sinh).
  * Khối 11: Lớp `11A1` (Tự Nhiên 1, 44 học sinh), `11A2` (Tự Nhiên 2, 41 học sinh).
  * Khối 12: Lớp `12A1` (Ôn Thi Quốc Gia, 40 học sinh), `12A2` (Ban Tự Nhiên, 39 học sinh).
* **Danh mục thiết bị Camera IP:**
  * `CAM_GATE_01`: Cổng Chính - Luồng Đi Vào 01 (IP: `192.168.10.101`, 25 FPS, vạch ảo chiều vào `CHECK_IN`).
  * `CAM_GATE_02`: Cổng Chính - Luồng Đi Ra 02 (IP: `192.168.10.102`, 25 FPS, vạch ảo chiều ra `CHECK_OUT`).
  * `CAM_GATE_03`: Cổng Phụ Bốt Bảo Vệ - Luồng Xe (IP: `192.168.10.103`, 25 FPS, quét hai chiều `BIDIRECTIONAL`).
  * `CAM_CLASS_10A1`: Camera Phòng Học 10A1 (IP: `192.168.20.101`, 20 FPS, quét hai chiều `BIDIRECTIONAL`).
  * `CAM_BD228DE4`: Camera Cổng Số 3 (IP: `192.168.1.103`, 25 FPS, chiều vào `CHECK_IN`).

### 4.5. Hồ sơ sinh trắc học và lịch sử điểm danh mẫu

* **10 Hồ sơ sinh trắc học mẫu (`face_biometric_profiles`):**
  * 7 Học sinh: `HS10A101` (Nguyễn Hoàng Long), `HS10A102` (Lê Tuấn Kiệt), `HS10A103` (Phạm Quỳnh Chi), `HS10A104` (Lê Mai), `HS10A105` (Trần Đức), `HS11A205` (Trần Thị Mai Phương), `HS12A110` (Vũ Quốc Anh) kèm vector đặc trưng 512 chiều và điểm chất lượng FIQA ≥ 0.89.
  * 2 Giáo viên: `GV_TOAN01` (Thầy Nguyễn Văn Nam), `GV_LY01` (Thầy Vũ Văn 1) đạt điểm FIQA ≥ 0.97.
  * 1 Nhân viên bảo vệ: `CB_BV01` (Bác Trần Văn Bảo) đạt điểm FIQA 0.91.
* **3 Hồ sơ đón tiếp khách và phụ huynh (`visitor_registrations`):**
  * `VIS_092201`: Nguyễn Văn Hùng (Bố của học sinh `HS10A101`) - Trạng thái đã duyệt (`APPROVED`).
  * `VIS_092202`: Trần Thị Thảo (Mẹ của học sinh `HS11A205`) - Trạng thái đã duyệt (`APPROVED`).
  * `VIS_092203`: Công ty Cung cấp Thiết bị Điện máy (Gặp giáo viên `GV_TOAN01`) - Trạng thái đã vào cổng (`CHECKED_IN`).
* **3 Đăng ký Webhook tích hợp ngoài (`webhook_subscriptions`):**
  * `VnEdu Cloud Sync` (Đồng bộ vào/ra `ATTENDANCE_CHECKIN`, `ATTENDANCE_CHECKOUT`).
  * `SMAS Viettel School Connector` (Đồng bộ Sổ đầu bài `CLASSROOM_EVALUATED`).
  * `Hệ thống Quản lý Học đường SIS Nội Bộ` (Cảnh báo người lạ `STRANGER_DETECTED`).

---

## 5. CÁC HẠNG MỤC CẦN TRIỂN KHAI VÀ THU THẬP THỰC TẾ TẠI HIỆN TRƯỜNG

Để chuyển đổi từ môi trường dữ liệu khởi tạo sang vận hành thử nghiệm trên người thật và thiết bị thật, cần hoàn tất 3 gói công việc tại hiện trường trường học:

### 5.1. Gói công việc 1: Lắp đặt thiết bị vật lý và hạ tầng mạng tại cổng trường
1. **Lắp đặt Camera IP thực tế:**
   * Lắp đặt 1 đến 2 camera IP ngoài trời tại cổng chính của trường (chiều cao 2.2m - 2.5m, góc nghiêng 15 - 20 độ, kháng nước bụi IP67, chống ngược sáng WDR ≥ 120dB).
   * Căn chỉnh vùng quan sát để vùng nhận diện hiệu quả nằm trong khoảng 3m - 5m phía trước vạch ảo.
2. **Đấu nối mạng nội bộ và lấy luồng RTSP:**
   * Cắm cáp mạng Cat6 vào Switch PoE, gán địa chỉ IP tĩnh cho camera trong dải mạng nội bộ trường.
   * Lấy đường dẫn luồng RTSP thực tế của camera (Ví dụ: `rtsp://admin:Pass@192.168.1.150:554/Streaming/Channels/101`).
   * Truy cập giao diện `/cameras` trên CMS, cập nhật URL RTSP này vào bản ghi camera `CAM_GATE_01` và `CAM_GATE_02`.
3. **Bố trí thiết bị bàn trực bảo vệ:**
   * Trang bị 1 máy tính để bàn hoặc tablet màn hình ≥ 10 inch tại bốt bảo vệ cổng trường.
   * Kết nối mạng nội bộ, mở trình duyệt truy cập `https://mschool.microtec.vn/guard-desk`, đăng nhập tài khoản `guard_gate1` để hiển thị màn hình bàn trực.

### 5.2. Gói công việc 2: Thu thập dữ liệu và hồ sơ sinh trắc học học sinh thật
1. **Lập danh sách học sinh thí điểm:**
   * Tiếp nhận danh sách 80 - 160 học sinh thuộc 2 - 4 lớp thí điểm từ nhà trường (Họ tên, Mã học sinh, Ngày sinh, Giới tính, Lớp, Số điện thoại phụ huynh nhận tin nhắn).
   * Nhập lớp học tại trang `/classes` hoặc `/master-data`.
2. **Thu thập ảnh khuôn mặt đạt chuẩn FIQA:**
   * Chụp 1 đến 3 ảnh chân dung của từng học sinh: Mắt nhìn thẳng, phông nền sáng, không đeo kính râm hoặc khẩu trang, góc nghiêng khuôn mặt ≤ 15°.
   * Truy cập giao diện `/biometrics`, tải ảnh lên hệ thống. Hệ thống tự động kiểm tra điểm chất lượng ảnh (FIQA ≥ 0.85) và trích xuất vector đặc trưng 512 chiều lưu vào CSDL `mschool_db`.
3. **Đồng bộ vector xuống bộ nhớ đệm:**
   * Bấm nút *"Đồng bộ vector xuống Edge Camera"* trên giao diện quản trị để nạp toàn bộ vector của học sinh thí điểm vào bộ nhớ RAM của tiến trình nhận diện, sẵn sàng cho việc nhận diện tức thì dưới 200ms.

### 5.3. Gói công việc 3: Thiết lập kênh gửi thông báo chính thức đến phụ huynh
1. **Lựa chọn kênh gửi thông báo:**
   * *Phương án Zalo ZNS:* Nhà trường cung cấp tài khoản Zalo OA đã xác thực, đăng ký mẫu tin ZNS điểm danh và cấu hình mã khóa API vào hệ thống.
   * *Phương án Ứng dụng di động (FCM):* Tải tệp cấu hình `firebase-adminsdk.json` của dự án trường học lên máy chủ và hướng dẫn phụ huynh cài đặt ứng dụng.
2. **Kích hoạt tham số:** Bật cờ tương ứng `NOTIF_ZNS_ENABLED = true` hoặc `NOTIF_APP_PUSH_ENABLED = true` tại trang `/system-config`.

---

## 6. KẾ HOẠCH TRIỂN KHAI THỬ NGHIỆM TỪNG BƯỚC

```
  GIAI ĐOẠN 1: TRIỂN KHAI HIỆN TRƯỜNG THỰC TẾ (Thời gian: 1 - 2 ngày)
  ├── Khảo sát hướng nắng và lắp đặt 1 - 2 Camera IP ngoài trời tại cổng trường
  ├── Kéo cáp mạng Cat6, cấu hình IP tĩnh và kiểm tra độ trễ mạng (< 20ms)
  ├── Nhập URL RTSP của camera thật vào hệ thống tại trang /cameras
  └── Bố trí máy tính/tablet tại bốt bảo vệ cổng và đăng nhập màn hình /guard-desk
           │
           ▼
  GIAI ĐOẠN 2: NẠP DỮ LIỆU THỰC ĐỊA & ĐỒNG BỘ VECTOR (Thời gian: 1 ngày)
  ├── Tạo danh mục 2 - 4 lớp học thí điểm thực tế tại /master-data hoặc /classes
  ├── Tải ảnh chân dung học sinh thật lên /biometrics để trích xuất vector 512 chiều
  └── Bấm nút "Đồng bộ vector xuống Edge Camera" để nạp bộ nhớ đệm nhận diện
           │
           ▼
  GIAI ĐOẠN 3: KIỂM THỬ KỸ THUẬT NỘI BỘ (Thời gian: 0.5 ngày)
  ├── Cho 5 - 10 học sinh thật đi bộ, đi xe đạp qua cổng ở các vận tốc khác nhau
  ├── Kiểm chứng bẫy Cooldown 90 giây (học sinh đi lặp lại không tạo 2 bản ghi)
  ├── Đo thời gian thông báo Zalo/Push gửi đến máy phụ huynh (yêu cầu < 3 giây)
  └── Cho 1 người lạ mặt đi qua cổng để kiểm chứng chuông cảnh báo đỏ tại bốt bảo vệ
           │
           ▼
  GIAI ĐOẠN 4: VẬN HÀNH THỬ NGHIỆM THỰC TẾ (Thời gian: 1 tuần)
  ├── Vận hành song song điểm danh không dừng và sổ giấy truyền thống để đối soát
  ├── Giáo viên chủ nhiệm thao tác xác nhận Sổ đầu bài điện tử đầu mỗi tiết học
  ├── Nhân viên bảo vệ vận hành màn hình bốt trực hàng ngày, tiếp đón khách
  └── Tổ chức họp tổng kết đánh giá tỷ lệ nhận diện đúng, lập biên bản nghiệm thu
```

---

## 7. TIÊU CHÍ NGHIỆM THU GIAI ĐOẠN THỬ NGHIỆM

Giai đoạn thử nghiệm quy mô nhỏ được đánh giá là thành công và đủ điều kiện nhân rộng khi đạt đầy đủ 5 tiêu chuẩn nghiệm thu độc lập:

1. **Tỷ lệ nhận diện chuẩn xác ≥ 99.0%:** Không phát sinh trường hợp nhận diện nhầm học sinh này sang học sinh khác (Tỷ lệ chấp nhận sai False Acceptance Rate < 0.01%).
2. **Khóa chống quét lặp đạt 100%:** Toàn bộ các lượt quét trong vòng 90 giây của cùng một học sinh tại cổng trường được gộp thành 1 phiên duy nhất, không tạo giao dịch ảo.
3. **Thời gian thông báo phụ huynh < 3 giây:** Đảm bảo 95% số lượt thông báo được gửi thành công đến phụ huynh trước khi học sinh bước vào lớp học.
4. **Độ ổn định hệ thống đạt 99.9%:** Máy chủ biên và các dịch vụ nền tảng vận hành liên tục trong suốt 1 tuần thử nghiệm, không phát sinh lỗi treo ứng dụng, không cạn kiệt bộ nhớ RAM và GPU.
5. **Đánh giá hài lòng từ nhà trường:** Cán bộ quản lý, giáo viên chủ nhiệm và nhân viên bảo vệ xác nhận phần mềm dễ sử dụng, giao diện trực quan và giảm thiểu trên 80% thời gian điểm danh thủ công.
