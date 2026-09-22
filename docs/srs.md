# HỆ THỐNG TRƯỜNG HỌC THÔNG MINH MSCHOOL
# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

---

## BẢNG THÔNG TIN QUẢN TRỊ TÀI LIỆU

### 1. Bảng Ghi Nhận Thay Đổi Tài Liệu (Change Log)

| Ngày thay đổi | Vị trí thay đổi | A*, M, D | Nguồn gốc | Phiên bản cũ | Mô tả thay đổi | Phiên bản mới |
| :---: | :--- | :---: | :--- | :---: | :--- | :---: |
| 22/09/2026 | Toàn bộ tài liệu | A* | Khởi tạo dự án | N/A | Tạo mới Tài liệu Đặc tả Yêu cầu Phần mềm (SRS) theo kiến trúc chuẩn Web CMS & Webhook API | V1.0 |

*Ghi chú ký hiệu thao tác:* `A*` – Tạo mới (Add), `M` – Sửa đổi (Modify), `D` – Xóa bỏ (Delete).

---

### 2. Trang Ký Duyệt (Sign-off Matrix)

| Vai trò | Họ và tên | Chức danh / Đơn vị | Chữ ký / Xác nhận | Ngày ký |
| :--- | :--- | :--- | :---: | :---: |
| **Người lập** | Đội ngũ Phân tích Nghiệp vụ | Kỹ sư BA Hệ thống Giáo dục | Đã xác nhận | 22/09/2026 |
| **Người xem xét** | Kiến trúc sư Hệ thống | Kiến trúc sư Giải pháp AI & Phần mềm | Đã xác nhận | 22/09/2026 |
| **Người phê duyệt** | Giám đốc Dự án mschool | Ban Giám đốc Khối Công nghệ | Đã phê duyệt | 22/09/2026 |

---

### 3. Danh Mục Từ Viết Tắt và Thuật Ngữ Kỹ Thuật

| Thuật ngữ viết tắt | Tên đầy đủ / Ý nghĩa kỹ thuật | Diễn giải chi tiết trong hệ thống mschool |
| :--- | :--- | :--- |
| **SRS** | Software Requirements Specification | Tài liệu đặc tả toàn diện các yêu cầu chức năng và phi chức năng của hệ thống. |
| **AI** | Artificial Intelligence | Trí tuệ nhân tạo, phân hệ thị giác máy tính nhận diện khuôn mặt và phát hiện đám đông. |
| **RTSP** | Real-Time Streaming Protocol | Giao thức truyền phát video thời gian thực từ camera mạng IP về máy chủ biên. |
| **SCRFD** | Sample and Computation Redistribution for Efficient Face Detection | Mô hình mạng nơ-ron phát hiện đa khuôn mặt mật độ cao với tốc độ siêu nhanh. |
| **ArcFace** | Additive Angular Margin Loss for Deep Face Recognition | Mô hình trích xuất vector đặc trưng khuôn mặt 512 chiều chuẩn hóa hình học L2. |
| **eDifFIQA** | Face Image Quality Assessment | Thuật toán đánh giá chất lượng ảnh chân dung (độ sắc nét, độ mở mắt, góc quay). |
| **ByteTrack** | Multi-Object Tracking by Associating Every Detection Box | Thuật toán theo dõi chuyển động đa đối tượng liên tục qua khung hình camera. |
| **Tripwire** | Virtual Spatial Tripwire | Vạch ranh giới không gian ảo hai chiều cấu hình trên khung hình camera để nhận diện hướng di chuyển Vào / Ra. |
| **TTL** | Time-To-Live | Thời gian tồn tại có hạn của dữ liệu vector khách thăm trường trước khi tự động giải phóng khỏi bộ nhớ RAM. |
| **SSO** | Single Sign-On | Cơ chế đăng nhập một lần tập trung qua chuẩn OAuth 2.0 / OpenID Connect. |
| **RBAC** | Role-Based Access Control | Mô hình kiểm soát truy cập và phân quyền hệ thống dựa trên vai trò người dùng. |
| **JWT** | JSON Web Token | Chuỗi mã hóa chứa thông tin phiên làm việc và chữ ký số an toàn dùng để xác thực API. |
| **HMAC-SHA256** | Hash-based Message Authentication Code | Thuật toán mã hóa băm khóa bí mật dùng để ký số các gói tin phát sự kiện Webhook. |
| **Outbox Pattern** | Transactional Outbox Pattern | Mẫu thiết kế phần mềm bảo đảm tính toàn vẹn sự kiện bằng cách lưu vào CSDL trước khi gửi bất đồng bộ. |
| **APM** | Application Performance Monitoring | Hệ thống giám sát hiệu năng ứng dụng, thu thập chỉ số CPU, GPU, RAM, mạng. |
| **Audit Log** | Immutable Audit Log | Nhật ký kiểm toán bất biến lưu lại toàn bộ các hành vi can thiệp dữ liệu trên hệ thống. |
| **FSD** | Feature-Sliced Design | Kiến trúc tổ chức mã nguồn giao diện frontend theo tầng chức năng độc lập, dễ mở rộng. |
| **POI SXSSF** | Streaming Extension for Apache POI | Thư viện kết xuất tệp Excel dung lượng hàng trăm nghìn dòng bằng cơ chế bộ đệm RAM giới hạn. |

---

## PHẦN I: TỔNG QUAN HỆ THỐNG VÀ PHẠM VI DỰ ÁN

### 1.1. Bối Cảnh và Mục Tiêu Dự Án

mschool là hệ thống trường học thông minh thế hệ mới, tích hợp công nghệ thị giác máy tính nhận diện khuôn mặt không dừng tại biên nhằm giải quyết triệt để các hạn chế của mô hình điểm danh truyền thống (gọi tên thủ công, quẹt thẻ từ gây ùn tắc, dễ gian lận và tốn kém chi phí vật tư in ấn).

**Mục tiêu cốt lõi của hệ thống:**
1. **Điểm danh không dừng tại cổng trường:** Đạt tốc độ nhận diện dưới 300ms, tỷ lệ nhận diện chính xác TAR ≥ 98.5%, giải tỏa lưu lượng 2.000 đến 3.000 học sinh qua cổng trong khung giờ cao điểm sáng sớm mà không cần dừng lại quẹt thẻ.
2. **Điểm danh tự động trong 50 phòng học:** Camera góc rộng chụp toàn cảnh tại phút thứ 5 đầu mỗi tiết học, bóc tách đồng thời trên 40 khuôn mặt, phân tách chính xác vùng bục giảng giáo viên và dãy bàn học sinh, tự động phát hiện học sinh vắng mặt hoặc ngồi nhầm lớp.
3. **Kiểm soát an ninh học đường chặt chẽ:** Tự động phát hiện khuôn mặt lạ không có trong hồ sơ, gửi cảnh báo viền đỏ và âm thanh về bốt bảo vệ; quản lý quy trình phụ huynh đón con qua mã định danh có thời hạn hiệu lực.
4. **Kiến trúc kết nối mở đa nền tảng:** Vận hành đồng bộ qua Cổng Web Quản trị Học đường (Web CMS) và Tầng Cổng Tích Hợp Mở API & Động cơ Webhook phát sự kiện thời gian thực có ký số HMAC-SHA256 đến các hệ thống quản lý sẵn có của nhà trường và cơ sở dữ liệu ngành giáo dục.

---

### 1.2. Mô Hình Kiến Trúc Tổng Thể 4 Tầng

Hệ sinh thái mschool được tổ chức thành 4 tầng kiến trúc phân tầng độc lập:

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 10, 'rankSpacing': 120, 'padding': 4, 'curve': 'basis'}}}%%
flowchart LR
    subgraph S_PHYSICAL ["TẦNG 1 & TẦNG 2: THIẾT BỊ VÀ MÁY CHỦ AI BIÊN"]
        direction TB
        L1_DEV["TẦNG 1: THIẾT BỊ HIỆN TRƯỜNG<br/>• Camera IP True WDR ≥ 120dB Cổng trường<br/>• 50 Camera IP góc rộng độ phân giải cao phòng học<br/>• Switch PoE mạng Gigabit & Màn hình Kiosk bốt bảo vệ"]
        L2_EDGE["TẦNG 2: MÁY CHỦ AI BIÊN TẠI TRƯỜNG<br/>• Ingestion Worker giải mã RTSP không đệm (buffer = 1)<br/>• SCRFD bóc tách đám đông & ArcFace 512D trên GPU<br/>• Đối soát 1:N trong bộ nhớ RAM (Permanent & Visitor TTL)"]
        L1_DEV -->|"Luồng RTSP H.264/H.265 (Port 554)"| L2_EDGE
    end

    subgraph S_CORE ["TẦNG 3 & TẦNG 4: NGHIỆP VỤ VÀ TÍCH HỢP ĐA NỀN TẢNG"]
        direction TB
        L3_CMS["TẦNG 3: CỔNG WEB QUẢN TRỊ HỌC ĐƯỜNG (WEB CMS)<br/>• Dashboard sĩ số thời gian thực qua WebSocket<br/>• Sơ đồ mặt bằng 50 phòng học & Cảnh báo an ninh bốt bảo vệ<br/>• Sổ đầu bài điện tử, Quản lý hồ sơ sinh trắc học & Báo cáo"]
        L4_INT["TẦNG 4: CỔNG TÍCH HỢP MỞ API & WEBHOOK<br/>• Động cơ phát Webhook thời gian thực ký số HMAC-SHA256<br/>• Thử lại lũy tiến Exponential Backoff & Circuit Breaker<br/>• Bộ Open REST API chuẩn OpenAPI kết nối EduSys / vnEdu"]
        L3_CMS -->|"Truy vấn dữ liệu & Điều hành"| L4_INT
    end

    L2_EDGE -->|"Phát sự kiện nhận diện & Trích xuất kết quả"| L3_CMS
```

---

### 1.3. Sơ Đồ Phân Rã Chức Năng Dạng Cây 3 Tầng Toàn Hệ Thống

Toàn bộ các tính năng nghiệp vụ của mschool được phân rã thành 5 phân hệ cốt lõi và 21 chức năng (Use Case) độc lập theo cấu trúc cây ngang 3 tầng dóng thẳng hàng lề trái:

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 8, 'rankSpacing': 140, 'padding': 3, 'curve': 'basis'}}}%%
flowchart LR
    %% GỐC HỆ THỐNG (CẤP 0)
    ROOT["HỆ THỐNG MSCHOOL TỔNG THỂ"]:::cLevel0

    %% 5 PHÂN HỆ CỐT LÕI (CẤP 1 - ĐỒNG BỘ TUYỆT ĐỐI 23 KÝ TỰ)
    MOD1["1. ĐIỂM DANH THÔNG MINH"]:::cLevel1
    MOD2["2. ĐỊNH DANH VÀ QUYỀN IAM"]:::cLevel1
    MOD3["3. QUẢN TRỊ VÀ GIÁM SÁT"]:::cLevel1
    MOD4["4. DANH MỤC VÀ CẤU HÌNH"]:::cLevel1
    MOD5["5. TỔNG HỢP VÀ ĐỐI SOÁT"]:::cLevel1

    %% CHỨC NĂNG CON PHÂN HỆ 1 (CẤP 2)
    F1_1["1.1. Ingestion RTSP & Tripwire"]:::cLevel2
    F1_2["1.2. Điểm danh 50 lớp học tự động"]:::cLevel2
    F1_3["1.3. Quản lý Khách thăm có hạn TTL"]:::cLevel2
    F1_4["1.4. Phê duyệt thủ công MakerChecker"]:::cLevel2

    %% CHỨC NĂNG CON PHÂN HỆ 2 (CẤP 2)
    F2_1["2.1. Đăng nhập một lần chuẩn SSO"]:::cLevel2
    F2_2["2.2. Quản lý tài khoản người dùng"]:::cLevel2
    F2_3["2.3. Phân quyền vai trò chuẩn RBAC"]:::cLevel2
    F2_4["2.4. Thẻ đón con & Mã QR động"]:::cLevel2

    %% CHỨC NĂNG CON PHÂN HỆ 3 (CẤP 2)
    F3_1["3.1. Quản trị Camera IP & Vạch ảo"]:::cLevel2
    F3_2["3.2. Giám sát Bốt bảo vệ & Người lạ"]:::cLevel2
    F3_3["3.3. Nhật ký kiểm toán Audit Log"]:::cLevel2
    F3_4["3.4. Giám sát hiệu năng APM GPU"]:::cLevel2

    %% CHỨC NĂNG CON PHÂN HỆ 4 (CẤP 2)
    F4_1["4.1. Danh mục Năm học, Khối và Lớp"]:::cLevel2
    F4_2["4.2. Hồ sơ sinh trắc học eDifFIQA"]:::cLevel2
    F4_3["4.3. Thời khóa biểu & Lịch quét lớp"]:::cLevel2
    F4_4["4.4. Cấu hình động & HotReload Redis"]:::cLevel2

    %% CHỨC NĂNG CON PHÂN HỆ 5 (CẤP 2)
    F5_1["5.1. Dashboard sĩ số thời gian thực"]:::cLevel2
    F5_2["5.2. Sơ đồ ma trận 50 phòng học"]:::cLevel2
    F5_3["5.3. Sổ đầu bài điện tử các tiết"]:::cLevel2
    F5_4["5.4. Báo cáo chuyên cần & Xuất Excel"]:::cLevel2
    F5_5["5.5. Webhook ký số HMAC & Open API"]:::cLevel2

    %% LIÊN KẾT TỪ GỐC SANG 5 PHÂN HỆ
    ROOT --> MOD1
    ROOT --> MOD2
    ROOT --> MOD3
    ROOT --> MOD4
    ROOT --> MOD5

    %% LIÊN KẾT TỪ PHÂN HỆ SANG CHỨC NĂNG CON ĐỘC LẬP
    MOD1 --> F1_1 & F1_2 & F1_3 & F1_4
    MOD2 --> F2_1 & F2_2 & F2_3 & F2_4
    MOD3 --> F3_1 & F3_2 & F3_3 & F3_4
    MOD4 --> F4_1 & F4_2 & F4_3 & F4_4
    MOD5 --> F5_1 & F5_2 & F5_3 & F5_4 & F5_5

    %% ĐỊNH DẠNG Ô CÂN ĐỐI
    classDef cLevel0 font-size:12px,font-weight:bold,padding:6px 16px;
    classDef cLevel1 font-size:11px,font-weight:bold,padding:5px 14px;
    classDef cLevel2 font-size:10px,padding:4px 10px;
```

---

## PHẦN II: KIẾN TRÚC DỮ LIỆU VÀ QUY TẮC TOÀN VẸN

### 2.1. Sơ Đồ Thực Thể Quan Hệ Mức Cao (Mermaid ERD)

```mermaid
erDiagram
    ACADEMIC_YEAR ||--o{ CLASS_ROOM : "phân cấp quản lý"
    CLASS_ROOM ||--o{ STUDENT : "danh sách biên chế"
    STUDENT ||--o{ FACE_PROFILE : "hồ sơ sinh trắc học"
    STUDENT ||--o{ PARENT_RELATION : "quan hệ thân nhân"
    PARENT ||--o{ PARENT_RELATION : "đại diện giám hộ"
    CLASS_ROOM ||--o{ TIMETABLE_PERIOD : "thời khóa biểu giảng dạy"
    STUDENT ||--o{ DAILY_SESSION : "phiên điểm danh ngày"
    CLASS_ROOM ||--o{ CLASSROOM_ATTENDANCE : "sổ đầu bài tiết học"
    DAILY_SESSION ||--o{ OUTBOX_EVENT : "phát sự kiện đồng bộ"
    CAMERA_DEVICE ||--o{ DAILY_SESSION : "thiết bị ghi nhận cổng"
```

---

### 2.2. Danh Mục Các Bảng Dữ Liệu Cốt Lõi

| Tên bảng CSDL | Ý nghĩa thực thể | Các trường khóa chính & Ngoại | Ràng buộc nghiệp vụ & Cơ chế bảo mật |
| :--- | :--- | :--- | :--- |
| `academic_years` | Năm học và Học kỳ | `id` (PK) | Duy nhất 1 năm học và học kỳ mang trạng thái `is_active = TRUE`. |
| `classes` | Lớp học theo khối | `id` (PK), `homeroom_teacher_id` (FK) | Tên lớp duy nhất trong cùng một năm học; mỗi lớp gắn với đúng 1 giáo viên chủ nhiệm. |
| `students` | Hồ sơ cá nhân học sinh | `id` (PK), `class_id` (FK), `student_code` (Unique) | `student_code` là mã định danh duy nhất toàn hệ thống; chỉ tài khoản `status = ACTIVE` mới được nạp vào bộ nhớ RAM đối soát. |
| `face_biometric_profiles` | Vector đặc trưng khuôn mặt | `id` (PK), `student_id` (FK) | Chuỗi vector 512 chiều kiểu số thực FLOAT32 được chuẩn hóa L2, mã hóa AES-256 khi ghi xuống CSDL bền vững. |
| `daily_attendance_sessions` | Phiên điểm danh học sinh trong ngày | `id` (PK), `student_id` (FK), `date` (Unique Index kép) | Quản lý trạng thái bằng Daily Session State Machine; lưu mốc `check_in_time`, `check_out_time`, `status = PRESENT / TARDY / ABSENT`. |
| `classroom_period_attendances` | Sổ đầu bài điện tử theo tiết học | `id` (PK), `class_id` (FK), `period_id` (FK) | Ghi nhận sĩ số có mặt, vắng mặt, giáo viên đứng lớp; tích hợp chữ ký số một chạm xác nhận sổ đầu bài. |
| `visitor_registrations` | Khách thăm & Phụ huynh đón con | `id` (PK), `student_id` (FK), `visitor_code` (Unique) | Cung cấp cửa sổ thời gian hiệu lực `valid_from` và `valid_to` (TTL); tự động dọn dẹp vector trong RAM khi hết hạn. |
| `outbox_events` | Hàng đợi sự kiện Webhook & SMS | `id` (PK), `aggregate_id` (Indexed) | Lưu sự kiện điểm danh nguyên tử cùng phiên CSDL; tiến trình nền đọc quét và ký số HMAC-SHA256 phát sang bên ngoài. |

---

### 2.3. Máy Trạng Thái Chu Trình Điểm Danh và Vòng Đời Hồ Sơ (State Machine)

```mermaid
flowchart LR
    subgraph S_MORNING ["1. GIAI ĐOẠN ĐÓN HỌC SINH BUỔI SÁNG"]
        direction TB
        ST_INIT["CHƯA ĐẾN TRƯỜNG (NOT_ARRIVED)<br/>• Trạng thái khởi tạo lúc 00:00 hàng ngày<br/>• Sẵn sàng tiếp nhận tín hiệu từ camera cổng"]
        ST_PRESENT["CÓ MẶT ĐÚNG GIỜ (PRESENT)<br/>• Quét qua vạch ảo cổng trước 07:15<br/>• Chốt Giờ Đến sáng, phát Webhook đón con"]
        ST_TARDY["ĐI HỌC MUỘN (TARDY)<br/>• Quét qua cổng sau mốc 07:15 sáng<br/>• Gắn cờ vi phạm nề nếp, cảnh báo GVCN"]
        ST_INIT -->|Vào cổng trước 07:15| ST_PRESENT
        ST_INIT -->|Vào cổng sau 07:15| ST_TARDY
    end

    subgraph S_DAY_OPS ["2. TRONG NGÀY & TAN TRƯỜNG BUỔI CHIỀU"]
        direction TB
        ST_TEMP_OUT["RA NGOÀI TẠM THỜI (TEMP_OUT)<br/>• Học sinh ra ngoài dưới 5 phút<br/>• Tự động khôi phục trạng thái khi vào lại"]
        ST_COMPLETED["HOÀN THÀNH NGÀY HỌC (COMPLETED)<br/>• Quét chiều Ra cổng sau 16:30 chiều<br/>• Chốt Giờ Về an toàn, phát Webhook tan trường"]
        ST_ABSENT["VẮNG MẶT CẢ NGÀY (ABSENT)<br/>• Không ghi nhận qua cổng tính đến 08:30<br/>• Đối soát vắng mặt tự động cả lớp"]
        ST_PRESENT -->|Đi ra ngoài cổng| ST_TEMP_OUT
        ST_TEMP_OUT -->|Vào lại trong 5 phút| ST_PRESENT
        ST_PRESENT -->|Tan học sau 16:30| ST_COMPLETED
        ST_INIT -->|Hết giờ điểm danh 08:30| ST_ABSENT
    end

    ST_TARDY -->|Tan học sau 16:30| ST_COMPLETED
```

---

### 2.4. Bẫy Toàn Vẹn Dữ Liệu và Kiểm Soát Đồng Thời

1. **Bẫy Khử Trùng Lặp Phân Tán (Distributed Cooldown Trap):**
   * Sử dụng khóa phân tán Redis dạng `cooldown:{student_id}:{gate_id}:{direction}` với thời gian sống TTL 90 giây.
   * Khi học sinh đứng trò chuyện trong vùng quét của camera, các lượt kích hoạt liên tiếp trong 90 giây bị chặn ngay tại tầng biên, không ghi trùng CSDL và không phát lặp sự kiện Webhook/SMS.
2. **Bẫy Đi Ngược Chiều và Ra Ngoài Ngắn Hạn (Short-Trip Filtering):**
   * Nếu học sinh đã vào trường nhưng chạy ra cổng lấy đồ rồi quay lại trong vòng dưới 5 phút, hệ thống tự động ghi đè lượt ra ngoài ngắn hạn, duy trì tính liên tục của phiên học buổi sáng.
3. **Bẫy Tranh Chấp Trạng Thái và Khóa Lạc Quan (Optimistic Locking):**
   * Khi giáo viên và ban giám hiệu cùng điều chỉnh điểm danh trên một học sinh, câu lệnh SQL bắt buộc kiểm tra phiên bản: `UPDATE daily_attendance_sessions SET status = :new_status, version = version + 1 WHERE id = :id AND version = :current_version`. Nếu số dòng tác động bằng 0, hệ thống cảnh báo xung đột dữ liệu và yêu cầu tải lại màn hình.
4. **Nguyên Tắc Maker-Checker trong Phê Duyệt Thủ Công:**
   * Mọi thao tác sửa đổi trạng thái điểm danh (từ vắng thành có mặt, phê duyệt đơn nghỉ phép) bắt buộc phải nhập lý do giải trình, ghi nhận danh tính người thực hiện và lưu vào Audit Log bất biến không thể sửa/xóa.


---

## PHẦN III: ĐẶC TẢ CHI TIẾT CÁC PHÂN HỆ VÀ CHỨC NĂNG NGHIỆP VỤ

### 1. PHÂN HỆ 1: ĐIỂM DANH THÔNG MINH VÀ TRÍ TUỆ NHÂN TẠO BIÊN

---

#### 1.1. UC-01: Điểm danh không dừng qua Camera IP Cổng trường

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cho phép hệ thống tự động thu nhận luồng video RTSP từ Camera IP cổng trường, phát hiện đối tượng, bám vết chuyển động qua vạch ảo không gian hai chiều, so khớp vector đặc trưng khuôn mặt trong bộ nhớ RAM và tự động chốt giờ đến/về của học sinh mà không yêu cầu học sinh dừng lại.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Camera IP cổng hoạt động bình thường (luồng RTSP ổn định); dịch vụ AI biên và bộ nhớ RAM Index đã nạp sẵn danh mục học sinh đang học (`status = ACTIVE`).
* **Đường dẫn thao tác:** Không có tương tác thủ công từ người dùng; quy trình xử lý tự động hoàn toàn ngầm (Edge Automated Pipeline). Ban giám hiệu và bảo vệ giám sát kết quả trên Bảng điều khiển Sĩ số hoặc Bàn làm việc Bốt bảo vệ.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận sự kiện hệ thống `action = 'GATE_ATTENDANCE_SCAN'`, `camera_id`, `student_id`, `direction = 'IN' / 'OUT'`, `cosine_similarity`, `timestamp = NOW()`.
* **Quy định phân quyền:** Dịch vụ tự động cấp hệ thống; phân quyền xem nhật ký thời gian thực cho Ban giám hiệu, Giáo viên chủ nhiệm và Nhân viên bảo vệ.

##### 2. Màn hình
* **Màn hình giám sát cổng thời gian thực (Default state):** Hiển thị 2 luồng camera cổng trực tiếp, thanh đếm số lượng học sinh đã vào trường, danh sách thẻ học sinh vừa qua cổng hiển thị ảnh snapshot cắt khuôn mặt, họ tên, lớp, thời gian và chỉ số tương đồng Cosine.
* **Trạng thái cảnh báo đối tượng lạ (Alert state):** Khi phát hiện khuôn mặt không khớp hồ sơ (độ tương đồng < 0.72), khung camera chuyển viền đỏ nhấp nháy, phát âm thanh cảnh báo tại bốt bảo vệ kèm hộp thoại chụp cận cảnh khuôn mặt.
* **Trạng thái không có dữ liệu (Empty state):** Khi ngoài khung giờ đón học sinh, bảng nhật ký hiển thị thông báo "Chưa có lượt quét nào trong phiên hiện tại".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Luồng Video RTSP * | Video Stream | INPUT | Luồng IP tĩnh | • Luồng video H.264/H.265 Full HD 1080p, buffer = 1 frame.<br/>• Kết nối qua cổng RTSP 554 dải mạng VLAN 20. |
| 2 | Vạch ảo Tripwire * | Line Coordinates | INPUT | Tọa độ (x1,y1)-(x2,y2) | • Cấu hình đoạn thẳng cắt ngang cổng trường.<br/>• Vector chỉ hướng xác định chiều Vào (IN) hoặc Ra (OUT). |
| 3 | Thẻ Học sinh qua cổng | Card Component | OUTPUT | Danh sách rỗng | • Hiển thị ảnh chụp đối soát cắt từ khung hình.<br/>• Họ tên học sinh `students.full_name`.<br/>• Mã định danh `students.student_code`.<br/>• Lớp học `classes.class_name`.<br/>• Mốc thời gian chính xác đến mili-giây. |
| 4 | Chỉ số tương đồng AI | Number(4,2) | OUTPUT | 0.00 | • Điểm tích vô hướng Cosine (0.00 - 1.00).<br/>• Ngưỡng công nhận mặc định ≥ 0.72. |
| 5 | Trạng thái lượt quét | Label | OUTPUT | "HỢP LỆ" | • Giá trị: "ĐÚNG GIỜ", "ĐI MUỘN", "RA VỀ", "TRÙNG LẶP COOLDOWN", "NGƯỜI LẠ". |

##### 4. Luồng nghiệp vụ
1. Học sinh bước qua vùng quét của camera cổng trường ở khoảng cách từ 2m đến 5m với tốc độ di chuyển tự nhiên.
2. Tiến trình `camera-worker` tiếp nhận luồng RTSP không đệm, thuật toán ByteTrack theo dõi chuyển động và cấp phát `track_id` duy nhất.
3. Thuật toán Vạch ảo Tripwire tính toán biến thiên tọa độ trọng tâm qua vạch phân định, xác định chính xác chiều di chuyển là Vào (IN) hoặc Ra (OUT).
4. Bộ lọc eDifFIQA đánh giá liên tục các khung hình của đối tượng: khi điểm chất lượng > 0.85 hoặc sau 0.8 giây, chọn ra 1 ảnh chụp khuôn mặt sắc nét nhất (Best Frame), gửi sang `miai` và đánh dấu `sent = true` để khóa track, triệt tiêu xử lý dư thừa.
5. Mô hình ArcFace ResNet50 trích xuất vector đặc trưng 512 chiều trong 15ms và thực hiện phép nhân ma trận tích vô hướng 1:N với kho vector trong bộ nhớ RAM trong 0.25ms:
   * `TH1 (So khớp thành công - Độ tương đồng ≥ 0.72):`
     * Hệ thống kiểm tra khóa Cooldown phân tán trên Redis `cooldown:gate:{student_code}:{direction}`.
     * Nếu khóa tồn tại (trong vòng 90 giây vừa quét): Hệ thống bỏ qua sự kiện, không ghi trùng CSDL, chỉ ghi log nội bộ.
     * Nếu ngoài Cooldown: Hệ thống thiết lập khóa Redis TTL 90s, gọi `DailySessionStateMachine` chốt Giờ Đến sáng (trước 07:15 là PRESENT, sau 07:15 là TARDY), cập nhật bảng `daily_attendance_sessions`.
     * Tạo bản ghi sự kiện vào bảng `outbox_events`, kích hoạt động cơ Webhook phát thông báo thời gian thực có ký số HMAC-SHA256 sang hệ thống đối tác và gửi tin nhắn SMS Brandname viễn thông cho phụ huynh trong thời gian dưới 2 giây.
   * `TH2 (Khuôn mặt lạ - Độ tương đồng < 0.72):`
     * Hệ thống không tìm thấy hồ sơ khớp trong bộ nhớ RAM; tự động lưu ảnh vào bảng `stranger_access_logs`.
     * Phát tín hiệu cảnh báo viền đỏ và âm thanh tức thời lên màn hình Bốt bảo vệ để nhân viên bảo vệ kiểm tra trực tiếp.
   * `TH3 (Mất kết nối mạng Internet WAN ra ngoài):`
     * Máy chủ biên tại trường vẫn tiếp tục nhận diện và ghi nhận điểm danh bình thường vào CSDL cục bộ `micro-server`. Sự kiện thông báo được lưu đệm trong hàng đợi Outbox và tự động đồng bộ bù ngay khi đường truyền phục hồi.

###### Sơ đồ tuần tự chức năng Điểm danh không dừng qua Camera IP Cổng trường

```mermaid
sequenceDiagram
    autonumber
    actor HS as Học Sinh
    participant CAM as Camera IP Cổng (RTSP)
    participant WRK as Ingestion Worker (Python)
    participant AI as Core AI (GPU ArcFace)
    participant RAM as RAM Index (0.25ms)
    participant BE as Backend Core (Spring Boot)
    participant REDIS as Cụm Redis Caching
    participant DB as CSDL PostgreSQL
    participant WH as Động cơ Webhook & SMS

    HS->>CAM: Bước qua cổng trường (cự ly 2m - 5m)
    CAM->>WRK: Truyền luồng RTSP Full HD (buffer = 1)
    Note over WRK: ByteTrack bám vết track_id<br/>Xác định hướng Vào / Ra qua Vạch ảo Tripwire
    WRK->>WRK: Lọc Best Frame eDifFIQA (điểm > 0.85 hoặc sau 0.8s)
    WRK->>AI: Gửi 1 ảnh chụp đẹp nhất & Khóa track (sent = true)
    activate AI
    AI->>AI: ArcFace trích xuất vector 512 chiều (15ms)
    AI->>RAM: So khớp tích vô hướng 1:N với RAM Index
    RAM-->>AI: Trả về kết quả (student_code, cosine = 0.88)
    AI-->>BE: Phát sự kiện điểm danh (student_code, direction, timestamp)
    deactivate AI

    activate BE
    BE->>REDIS: Kiểm tra key cooldown:gate:{student_code}
    alt TH1.1: Trong cửa sổ Cooldown 90 giây (Trùng lặp)
        REDIS-->>BE: Key tồn tại
        Note over BE: Hủy bỏ sự kiện, không ghi trùng CSDL
    else TH1.2: Ngoài cửa sổ Cooldown 90 giây (Hợp lệ)
        REDIS-->>BE: Key không tồn tại
        BE->>REDIS: Thiết lập key cooldown (TTL = 90s)
        BE->>BE: DailySessionStateMachine chốt Giờ Đến / Về
        BE->>DB: Cập nhật bảng daily_attendance_sessions
        BE->>DB: INSERT INTO outbox_events (sự kiện điểm danh)
        BE-)WH: Kích hoạt Webhook ký số HMAC-SHA256 & SMS (< 2s)
    end
    deactivate BE
```

---

#### 1.2. UC-02: Điểm danh toàn cảnh 50 phòng học tự động theo Thời khóa biểu

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Tự động kích hoạt chụp ảnh toàn cảnh tại 50 phòng học vào đúng phút thứ 5 đầu mỗi tiết học, sử dụng mô hình SCRFD bóc tách trên 40 khuôn mặt, phân chia thành 2 vùng không gian độc lập (Bục giảng giáo viên và Dãy bàn học sinh), tự động đối soát danh sách lớp, phát hiện học sinh vắng mặt, phát hiện học sinh ngồi nhầm lớp và cập nhật Sổ đầu bài điện tử.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Camera phòng học kết nối thông suốt trong dải VLAN 20; Thời khóa biểu của tuần học hiện tại đã được thiết lập và kích hoạt.
* **Đường dẫn thao tác:** Tiến trình nền tự động kích hoạt bởi Quartz Scheduler. Giáo viên và Ban giám hiệu xem kết quả tại menu "Quản trị Lớp học" → "Sơ đồ 50 phòng học" hoặc "Sổ đầu bài điện tử".
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'CLASSROOM_PERIOD_SCAN'`, `class_id`, `room_id`, `period_id`, `present_count`, `absent_count`, `wrong_class_count`.
* **Quy định phân quyền:** Ban giám hiệu và Giáo viên bộ môn của tiết học được quyền xem chi tiết và ký xác nhận sổ đầu bài điện tử.

##### 2. Màn hình
* **Màn hình Sơ đồ Mặt bằng 50 Phòng học (Default state):** Hiển thị dạng lưới ma trận 50 phòng học phân chia theo Khối 10, Khối 11, Khối 12. Mỗi phòng hiển thị mã lớp, sĩ số (ví dụ: 39/40), trạng thái tiết học (Đang diễn ra, Đã chốt điểm danh).
* **Màn hình Xem chi tiết Phòng học (Modal state):** Hiển thị ảnh chụp góc rộng của lớp, phân chia khung chữ nhật màu xanh lá cho Bục giảng giáo viên (Teacher ROI) và khung màu xanh dương cho Dãy bàn học sinh (Student ROI); danh sách chi tiết học sinh vắng mặt kèm ảnh đối soát.
* **Trạng thái cảnh báo học sinh ngồi nhầm lớp (Alert state):** Hiển thị thẻ viền vàng nhấp nháy đối với các học sinh lớp khác đang có mặt trong phòng học, ghi rõ "Học sinh Nguyễn Văn A (Lớp 10A2) đang ngồi tại phòng 10A1".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Lệnh kích hoạt Snapshot * | Cron Trigger | INPUT | Phút thứ 5 mỗi tiết | • Tự động kích hoạt bởi bộ lập lịch Quartz Scheduler theo thời khóa biểu `timetables`. |
| 2 | Ảnh góc rộng phòng học * | Image Stream | INPUT | 3 ảnh JPEG góc rộng | • Camera phòng học chụp liên tiếp 3 ảnh độ phân giải cao qua HTTP Snapshot dải VLAN 20. |
| 3 | Vùng Bục giảng (Teacher ROI) | Bounding Box | OUTPUT | Tọa độ ROI trên | • Xác định giáo viên đứng lớp; so khớp với phân công giảng dạy để xác nhận: Đúng giáo viên / Dạy thay / Vắng mặt. |
| 4 | Vùng Dãy bàn (Student ROI) | Bounding Box | OUTPUT | Tọa độ ROI dưới | • Bóc tách đồng thời đến 40 khuôn mặt học sinh; so khớp 1:N với danh sách lớp. |
| 5 | Sĩ số có mặt | Number(2) | OUTPUT | 0 | • Số học sinh có mặt thực tế trong lớp học `classroom_period_attendances.present_count`. |
| 6 | Danh sách vắng mặt | List Component | OUTPUT | Danh sách rỗng | • Họ tên, mã học sinh vắng mặt; hiển thị nhãn "Có phép" hoặc "Không phép". |
| 7 | Cảnh báo ngồi nhầm lớp | Alert Component | OUTPUT | Danh sách rỗng | • Danh sách học sinh thuộc lớp khác được camera phát hiện trong phòng học này. |

##### 4. Luồng nghiệp vụ
1. Đúng phút thứ 5 đầu mỗi tiết học (ví dụ: 07h05 Tiết 1, 07h55 Tiết 2), Quartz Scheduler gửi yêu cầu kích hoạt tác vụ điểm danh lớp học.
2. Hệ thống gửi lệnh HTTP Snapshot qua dải mạng VLAN cô lập đến Camera IP phòng học tương ứng, nhận về 3 khung hình JPEG góc rộng.
3. Hệ thống gửi ảnh tới API `/face/classroom-detect` của `miai`. Mô hình SCRFD bóc tách đồng thời 40 khuôn mặt trong 25ms và phân chia không gian thành 2 vùng độc lập:
   * **Xử lý Vùng Bục giảng (Teacher ROI):**
     * Trích xuất vector khuôn mặt người đứng tại bục giảng, so khớp với Giáo viên bộ môn theo thời khóa biểu.
     * Nếu trùng khớp: Ghi nhận giáo viên giảng dạy đúng giờ.
     * Nếu là giáo viên khác: Ghi nhận trạng thái "Dạy thay", lưu thông tin giáo viên dạy thay.
     * Nếu không phát hiện khuôn mặt: Ghi nhận trạng thái "Chưa có giáo viên".
   * **Xử lý Vùng Dãy bàn học sinh (Student ROI):**
     * Trích xuất vector của toàn bộ học sinh trong phòng học, so khớp với danh sách 40 học sinh chính thức của lớp.
     * `TH1 (Học sinh có mặt đúng lớp):` Đánh dấu trạng thái có mặt trong tiết học.
     * `TH2 (Học sinh vắng mặt):` Các học sinh trong biên chế lớp nhưng không tìm thấy khuôn mặt trong lớp sẽ được liệt kê vào danh sách vắng mặt của tiết học.
     * `TH3 (Học sinh ngồi nhầm lớp):` Đối soát vector nhận diện khớp với học sinh thuộc biên chế một lớp học khác, hệ thống kích hoạt cảnh báo "Ngồi nhầm phòng học" gửi đến giáo viên bộ môn và giám thị.
4. Hệ thống tổng hợp kết quả, lưu vào bảng `classroom_period_attendances` và tự động cập nhật Sổ đầu bài điện tử thời gian thực qua kết nối WebSocket.

###### Sơ đồ tuần tự chức năng Điểm danh toàn cảnh 50 phòng học tự động

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Quartz Scheduler
    participant CAM as Camera Phòng học (VLAN)
    participant AI as Core AI (SCRFD & ArcFace)
    participant RAM as RAM Index (Permanent)
    participant BE as Backend Nghiệp vụ
    participant DB as CSDL PostgreSQL
    participant CMS as Giao diện Web CMS

    CRON->>BE: 1. Kích hoạt tác vụ đầu tiết (phút thứ 5)
    activate BE
    BE->>CAM: 2. Gửi lệnh HTTP Snapshot qua VLAN 20
    CAM-->>BE: 3. Trả về 3 khung hình JPEG góc rộng
    BE->>AI: 4. Gọi API /face/classroom-detect
    activate AI
    AI->>AI: 5. SCRFD bóc tách 40 khuôn mặt (25ms)
    AI->>AI: 6. Phân tách Bục giảng (Teacher) & Dãy bàn (Student)

    par Đối soát Giáo viên đứng lớp
        AI->>RAM: 7.1. So khớp vector Giáo viên theo Thời khóa biểu
        RAM-->>AI: 7.2. Kết quả: Đúng giáo viên / Dạy thay
    and Đối soát Học sinh trong lớp
        AI->>RAM: 8.1. So khớp 1:N với danh mục học sinh lớp
        RAM-->>AI: 8.2. Danh sách: Có mặt / Vắng mặt / Nhầm lớp
    end

    AI-->>BE: 9. Trả kết quả phân tích toàn cảnh tiết học
    deactivate AI
    BE->>DB: 10. Lưu bản ghi classroom_period_attendances
    BE-)CMS: 11. Đẩy cập nhật Sổ đầu bài điện tử qua WebSocket
    deactivate BE
```

---

#### 1.3. UC-03: Đăng ký và Quản lý Khách thăm / Phụ huynh Đón con có Thời hạn TTL

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cho phép nhân viên bảo vệ tại bốt cổng hoặc quản trị viên tiếp nhận đăng ký khách thăm trường, phụ huynh đến đón con sớm hoặc đối tác liên hệ công tác; chụp ảnh chân dung, cấp quyền ra vào có giới hạn thời gian (TTL) và đồng bộ tức thời vector vào phân vùng RAM động của máy chủ AI biên.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người thực hiện có tài khoản vai trò Bảo vệ hoặc Quản trị viên; máy ảnh webcam tại bốt bảo vệ hoạt động tốt.
* **Đường dẫn thao tác:** Đăng nhập Web CMS → Menu "Bốt Bảo vệ" → Nhấn nút [[Tiếp đón khách]] → Mở form đăng ký.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'REGISTER_VISITOR'`, `visitor_code`, `full_name`, `purpose`, `valid_from`, `valid_to`, `created_by`.
* **Quy định phân quyền:** Nhân viên bảo vệ, Giám thị học đường và Quản trị viên hệ thống.

##### 2. Màn hình
* **Màn hình Đăng ký Khách thăm (Default state):** Biểu mẫu gồm thông tin cá nhân khách, số điện thoại, số CCCD, mục đích thăm trường, liên kết với học sinh (nếu là phụ huynh đón con), khung chụp ảnh chân dung trực tiếp và khoảng thời gian cho phép ra vào (TTL).
* **Hộp thoại xác nhận phê duyệt vào trường (Confirm Popup):** Hiển thị tóm tắt thông tin khách, ảnh đối soát, thời gian hết hạn hiệu lực mở cổng và nút [[Xác nhận mở làn đón]].
* **Thông báo phản hồi (Toast notification):** Toast xanh góc màn hình: "Đăng ký khách thành công. Mã thẻ đón con: [MÃ_KHÁCH]".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Họ và tên khách * | Textbox(100) | INPUT | Để trống | • Trường bắt buộc; chuẩn hóa viết hoa chữ cái đầu.<br/>• Lưu vào `visitor_registrations.full_name`. |
| 2 | Số điện thoại liên hệ * | Textbox(15) | INPUT | Để trống | • Trường bắt buộc; chuẩn hóa 10 chữ số di động.<br/>• Lưu vào `visitor_registrations.phone_number`. |
| 3 | Số CCCD/CMND | Textbox(20) | INPUT | Để trống | • Chỉ nhập ký tự số từ 9 đến 12 chữ số.<br/>• Lưu vào `visitor_registrations.identity_card`. |
| 4 | Mục đích đến trường * | Dropdown | INPUT | "Đón con" | • Giá trị: "Đón con sớm", "Gặp ban giám hiệu", "Liên hệ công tác", "Giao hàng/Sửa chữa". |
| 5 | Học sinh đón (nếu có) | Autocomplete | INPUT | Để trống | • Tìm kiếm theo mã hoặc họ tên học sinh; tự động hiển thị lớp học và giáo viên chủ nhiệm. |
| 6 | Thời gian hiệu lực (TTL) * | Number(4) | INPUT | 120 | • Thời gian sống tính bằng phút (30 - 480 phút). Mặc định 120 phút.<br/>• Tính toán `valid_from = NOW()`, `valid_to = NOW() + TTL`. |
| 7 | Ảnh chân dung mẫu * | Camera Capture | INPUT | Để trống | • Chụp trực tiếp từ webcam bốt bảo vệ; kiểm định eDifFIQA ≥ 0.75.<br/>• Trích xuất vector 512D lưu vào RAM `_visitor_identities`. |
| 8 | Xác nhận đăng ký | Button | INPUT | N/A | • Nút thực hiện lưu hồ sơ và đồng bộ vector sang RAM biên. |

##### 4. Luồng nghiệp vụ
1. Khách hoặc phụ huynh đến bốt bảo vệ cổng trường xuất trình giấy tờ tùy thân và nêu lý do đến trường.
2. Nhân viên bảo vệ truy cập Web CMS → Menu "Bốt Bảo vệ" → Nhấn [[Tiếp đón khách]].
3. Bảo vệ nhập thông tin khách, chọn học sinh cần đón (nếu là phụ huynh) và kích hoạt webcam chụp ảnh chân dung khuôn mặt khách.
4. Nhân viên bảo vệ nhấn button `[Xác nhận đăng ký]`:
   * `TH1 (Bỏ trống trường bắt buộc hoặc ảnh không đạt chuẩn eDifFIQA < 0.75):` Hệ thống báo lỗi inline, yêu cầu chụp lại ảnh khuôn mặt rõ nét, không đội mũ, không đeo khẩu trang.
   * `TH2 (Đầy đủ thông tin hợp lệ):`
     * Hệ thống tạo mới bản ghi trong bảng `visitor_registrations` với `status = 'APPROVED'`, sinh mã đón con duy nhất `visitor_code` (UUID ngắn 8 ký tự).
     * Hệ thống gửi vector 512 chiều của khách sang Động cơ AI biên qua API `/face/visitor/register` kèm thời gian hết hạn `valid_to`. Động cơ AI nạp vector vào phân vùng RAM động `VISITOR_DYNAMIC_INDEX`.
     * Khi khách hoặc phụ huynh bước qua cổng quét camera, hệ thống đối soát nhận diện thành công, tự động mở làn đón học sinh và thông báo đến giáo viên chủ nhiệm.
     * Sau khi hết thời hạn TTL (mặc định 120 phút), tiến trình nền `auto_evict_expired()` chạy ngầm mỗi 5 phút tự động giải phóng vector của khách khỏi bộ nhớ RAM, bảo đảm tuyệt đối an ninh học đường.

###### Sơ đồ tuần tự chức năng Đăng ký và Quản lý Khách thăm có thời hạn TTL

```mermaid
sequenceDiagram
    autonumber
    actor BV as Nhân viên Bảo vệ
    participant CMS as Web CMS Bốt Bảo vệ
    participant BE as Backend Core
    participant AI as Core AI Engine
    participant RAM as RAM Visitor Index
    participant DB as CSDL PostgreSQL

    BV->>CMS: 1. Nhập thông tin khách & Chụp ảnh chân dung
    BV->>CMS: 2. Nhấn [Xác nhận đăng ký]
    activate CMS
    CMS->>BE: 3. POST /api/v1/visitors (thông tin & ảnh)
    activate BE
    BE->>AI: 4. Kiểm định chất lượng ảnh & Trích xuất vector 512D
    activate AI
    AI-->>BE: 5. Vector 512D hợp lệ (eDifFIQA ≥ 0.75)
    deactivate AI

    BE->>DB: 6. INSERT INTO visitor_registrations (TTL = 120p)
    BE->>AI: 7. POST /face/visitor/register (vector, valid_to)
    activate AI
    AI->>RAM: 8. Nạp vector vào phân vùng VISITOR_DYNAMIC_INDEX
    RAM-->>AI: 9. Đồng bộ RAM thành công
    AI-->>BE: 10. Xác nhận nạp RAM
    deactivate AI

    BE-->>CMS: 11. Trả kết quả thành công (visitor_code)
    deactivate BE
    CMS-->>BV: 12. Hiển thị toast "Đăng ký khách thành công", cấp mã mở làn
    deactivate CMS
```

---

#### 1.4. UC-04: Điều chỉnh Điểm danh và Phê duyệt Thủ công (Maker-Checker)

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cho phép Giáo viên chủ nhiệm hoặc Ban giám hiệu thực hiện điều chỉnh trạng thái điểm danh của học sinh trong các trường hợp ngoại lệ thực tế (học sinh xin nghỉ ốm có đơn phép gửi sau, học sinh đi vào qua cổng phụ không có camera, học sinh tham gia kỳ thi học sinh giỏi); áp dụng nguyên tắc Maker-Checker yêu cầu bắt buộc nhập lý do giải trình và lưu vết kiểm toán bất biến.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng đăng nhập tài khoản vai trò Giáo viên chủ nhiệm hoặc Ban giám hiệu; phiên điểm danh của ngày học đang mở hoặc trong thời hạn cho phép điều chỉnh (tối đa 48 giờ sau ngày học).
* **Đường dẫn thao tác:** Đăng nhập Web CMS → Menu "Sổ Điểm danh" → Chọn Lớp học & Ngày học → Nhấp chọn học sinh cần sửa → Nhấn biểu tượng [[Chỉnh sửa trạng thái]].
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận bắt buộc `action = 'MANUAL_ATTENDANCE_OVERRIDE'`, `student_id`, `date`, `old_status`, `new_status`, `reason`, `updated_by`, `timestamp = NOW()`.
* **Quy định phân quyền:** Giáo viên chủ nhiệm (được sửa lớp mình phụ trách), Ban giám hiệu (được phê duyệt và sửa toàn trường).

##### 2. Màn hình
* **Màn hình Danh sách Điểm danh Lớp học (Default state):** Danh sách học sinh của lớp kèm cột trạng thái điểm danh hiện tại: "Có mặt" (xanh), "Đi muộn" (vàng), "Vắng không phép" (đỏ), "Vắng có phép" (xanh dương).
* **Hộp thoại Điều chỉnh Điểm danh (Confirm Modal):** Hiển thị thông tin học sinh, trạng thái hiện tại, dropdown chọn trạng thái mới, textarea nhập lý do điều chỉnh bắt buộc và 2 nút [[Hủy bỏ]], [[Lưu điều chỉnh]].
* **Thông báo phản hồi (Toast notification):** Toast xanh: "Điều chỉnh trạng thái điểm danh thành công cho học sinh [Họ_Tên]".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Mã học sinh | Label | OUTPUT | Tự động | • Mã học sinh `students.student_code`. |
| 2 | Họ và tên học sinh | Label | OUTPUT | Tự động | • Họ tên học sinh `students.full_name`. |
| 3 | Trạng thái hiện tại | Label | OUTPUT | Tự động | • Trạng thái điểm danh ghi nhận tự động ban đầu. |
| 4 | Trạng thái mới * | Dropdown | INPUT | Để trống | • Trường bắt buộc. Giá trị: "CÓ MẶT", "ĐI MUỘN", "NGHỈ CÓ PHÉP", "NGHỈ KHÔNG PHÉP". |
| 5 | Lý do giải trình * | Textarea(500) | INPUT | Để trống | • Trường bắt buộc tối thiểu 10 ký tự.<br/>• Lưu vào `daily_attendance_sessions.override_reason`. |
| 6 | Minh chứng đính kèm | Upload file | INPUT | Để trống | • Định dạng: `.jpg`, `.png`, `.pdf` (đơn xin phép, giấy khám bệnh). Dung lượng tối đa 10MB. |
| 7 | Hủy bỏ | Button | INPUT | N/A | • Đóng popup, không thay đổi dữ liệu CSDL. |
| 8 | Lưu điều chỉnh | Button | INPUT | N/A | • Kiểm tra dữ liệu, kích hoạt cập nhật trạng thái kèm phiên bản `version = version + 1`. |

##### 4. Luồng nghiệp vụ
1. Giáo viên chủ nhiệm đăng nhập Web CMS → Truy cập "Sổ Điểm danh Lớp học" → Chọn ngày cần điều chỉnh.
2. Hệ thống tải danh sách học sinh và trạng thái điểm danh của lớp trong ngày được chọn.
3. Giáo viên nhấp vào dòng học sinh có phát sinh lý do chính đáng (ví dụ: học sinh vắng do đi khám bệnh nhưng gia đình đã nộp đơn xin phép) → Nhấn biểu tượng `[Chỉnh sửa]`.
4. Hệ thống hiển thị hộp thoại "Điều chỉnh trạng thái điểm danh". Giáo viên chọn trạng thái mới là "NGHỈ CÓ PHÉP" và nhập lý do: "Gia đình có đơn xin phép nghỉ ốm đính kèm".
5. Giáo viên nhấn button `[Lưu điều chỉnh]`:
   * `TH1 (Bỏ trống lý do giải trình hoặc lý do dưới 10 ký tự):` Hệ thống báo lỗi viền đỏ: *"Đồng chí bắt buộc phải nhập lý do giải trình chi tiết (tối thiểu 10 ký tự) khi điều chỉnh điểm danh thủ công"*.
   * `TH2 (Xung đột phiên bản dữ liệu - Optimistic Locking):` Bản ghi điểm danh đã bị người dùng khác cập nhật đồng thời, câu lệnh SQL kiểm tra `version = :current_version` trả về 0 dòng tác động; hệ thống cảnh báo: *"Dữ liệu điểm danh của học sinh này vừa được cập nhật bởi quản trị viên khác. Vui lòng tải lại trang"*.
   * `TH3 (Dữ liệu hợp lệ và không xung đột):`
     * Hệ thống thực hiện cập nhật bảng `daily_attendance_sessions`: `status = 'EXCUSED_ABSENT'`, `override_reason = :reason`, `is_manually_overridden = TRUE`, `overridden_by = :user_id`, `version = version + 1`, `updated_date = NOW()`.
     * Ghi nhận 1 bản ghi vào bảng kiểm toán bất biến `audit_log`.
     * Tạo sự kiện đồng bộ vào `outbox_events` để phát Webhook thông báo trạng thái cập nhật sang hệ thống quản lý trường.
     * Đóng hộp thoại, hiển thị toast: *"Điều chỉnh trạng thái điểm danh thành công"*.

###### Sơ đồ tuần tự chức năng Điều chỉnh Điểm danh và Phê duyệt Thủ công

```mermaid
sequenceDiagram
    autonumber
    actor GV as Giáo viên Chủ nhiệm
    participant CMS as Giao diện Web CMS
    participant BE as Dịch vụ Backend Core
    participant DB as CSDL PostgreSQL
    participant WH as Webhook Gateway

    GV->>CMS: 1. Mở sổ điểm danh lớp & Nhấn [Chỉnh sửa]
    CMS-->>GV: 2. Hiển thị popup điều chỉnh điểm danh
    GV->>CMS: 3. Chọn trạng thái mới & Nhập lý do giải trình
    GV->>CMS: 4. Nhấn [Lưu điều chỉnh]
    activate CMS
    CMS->>BE: 5. PUT /api/v1/attendance/override (student_id, date, new_status, reason, version)
    activate BE

    BE->>BE: 6. Kiểm tra lý do giải trình (độ dài ≥ 10 ký tự)
    alt TH1: Thiếu lý do hoặc lý do quá ngắn
        BE-->>CMS: 7.1. Báo lỗi 400 Bad Request (Thiếu lý do giải trình)
        CMS-->>GV: 7.2. Hiển thị thông báo inline tại ô lý do
    else TH2: Xung đột phiên bản đồng thời (Optimistic Locking)
        BE->>DB: 8.1. UPDATE ... WHERE id = :id AND version = :version
        DB-->>BE: 8.2. Số dòng cập nhật = 0 (Xung đột)
        BE-->>CMS: 8.3. Báo lỗi 409 Conflict (Dữ liệu đã bị thay đổi)
        CMS-->>GV: 8.4. Cảnh báo xung đột và yêu cầu tải lại trang
    else TH3: Cập nhật thành công
        BE->>DB: 9.1. UPDATE ... SET status = :new_status, version = version + 1, ...
        DB-->>BE: 9.2. Cập nhật thành công (1 dòng)
        BE->>DB: 9.3. INSERT INTO audit_log (action = 'MANUAL_ATTENDANCE_OVERRIDE', ...)
        BE->>DB: 9.4. INSERT INTO outbox_events (sự kiện cập nhật)
        BE-)WH: 9.5. Phát sự kiện Webhook đồng bộ ra ngoài
        BE-->>CMS: 9.6. Phản hồi 200 OK
        CMS-->>GV: 9.7. Đóng popup, hiển thị toast "Điều chỉnh thành công"
    end
    deactivate BE
    deactivate CMS
```

---

### 2. PHÂN HỆ 2: ĐỊNH DANH VÀ QUẢN LÝ QUYỀN TRUY CẬP (IAM)

---

#### 2.1. UC-05: Đăng nhập Một lần Tập trung chuẩn SSO và Xác thực Phiên làm việc

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp cơ chế đăng nhập một lần (Single Sign-On - SSO) tập trung chuẩn OAuth 2.0 / OpenID Connect cho cán bộ quản lý giáo dục, hiệu trưởng, giáo viên và nhân viên nhà trường; cấp phát và xác thực phiên làm việc an toàn qua Token JWT có mã hóa RSA 2048-bit.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng có tài khoản đang kích hoạt (`status = ACTIVE`) trên cổng xác thực tập trung SSO; trình duyệt hỗ trợ HTTPS TLS 1.3.
* **Đường dẫn thao tác:** Truy cập URL hệ thống Web CMS mschool → Nhấn [[Đăng nhập bằng SSO]] → Chuyển hướng Cổng xác thực → Nhập thông tin xác thực → Chuyển hướng trở lại mschool.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'USER_LOGIN_SSO'`, `user_id`, `ip_address`, `user_agent`, `status = 'SUCCESS' / 'FAIL'`, `timestamp = NOW()`.
* **Quy định phân quyền:** Toàn bộ người dùng có tài khoản hợp lệ.

##### 2. Màn hình
* **Màn hình Đăng nhập Hệ thống (Default state):** Giao diện đăng nhập hiện đại với thương hiệu mschool, nút bấm nổi bật [[Đăng nhập qua Cổng SSO Giáo Dục]] và form đăng nhập nội bộ dự phòng cho nhân viên bảo vệ.
* **Trạng thái xác thực thất bại (Alert state):** Hiển thị cảnh báo lỗi viền đỏ: "Tài khoản hoặc mật khẩu không chính xác" hoặc "Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ ban quản trị".
* **Thông báo đăng nhập thành công (Toast notification):** Chuyển hướng vào Dashboard, toast thông báo: "Xin chào [Họ_Tên]! Chúc đồng chí một ngày làm việc hiệu quả".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Nút Đăng nhập SSO | Button | INPUT | N/A | • Chuyển hướng sang cổng định danh SSO tập trung (OpenID Connect). |
| 2 | Tên đăng nhập dự phòng | Textbox(50) | INPUT | Để trống | • Áp dụng cho tài khoản bốt bảo vệ không thuộc hệ thống SSO ngành. |
| 3 | Mật khẩu dự phòng | Password(100) | INPUT | Để trống | • Mã hóa RSA 2048-bit trước khi truyền mạng; kiểm tra băm BCrypt. |
| 4 | Mã Token xác thực | Secret String | OUTPUT | Sinh tự động | • Token JWT chứa: `user_id`, `roles`, `permissions`, thời gian sống 8 giờ.<br/>• Lưu phiên vào Redis `session:{user_id}`. |

##### 4. Luồng nghiệp vụ
1. Người dùng mở trình duyệt, truy cập vào cổng Web CMS mschool.
2. Người dùng nhấn nút `[Đăng nhập bằng SSO Giáo Dục]`. Hệ thống chuyển hướng trình duyệt đến máy chủ xác thực SSO tập trung với `client_id` và `redirect_uri` đã đăng ký.
3. Người dùng nhập thông tin tài khoản và hoàn tất xác thực (kèm mã OTP đa yếu tố nếu được cấu hình trên cổng SSO).
4. Máy chủ SSO xác thực thành công và chuyển hướng trình duyệt trở lại mschool kèm mã ủy quyền `authorization_code`.
5. Backend mschool tiếp nhận `authorization_code`, gọi kênh bảo mật trao đổi lấy Token truy cập (`access_token`) và mã định danh người dùng:
   * `TH1 (Tài khoản không tồn tại trong hệ thống mschool hoặc bị khóa `status = SUSPENDED`):` Hệ thống từ chối truy cập, ghi nhật ký cảnh báo và hiển thị thông báo lỗi: *"Tài khoản của bạn chưa được cấp quyền truy cập hệ thống mschool hoặc đang bị tạm khóa"*.
   * `TH2 (Xác thực thành công và tài khoản hợp lệ):`
     * Hệ thống ánh xạ danh sách quyền hạn và vai trò từ cơ sở dữ liệu RBAC.
     * Cấp phát cặp Token JWT (`access_token` có hiệu lực 60 phút, `refresh_token` có hiệu lực 7 ngày).
     * Ghi nhận phiên làm việc vào bộ đệm Redis và ghi nhật ký đăng nhập thành công vào bảng `audit_log`.
     * Chuyển hướng người dùng vào giao diện làm việc tương ứng với vai trò (Hiệu trưởng vào Bảng điều khiển sĩ số toàn trường, Giáo viên vào Sổ đầu bài điện tử, Bảo vệ vào Bàn làm việc Bốt bảo vệ).

###### Sơ đồ tuần tự chức năng Đăng nhập Một lần Tập trung chuẩn SSO

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng (BGH / Giáo viên)
    participant FE as Giao diện Web CMS
    participant BE as Backend IAM mschool
    participant SSO as Cổng Xác thực SSO Tập trung
    participant REDIS as Bộ đệm Caching Redis
    participant DB as CSDL PostgreSQL

    U->>FE: 1. Truy cập Web CMS & Nhấn [Đăng nhập SSO]
    FE->>SSO: 2. Chuyển hướng trình duyệt sang SSO (OAuth 2.0)
    U->>SSO: 3. Nhập tài khoản, mật khẩu & Xác thực OTP
    SSO-->>FE: 4. Chuyển hướng về mschool kèm authorization_code
    FE->>BE: 5. POST /api/v1/auth/sso/callback (authorization_code)
    activate BE
    BE->>SSO: 6. Giao dịch Back-channel đổi code lấy access_token
    SSO-->>BE: 7. Trả về thông tin định danh người dùng
    BE->>DB: 8. SELECT * FROM users WHERE sso_id = :id AND status = 'ACTIVE'
    DB-->>BE: 9. Thông tin người dùng & Danh sách vai trò RBAC

    BE->>REDIS: 10. Lưu phiên làm việc JWT vào Redis Cache
    BE->>DB: 11. Ghi nhật ký đăng nhập thành công vào audit_log
    BE-->>FE: 12. Trả về Token JWT (Access Token & Refresh Token)
    deactivate BE
    FE-->>U: 13. Chuyển hướng vào màn hình làm việc tương ứng vai trò
```

---

#### 2.2. UC-06: Quản lý Tài khoản Người dùng Toàn trường

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp công cụ quản trị vòng đời tài khoản toàn diện cho Quản trị viên hệ thống: tạo mới, chỉnh sửa thông tin, phân quyền, khóa/mở khóa tài khoản và thiết lập lại mật khẩu cho các nhóm đối tượng (Ban giám hiệu, Giáo viên, Giám thị, Nhân viên bảo vệ, Phụ huynh).
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng đăng nhập tài khoản có vai trò Quản trị viên hệ thống (`role = ADMIN`).
* **Đường dẫn thao tác:** Đăng nhập Web CMS → Menu "Quản trị Hệ thống" → "Tài khoản người dùng" → Màn hình danh sách người dùng.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'USER_CREATE' / 'USER_UPDATE' / 'USER_LOCK'`, `target_user_id`, `changed_fields`, `performed_by`, `timestamp = NOW()`.
* **Quy định phân quyền:** Quản trị viên hệ thống cấp cao (System Admin).

##### 2. Màn hình
* **Màn hình Danh sách Người dùng (Default state):** Bảng danh sách gồm các cột: Tên đăng nhập, Họ và tên, Email, Số điện thoại, Vai trò (Badge màu), Trạng thái (Hoạt động / Bị khóa), Ngày tạo và Cột Thao tác.
* **Hộp thoại Thêm mới / Cập nhật Tài khoản (Modal state):** Form nhập thông tin cá nhân, phân quyền vai trò, chọn lớp học quản lý (đối với giáo viên chủ nhiệm).
* **Hộp thoại Khóa / Mở khóa Tài khoản (Confirm Popup):** Hiển thị cảnh báo: "Đồng chí có chắc chắn muốn khóa tài khoản [Tên_Đăng_Nhập]? Người dùng này sẽ lập tức bị đăng xuất khỏi hệ thống".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Tên đăng nhập * | Textbox(50) | INPUT | Để trống | • Duy nhất toàn hệ thống, chỉ chứa chữ cái và số.<br/>• Lưu vào `users.username`. |
| 2 | Họ và tên * | Textbox(100) | INPUT | Để trống | • Chuẩn hóa viết hoa chữ cái đầu `users.full_name`. |
| 3 | Email liên hệ * | Textbox(100) | INPUT | Để trống | • Định dạng email hợp lệ; duy nhất `users.email`. |
| 4 | Số điện thoại * | Textbox(15) | INPUT | Để trống | • 10 chữ số di động `users.phone_number`. |
| 5 | Vai trò người dùng * | Dropdown | INPUT | Để trống | • Giá trị: "BAN_GIAM_HIEU", "GIAO_VIEN", "BAO_VE", "QUAN_TRI_VIEN". |
| 6 | Trạng thái tài khoản | Radio | INPUT | "HOẠT ĐỘNG" | • `ACTIVE` (Hoạt động), `LOCKED` (Bị khóa). |
| 7 | Nút Khóa / Mở khóa | Button | INPUT | N/A | • Đổi trạng thái tài khoản và hủy phiên Redis ngay lập tức. |

##### 4. Luồng nghiệp vụ
1. Quản trị viên truy cập menu "Quản trị Hệ thống" → "Tài khoản người dùng".
2. Hệ thống hiển thị danh sách người dùng toàn trường với phân trang và bộ lọc tìm kiếm.
3. Quản trị viên nhấn [[Thêm mới tài khoản]] và điền thông tin biểu mẫu.
4. Quản trị viên nhấn button `[Lưu lại]`:
   * `TH1 (Trùng tên đăng nhập hoặc email):` Hệ thống kiểm tra bảng `users`; nếu trùng lặp, báo lỗi 409 Conflict: *"Tên đăng nhập hoặc email [Giá_Trị] đã tồn tại trong hệ thống"*.
   * `TH2 (Dữ liệu hợp lệ):` Hệ thống tạo bản ghi mới trong bảng `users`, mã hóa mật khẩu khởi tạo bằng thuật toán BCrypt với hệ số muối cost = 12, gán vai trò trong bảng `user_roles`, ghi nhật ký kiểm toán và gửi email thông tin đăng nhập ban đầu cho người dùng.
5. **Trường hợp Khóa tài khoản:** Quản trị viên nhấn nút Khóa trên dòng tài khoản và xác nhận trong popup. Hệ thống cập nhật `status = 'LOCKED'` trong CSDL và lập tức xóa key phiên làm việc trên Redis `session:{user_id}`, buộc người dùng phải đăng xuất tức thì khỏi toàn bộ các thiết bị.

###### Sơ đồ tuần tự chức năng Quản lý Tài khoản Người dùng

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên
    participant CMS as Web CMS Quản trị
    participant BE as Backend IAM
    participant REDIS as Redis Cache
    participant DB as CSDL PostgreSQL

    AD->>CMS: 1. Nhập thông tin tài khoản mới & Nhấn [Lưu lại]
    activate CMS
    CMS->>BE: 2. POST /api/v1/users (thông tin tài khoản)
    activate BE
    BE->>DB: 3. Kiểm tra trùng lặp username & email
    alt TH1: Trùng tên đăng nhập hoặc email
        DB-->>BE: 4.1. Đã tồn tại bản ghi
        BE-->>CMS: 4.2. Báo lỗi 409 Conflict (Trùng thông tin)
        CMS-->>AD: 4.3. Hiển thị thông báo lỗi inline
    else TH2: Thông tin hợp lệ
        BE->>DB: 5.1. INSERT INTO users (mật khẩu băm BCrypt)
        BE->>DB: 5.2. INSERT INTO user_roles (gán vai trò RBAC)
        BE->>DB: 5.3. INSERT INTO audit_log (action = 'USER_CREATE')
        BE-->>CMS: 5.4. Trả kết quả 201 Created
        CMS-->>AD: 5.5. Đóng form, hiển thị toast "Tạo tài khoản thành công"
    end
    deactivate BE
    deactivate CMS
```

---

#### 2.3. UC-07: Phân quyền Vai trò Người dùng chuẩn RBAC

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Thiết lập ma trận phân quyền chi tiết (Role-Based Access Control - RBAC) tới từng phân hệ, từng màn hình và từng quyền thao tác cụ thể (Xem, Thêm, Sửa, Xóa, Xuất dữ liệu, Phê duyệt, Khóa); bảo đảm tuân thủ nghiêm ngặt nguyên tắc đặc quyền tối thiểu.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Quản trị viên hệ thống đã đăng nhập và có đặc quyền quản trị an ninh.
* **Đường dẫn thao tác:** Web CMS → "Quản trị Hệ thống" → "Phân quyền vai trò (RBAC)" → Chọn vai trò → Ma trận quyền.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'RBAC_PERMISSION_UPDATE'`, `role_id`, `added_permissions`, `removed_permissions`, `updated_by`.
* **Quy định phân quyền:** Duy nhất vai trò Quản trị viên hệ thống (System Admin).

##### 2. Màn hình
* **Màn hình Ma trận Phân quyền (Default state):** Hiển thị danh sách vai trò bên trái; bên phải là ma trận cây chức năng theo dạng lưới checkbox với các cột: Tên chức năng / Màn hình, Xem (Read), Thêm mới (Create), Chỉnh sửa (Update), Xóa (Delete), Xuất Excel (Export), Phê duyệt (Approve).
* **Hộp thoại xác nhận thay đổi quyền (Confirm Popup):** Hiển thị danh sách các quyền vừa được thêm hoặc thu hồi kèm nút [[Xác nhận cập nhật]].
* **Thông báo phản hồi (Toast notification):** Toast xanh: "Cập nhật phân quyền cho vai trò [Tên_Vai_Trò] thành công. Quyền mới sẽ có hiệu lực trong phiên đăng nhập tiếp theo".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Danh sách vai trò | List Select | INPUT | "GIÁO VIÊN" | • Chọn vai trò cần cấu hình: BGH, Giáo viên, Bảo vệ, Phụ huynh. |
| 2 | Checkbox Xem (Read) | Checkbox | INPUT | Theo cấu hình | • Cho phép xem màn hình và danh sách dữ liệu. |
| 3 | Checkbox Thêm mới (Create) | Checkbox | INPUT | Theo cấu hình | • Cho phép tạo mới hồ sơ học sinh, đăng ký khách, tạo lịch. |
| 4 | Checkbox Chỉnh sửa (Update) | Checkbox | INPUT | Theo cấu hình | • Cho phép sửa thông tin, điều chỉnh điểm danh Maker-Checker. |
| 5 | Checkbox Xóa (Delete) | Checkbox | INPUT | Theo cấu hình | • Cho phép xóa mềm bản ghi dữ liệu (`is_deleted = TRUE`). |
| 6 | Checkbox Phê duyệt (Approve) | Checkbox | INPUT | Theo cấu hình | • Cho phép phê duyệt đơn nghỉ phép, chốt sổ đầu bài điện tử. |
| 7 | Nút Lưu cấu hình quyền | Button | INPUT | N/A | • Cập nhật bảng `role_permissions` và xóa bộ nhớ đệm quyền trên Redis. |

##### 4. Luồng nghiệp vụ
1. Quản trị viên truy cập "Quản trị Hệ thống" → "Phân quyền vai trò (RBAC)".
2. Quản trị viên chọn vai trò cần cấu hình từ danh sách (ví dụ: vai trò `GIAO_VIEN`).
3. Hệ thống tải cây ma trận phân quyền hiện tại của vai trò được chọn từ cơ sở dữ liệu.
4. Quản trị viên thực hiện tích chọn hoặc bỏ chọn các ô quyền tương ứng trên từng dòng chức năng.
5. Quản trị viên nhấn button `[Lưu cấu hình quyền]`:
   * Hệ thống hiển thị popup tóm tắt danh sách quyền thay đổi (ví dụ: cấp thêm quyền "Phê duyệt Sổ đầu bài", thu hồi quyền "Xóa hồ sơ sinh trắc học").
   * Quản trị viên nhấn `[Xác nhận]`:
     * Hệ thống thực hiện cập nhật bảng liên kết `role_permissions` trong một phiên giao dịch CSDL nguyên tử.
     * Xóa sạch bộ đệm phân quyền trên Redis `cache:permissions:{role_id}` để ép hệ thống tải lại ma trận quyền mới nhất trong các yêu cầu gọi API tiếp theo.
     * Ghi nhận hành vi vào bảng `audit_log`.
     * Hiển thị toast thông báo: *"Cập nhật phân quyền vai trò thành công"*.

###### Sơ đồ tuần tự chức năng Phân quyền Vai trò Người dùng chuẩn RBAC

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên
    participant CMS as Web CMS Quản trị
    participant BE as Backend IAM
    participant REDIS as Redis Cache
    participant DB as CSDL PostgreSQL

    AD->>CMS: 1. Chọn vai trò & Thay đổi ma trận checkbox quyền
    AD->>CMS: 2. Nhấn [Lưu cấu hình quyền]
    CMS-->>AD: 3. Hiển thị popup tóm tắt quyền thay đổi
    AD->>CMS: 4. Nhấn [Xác nhận cập nhật]
    activate CMS
    CMS->>BE: 5. PUT /api/v1/roles/:id/permissions (danh sách quyền mới)
    activate BE
    BE->>DB: 6. Giao dịch nguyên tử cập nhật bảng role_permissions
    BE->>REDIS: 7. Xóa key cache phân quyền cache:permissions:{role_id}
    BE->>DB: 8. INSERT INTO audit_log (action = 'RBAC_PERMISSION_UPDATE')
    BE-->>CMS: 9. Phản hồi 200 OK
    deactivate BE
    CMS-->>AD: 10. Đóng popup, hiển thị toast "Cập nhật phân quyền thành công"
    deactivate CMS
```

---

#### 2.4. UC-08: Quản lý Thẻ đón con Điện tử và Mã QR Động

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp giải pháp Thẻ đón con điện tử an toàn cho phụ huynh học sinh; cấp phát mã định danh dạng mã QR động có gắn thời hạn hiệu lực (TTL 60 giây) hiển thị trên Cổng tra cứu Web của phụ huynh hoặc gửi qua Webhook/Zalo ZNS; nhân viên bảo vệ quét mã QR tại bốt cổng để xác minh chính xác mối quan hệ thân nhân và mở làn đón học sinh.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Hồ sơ phụ huynh đã được liên kết và xác minh quan hệ với học sinh (`is_verified = TRUE`); học sinh đã có trạng thái đến trường trong phiên ngày (`status = PRESENT`).
* **Đường dẫn thao tác:** Phụ huynh truy cập Cổng tra cứu Web → Chọn con cần đón → Nhấn [[Lấy mã đón con]]; Bảo vệ quét mã tại màn hình Bốt bảo vệ cổng.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'PICKUP_QR_VERIFY'`, `parent_id`, `student_id`, `gate_id`, `guard_id`, `status = 'APPROVED' / 'REJECT'`, `timestamp = NOW()`.
* **Quy định phân quyền:** Phụ huynh học sinh (tạo mã), Nhân viên bảo vệ cổng (quét xác minh).

##### 2. Màn hình
* **Màn hình Cổng Tra cứu Phụ huynh (Default state):** Thẻ thông tin học sinh, trạng thái hiện tại "Đang trong lớp học", nút bấm lớn [[Tạo mã QR đón con]].
* **Màn hình Mã QR Đón con Động (Active state):** Hiển thị mã QR động khổ lớn, đồng hồ đếm ngược thời gian hiệu lực 60 giây (vòng tròn thanh tiến trình), ảnh thẻ học sinh và tên người đón được cấp phép.
* **Màn hình Bốt Bảo vệ khi quét mã QR (Scanner state):** Giao diện quét mã camera; khi quét trúng mã hợp lệ, hiển thị khung viền xanh lá, âm thanh xác nhận "Bíp", thông tin đối chiếu khớp 100%: Ảnh phụ huynh, Ảnh học sinh, Lớp học, Tên người đón hợp pháp.

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Mã định danh học sinh | Label | OUTPUT | Tự động | • Mã học sinh `students.student_code`. |
| 2 | Mã QR Đón con Động | QR Code Graphic | OUTPUT | Sinh động | • Chuỗi mã hóa AES-256 chứa: `student_id`, `parent_id`, `timestamp`, `nonce`.<br/>• Thời gian sống TTL 60 giây, tự động làm mới mã mới. |
| 3 | Đồng hồ đếm ngược | Countdown Timer | OUTPUT | "60s" | • Đếm ngược từ 60 về 0 giây; hết giờ tự động tạo lại mã mới. |
| 4 | Máy quét mã QR bốt bảo vệ | Camera Scanner | INPUT | Quét tự động | • Đầu đọc mã QR 2D chuyên dụng hoặc webcam bốt bảo vệ. |
| 5 | Nút Xác nhận Mở làn | Button | INPUT | N/A | • Bảo vệ nhấn xác nhận cho học sinh ra về sau khi kiểm tra trực quan. |

##### 4. Luồng nghiệp vụ
1. Phụ huynh đến trường đón con lúc tan học, mở Cổng Tra cứu Web trên thiết bị cá nhân → Nhấn button `[Lấy mã QR đón con]`.
2. Hệ thống tạo mã QR động: kết hợp `parent_id`, `student_id`, mốc thời gian hiện tại và số ngẫu nhiên `nonce`, ký số bằng thuật toán HMAC-SHA256, hiển thị mã QR kèm đồng hồ đếm ngược 60 giây.
3. Phụ huynh đưa mã QR trước đầu quét của bốt bảo vệ cổng trường.
4. Máy quét bốt bảo vệ đọc mã và gửi chuỗi dữ liệu lên backend xác thực qua API `/api/v1/pickup/verify`:
   * `TH1 (Mã QR hết hạn hiệu lực > 60 giây hoặc chữ ký số bị sai lệch):` Hệ thống phát âm thanh cảnh báo lỗi viền đỏ, hiển thị thông báo: *"Mã QR đón con đã hết hạn hoặc không hợp lệ. Đề nghị phụ huynh mở lại mã mới"*.
   * `TH2 (Mối quan hệ đón con chưa được phê duyệt hoặc người đón không đúng hồ sơ):` Hệ thống hiển thị cảnh báo viền vàng, yêu cầu bảo vệ kiểm tra giấy tờ tùy thân trực tiếp.
   * `TH3 (Mã QR hợp lệ 100%):`
     * Hệ thống hiển thị ngay tức khắc trên màn hình bốt bảo vệ: Ảnh học sinh, Ảnh phụ huynh hợp pháp, Tên lớp, Họ tên giáo viên chủ nhiệm.
     * Nhân viên bảo vệ kiểm tra đối chiếu trực quan và nhấn nút `[Xác nhận mở làn đón con]`.
     * Hệ thống cập nhật bảng `daily_attendance_sessions`: chốt trạng thái `COMPLETED` (Đã đón con về an toàn), ghi nhận thời gian ra cổng `check_out_time = NOW()`.
     * Tạo sự kiện Webhook gửi thông báo tức thời sang hệ thống quản lý trường và gửi SMS xác nhận đến số điện thoại của cả bố và mẹ học sinh: *"Học sinh [Họ_Tên] đã được phụ huynh đón về an toàn lúc [Thời_Gian]"*.

###### Sơ đồ tuần tự chức năng Quản lý Thẻ đón con Điện tử và Mã QR Động

```mermaid
sequenceDiagram
    autonumber
    actor PH as Phụ huynh Học sinh
    participant WEB as Cổng Tra cứu Web Phụ huynh
    actor BV as Nhân viên Bảo vệ
    participant SCAN as Đầu đọc Mã QR Bốt Bảo vệ
    participant BE as Backend Nghiệp vụ
    participant DB as CSDL PostgreSQL
    participant WH as Động cơ Webhook & SMS

    PH->>WEB: 1. Nhấn [Lấy mã QR đón con]
    activate WEB
    WEB->>BE: 2. POST /api/v1/pickup/generate-qr (student_id)
    activate BE
    BE->>BE: 3. Ký số HMAC-SHA256 tạo mã động (TTL = 60s)
    BE-->>WEB: 4. Trả về chuỗi QR Token động
    deactivate BE
    WEB-->>PH: 5. Hiển thị mã QR đếm ngược 60 giây
    deactivate WEB

    PH->>SCAN: 6. Đưa mã QR trước đầu quét tại bốt bảo vệ
    activate SCAN
    SCAN->>BE: 7. POST /api/v1/pickup/verify (qr_token)
    activate BE
    BE->>BE: 8. Giải mã & Thẩm tra chữ ký HMAC và mốc thời gian

    alt TH1: Mã QR hết hạn (> 60s) hoặc bị giả mạo
        BE-->>SCAN: 9.1. Báo lỗi 400 Bad Request (Mã hết hạn)
        SCAN-->>BV: 9.2. Cảnh báo viền đỏ "Mã QR không hợp lệ"
    else TH3: Mã QR hợp lệ 100%
        BE->>DB: 10.1. Truy vấn thông tin học sinh & Thân nhân hợp pháp
        DB-->>BE: 10.2. Trả về ảnh đối chiếu & Lớp học
        BE-->>SCAN: 10.3. Hiển thị ảnh học sinh & phụ huynh khớp 100%
        BV->>SCAN: 11. Đối chiếu trực quan & Nhấn [Xác nhận mở làn]
        SCAN->>BE: 12. POST /api/v1/pickup/confirm (student_id)
        BE->>DB: 13.1. UPDATE daily_attendance_sessions SET status = 'COMPLETED'
        BE->>DB: 13.2. INSERT INTO outbox_events (sự kiện đón con)
        BE-)WH: 13.3. Phát Webhook & Gửi SMS xác nhận đến phụ huynh (< 2s)
        BE-->>SCAN: 13.4. Xác nhận hoàn tất mở cổng
    end
    deactivate BE
    deactivate SCAN
```


---

### 3. PHÂN HỆ 3: QUẢN TRỊ HỆ THỐNG, THIẾT BỊ BIÊN VÀ GIÁM SÁT

---

#### 3.1. UC-09: Quản trị Thiết bị Camera IP và Thiết lập Tọa độ Vạch ảo Tripwire

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cho phép Quản trị viên kỹ thuật cấu hình danh mục thiết bị Camera IP lắp đặt tại cổng trường và 50 phòng học; quản lý thông số kết nối (địa chỉ IP tĩnh, cổng RTSP, tài khoản kết nối đã mã hóa an toàn); thiết lập giao diện vẽ tọa độ vạch ranh giới ảo Tripwire hai chiều trực tiếp trên khung hình video để phục vụ thuật toán xác định hướng di chuyển Vào / Ra.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng có vai trò Quản trị viên hệ thống; camera đã được cấp nguồn PoE và gán địa chỉ IP trong dải VLAN 20.
* **Đường dẫn thao tác:** Web CMS → "Quản trị Thiết bị" → "Danh mục Camera IP" → Chọn camera → Nhấn [[Cấu hình vạch ảo Tripwire]].
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'CAMERA_CONFIG_UPDATE'`, `camera_id`, `ip_address`, `tripwire_coordinates`, `updated_by`, `timestamp = NOW()`.
* **Quy định phân quyền:** Quản trị viên hệ thống (System Admin).

##### 2. Màn hình
* **Màn hình Danh sách Camera IP (Default state):** Bảng danh sách thiết bị hiển thị: Tên camera, Vị trí lắp đặt (Cổng 1, Phòng 10A1), Địa chỉ IP, Trạng thái kết nối (Badge xanh "Đang hoạt động" / Badge đỏ "Mất tín hiệu"), Tốc độ khung hình (FPS) và Cột thao tác.
* **Màn hình Cấu hình Vạch ảo Không gian (Interactive Canvas Modal):** Hiển thị khung hình video trực tiếp từ camera, thanh công cụ vẽ: [[Vẽ vạch ranh giới]], [[Đổi chiều mũi tên Vào/Ra]], [[Thiết lập vùng loại trừ]], nút [[Lưu cấu hình]].
* **Thông báo phản hồi (Toast notification):** Toast xanh: "Cập nhật tọa độ vạch ảo Tripwire thành công. Cấu hình đã được đồng bộ tức thời sang tiến trình Ingestion Worker".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Tên Camera IP * | Textbox(100) | INPUT | Để trống | • Đặt tên gợi nhớ: "Camera Cổng Chính 01", "Camera Lớp 12A1".<br/>• Lưu vào `camera_devices.device_name`. |
| 2 | Địa chỉ IP tĩnh * | Textbox(20) | INPUT | "10.60.20.x" | • Định dạng IPv4 chuẩn trong dải VLAN Camera IP.<br/>• Lưu vào `camera_devices.ip_address`. |
| 3 | Đường dẫn RTSP * | Textbox(255) | INPUT | Để trống | • Chuỗi kết nối luồng RTSP (ví dụ: `rtsp://admin:pass@10.60.20.10:554/h264`). |
| 4 | Phân loại vị trí * | Dropdown | INPUT | "CỔNG TRƯỜNG" | • Giá trị: "CỔNG TRƯỜNG", "LỚP HỌC", "NHÀ XE", "HÀNH LANG". |
| 5 | Tọa độ Vạch ảo (X1, Y1) | Number Pair | INPUT | (0, 0) | • Tọa độ điểm bắt đầu của vạch ranh giới trên khung hình camera. |
| 6 | Tọa độ Vạch ảo (X2, Y2) | Number Pair | INPUT | (0, 0) | • Tọa độ điểm kết thúc của vạch ranh giới trên khung hình camera. |
| 7 | Hướng quy định Vào (IN) | Angle / Vector | INPUT | 90° | • Hướng vector chỉ định đối tượng vượt vạch được tính là Vào trường. |
| 8 | Nút Lưu cấu hình | Button | INPUT | N/A | • Lưu vào CSDL và phát thông điệp cập nhật qua Redis Pub/Sub. |

##### 4. Luồng nghiệp vụ
1. Quản trị viên truy cập Web CMS → "Quản trị Thiết bị" → "Danh mục Camera IP".
2. Quản trị viên chọn camera cổng cần hiệu chỉnh → Nhấn button `[Cấu hình vạch ảo Tripwire]`.
3. Hệ thống mở màn hình Canvas tương tác, trích xuất 1 khung hình chụp thực tế từ luồng RTSP của camera làm nền.
4. Quản trị viên dùng chuột kéo thả một đoạn thẳng phân định ranh giới cổng trường, chọn hướng mũi tên chỉ chiều di chuyển Vào (Inbound) và Ra (Outbound).
5. Quản trị viên nhấn button `[Lưu cấu hình]`:
   * Hệ thống kiểm tra tọa độ đoạn thẳng: đảm bảo độ dài vạch tối thiểu 100 pixel và nằm trọn trong khung hình video.
   * `TH1 (Tọa độ không hợp lệ):` Báo lỗi inline: *"Đoạn thẳng phân định quá ngắn hoặc nằm ngoài khung hình. Vui lòng vẽ lại"*.
   * `TH2 (Tọa độ hợp lệ):`
     * Hệ thống lưu cặp tọa độ `(x1, y1), (x2, y2)` và vector chỉ hướng vào bảng `camera_devices`.
     * Cổng quản trị phát thông điệp nóng lên kênh Redis Pub/Sub (`mschool:config:camera`).
     * Tiến trình `camera-worker` đang giám sát camera này tiếp nhận thông điệp, nạp lại tọa độ vạch ảo mới trong bộ nhớ RAM trong thời gian dưới 100ms mà không làm gián đoạn luồng video.
     * Ghi nhật ký vào `audit_log`, hiển thị toast thông báo cập nhật thành công.

###### Sơ đồ tuần tự chức năng Quản trị Camera IP và Thiết lập Vạch ảo Tripwire

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên
    participant CMS as Web CMS Quản trị
    participant BE as Backend Nghiệp vụ
    participant REDIS as Kênh Redis Pub/Sub
    participant WRK as Ingestion Worker
    participant DB as CSDL PostgreSQL

    AD->>CMS: 1. Kéo thả đoạn thẳng vạch ảo & Chọn hướng mũi tên
    AD->>CMS: 2. Nhấn [Lưu cấu hình]
    activate CMS
    CMS->>BE: 3. PUT /api/v1/cameras/:id/tripwire (tọa độ x1,y1,x2,y2, vector)
    activate BE
    BE->>DB: 4. UPDATE camera_devices SET tripwire_config = :config
    BE->>DB: 5. INSERT INTO audit_log (action = 'CAMERA_CONFIG_UPDATE')
    BE->>REDIS: 6. PUBLISH mschool:config:camera {camera_id, coordinates}
    activate REDIS
    REDIS-)WRK: 7. Gửi sự kiện cập nhật cấu hình nóng (Hot-Reload)
    deactivate REDIS
    activate WRK
    WRK->>WRK: 8. Nạp lại tọa độ vạch ảo trong RAM (< 100ms)
    deactivate WRK
    BE-->>CMS: 9. Phản hồi 200 OK
    deactivate BE
    CMS-->>AD: 10. Hiển thị toast "Cập nhật vạch ảo thành công"
    deactivate CMS
```

---

#### 3.2. UC-10: Màn hình Giám sát Bốt Bảo vệ và Cảnh báo An ninh Người lạ

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp bàn làm việc chuyên biệt (Guard Desk Portal) tối ưu cho nhân viên bảo vệ tại bốt cổng trường: giám sát đồng thời luồng video trực tiếp từ camera cổng, theo dõi danh sách học sinh vừa quét thẻ thành công, phát hiện và phát cảnh báo âm thanh/viền đỏ tức thời khi có người lạ lọt vào tầm quét, tiếp đón phụ huynh đến đón con và phê duyệt khách thăm nhanh.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Nhân viên bảo vệ đăng nhập tài khoản vai trò `role = BAO_VE`; màn hình cảm ứng Kiosk tại bốt kết nối mạng LAN nội bộ.
* **Đường dẫn thao tác:** Đăng nhập hệ thống → Màn hình tự động chuyển hướng mặc định vào "Bàn làm việc Bốt Bảo vệ".
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'STRANGER_ALERT_ACK'`, `stranger_id`, `guard_id`, `action_taken = 'VERIFIED' / 'REJECTED'`, `timestamp = NOW()`.
* **Quy định phân quyền:** Nhân viên bảo vệ, Giám thị học đường, Ban giám hiệu.

##### 2. Màn hình
* **Màn hình Bàn làm việc Bốt Bảo vệ (Default state):** Giao diện chia 3 cột:
  * Cột trái: 2 khung video trực tiếp từ Camera Cổng Chính 1 và Cổng Phụ 2.
  * Cột giữa: Danh sách luồng thẻ động (Live Feed) học sinh vừa qua cổng hiển thị ảnh cắt khuôn mặt, họ tên, lớp học và mốc giờ.
  * Cột phải: Danh mục tác vụ nhanh: [[Đăng ký khách nhanh]], [[Quét mã QR đón con]], [[Danh sách phụ huynh chờ]].
* **Trạng thái Cảnh báo Người lạ (Alert state):** Khung viền camera chuyển màu đỏ nhấp nháy, phát âm thanh cảnh báo "Cảnh báo an ninh: Phát hiện đối tượng chưa đăng ký", hiển thị hộp thoại cận cảnh khuôn mặt người lạ kèm mốc thời gian và 2 nút thao tác nhanh: [[Đã kiểm tra - Cho vào]], [[Từ chối tiếp cận]].
* **Thông báo phản hồi (Toast notification):** Toast vàng: "Đã xử lý cảnh báo người lạ lúc [Thời_Gian]".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Khung Video Trực tiếp | Video Component | OUTPUT | RTSP WebRTC | • Luồng video hiển thị độ trễ siêu thấp dưới 300ms. |
| 2 | Live Feed Học sinh qua cổng | Card List | OUTPUT | Danh sách rỗng | • Cập nhật tự động qua WebSocket; hiển thị tối đa 30 lượt gần nhất. |
| 3 | Hộp thoại Cảnh báo Người lạ | Modal Alert | OUTPUT | Ẩn mặc định | • Tự động bật lên khi nhận sự kiện `STRANGER_DETECTED` từ AI. |
| 4 | Nút Đã kiểm tra - Cho vào | Button | INPUT | N/A | • Bảo vệ xác nhận đối tượng đã được kiểm tra giấy tờ hợp lệ. |
| 5 | Nút Từ chối tiếp cận | Button | INPUT | N/A | • Ghi nhận từ chối và kích hoạt cảnh báo an ninh nâng cao. |
| 6 | Ghi chú xử lý bảo vệ | Textbox(200) | INPUT | Để trống | • Nhập ghi chú vắn tắt của bảo vệ khi xử lý người lạ. |

##### 4. Luồng nghiệp vụ
1. Nhân viên bảo vệ trực tại bốt cổng mở màn hình Kiosk Bốt bảo vệ.
2. Hệ thống thiết lập kết nối WebSocket với backend mschool, duy trì cập nhật luồng sự kiện thời gian thực.
3. Khi có người qua cổng không khớp với bất kỳ vector nào trong danh mục học sinh, giáo viên hay khách hợp lệ (độ tương đồng < 0.72):
   * Động cơ AI tự động cắt ảnh khuôn mặt người lạ, gửi sự kiện `STRANGER_DETECTED` lên backend.
   * Backend lưu bản ghi vào bảng `stranger_access_logs` và bắn thông điệp WebSocket tức thời tới màn hình bốt bảo vệ.
   * Màn hình bốt bảo vệ lập tức chuyển viền đỏ, kích hoạt âm thanh cảnh báo và mở hộp thoại hiển thị ảnh chụp người lạ.
4. Nhân viên bảo vệ tiếp cận đối tượng tại cổng để kiểm tra:
   * `TH1 (Khách liên hệ công tác hoặc phụ huynh đón con):` Bảo vệ nhấn nút `[Đăng ký khách nhanh]`, hệ thống mở form chuyển sang quy trình UC-03 cấp quyền vào trường.
   * `TH2 (Đối tượng lạ không có phận sự):` Bảo vệ yêu cầu rời khỏi khu vực cổng trường và nhấn nút `[Từ chối tiếp cận]` trên màn hình.
   * `TH3 (Xác nhận an toàn):` Bảo vệ nhấn nút `[Đã kiểm tra - Cho vào]`, nhập ghi chú ngắn gọn.
5. Hệ thống cập nhật trạng thái xử lý trong bảng `stranger_access_logs`: `is_handled = TRUE`, `handled_by = :guard_id`, `handling_note = :note`, `handled_at = NOW()`, tắt cảnh báo âm thanh và lưu vết vào `audit_log`.

###### Sơ đồ tuần tự chức năng Giám sát Bốt Bảo vệ và Cảnh báo An ninh Người lạ

```mermaid
sequenceDiagram
    autonumber
    actor NL as Người lạ qua cổng
    participant CAM as Camera Cổng
    participant AI as Core AI GPU
    participant BE as Backend Core
    participant WS as WebSocket Channel
    actor BV as Nhân viên Bảo vệ
    participant KIOSK as Màn hình Bốt Bảo vệ
    participant DB as CSDL PostgreSQL

    NL->>CAM: 1. Bước qua vùng quét cổng trường
    CAM->>AI: 2. Luồng video & Bóc tách khuôn mặt
    activate AI
    AI->>AI: 3. So khớp RAM không tìm thấy (Cosine < 0.72)
    AI->>BE: 4. POST /api/v1/security/stranger-alert (ảnh cắt, camera_id)
    deactivate AI
    activate BE
    BE->>DB: 5. INSERT INTO stranger_access_logs (ảnh, mốc giờ)
    BE-)WS: 6. Phát sự kiện WebSocket STRANGER_DETECTED
    deactivate BE

    WS-)KIOSK: 7. Bật hộp thoại cảnh báo viền đỏ & Phát âm thanh
    BV->>KIOSK: 8. Kiểm tra thực địa & Nhấn [Đã kiểm tra - Cho vào]
    activate KIOSK
    KIOSK->>BE: 9. POST /api/v1/security/stranger/:id/resolve (ghi chú)
    activate BE
    BE->>DB: 10. UPDATE stranger_access_logs SET is_handled = TRUE
    BE->>DB: 11. INSERT INTO audit_log (action = 'STRANGER_ALERT_ACK')
    BE-->>KIOSK: 12. Phản hồi xử lý thành công
    deactivate BE
    KIOSK-->>BV: 13. Tắt âm thanh cảnh báo, đóng hộp thoại
    deactivate KIOSK
```

---

#### 3.3. UC-11: Nhật ký Kiểm toán Tập trung (Audit Log)

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Tự động ghi nhận và lưu trữ bất biến 100% các hành vi tác động dữ liệu và can thiệp hệ thống (đăng nhập, chỉnh sửa điểm danh Maker-Checker, điều chỉnh cấu hình tham số, cập nhật thời khóa biểu, xuất dữ liệu học sinh); cung cấp công cụ tra cứu, lọc nâng cao và trích xuất dữ liệu kiểm toán phục vụ công tác thanh tra giáo dục và an toàn thông tin.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng đăng nhập tài khoản có vai trò Quản trị viên hệ thống hoặc Ban giám hiệu.
* **Đường dẫn thao tác:** Web CMS → "Quản trị Hệ thống" → "Nhật ký Kiểm toán (Audit Log)" → Danh sách nhật ký.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Chính chức năng này là cơ chế đọc và quản lý dữ liệu kiểm toán; việc truy vấn hoặc xuất dữ liệu kiểm toán cũng được tự động ghi nhận một bản ghi kiểm toán cấp cao `action = 'AUDIT_LOG_EXPORT'`.
* **Quy định phân quyền:** Ban giám hiệu và Quản trị viên hệ thống (chỉ có quyền Xem và Xuất báo cáo, tuyệt đối không có quyền Sửa hoặc Xóa).

##### 2. Màn hình
* **Màn hình Tra cứu Nhật ký Kiểm toán (Default state):** Bộ lọc nâng cao trên cùng (Khoảng thời gian, Hành vi tác động, Người thực hiện, Địa chỉ IP, Phân hệ nghiệp vụ); bảng dữ liệu nhật ký gồm các cột: Mốc thời gian (chính xác đến giây), Tài khoản người dùng, Hành vi, Phân hệ, Địa chỉ IP, Dữ liệu trước thay đổi, Dữ liệu sau thay đổi và Chi tiết.
* **Hộp thoại Xem Chi Tiết Bản Ghi Kiểm Toán (Modal state):** Hiển thị dạng so sánh 2 cột JSON trực quan (Diff Viewer) giữa dữ liệu cũ (`old_value`) và dữ liệu mới (`new_value`) với các trường thay đổi được tô màu vàng nổi bật.
* **Trạng thái không có dữ liệu (Empty state):** Hiển thị thông báo: "Không tìm thấy bản ghi kiểm toán nào thỏa mãn điều kiện lọc".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Khoảng thời gian lọc * | Date Range Picker | INPUT | 7 ngày gần nhất | • Chọn Từ ngày - Đến ngày; tối đa khoảng 90 ngày mỗi lần tra cứu. |
| 2 | Loại hành vi tác động | Dropdown | INPUT | "TẤT CẢ" | • Giá trị: "TẤT CẢ", "ĐĂNG NHẬP", "SỬA ĐIỂM DANH", "CẤU HÌNH", "XUẤT DỮ LIỆU". |
| 3 | Người thực hiện | Autocomplete | INPUT | Để trống | • Lọc theo họ tên hoặc tên đăng nhập `audit_logs.user_id`. |
| 4 | Địa chỉ IP truy cập | Textbox(20) | INPUT | Để trống | • Tìm kiếm theo địa chỉ IP nguồn `audit_logs.ip_address`. |
| 5 | Nút Tra cứu | Button | INPUT | N/A | • Thực thi truy vấn phân trang trên CSDL. |
| 6 | Nút Xuất tệp Excel | Button | INPUT | N/A | • Xuất toàn bộ kết quả lọc ra tệp Excel bảo vệ có mã xác thực. |

##### 4. Luồng nghiệp vụ
1. Quản trị viên truy cập "Quản trị Hệ thống" → "Nhật ký Kiểm toán (Audit Log)".
2. Hệ thống tải mặc định danh sách nhật ký kiểm toán trong 7 ngày gần nhất, sắp xếp theo thứ tự thời gian giảm dần (mới nhất lên đầu).
3. Quản trị viên nhập điều kiện lọc chi tiết (ví dụ: tìm kiếm các hành vi "SỬA ĐIỂM DANH" do giáo viên thực hiện trong tuần qua) → Nhấn button `[Tra cứu]`.
4. Hệ thống truy vấn bảng `audit_logs`:
   * `TH1 (Không tìm thấy bản ghi):` Hiển thị thông báo rỗng: *"Không có dữ liệu nhật ký phù hợp"*.
   * `TH2 (Có dữ liệu phù hợp):` Hiển thị bảng danh sách phân trang (20 bản ghi/trang).
5. Quản trị viên nhấn vào nút `[Xem chi tiết]` trên một bản ghi:
   * Hệ thống hiển thị hộp thoại Diff Viewer so sánh cấu trúc JSON trước và sau can thiệp (ví dụ: trường `status` đổi từ `ABSENT` thành `EXCUSED_ABSENT`, lý do giải trình đính kèm).
6. **Trường hợp xuất dữ liệu:** Quản trị viên nhấn nút `[Xuất tệp Excel]`. Hệ thống kiểm tra quyền, tạo tệp Excel theo định dạng bảo vệ và ghi 1 bản ghi kiểm toán mới: `action = 'AUDIT_LOG_EXPORT'`.

###### Sơ đồ tuần tự chức năng Tra cứu Nhật ký Kiểm toán Tập trung

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên
    participant CMS as Web CMS Quản trị
    participant BE as Backend Core
    participant DB as CSDL PostgreSQL

    AD->>CMS: 1. Nhập điều kiện lọc (Khoảng ngày, Hành vi, Người dùng)
    AD->>CMS: 2. Nhấn [Tra cứu]
    activate CMS
    CMS->>BE: 3. GET /api/v1/audit-logs?from=&to=&action=&user=
    activate BE
    BE->>DB: 4. SELECT * FROM audit_logs WHERE ... ORDER BY timestamp DESC
    DB-->>BE: 5. Trả về danh sách bản ghi kiểm toán
    BE-->>CMS: 6. Dữ liệu phân trang & Thông tin so sánh JSON
    deactivate BE
    CMS-->>AD: 7. Hiển thị bảng nhật ký kiểm toán bất biến
    deactivate CMS

    AD->>CMS: 8. Nhấn [Xem chi tiết bản ghi]
    CMS-->>AD: 9. Hiển thị hộp thoại Diff Viewer so khớp dữ liệu cũ / mới
```

---

#### 3.4. UC-12: Giám sát Hiệu năng Hệ thống và APM (GPU RTX 3060)

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp bảng điều khiển giám sát hiệu năng ứng dụng (APM) và trạng thái tài nguyên phần cứng 24/7 của máy chủ biên `micro-server`: đo lường công suất tính toán GPU NVIDIA RTX 3060, dung lượng VRAM chiếm dụng, nhiệt độ GPU, tải CPU Intel Xeon 32 luồng, bộ nhớ RAM 62GB, thông lượng mạng và trạng thái kết nối của toàn bộ 50 camera IP; tự động phát cảnh báo khi các chỉ số vượt ngưỡng an toàn.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Dịch vụ Prometheus và node_exporter/gpu_exporter đang hoạt động thu thập số liệu trên máy chủ biên.
* **Đường dẫn thao tác:** Web CMS → "Quản trị Hệ thống" → "Giám sát Hiệu năng (APM)" → Bảng điều khiển Grafana nhúng.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Hệ thống tự động ghi nhật ký cảnh báo hạ tầng khi các chỉ số vượt ngưỡng an toàn `action = 'SYSTEM_RESOURCE_ALERT'`, `metric_name`, `current_value`, `threshold`.
* **Quy định phân quyền:** Quản trị viên hệ thống cấp cao và Đội ngũ kỹ sư vận hành.

##### 2. Màn hình
* **Màn hình Giám sát Hiệu năng Tổng thể (Default state):** Hiển thị 6 khối thẻ thông số lớn:
  * Thẻ GPU Load: Đồng hồ đo phần trăm (%) tải tính toán GPU (ngưỡng an toàn < 70%).
  * Thẻ VRAM Usage: Dung lượng VRAM chiếm dụng (ví dụ: 1.5 GB / 12 GB - 12.5%).
  * Thẻ GPU Temp: Nhiệt độ card đồ họa (ví dụ: 54°C - ngưỡng an toàn < 75°C).
  * Thẻ CPU Load: Tỷ lệ tải CPU 32 luồng (ngưỡng an toàn < 50%).
  * Thẻ RAM Usage: Dung lượng RAM sử dụng (ví dụ: 28 GB / 62 GB).
  * Thẻ Camera Health: 52/52 Camera IP trực tuyến (100% xanh).
* **Trạng thái Cảnh báo Tài nguyên Vượt ngưỡng (Alert state):** Khối thẻ chuyển sang màu cam (Cảnh báo) hoặc màu đỏ (Nguy hiểm) khi GPU vượt 85% hoặc nhiệt độ vượt 80°C.
* **Biểu đồ chuỗi thời gian (Time-series Charts):** Biểu đồ đường biến thiên tải trọng 24 giờ qua theo từng khung thời gian 5 phút.

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Tỷ lệ tải GPU (%) | Gauge Component | OUTPUT | 0% | • Tải tính toán GPU NVIDIA RTX 3060; cảnh báo khi > 80%. |
| 2 | Dung lượng VRAM | Number (GB) | OUTPUT | 1.5 GB | • Chiếm dụng bộ nhớ đồ họa; định mức chuẩn 1.5GB / 12GB. |
| 3 | Nhiệt độ GPU (°C) | Gauge Component | OUTPUT | 50°C | • Nhiệt độ cảm biến GPU; cảnh báo quạt tản nhiệt khi > 75°C. |
| 4 | Tải CPU (%) | Gauge Component | OUTPUT | 20% | • Tải xử lý CPU Xeon 32 luồng; định mức 20% - 35%. |
| 5 | Tình trạng Camera IP | Status Matrix | OUTPUT | 52 Nodes | • Trạng thái nhịp tim (Heartbeat) của 2 camera cổng và 50 phòng học. |
| 6 | Độ trễ suy luận AI | Number (ms) | OUTPUT | 25ms | • Thời gian xử lý trung bình chuỗi Detect + ArcFace + Matching. |

##### 4. Luồng nghiệp vụ
1. Tiến trình thu thập số liệu `prometheus` định kỳ mỗi 5 giây thu thập các chỉ số phần cứng qua `nvidia-smi` và `node_exporter`.
2. Giao diện Web CMS nhúng bảng điều khiển APM Grafana hiển thị trực quan các biểu đồ chuỗi thời gian.
3. Quản trị viên theo dõi trạng thái vận hành trong giờ cao điểm đón học sinh buổi sáng (06h30 - 07h30):
   * `TH1 (Toàn bộ chỉ số trong ngưỡng định mức an toàn):`
     * Tải GPU duy trì trong khoảng 35% – 50%, VRAM chiếm 1.5GB / 12GB, nhiệt độ ổn định 55°C, 52/52 Camera IP truyền luồng đều đặn ở tốc độ FPS ≥ 20.
     * Hệ thống hiển thị toàn bộ thẻ trạng thái màu xanh lá (HEALTHY).
   * `TH2 (Một camera IP phòng học bị mất tín hiệu kết nối):`
     * RTSP Watchdog phát hiện không nhận được khung hình quá 5 giây, kích hoạt thử kết nối lại tự động theo thuật toán Exponential Backoff.
     * Thẻ Camera Health chuyển sang màu vàng (51/52 Online), gửi thông báo cảnh báo tức thời đến màn hình kỹ thuật viên nhà trường để kiểm tra dây cáp mạng hoặc nguồn PoE phòng học đó.
   * `TH3 (Tài nguyên GPU hoặc nhiệt độ tăng cao bất thường > 80°C):`
     * Hệ thống tự động phát cảnh báo khẩn cấp (CRITICAL ALERT) qua Webhook/Email đến đội ngũ kỹ sư kiến trúc để kiểm tra hệ thống tản nhiệt phòng máy chủ `micro-server`.

###### Sơ đồ tuần tự chức năng Giám sát Hiệu năng Hệ thống và APM

```mermaid
sequenceDiagram
    autonumber
    participant GPU as GPU RTX 3060 & Máy chủ
    participant EXP as Prometheus Exporters
    participant PROM as Máy chủ Prometheus
    participant BE as Backend Giám sát
    participant CMS as Giao diện Web APM Grafana
    actor AD as Quản trị viên Kỹ thuật

    loop Chu kỳ thu thập số liệu mỗi 5 giây
        EXP->>GPU: 1. Thu thập tải GPU, VRAM, Nhiệt độ, CPU, RAM
        GPU-->>EXP: 2. Trả về thông số phần cứng
        PROM->>EXP: 3. Kéo số liệu định kỳ (Scrape metrics)
    end

    AD->>CMS: 4. Mở màn hình Giám sát Hiệu năng APM
    activate CMS
    CMS->>PROM: 5. Truy vấn dữ liệu chuỗi thời gian qua PromQL
    PROM-->>CMS: 6. Trả về mảng số liệu hiệu năng 24h
    CMS-->>AD: 7. Hiển thị đồng hồ đo tải GPU, VRAM và biểu đồ thời gian thực
    deactivate CMS

    opt Khi có sự cố camera mất tín hiệu hoặc tải vượt 85%
        PROM-)BE: 8. Kích hoạt Alertmanager cảnh báo vượt ngưỡng
        activate BE
        BE->>BE: 9. Ghi nhật ký cảnh báo vào audit_log
        BE-)CMS: 10. Đẩy cảnh báo đỏ qua WebSocket đến quản trị viên
        deactivate BE
    end
```

---

### 4. PHÂN HỆ 4: QUẢN LÝ DANH MỤC HỌC ĐƯỜNG MASTER DATA VÀ ĐỘNG CƠ CẤU HÌNH ĐỘNG

---

#### 4.1. UC-13: Quản lý Danh mục Năm học, Khối và Lớp học (Đồng bộ EduSys / vnEdu)

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cho phép Quản trị viên đào tạo quản lý cơ cấu tổ chức học đường: danh mục năm học, học kỳ, phân cấp các khối 10, 11, 12, danh sách phòng học tiêu chuẩn và phân công giáo viên chủ nhiệm; cung cấp bộ kết nối đồng bộ tự động hai chiều qua API với hệ sinh thái cơ sở dữ liệu ngành giáo dục (EduSys / vnEdu).
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng có vai trò Quản trị viên đào tạo hoặc Ban giám hiệu.
* **Đường dẫn thao tác:** Web CMS → "Danh mục Học đường" → "Năm học, Khối & Lớp" → Danh sách lớp học.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'CLASS_MASTER_UPDATE'`, `class_id`, `class_name`, `homeroom_teacher_id`, `updated_by`.
* **Quy định phân quyền:** Quản trị viên đào tạo và Ban giám hiệu.

##### 2. Màn hình
* **Màn hình Danh mục Khối và Lớp học (Default state):** Cây phân cấp: Năm học hiện tại → Khối 10, Khối 11, Khối 12 → Danh sách các lớp kèm sĩ số học sinh, phòng học vật lý cố định, họ tên giáo viên chủ nhiệm và số điện thoại liên lạc.
* **Hộp thoại Thêm mới / Chỉnh sửa Lớp học (Modal state):** Form nhập tên lớp, chọn khối học, chọn giáo viên chủ nhiệm từ danh bạ giáo viên và liên kết với phòng học văn hóa.
* **Hộp thoại Đồng bộ CSDL Ngành (Sync Modal):** Nút bấm [[Đồng bộ từ EduSys / vnEdu]], hiển thị thanh tiến trình đồng bộ dữ liệu lớp học và học sinh tự động.

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Tên lớp học * | Textbox(50) | INPUT | Để trống | • Đặt tên lớp chuẩn: "10A1", "11B2", "12A3".<br/>• Duy nhất trong năm học; lưu vào `classes.class_name`. |
| 2 | Khối học * | Dropdown | INPUT | "Khối 10" | • Giá trị: "Khối 10", "Khối 11", "Khối 12". |
| 3 | Giáo viên chủ nhiệm * | Dropdown Select | INPUT | Để trống | • Chọn từ danh sách giáo viên có trạng thái công tác `ACTIVE`.<br/>• Lưu vào `classes.homeroom_teacher_id`. |
| 4 | Phòng học vật lý cố định | Dropdown | INPUT | Để trống | • Chọn phòng học trong danh mục `rooms`. |
| 5 | Nút Đồng bộ CSDL Ngành | Button | INPUT | N/A | • Gọi Open API lấy dữ liệu từ hệ thống EduSys / vnEdu. |

##### 4. Luồng nghiệp vụ
1. Quản trị viên truy cập Web CMS → "Danh mục Học đường" → "Năm học, Khối & Lớp".
2. Quản trị viên có thể tạo thủ công lớp học mới hoặc nhấn nút `[Đồng bộ từ EduSys / vnEdu]`:
   * `TH1 (Đồng bộ tự động từ CSDL Ngành):`
     * Hệ thống kết nối với Cổng Open REST API của EduSys/vnEdu qua mã API Key đã cấu hình.
     * Hệ thống kéo danh sách năm học, khối lớp, phân công giáo viên và danh sách học sinh.
     * So khớp dữ liệu: Tự động cập nhật các lớp học có biến động, thêm mới các lớp học mới xuất hiện, bảo toàn lịch sử các năm học cũ.
     * Hiển thị bảng đối soát số lượng: "Đồng bộ thành công 45 lớp học và 1.850 học sinh".
   * `TH2 (Thêm mới / Chỉnh sửa thủ công):`
     * Quản trị viên nhập thông tin biểu mẫu lớp học.
     * Kiểm tra trùng lặp: nếu tên lớp đã tồn tại trong cùng năm học, báo lỗi 409 Conflict: *"Tên lớp [Tên_Lớp] đã tồn tại trong năm học này"*.
     * Nếu hợp lệ: Cập nhật CSDL bảng `classes`, ghi nhật ký vào `audit_log`, hiển thị toast thành công.

###### Sơ đồ tuần tự chức năng Quản lý Danh mục Lớp học và Đồng bộ CSDL Ngành

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên Đào tạo
    participant CMS as Web CMS Danh mục
    participant BE as Backend Master Data
    participant MOET as CSDL Ngành (EduSys / vnEdu)
    participant DB as CSDL PostgreSQL

    AD->>CMS: 1. Nhấn nút [Đồng bộ từ EduSys / vnEdu]
    activate CMS
    CMS->>BE: 2. POST /api/v1/sync/external-school-system
    activate BE
    BE->>MOET: 3. Gọi Open API lấy danh mục Năm học, Lớp, Giáo viên
    activate MOET
    MOET-->>BE: 4. Trả về dữ liệu JSON danh mục học đường
    deactivate MOET

    BE->>DB: 5. Giao dịch CSDL: So khớp, Thêm mới & Cập nhật classes
    BE->>DB: 6. INSERT INTO audit_log (action = 'CLASS_MASTER_SYNC')
    BE-->>CMS: 7. Báo cáo kết quả đồng bộ (Số lượng lớp, học sinh)
    deactivate BE
    CMS-->>AD: 8. Hiển thị thông báo toast "Đồng bộ CSDL Ngành thành công"
    deactivate CMS
```

---

#### 4.2. UC-14: Quản lý Hồ sơ Sinh trắc học và Kiểm định Chất lượng Ảnh eDifFIQA

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp công cụ tiếp nhận ảnh chân dung đăng ký của học sinh và giáo viên; tự động kiểm định chất lượng ảnh bằng thuật toán eDifFIQA (độ sắc nét phương sai Laplacian ≥ 100, độ mở mắt, góc nghiêng Yaw/Pitch/Roll ≤ 15 độ, độ sáng 40 - 85 IRE); tự động cắt căn chỉnh khuôn mặt, trích xuất vector 512 chiều bằng ArcFace ResNet50, mã hóa AES-256 lưu CSDL và nạp vào bộ nhớ RAM máy chủ biên.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Học sinh có hồ sơ cá nhân trong hệ thống; tệp ảnh đầu vào định dạng JPEG hoặc PNG dung lượng từ 200KB đến 2MB.
* **Đường dẫn thao tác:** Web CMS → "Quản lý Sinh trắc học" → Chọn học sinh → Nhấn [[Cập nhật ảnh mẫu]].
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'BIOMETRIC_PROFILE_UPDATE'`, `student_id`, `quality_score`, `updated_by`, `timestamp = NOW()`.
* **Quy định phân quyền:** Quản trị viên hệ thống, Giáo viên chủ nhiệm (được tải ảnh cho học sinh lớp mình).

##### 2. Màn hình
* **Màn hình Quản lý Hồ sơ Sinh trắc học (Default state):** Danh sách học sinh kèm ảnh chân dung hiện tại, trạng thái chất lượng ảnh (Badge xanh "Đạt chuẩn eDifFIQA: 0.91" / Badge đỏ "Chưa có ảnh" / Badge vàng "Ảnh chất lượng thấp").
* **Hộp thoại Tải và Kiểm định Ảnh Mẫu (Modal state):** Khung kéo thả tệp ảnh, khung hình xem trước, biểu đồ radar 5 tiêu chí chất lượng: Độ sắc nét, Góc quay, Độ mở mắt, Ánh sáng, Che khuất ngũ quan.
* **Thông báo phản hồi (Toast notification):** Toast xanh: "Ảnh mẫu đạt chuẩn chất lượng (Điểm: 0.92). Đã trích xuất và đồng bộ vector 512D sang bộ nhớ RAM thành công".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Tệp ảnh tải lên * | File Upload | INPUT | Để trống | • Định dạng JPEG/PNG; độ phân giải tối thiểu 300 × 300 pixel. |
| 2 | Điểm chất lượng tổng hợp | Number(4,2) | OUTPUT | 0.00 | • Điểm chất lượng eDifFIQA (0.00 - 1.00); yêu cầu ≥ 0.80. |
| 3 | Góc quay khuôn mặt | Angles (Y, P, R) | OUTPUT | (0°, 0°, 0°) | • Yaw ≤ 15°, Pitch ≤ 10°, Roll ≤ 10°. |
| 4 | Độ sắc nét hình ảnh | Number | OUTPUT | 0 | • Phương sai Laplacian; yêu cầu đạt ≥ 100. |
| 5 | Vector đặc trưng 512D | Binary / Blob | OUTPUT | 512 floats | • Vector trích xuất chuẩn hóa L2; mã hóa AES-256 vào `face_biometric_profiles.feature_vector`. |
| 6 | Nút Xác nhận Lưu hồ sơ | Button | INPUT | N/A | • Lưu vào CSDL và đồng bộ sang bộ nhớ RAM AI biên. |

##### 4. Luồng nghiệp vụ
1. Giáo viên hoặc Quản trị viên truy cập "Quản lý Sinh trắc học" → Chọn học sinh cần cập nhật ảnh mẫu.
2. Người dùng chọn 1 hoặc nhiều ảnh chân dung chụp tự nhiên của học sinh đưa vào khung tải ảnh.
3. Hệ thống gửi ảnh tới API `/face/verify-quality` của `miai`:
   * Thuật toán eDifFIQA phân tích ngũ quan và các chỉ số hình học:
     * `TH1 (Ảnh không đạt chuẩn: bị mờ, nghiêng quá mức, nhắm mắt hoặc ngược sáng):`
       * Hệ thống hiển thị cảnh báo đỏ chi tiết từng lỗi: *"Ảnh không đạt chuẩn: Độ sắc nét thấp (Laplacian: 62 < 100), góc nghiêng ngang quá lớn (Yaw: 22° > 15°). Vui lòng chọn ảnh chụp thẳng, rõ nét hơn"*. Nút Lưu bị vô hiệu hóa.
     * `TH2 (Ảnh đạt chuẩn chất lượng eDifFIQA ≥ 0.80):`
       * Hệ thống hiển thị biểu đồ radar xanh lá, tích xanh "ĐẠT CHUẨN".
       * Mô hình ArcFace ResNet50 trích xuất vector đặc trưng 512 chiều chuẩn hóa L2.
4. Người dùng nhấn button `[Xác nhận Lưu hồ sơ]`:
   * Hệ thống mã hóa chuỗi vector bằng thuật toán AES-256 và lưu vào bảng `face_biometric_profiles`.
   * Hệ thống phát sự kiện đồng bộ tới bộ nhớ RAM máy chủ biên: nạp vector mới vào cấu trúc `PERMANENT_INDEX` để sẵn sàng cho điểm danh cổng trường ngay lập tức mà không cần khởi động lại.
   * Ghi nhật ký vào `audit_log`, hiển thị toast thông báo thành công.

###### Sơ đồ tuần tự chức năng Quản lý Hồ sơ Sinh trắc học và Kiểm định eDifFIQA

```mermaid
sequenceDiagram
    autonumber
    actor GV as Giáo viên Chủ nhiệm
    participant CMS as Web CMS Sinh trắc học
    participant BE as Backend Nghiệp vụ
    participant AI as Core AI (eDifFIQA & ArcFace)
    participant RAM as RAM Index (Permanent)
    participant DB as CSDL PostgreSQL

    GV->>CMS: 1. Tải tệp ảnh chân dung học sinh
    activate CMS
    CMS->>BE: 2. POST /api/v1/biometrics/verify-quality (ảnh)
    activate BE
    BE->>AI: 3. Đánh giá chất lượng ngũ quan eDifFIQA
    activate AI
    AI->>AI: 4. Đo độ nét, góc nghiêng Yaw/Pitch, độ mở mắt
    alt TH1: Ảnh không đạt chất lượng (Điểm < 0.80)
        AI-->>BE: 5.1. Báo lỗi chi tiết (Mờ, nghiêng quá 15°)
        BE-->>CMS: 5.2. Hiển thị cảnh báo đỏ và khóa nút Lưu
    else TH2: Ảnh đạt chuẩn chất lượng (Điểm ≥ 0.80)
        AI->>AI: 6.1. ArcFace trích xuất vector 512D chuẩn hóa L2
        AI-->>BE: 6.2. Trả về điểm chất lượng & Vector đặc trưng 512D
        deactivate AI
        BE-->>CMS: 7. Hiển thị tích xanh "ĐẠT CHUẨN", mở nút Lưu
        deactivate BE

        GV->>CMS: 8. Nhấn [Xác nhận Lưu hồ sơ]
        CMS->>BE: 9. POST /api/v1/biometrics/commit (student_id, vector)
        activate BE
        BE->>DB: 10. INSERT INTO face_biometric_profiles (mã hóa AES-256)
        BE->>AI: 11. Đồng bộ vector mới vào PERMANENT_INDEX trong RAM
        activate AI
        AI->>RAM: 12. Cập nhật chỉ mục RAM (< 1ms)
        RAM-->>AI: 13. Đồng bộ RAM hoàn tất
        deactivate AI
        BE->>DB: 14. INSERT INTO audit_log (action = 'BIOMETRIC_PROFILE_UPDATE')
        BE-->>CMS: 15. Phản hồi thành công
        deactivate BE
        CMS-->>GV: 16. Hiển thị toast "Cập nhật sinh trắc học thành công"
    end
    deactivate CMS
```

---

#### 4.3. UC-15: Quản lý Thời khóa biểu và Lịch trình Quét Phòng học Tự động

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Quản lý thời khóa biểu giảng dạy chi tiết theo tuần của toàn trường (thứ trong tuần, tiết học 1..10, môn học, lớp học, phòng học, giáo viên phụ trách); tự động tạo lập và điều chỉnh lịch trình quét của bộ lập lịch Quartz Cron Scheduler kích hoạt camera phòng học chụp ảnh tại phút thứ 5 đầu mỗi tiết học.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Danh mục năm học, khối, lớp học và phòng học đã được kích hoạt.
* **Đường dẫn thao tác:** Web CMS → "Quản lý Đào tạo" → "Thời khóa biểu" → Chọn Tuần học & Khối lớp.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'TIMETABLE_UPDATE'`, `academic_year_id`, `week_number`, `affected_classes_count`, `updated_by`.
* **Quy định phân quyền:** Quản trị viên đào tạo và Ban giám hiệu.

##### 2. Màn hình
* **Màn hình Thời khóa biểu Tuần (Default state):** Bảng ma trận lưới: Hàng ngang là các Thứ (Thứ 2 đến Thứ 7), Hàng dọc là 10 Tiết học (5 tiết sáng, 5 tiết chiều). Mỗi ô hiển thị Tên môn học, Giáo viên giảng dạy, Phòng học; hỗ trợ kéo thả (Drag & Drop) môn học vào các tiết.
* **Hộp thoại Cấu hình Tiết học (Modal state):** Form chọn môn học, giáo viên, phòng học và thời gian bắt đầu tiết học (ví dụ: Tiết 1: 07h00 - 07h45, quét camera lúc 07h05).
* **Nút Nhập Thời khóa biểu từ Excel:** Cho phép tải lên tệp Excel mẫu thời khóa biểu toàn trường.

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Lớp học áp dụng * | Dropdown | INPUT | "10A1" | • Chọn lớp học cần lên lịch `timetables.class_id`. |
| 2 | Tuần học áp dụng * | Dropdown | INPUT | "Tuần 1" | • Tuần trong năm học (Tuần 1 đến Tuần 35). |
| 3 | Tiết học trong ngày * | Dropdown | INPUT | "Tiết 1" | • Tiết 1 đến Tiết 10 trong ngày `timetables.period_id`. |
| 4 | Môn học * | Dropdown | INPUT | Để trống | • Môn học: Toán, Ngữ văn, Tiếng Anh, Vật lý... |
| 5 | Giáo viên giảng dạy * | Dropdown Select | INPUT | Để trống | • Giáo viên phụ trách; kiểm tra chống trùng lịch dạy. |
| 6 | Phòng học * | Dropdown | INPUT | Phòng lớp | • Phòng học vật lý gắn với camera IP tương ứng. |
| 7 | Nút Áp dụng Lịch trình | Button | INPUT | N/A | • Cập nhật CSDL và tự động sinh lại Quartz Cron Triggers. |

##### 4. Luồng nghiệp vụ
1. Quản trị viên đào tạo truy cập "Thời khóa biểu" → Chọn lớp và tuần học cần thiết lập.
2. Quản trị viên xếp môn học, giáo viên và phòng học vào từng tiết trên bảng ma trận.
3. Hệ thống kiểm tra bẫy xung đột lịch trình (Conflict Detection):
   * `TH1 (Trùng lịch giáo viên hoặc trùng phòng học):` Nếu một giáo viên bị xếp dạy cùng 1 tiết tại 2 lớp khác nhau, hoặc 2 lớp cùng xếp vào 1 phòng học trong cùng một tiết, hệ thống báo lỗi viền đỏ và từ chối lưu: *"Xung đột thời khóa biểu: Giáo viên [Họ_Tên] đã có lịch dạy Tiết 2 tại lớp 10A2"*.
   * `TH2 (Thời khóa biểu hợp lệ):`
     * Hệ thống lưu danh mục tiết học vào bảng `timetables`.
     * Tự động tính toán mốc giờ quét camera: phút thứ 5 đầu mỗi tiết học (ví dụ: Tiết 1 quét lúc 07h05, Tiết 2 quét lúc 07h55).
     * Cập nhật danh sách Quartz Cron Triggers của tiến trình nền `ClassroomScheduler.java`.
     * Ghi nhật ký vào `audit_log`, hiển thị toast thông báo: *"Cập nhật thời khóa biểu và lịch quét phòng học thành công"*.

###### Sơ đồ tuần tự chức năng Quản lý Thời khóa biểu và Lịch trình Quét Phòng học

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên Đào tạo
    participant CMS as Web CMS Thời khóa biểu
    participant BE as Backend Scheduler
    participant CRON as Quartz Cron Engine
    participant DB as CSDL PostgreSQL

    AD->>CMS: 1. Xếp lịch giảng dạy trên lưới & Nhấn [Áp dụng]
    activate CMS
    CMS->>BE: 2. POST /api/v1/timetables/bulk-save (danh sách tiết học)
    activate BE
    BE->>DB: 3. Kiểm tra xung đột lịch giáo viên và phòng học
    alt TH1: Xung đột giáo viên dạy trùng tiết
        DB-->>BE: 4.1. Bản ghi xung đột lịch dạy
        BE-->>CMS: 4.2. Báo lỗi 409 Conflict (Trùng lịch dạy)
        CMS-->>AD: 4.3. Cảnh báo đỏ vị trí tiết bị trùng lịch
    else TH2: Lịch trình hợp lệ không xung đột
        BE->>DB: 5.1. INSERT INTO timetables (lưu lịch học tuần)
        BE->>CRON: 5.2. Cập nhật lại danh sách Cron Triggers quét phòng học
        CRON-->>BE: 5.3. Xác nhận nạp lịch trình thành công
        BE->>DB: 5.4. INSERT INTO audit_log (action = 'TIMETABLE_UPDATE')
        BE-->>CMS: 5.5. Trả kết quả thành công
        deactivate BE
        CMS-->>AD: 6. Hiển thị toast "Cập nhật thời khóa biểu thành công"
    end
    deactivate CMS
```

---

#### 4.4. UC-16: Động cơ Cấu hình Tham số Đa tầng và Hot-Reload qua Redis Pub/Sub

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cho phép Quản trị viên cấp cao tùy biến linh hoạt toàn bộ 12 tham số vận hành của hệ thống (ngưỡng tương đồng Cosine AI, kích thước cắt mặt tối thiểu, góc quay tối đa, thời gian khóa Cooldown, giờ mở cổng đón học sinh, mốc chốt đi muộn, giờ tan học, hạn mức gửi SMS Brandname, thời gian lưu ảnh snapshot và audit log); áp dụng cơ chế Cập nhật Nóng không gián đoạn dịch vụ (Zero-Downtime Hot-Reload) qua kênh Redis Pub/Sub trong thời gian dưới 100ms mà không yêu cầu khởi động lại ứng dụng hay GPU Worker.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Quản trị viên hệ thống có đặc quyền can thiệp cấu hình lõi.
* **Đường dẫn thao tác:** Web CMS → "Quản trị Hệ thống" → "Cấu hình Tham số Vận hành" → Biểu mẫu cấu hình.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'SYSTEM_CONFIG_UPDATE'`, `param_key`, `old_value`, `new_value`, `updated_by`, `timestamp = NOW()`.
* **Quy định phân quyền:** Duy nhất Quản trị viên hệ thống cấp cao (System Admin).

##### 2. Màn hình
* **Màn hình Cấu hình Tham số Động (Default state):** Phân chia 4 nhóm tab rõ ràng:
  * Tab 1: Thuật toán AI (Ngưỡng Cosine, kích thước mặt tối thiểu, góc quay).
  * Tab 2: Quy tắc Nghiệp vụ Điểm danh (Thời gian Cooldown, khung giờ đón/về, mốc chốt đi muộn).
  * Tab 3: Thông báo & Tích hợp (Bật SMS dự phòng, hạn mức SMS ngày, gom thông báo).
  * Tab 4: Lưu trữ & An toàn Dữ liệu (Thời gian lưu ảnh snapshot, thời gian lưu audit log).
* **Hộp thoại xác nhận thay đổi cấu hình nóng (Confirm Popup):** Hiển thị danh sách tham số thay đổi, cảnh báo tác động vận hành và nút [[Xác nhận Hot-Reload]].
* **Thông báo phản hồi (Toast notification):** Toast xanh: "Áp dụng cấu hình tham số mới thành công. Toàn bộ máy chủ nghiệp vụ và GPU Worker đã nạp lại giá trị mới trong 45ms".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên tham số | Kiểu dữ liệu | Giá trị mặc định | Khoảng cho phép | Ý nghĩa nghiệp vụ & Tác động vận hành |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | `ai.face.cosine_threshold` * | Float | 0.72 | 0.60 - 0.85 | • Ngưỡng tương đồng tối thiểu công nhận học sinh; tăng lên giúp giảm nhận nhầm, giảm xuống giúp bắt nhạy hơn. |
| 2 | `ai.face.min_crop_size` * | Integer | 80 | 50 - 150 | • Kích thước tối thiểu khuôn mặt (pixel) để đưa vào trích xuất vector. |
| 3 | `ai.face.max_pose_yaw` * | Integer | 25 | 10 - 45 | • Góc quay đầu ngang tối đa (độ); lọc các góc quay quá nghiêng. |
| 4 | `biz.attendance.cooldown_seconds` * | Integer | 90 | 30 - 300 | • Thời gian khóa Cooldown giữa 2 lần quét liên tiếp để chống bắn lặp thông báo. |
| 5 | `biz.time.morning_late_cutoff` * | Time | 07:15 | 06:45 - 08:30 | • Mốc giờ chốt đi muộn; học sinh qua cổng sau giờ này bị gắn cờ TARDY. |
| 6 | `notify.sms.daily_quota_per_student` * | Integer | 2 | 1 - 5 | • Hạn mức tin nhắn SMS tối đa cho 1 học sinh/ngày tránh bội chi cước viễn thông. |
| 7 | `system.retention.snapshot_days` * | Integer | 30 | 7 - 90 | • Số ngày lưu ảnh snapshot camera trước khi tiến trình tự động dọn dẹp đĩa. |
| 8 | `system.retention.audit_log_days` * | Integer | 730 | 365 - 1825 | • Số ngày lưu nhật ký kiểm toán (tối thiểu 2 năm theo quy chuẩn an toàn). |

##### 4. Luồng nghiệp vụ
1. Quản trị viên truy cập "Quản trị Hệ thống" → "Cấu hình Tham số Vận hành".
2. Quản trị viên điều chỉnh các tham số cần tối ưu (ví dụ: trong tuần thi cử, điều chỉnh thời gian Cooldown từ 90s xuống 60s để tăng tốc độ đối soát).
3. Quản trị viên nhấn button `[Lưu cấu hình]`:
   * Hệ thống kiểm tra ràng buộc khoảng giá trị cho phép của từng tham số:
     * `TH1 (Giá trị ngoài khoảng cho phép):` Hệ thống dừng thực hiện, báo lỗi inline tại trường vi phạm: *"Giá trị thời gian Cooldown phải nằm trong khoảng từ 30 đến 300 giây"*.
     * `TH2 (Giá trị hợp lệ):` Hệ thống hiển thị popup xác nhận thay đổi cấu hình nóng.
4. Quản trị viên nhấn `[Xác nhận Hot-Reload]`:
   * Hệ thống lưu giá trị mới vào bảng `system_configurations` trong CSDL Core.
   * Ghi nhận lịch sử thay đổi vào bảng kiểm toán bất biến `audit_log`.
   * Backend phát một thông điệp cập nhật lên kênh Redis Pub/Sub chuyên dụng: `PUBLISH mschool:config:event {param_key, new_value}`.
   * Toàn bộ các tiến trình đang lắng nghe kênh này (`base-be`, `camera-worker`, `base-ai`) lập tức nạp lại giá trị tham số mới vào bộ nhớ RAM trong thời gian dưới 100ms.
   * Dịch vụ vận hành tiếp tục thông suốt 100%, không bị rớt bất kỳ kết nối mạng hay khung hình camera nào.

###### Sơ đồ tuần tự chức năng Cấu hình Động và Zero-Downtime Hot-Reload

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên Hệ thống
    participant CMS as Web CMS Cấu hình
    participant BE as Backend Config Core
    participant REDIS as Kênh Redis Pub/Sub
    participant AI as AI Engine & GPU Worker
    participant WRK as Ingestion Worker
    participant DB as CSDL PostgreSQL

    AD->>CMS: 1. Điều chỉnh tham số (Cooldown 90s -> 60s)
    AD->>CMS: 2. Nhấn [Lưu cấu hình] & Xác nhận Hot-Reload
    activate CMS
    CMS->>BE: 3. PUT /api/v1/system-configs (danh sách tham số mới)
    activate BE
    BE->>DB: 4. UPDATE system_configurations SET value = :val
    BE->>DB: 5. INSERT INTO audit_log (action = 'SYSTEM_CONFIG_UPDATE')

    BE->>REDIS: 6. PUBLISH mschool:config:event {key, value}
    activate REDIS
    par Phân phối thông điệp nóng tới AI Engine
        REDIS-)AI: 7.1. Nhận thông điệp cập nhật tham số
        AI->>AI: 7.2. Nạp giá trị mới vào RAM (< 50ms)
    and Phân phối thông điệp nóng tới Ingestion Worker
        REDIS-)WRK: 8.1. Nhận thông điệp cập nhật tham số
        WRK->>WRK: 8.2. Cập nhật biến cấu hình trong RAM (< 30ms)
    end
    deactivate REDIS

    BE-->>CMS: 9. Phản hồi thành công (thời gian áp dụng: 45ms)
    deactivate BE
    CMS-->>AD: 10. Hiển thị toast "Áp dụng cấu hình nóng thành công"
    deactivate CMS
```


---

### 5. PHÂN HỆ 5: BẢNG ĐIỀU KHIỂN SĨ SỐ, SỔ ĐẦU BÀI ĐIỆN TỬ VÀ TÍCH HỢP ĐA NỀN TẢNG

---

#### 5.1. UC-17: Bảng điều khiển Sĩ số Toàn trường Thời gian thực (Live Dashboard)

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp bức tranh toàn cảnh trực quan về tình hình chuyên cần toàn trường trong ngày cho Ban giám hiệu và Phòng đào tạo; cập nhật biến động quân số đến trường và ra về theo thời gian thực qua kết nối WebSocket hai chiều; hiển thị biểu đồ phân bố lưu lượng theo từng khoảng thời gian 5 phút và luồng thẻ trực tiếp 20 học sinh vừa qua cổng gần nhất.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng đăng nhập tài khoản có quyền xem bảng điều khiển tổng thể (`role = BAN_GIAM_HIEU` hoặc `role = ADMIN`).
* **Đường dẫn thao tác:** Đăng nhập hệ thống Web CMS → Màn hình mặc định hiển thị "Bảng điều khiển Sĩ số Toàn trường (Live Dashboard)".
* **Quy định ghi nhật ký hệ thống (Audit Log):** Không ghi nhận log cho các hành vi chỉ đọc màn hình thông thường; ghi nhận log khi người dùng thao tác lọc nâng cao hoặc xuất báo cáo nhanh.
* **Quy định phân quyền:** Ban giám hiệu, Phòng Đào tạo, Quản trị viên hệ thống.

##### 2. Màn hình
* **Màn hình Dashboard Sĩ số (Default state):**
  * Hàng trên: 4 thẻ thống kê số lớn: Tổng sĩ số danh bộ toàn trường (ví dụ: 2.150), Số học sinh đã đến trường (1.980 - 92.1%), Số học sinh đi muộn (45), Số học sinh vắng mặt chưa rõ lý do (125).
  * Khối giữa bên trái: Biểu đồ đường phân bố lưu lượng học sinh qua cổng từ 06h30 đến 08h00 sáng theo từng bước 5 phút.
  * Khối giữa bên phải: Tỷ lệ chuyên cần phần trăm (%) phân rã theo Khối 10, Khối 11, Khối 12.
  * Khối dưới: Luồng thẻ động (Live Feed) hiển thị 20 học sinh vừa bước qua cổng (ảnh snapshot cắt mặt, họ tên, mã học sinh, lớp, cổng, thời gian chính xác đến từng giây).
* **Trạng thái Mất kết nối WebSocket (Alert state):** Hiển thị thanh cảnh báo viền vàng đầu màn hình: "Mất kết nối thời gian thực tới máy chủ. Hệ thống đang tự động kết nối lại...".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Tổng sĩ số toàn trường | Number | OUTPUT | 0 | • Tổng số học sinh `status = ACTIVE` toàn trường. |
| 2 | Đã có mặt đúng giờ | Number / Percentage | OUTPUT | 0 (0%) | • Số học sinh có trạng thái `PRESENT` trong ngày. |
| 3 | Số học sinh đi muộn | Number | OUTPUT | 0 | • Số học sinh có trạng thái `TARDY` trong ngày. |
| 4 | Số học sinh chưa đến | Number | OUTPUT | 0 | • Học sinh chưa có bản ghi quét cổng tính đến thời điểm hiện tại. |
| 5 | Biểu đồ Lưu lượng 5 phút | Line Chart | OUTPUT | Chuỗi dữ liệu rỗng | • Cập nhật tự động điểm dữ liệu mỗi khi có học sinh qua cổng. |
| 6 | Thẻ Live Feed học sinh | Card Component | OUTPUT | Danh sách 20 thẻ | • Nhận gói tin JSON qua kênh WebSocket `topic/live-attendance`. |

##### 4. Luồng nghiệp vụ
1. Ban giám hiệu đăng nhập Web CMS, màn hình mặc định tải Bảng điều khiển Sĩ số Toàn trường.
2. Trình duyệt thiết lập kết nối WebSocket với backend qua địa chỉ `wss://mschool.local/ws/live-dashboard`.
3. Backend nạp trạng thái chuyên cần tổng hợp từ bộ đệm Redis và CSDL, trả về khung dữ liệu ban đầu hiển thị trên 4 thẻ chỉ số và biểu đồ phân bố lưu lượng.
4. Khi có học sinh bước qua cổng trường được AI nhận diện thành công:
   * Backend ghi nhận sự kiện điểm danh, cập nhật bộ đếm trong Redis.
   * Kênh WebSocket lập tức phát gói tin sự kiện `ATTENDANCE_EVENT` gồm: Họ tên, Lớp, Ảnh cắt khuôn mặt, Cổng và Mốc giờ.
   * Giao diện Dashboard tự động tăng biến đếm số lượng học sinh có mặt, cập nhật tỷ lệ chuyên cần và chèn thêm 1 thẻ học sinh mới vào đầu danh sách Live Feed với hiệu ứng mượt mà (Fade-in).
5. Khi kết nối mạng bị gián đoạn, client tự động kích hoạt cơ chế thử kết nối lại theo chu kỳ 3 giây và tự động đồng bộ bù dữ liệu ngay khi kết nối thành công.

###### Sơ đồ tuần tự chức năng Bảng điều khiển Sĩ số Toàn trường Thời gian thực

```mermaid
sequenceDiagram
    autonumber
    actor BGH as Ban Giám hiệu
    participant CMS as Web CMS Live Dashboard
    participant WS as WebSocket Broker
    participant BE as Backend Core
    participant REDIS as Redis Aggregator

    BGH->>CMS: 1. Mở màn hình Live Dashboard
    activate CMS
    CMS->>WS: 2. Thiết lập kết nối wss://mschool/ws/live-dashboard
    WS-->>CMS: 3. Xác nhận kết nối thành công
    CMS->>BE: 4. GET /api/v1/dashboard/summary-snapshot
    activate BE
    BE->>REDIS: 5. Lấy tổng số quân số đã đến, đi muộn, vắng mặt
    REDIS-->>BE: 6. Dữ liệu tổng hợp tức thời
    BE-->>CMS: 7. Trả về dữ liệu khởi tạo 4 thẻ chỉ số & Biểu đồ
    deactivate BE
    CMS-->>BGH: 8. Hiển thị Dashboard thời gian thực

    Note over BE,WS: HỌC SINH MỚI QUA CỔNG
    BE-)WS: 9. Phát thông điệp ATTENDANCE_EVENT qua WebSocket
    WS-)CMS: 10. Đẩy dữ liệu thẻ học sinh & cập nhật sĩ số
    CMS-->>BGH: 11. Nhảy số counter & chèn thẻ Live Feed (không reload trang)
    deactivate CMS
```

---

#### 5.2. UC-18: Sơ đồ Mặt bằng 50 Phòng học Trực quan

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Hiển thị trực quan sơ đồ ma trận 50 phòng học phân chia theo 3 tầng nhà hoặc 3 khối lớp (Khối 10, 11, 12); thể hiện trạng thái điểm danh theo thời gian thực của từng lớp học trong tiết học hiện tại (màu xanh lá: đủ sĩ số; màu vàng: có học sinh vắng hoặc đi muộn; màu đỏ nhấp nháy: cảnh báo có học sinh lạ ngồi nhầm lớp); hỗ trợ bấm xem chi tiết ảnh chụp toàn cảnh lớp học.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Camera 50 phòng học đã được cấu hình và liên kết với danh mục phòng học; tiết học đang trong khung giờ giảng dạy chính khóa.
* **Đường dẫn thao tác:** Web CMS → Menu "Giám sát Lớp học" → "Sơ đồ Mặt bằng 50 Phòng học".
* **Quy định ghi nhật ký hệ thống (Audit Log):** Không ghi nhật ký khi xem thông thường; ghi nhận log khi bấm xem chi tiết ảnh chụp độ phân giải cao `action = 'CLASSROOM_SNAPSHOT_VIEW'`, `room_id`, `class_id`.
* **Quy định phân quyền:** Ban giám hiệu, Giám thị học đường và Giáo viên toàn trường.

##### 2. Màn hình
* **Màn hình Sơ đồ Ma trận 50 Phòng học (Default state):** Lưới ô vuông 50 phòng học sắp xếp theo Khối:
  * Khối 10: 16 phòng (10A1 đến 10A16).
  * Khối 11: 17 phòng (11A1 đến 11A17).
  * Khối 12: 17 phòng (12A1 đến 12A17).
  * Mỗi ô hiển thị: Tên lớp, Phòng học, Giáo viên đang dạy, Tỷ lệ chuyên cần (ví dụ: 38/40), Badge màu trạng thái.
* **Hộp thoại Chi tiết Phòng học (Modal state):** Hiển thị ảnh chụp góc rộng của phòng học lúc phút thứ 5 đầu tiết, phân chia rõ khung Bục giảng (Teacher) và Dãy bàn (Student), danh sách học sinh vắng mặt kèm ảnh đối soát.
* **Cảnh báo học sinh lạ ngồi nhầm lớp (Alert state):** Ô phòng học chuyển viền đỏ nhấp nháy, hiển thị nhãn cảnh báo: "Phát hiện 01 học sinh lớp 11B2 ngồi nhầm phòng".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Bộ lọc Khối lớp | Dropdown Select | INPUT | "TẤT CẢ" | • Lọc hiển thị: "TẤT CẢ", "KHỐI 10", "KHỐI 11", "KHỐI 12". |
| 2 | Bộ lọc Tiết học | Dropdown | INPUT | Tiết hiện tại | • Chọn xem lịch sử các tiết học trước đó trong ngày. |
| 3 | Thẻ phòng học trên lưới | Grid Component | OUTPUT | 50 thẻ phòng | • Hiển thị màu sắc trạng thái: Xanh (Đủ), Vàng (Thiếu), Đỏ (Nhầm lớp). |
| 4 | Ảnh toàn cảnh lớp học | Image Component | OUTPUT | Ảnh JPEG lớp | • Ảnh chụp góc rộng độ phân giải cao tại phút thứ 5 của tiết. |
| 5 | Danh sách học sinh vắng | List Component | OUTPUT | Danh sách rỗng | • Họ tên, mã học sinh, tình trạng có đơn phép / không phép. |

##### 4. Luồng nghiệp vụ
1. Giám thị hoặc Ban giám hiệu truy cập menu "Sơ đồ Mặt bằng 50 Phòng học".
2. Hệ thống tải thông tin trạng thái của 50 phòng học trong tiết học hiện tại từ bảng `classroom_period_attendances`.
3. Người dùng quan sát toàn cảnh ma trận:
   * `TH1 (Phòng học bình thường - Đủ sĩ số):` Ô phòng học hiển thị màu xanh lá cây, sĩ số đạt 100% (ví dụ: 40/40), giáo viên đúng phân công.
   * `TH2 (Phòng học có học sinh vắng mặt):` Ô phòng học hiển thị màu vàng cam (ví dụ: 38/40). Người dùng nhấp chuột vào ô phòng học: hệ thống mở modal xem chi tiết danh sách 2 học sinh vắng mặt và thông tin phụ huynh để kịp thời liên hệ.
   * `TH3 (Cảnh báo học sinh ngồi nhầm lớp):` Ô phòng học nhấp nháy viền đỏ. Người dùng nhấp vào ô phòng học để xem ảnh đối soát cận cảnh: hệ thống chỉ rõ vị trí bàn học sinh đang ngồi và họ tên học sinh thuộc lớp khác để giám thị tới nhắc nhở.
4. Người dùng có thể nhấn nút `[Xem ảnh chụp toàn cảnh]` để kiểm tra trực quan chất lượng ảnh và sự hiện diện thực tế của giáo viên đứng lớp.

###### Sơ đồ tuần tự chức năng Sơ đồ Mặt bằng 50 Phòng học Trực quan

```mermaid
sequenceDiagram
    autonumber
    actor GT as Giám thị Học đường
    participant CMS as Web CMS Sơ đồ 50 Phòng
    participant BE as Backend Core
    participant DB as CSDL PostgreSQL

    GT->>CMS: 1. Mở màn hình Sơ đồ Mặt bằng 50 Phòng học
    activate CMS
    CMS->>BE: 2. GET /api/v1/classroom-matrix/current-period
    activate BE
    BE->>DB: 3. Truy vấn classroom_period_attendances của tiết hiện tại
    DB-->>BE: 4. Danh sách sĩ số 50 phòng học kèm cờ cảnh báo
    BE-->>CMS: 5. Dữ liệu trạng thái ma trận
    deactivate BE
    CMS-->>GT: 6. Hiển thị lưới ma trận 50 phòng (Xanh, Vàng, Đỏ)

    GT->>CMS: 7. Bấm vào ô phòng học có cảnh báo viền đỏ (10A1)
    CMS->>BE: 8. GET /api/v1/classroom-attendance/:id/detail
    activate BE
    BE->>DB: 9. Lấy ảnh snapshot lớp & Danh sách vắng mặt, nhầm lớp
    DB-->>BE: 10. Dữ liệu chi tiết & Tọa độ Bounding Box
    BE-->>CMS: 11. Trả về ảnh phân tách ROI & Danh sách học sinh
    deactivate BE
    CMS-->>GT: 12. Mở modal hiển thị ảnh chụp toàn cảnh & Vị trí ngồi nhầm
    deactivate CMS
```

---

#### 5.3. UC-19: Sổ đầu bài Điện tử và Ký duyệt Tiết học

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Thay thế hoàn toàn sổ đầu bài giấy truyền thống bằng Sổ đầu bài điện tử thông minh: tự động điền sĩ số học sinh có mặt/vắng mặt từ kết quả AI camera góc rộng, tự động ghi nhận giáo viên giảng dạy theo thời khóa biểu; hỗ trợ giáo viên bộ môn xác nhận nội dung bài dạy, nhận xét tiết học và thực hiện ký số xác nhận một chạm cuối tiết học.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Giáo viên bộ môn đăng nhập tài khoản có phân công dạy tiết học đó; tiết học đã diễn ra và đã hoàn thành quét ảnh tự động đầu tiết.
* **Đường dẫn thao tác:** Đăng nhập Web CMS → Menu "Sổ Đầu Bài Điện Tử" → Chọn Lớp & Tiết dạy của mình → Mở sổ tiết học.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'LESSON_REGISTER_SIGN'`, `class_id`, `period_id`, `teacher_id`, `present_count`, `signed_at = NOW()`.
* **Quy định phân quyền:** Giáo viên bộ môn (nhập nội dung và ký tiết dạy), Giáo viên chủ nhiệm và Ban giám hiệu (xem và duyệt tổng hợp tuần).

##### 2. Màn hình
* **Màn hình Sổ đầu bài Tiết học (Default state):** Giao diện mô phỏng chuẩn trang sổ đầu bài truyền thống:
  * Khối Thông tin Tiết học: Tiết số, Môn học, Giáo viên giảng dạy (tự động điền).
  * Khối Sĩ số: Tổng số học sinh, Số có mặt, Số vắng mặt (kèm danh sách họ tên tự động nạp từ AI).
  * Khối Nội dung Giảng dạy: Tên bài dạy / Chủ đề bài học, Xếp loại tiết học (Giỏi / Khá / Trung bình).
  * Khối Nhận xét & Ký xác nhận: Ô nhập nhận xét nề nếp lớp và nút nổi bật [[Ký xác nhận sổ đầu bài]].
* **Trạng thái Đã ký duyệt (Signed state):** Nút ký chuyển thành huy hiệu "ĐÃ KÝ DUYỆT" màu xanh lá có mốc thời gian và họ tên giáo viên, biểu mẫu chuyển sang chế độ chỉ đọc (Read-only) chống sửa đè.
* **Thông báo phản hồi (Toast notification):** Toast xanh: "Ký xác nhận sổ đầu bài Tiết [X] thành công".

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Môn học & Tiết dạy | Label | OUTPUT | Tự động | • Tự động ánh xạ từ thời khóa biểu `timetables`. |
| 2 | Sĩ số có mặt / vắng | Number / List | OUTPUT | Tự động từ AI | • Lấy từ kết quả quét tự động `classroom_period_attendances`. |
| 3 | Tên bài dạy / Chủ đề * | Textbox(255) | INPUT | Để trống | • Trường bắt buộc; giáo viên nhập tên bài học theo phân phối chương trình. |
| 4 | Xếp loại tiết học * | Dropdown | INPUT | "Tốt" | • Giá trị: "Tốt", "Khá", "Trung bình", "Yếu". |
| 5 | Nhận xét nề nếp | Textarea(500) | INPUT | Để trống | • Ghi nhận nề nếp học tập, ý thức học sinh trong tiết học. |
| 6 | Nút Ký xác nhận một chạm | Button | INPUT | N/A | • Thực hiện ký điện tử, chốt sổ đầu bài tiết học và khóa sửa. |

##### 4. Luồng nghiệp vụ
1. Giáo viên bộ môn kết thúc tiết dạy, mở Web CMS trên máy tính bàn giáo viên hoặc máy trạm lớp học.
2. Hệ thống tự động nhận diện tài khoản giáo viên và mở trang Sổ đầu bài của tiết dạy tương ứng.
3. Giáo viên kiểm tra sĩ số tự động được camera AI ghi nhận:
   * Nếu có sai lệch so với thực tế (ví dụ: 1 học sinh xuống phòng y tế sau khi quét ảnh), giáo viên có thể điều chỉnh ghi chú vắng có phép.
4. Giáo viên nhập Tên bài học giảng dạy, chọn Xếp loại tiết học và nhập nhận xét nề nếp.
5. Giáo viên nhấn button `[Ký xác nhận một chạm]`:
   * `TH1 (Chưa nhập tên bài dạy):` Hệ thống báo lỗi viền đỏ: *"Đồng chí chưa nhập Tên bài dạy theo phân phối chương trình"*.
   * `TH2 (Hợp lệ):`
     * Hệ thống lưu nội dung bài học vào bảng `classroom_period_attendances`.
     * Cập nhật trạng thái `is_signed = TRUE`, `signed_by = :teacher_id`, `signed_at = NOW()`.
     * Khóa sửa biểu mẫu tiết học này; toàn bộ dữ liệu trở thành bất biến.
     * Ghi nhật ký vào `audit_log`, tự động đồng bộ kết quả sang học bạ điện tử và CSDL ngành giáo dục.
     * Hiển thị toast thông báo ký sổ đầu bài thành công.

###### Sơ đồ tuần tự chức năng Sổ đầu bài Điện tử và Ký duyệt Tiết học

```mermaid
sequenceDiagram
    autonumber
    actor GV as Giáo viên Bộ môn
    participant CMS as Web CMS Sổ Đầu Bài
    participant BE as Backend Nghiệp vụ
    participant DB as CSDL PostgreSQL

    GV->>CMS: 1. Mở trang Sổ đầu bài tiết dạy của mình
    activate CMS
    CMS->>BE: 2. GET /api/v1/lesson-register/:period_id
    activate BE
    BE->>DB: 3. Lấy kết quả điểm danh AI & Thông tin tiết học
    DB-->>BE: 4. Sĩ số có mặt, vắng mặt, môn học
    BE-->>CMS: 5. Điền tự động thông tin lên biểu mẫu sổ
    deactivate BE

    GV->>CMS: 6. Nhập Tên bài dạy, Xếp loại tiết học & Nhận xét
    GV->>CMS: 7. Nhấn [Ký xác nhận một chạm]
    CMS->>BE: 8. POST /api/v1/lesson-register/:id/sign (nội dung, chữ ký)
    activate BE
    BE->>BE: 9. Kiểm tra trường bắt buộc *
    BE->>DB: 10. UPDATE classroom_period_attendances SET is_signed = TRUE, ...
    BE->>DB: 11. INSERT INTO audit_log (action = 'LESSON_REGISTER_SIGN')
    BE-->>CMS: 12. Trả kết quả ký duyệt thành công
    deactivate BE
    CMS-->>GV: 13. Chuyển sang badge "ĐÃ KÝ DUYỆT", khóa sửa biểu mẫu
    deactivate CMS
```

---

#### 5.4. UC-20: Báo cáo Thống kê Chuyên cần Định kỳ và Xuất Excel Streaming

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp bộ công cụ phân tích và tổng hợp số liệu chuyên cần đa chiều theo chu kỳ Ngày, Tuần, Tháng, Học kỳ và Năm học; cung cấp 8 mẫu báo cáo nghiệp vụ chuẩn mực của ngành giáo dục; ứng dụng công nghệ Apache POI với cấu hình bộ đệm `SXSSFWorkbook` giới hạn RAM 500 dòng và tự động tràn đĩa tạm, cho phép kết xuất tệp Excel dung lượng hàng trăm nghìn dòng dữ liệu mà không gây tràn bộ nhớ máy chủ; hỗ trợ kết xuất PDF chuẩn in ấn A4/A3 có mã QR xác thực tính toàn vẹn.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Người dùng có tài khoản vai trò Ban giám hiệu, Phòng Đào tạo hoặc Giáo viên chủ nhiệm.
* **Đường dẫn thao tác:** Web CMS → "Báo cáo Thống kê" → Danh mục 8 mẫu báo cáo → Chọn tiêu chí lọc → Nhấn [[Xuất Excel / PDF]].
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'REPORT_EXPORT'`, `report_type`, `filter_criteria`, `file_format = 'XLSX' / 'PDF'`, `exported_by`.
* **Quy định phân quyền:** Ban giám hiệu, Giáo viên chủ nhiệm (được xuất báo cáo lớp mình), Phòng Kế toán - Tài chính (đối soát tin nhắn SMS).

##### 2. Màn hình
* **Màn hình Trung tâm Báo cáo Thống kê (Default state):** Danh mục thẻ 8 mẫu báo cáo chuyên sâu:
  * Mẫu 1: Bảng điều khiển giám sát chuyên cần trực tiếp.
  * Mẫu 2: Báo cáo tổng hợp chuyên cần định kỳ (Ngày/Tuần/Tháng/Học kỳ).
  * Mẫu 3: Báo cáo học sinh đi muộn và theo dõi đối tượng bất thường.
  * Mẫu 4: Sổ điểm danh điện tử theo lớp (Mô phỏng Thông tư 22/2021/TT-BGDĐT).
  * Mẫu 5: Báo cáo mật độ lưu lượng và tải trọng cổng trường.
  * Mẫu 6: Báo cáo kiểm soát khách thăm và đối tượng lạ vào trường.
  * Mẫu 7: Báo cáo nhật ký tương tác và sản lượng tin nhắn SMS Brandname.
  * Mẫu 8: Báo cáo hiệu năng nhận diện AI và giám sát phần cứng GPU.
* **Hộp thoại Tùy chọn Xuất Báo cáo (Export Modal):** Chọn khoảng thời gian, chọn Khối/Lớp, chọn định dạng xuất: [[Xuất tệp Excel (.xlsx)]], [[Kết xuất PDF in ấn (.pdf)]].
* **Thanh tiến trình xuất dữ liệu lớn (Progress state):** Hiển thị thanh tiến trình streaming (ví dụ: "Đang kết xuất 15.000 dòng dữ liệu... 85%").

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Mẫu báo cáo * | Dropdown | INPUT | "Mẫu 2: Tổng hợp" | • Chọn 1 trong 8 mẫu báo cáo chuyên sâu. |
| 2 | Kỳ báo cáo * | Dropdown | INPUT | "Tháng này" | • Giá trị: "Hôm nay", "Tuần này", "Tháng này", "Học kỳ I", "Tùy chọn". |
| 3 | Khối học | Dropdown | INPUT | "TẤT CẢ" | • Lọc theo Khối 10, Khối 11, Khối 12 hoặc Toàn trường. |
| 4 | Lớp học | Dropdown | INPUT | "TẤT CẢ" | • Lọc theo lớp học cụ thể. |
| 5 | Nút Xem trước dữ liệu | Button | INPUT | N/A | • Hiển thị bảng dữ liệu tóm tắt trên màn hình Web. |
| 6 | Nút Xuất Excel Streaming | Button | INPUT | N/A | • Kích hoạt bộ tạo file Apache POI SXSSF không giới hạn dung lượng. |
| 7 | Nút Kết xuất PDF chuẩn in | Button | INPUT | N/A | • Tạo tệp PDF A4 chuẩn mẫu in có quốc hiệu và khung chữ ký. |

##### 4. Luồng nghiệp vụ
1. Người dùng truy cập "Báo cáo Thống kê" → Chọn mẫu báo cáo cần khai thác (ví dụ: Mẫu 2 - Báo cáo tổng hợp chuyên cần tháng).
2. Người dùng thiết lập các tiêu chí lọc: chọn Tháng 9/2026, chọn Khối 10 → Nhấn nút `[Xem trước]`.
3. Hệ thống thực thi câu lệnh SQL tổng hợp số liệu, hiển thị bảng xem trước trên màn hình gồm các chỉ số: Sĩ số danh bộ, Số lượt đúng giờ, Số lượt đi muộn, Số buổi nghỉ có phép/không phép, Tỷ lệ chuyên cần trung bình và xếp hạng thi đua nề nếp giữa các lớp.
4. Người dùng nhấn nút `[Xuất Excel Streaming]`:
   * Backend kích hoạt tiến trình xuất dữ liệu `ExportEngine`:
     * Khởi tạo đối tượng `SXSSFWorkbook` với tham số `rowAccessWindowSize = 500`.
     * Đọc tuần tự dữ liệu từ CSDL theo cơ chế con trỏ (Cursor Streaming), ghi liên tục từng dòng vào tệp Excel.
     * Khi bộ nhớ vượt quá 500 dòng, các dòng cũ tự động được ghi tràn xuống đĩa đệm tạm thời `/tmp/excel_buffer`, giải phóng hoàn toàn bộ nhớ RAM.
     * Áp dụng định dạng ô (Cell Style), kẻ khung viền, tính tổng tự động bằng công thức Excel động `SUM(...)` và `AVERAGE(...)`.
     * Đóng gói tệp `.xlsx` và truyền luồng tải về (Stream Download) trực tiếp về trình duyệt người dùng với tốc độ cao.
   * Ghi nhận 1 bản ghi kiểm toán vào `audit_log`: `action = 'REPORT_EXPORT'`.
   * Hiển thị toast thông báo: *"Xuất báo cáo Excel thành công"*.

###### Sơ đồ tuần tự chức năng Xuất Báo cáo Thống kê Hiệu năng cao

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng (BGH / Giáo viên)
    participant CMS as Web CMS Báo Cáo
    participant BE as Backend Export Service
    participant POI as Apache POI SXSSF Engine
    participant DB as CSDL PostgreSQL

    U->>CMS: 1. Chọn Mẫu báo cáo & Tiêu chí lọc (Tháng, Khối lớp)
    U->>CMS: 2. Nhấn [Xuất Excel Streaming]
    activate CMS
    CMS->>BE: 3. POST /api/v1/reports/export/excel (report_type, filters)
    activate BE
    BE->>POI: 4. Khởi tạo SXSSFWorkbook (windowSize = 500 dòng)
    BE->>DB: 5. Mở con trỏ đọc dữ liệu điểm danh theo lô (Batch Cursor)
    
    loop Đọc và ghi dữ liệu theo luồng
        DB-->>BE: 6.1. Trả về lô 1.000 bản ghi
        BE->>POI: 6.2. Ghi dòng dữ liệu & Tự động tràn đĩa đệm tạm
    end

    POI->>POI: 7. Kẻ khung viền & Chèn công thức Excel động
    POI-->>BE: 8. Hoàn tất đóng gói tệp .xlsx
    BE->>DB: 9. INSERT INTO audit_log (action = 'REPORT_EXPORT')
    BE-->>CMS: 10. Truyền luồng tệp tin về trình duyệt (Streaming Download)
    deactivate BE
    CMS-->>U: 11. Trình duyệt tải xuống tệp báo cáo hoàn chỉnh
    deactivate CMS
```

---

#### 5.5. UC-21: Quản trị Đối tác Webhook Ký số HMAC-SHA256 và Open API

##### 1. Thông tin chung chức năng
* **Mục đích chức năng:** Cung cấp cổng quản trị kết nối tích hợp mở đa nền tảng cho hệ thống mschool: quản lý danh sách các hệ thống đối tác bên ngoài (phần mềm quản lý trường học SIS, ứng dụng sổ liên lạc điện tử của trường, hệ thống CSDL ngành giáo dục EduSys / vnEdu); cấu hình điểm cuối nhận sự kiện (Webhook URL); cấp phát cặp khóa bí mật an toàn; cấu hình chữ ký số HMAC-SHA256 trên từng payload sự kiện; thiết lập chính sách tự động thử lại theo thuật toán Exponential Backoff và bộ ngắt mạch Circuit Breaker tự động cô lập điểm cuối mất kết nối.
* **Điều kiện tiên quyết / Trạng thái áp dụng:** Quản trị viên hệ thống có đặc quyền quản trị cổng tích hợp.
* **Đường dẫn thao tác:** Web CMS → "Cổng Tích Hợp" → "Quản lý Webhook & API" → Danh sách đối tác tích hợp.
* **Quy định ghi nhật ký hệ thống (Audit Log):** Ghi nhận `action = 'WEBHOOK_PARTNER_UPDATE'`, `partner_id`, `endpoint_url`, `secret_key_rotated = TRUE/FALSE`, `updated_by`.
* **Quy định phân quyền:** Duy nhất Quản trị viên hệ thống cấp cao (System Admin).

##### 2. Màn hình
* **Màn hình Quản trị Đối tác Webhook & API (Default state):** Bảng danh sách đối tác gồm: Tên đối tác (ví dụ: "Cổng SIS Trường Marie Curie", "Hệ thống EduSys Sở"), Điểm cuối Webhook URL, Trạng thái (Hoạt động / Ngắt mạch Circuit Breaker), Tỷ lệ gửi thành công (ví dụ: 99.8%), Thời gian phản hồi trung bình (ms) và Cột thao tác.
* **Hộp thoại Thêm mới / Cập nhật Đối tác (Modal state):** Form nhập tên đối tác, Webhook Endpoint URL, danh sách sự kiện đăng ký nhận (Học sinh vào trường, Học sinh tan học, Cảnh báo đi muộn, Đổi trạng thái điểm danh), nút [[Tạo mới mã khóa bí mật HMAC]] và nút [[Gửi gói tin kiểm tra kết nối (Ping Test)]].
* **Trạng thái Ngắt mạch Circuit Breaker (Alert state):** Hiển thị nhãn cảnh báo đỏ "CIRCUIT OPEN" khi đối tác bị lỗi liên tiếp quá 5 lần; hệ thống tự động tạm ngưng gửi trong 60 giây để chống nghẽn luồng.

##### 3. Mô tả chi tiết các thành phần

| STT | Tên | Kiểu dữ liệu [Độ dài dữ liệu] | Input/Output | Giá trị khởi tạo | Mô tả (Mapping CSDL & Ràng buộc) |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | Tên hệ thống đối tác * | Textbox(100) | INPUT | Để trống | • Tên ứng dụng đối tác `webhook_partners.partner_name`. |
| 2 | Điểm cuối Webhook URL * | Textbox(255) | INPUT | "https://" | • Bắt buộc sử dụng giao thức HTTPS bảo mật `webhook_partners.endpoint_url`. |
| 3 | Khóa bí mật HMAC * | Secret String | OUTPUT | Sinh ngẫu nhiên | • Chuỗi Hex ngẫu nhiên 64 ký tự dùng để ký số HMAC-SHA256. |
| 4 | Danh sách sự kiện nhận * | Checkbox Group | INPUT | Chọn tất cả | • `STUDENT_CHECKIN`, `STUDENT_CHECKOUT`, `STUDENT_TARDY`, `ATTENDANCE_OVERRIDE`. |
| 5 | Số lần thử lại tối đa | Number(2) | INPUT | 5 lần | • Số lần thử lại theo Exponential Backoff (1s, 2s, 4s, 8s, 16s). |
| 6 | Nút Gửi kiểm tra Ping | Button | INPUT | N/A | • Gửi gói tin giả lập kiểm tra tính phản hồi của điểm cuối đối tác. |

##### 4. Luồng nghiệp vụ
1. Quản trị viên truy cập "Cổng Tích Hợp" → "Quản lý Webhook & API".
2. Quản trị viên nhấn [[Thêm mới đối tác]] → Điền tên hệ thống đối tác, nhập Webhook URL và chọn các sự kiện muốn đồng bộ.
3. Hệ thống tự động sinh một mã khóa bí mật HMAC-SHA256 duy nhất (Secret Key) gồm 64 ký tự hex ngẫu nhiên.
4. Quản trị viên nhấn nút `[Gửi kiểm tra Ping]`:
   * Hệ thống tạo gói tin payload mẫu `{"event": "PING", "timestamp": 1774260000}`, tính mã băm HMAC-SHA256, đặt vào Header `X-Hub-Signature-256` và gửi lệnh POST tới Webhook URL.
   * `TH1 (Điểm cuối trả về mã lỗi HTTP khác 2xx hoặc quá thời gian chờ Timeout 3s):` Hệ thống báo lỗi viền đỏ: *"Không thể kết nối tới điểm cuối Webhook. Mã lỗi: [MÃ_LỖI] hoặc hết thời gian chờ"*.
   * `TH2 (Điểm cuối phản hồi HTTP 200 OK):` Hệ thống hiển thị tích xanh "KẾT NỐI THÀNH CÔNG (Độ trễ: 125ms)".
5. Quản trị viên nhấn button `[Lưu cấu hình đối tác]`:
   * Lưu thông tin vào bảng `webhook_partners`, mã hóa lưu trữ Secret Key trong CSDL.
   * Kích hoạt tiến trình nền `WebhookDispatcherService.java` sẵn sàng phát sự kiện.
6. **Cơ chế Phát sự kiện thời gian thực và Xử lý Lỗi ngoại tuyến:**
   * Khi có sự kiện điểm danh mới được ghi nhận vào bảng `outbox_events`:
     * Tiến trình nền quét hàng đợi Outbox theo chu kỳ 1 giây.
     * Lấy danh sách các đối tác đăng ký sự kiện tương ứng, tạo payload JSON chuẩn, ký số HMAC-SHA256 và gửi bất đồng bộ qua HTTPS POST.
     * Nếu đối tác mất kết nối tạm thời: Hệ thống tự động kích hoạt thuật toán thử lại Exponential Backoff sau 1s, 2s, 4s, 8s... tối đa 60s.
     * Nếu lỗi liên tiếp vượt quá 5 lần: Bộ ngắt mạch Circuit Breaker tự động chuyển trạng thái sang `OPEN`, tạm dừng gửi tới đối tác này trong 60 giây để giải phóng tài nguyên hàng đợi, bảo đảm toàn bộ hệ thống mschool không bao giờ bị ảnh hưởng bởi sự cố của bên thứ ba.

###### Sơ đồ tuần tự chức năng Quản trị Đối tác Webhook Ký số và Phát sự kiện

```mermaid
sequenceDiagram
    autonumber
    participant BE as Backend Outbox Engine
    participant DB as CSDL PostgreSQL
    participant WH as Động cơ Webhook Dispatcher
    participant CB as Bộ Ngắt Mạch Circuit Breaker
    participant PARTNER as Cổng Nhận Webhook Đối Tác

    loop Chu kỳ quét hàng đợi Outbox mỗi 1 giây
        BE->>DB: 1. SELECT * FROM outbox_events WHERE status = 'PENDING' LIMIT 100
        DB-->>BE: 2. Danh sách 100 sự kiện điểm danh mới
    end

    BE->>WH: 3. Đẩy danh sách sự kiện sang Webhook Dispatcher
    activate WH
    WH->>CB: 4. Kiểm tra trạng thái mạch kết nối đối tác
    alt Mạch đang ĐÓNG (CLOSED - Bình thường)
        WH->>WH: 5. Ký số HMAC-SHA256 trên payload JSON
        WH->>PARTNER: 6. POST https://partner/webhook (Header: X-Hub-Signature-256)
        activate PARTNER
        alt Đối tác phản hồi HTTP 200 OK
            PARTNER-->>WH: 7.1. 200 OK
            WH->>DB: 7.2. UPDATE outbox_events SET status = 'DELIVERED'
        else Đối tác báo lỗi HTTP 5xx hoặc Timeout
            PARTNER-->>WH: 8.1. Lỗi kết nối
            WH->>WH: 8.2. Kích hoạt Retry Exponential Backoff (1s, 2s, 4s...)
            opt Khi lỗi liên tiếp > 5 lần
                WH->>CB: 8.3. Chuyển trạng thái mạch sang MỞ (OPEN)
                Note over CB: Tạm dừng gửi 60 giây để chống nghẽn luồng
            end
        end
        deactivate PARTNER
    else Mạch đang MỞ (OPEN - Điểm cuối đối tác đang mất kết nối)
        WH->>DB: 9. Tạm giữ sự kiện trong CSDL chờ phục hồi
    end
    deactivate WH
```

---

## PHẦN IV: YÊU CẦU PHI CHỨC NĂNG VÀ RÀNG BUỘC KỸ THUẬT

### 4.1. Yêu Cầu Về Hiệu Năng và Năng Lực Tải Cao

1. **Thời gian phản hồi nhận diện không dừng tại cổng trường:**
   * Độ trễ toàn trình từ thời điểm học sinh bước qua vạch ảo cổng đến khi hiển thị kết quả và phát sự kiện Webhook đạt cam kết **dưới 300ms** (gồm: trích xuất ảnh 10ms, trích xuất vector ArcFace GPU 15ms, đối soát RAM Index 0.25ms, ghi CSDL và bắn sự kiện < 5ms).
2. **Năng lực xử lý điểm danh toàn cảnh phòng học:**
   * Thời gian bóc tách đồng thời 40 khuôn mặt trong ảnh toàn cảnh góc rộng lớp học bằng mô hình SCRFD đạt cam kết **dưới 25ms / ảnh**.
   * Thời gian hoàn tất đối soát sĩ số và cập nhật Sổ đầu bài điện tử cho toàn bộ 50 phòng học đạt cam kết **dưới 15 giây** kể từ thời điểm chụp.
3. **Năng lực chịu tải đỉnh dồn dập:**
   * Hệ thống bảo đảm xử lý thông suốt thông lượng từ **30 đến 60 giao dịch/giây (TPS)** tại các cổng trường trong khung giờ cao điểm sáng sớm (06h45 - 07h30) mà không phát sinh hiện tượng nghẽn hàng đợi hay tăng thời gian trễ.
4. **Tối ưu hóa tiêu thụ tài nguyên phần cứng máy chủ biên `micro-server`:**
   * GPU NVIDIA RTX 3060: Tải tính toán (Compute Load) trong giờ cao điểm duy trì ổn định trong khoảng **35% – 50%**, dung lượng VRAM chiếm dụng dưới **1.5 GB / 12 GB** (dư hơn 10 GB VRAM an toàn).
   * CPU Intel Xeon 32 luồng: Tiếp nhận đồng thời 4 luồng RTSP 1080p và giải mã không đệm chỉ chiếm từ **6 đến 8 Core CPU** (khoảng 20% – 25% công suất CPU).
   * Bộ nhớ RAM 62GB: Kho vector Permanent và Visitor Index trong RAM chiếm dưới **50 MB** (dưới 0.1% tổng dung lượng RAM).

---

### 4.2. Yêu Cầu Về An Toàn Thông Tin và Bảo Vệ Dữ Liệu Sinh Trắc Học

1. **Mã hóa dữ liệu nhạy cảm và sinh trắc học:**
   * Toàn bộ vector đặc trưng khuôn mặt 512 chiều được mã hóa bằng thuật toán đối xứng **AES-256** trước khi ghi xuống cơ sở dữ liệu PostgreSQL bền vững.
   * Mật khẩu đăng nhập quản trị được băm an toàn bằng thuật toán **BCrypt** với hệ số muối cost = 12.
   * Mật khẩu và dữ liệu định danh truyền mạng được mã hóa bất đối xứng sử dụng cặp khóa **RSA 2048-bit**.
2. **Bảo vệ kênh truyền mạng và phân vùng an ninh:**
   * Bắt buộc sử dụng giao thức **HTTPS với chuẩn mã hóa an toàn TLS 1.3** trên toàn bộ các kênh kết nối bên ngoài.
   * Phân vùng mạng Camera IP (VLAN 20) bị cô lập tuyệt đối, không có cổng truy cập ra mạng Internet công cộng nhằm triệt tiêu hoàn toàn nguy cơ rò rỉ hình ảnh học sinh.
3. **Bảo mật Tầng Web CMS và Cổng API Tích hợp:**
   * Thiết lập các chính sách an ninh trình duyệt nghiêm ngặt: Content Security Policy (CSP), CORS giới hạn tên miền tin cậy, kích hoạt cờ `HttpOnly`, `SameSite=Strict`, `Secure` cho cookie phiên.
   * Xác thực và chống giả mạo gói tin Webhook bằng chữ ký số **HMAC-SHA256** (HTTP Header `X-Hub-Signature-256`) cấp riêng cho từng đối tác.
   * Kiểm soát chặt chẽ quyền hạn vai trò người dùng theo mô hình **RBAC** trên 100% các nhánh API endpoint theo nguyên tắc Mặc định từ chối (Default Deny).
4. **Nhật ký kiểm toán bất biến (Audit Log):**
   * Lưu vết 100% các thao tác thêm, sửa, xóa, điều chỉnh điểm danh Maker-Checker, trích xuất báo cáo và thay đổi cấu hình hệ thống; thời gian lưu trữ nhật ký kiểm toán tối thiểu **2 năm (730 ngày)** phục vụ thanh tra an toàn thông tin.

---

### 4.3. Yêu Cầu Về Tính Sẵn Sàng và Dự Phòng Thảm Họa

1. **Mục tiêu thời gian và tính toàn vẹn dữ liệu:**
   * Cam kết mục tiêu thời gian phục hồi dịch vụ: **RTO ≤ 15 phút**.
   * Cam kết mục tiêu bảo toàn trọn vẹn dữ liệu điểm danh: **RPO = 0** (không thất thoát bất kỳ bản ghi điểm danh nào).
2. **Cơ chế hoạt động ngoại tuyến biên (Offline Local Resilience):**
   * Khi đường truyền mạng Internet từ trường học ra ngoài bị gián đoạn (WAN Outage), máy chủ biên `micro-server` tại trường vẫn tiếp tục nhận diện khuôn mặt và ghi nhận điểm danh chuyên cần hoàn toàn bình thường vào CSDL nội bộ. Các sự kiện Webhook/SMS được tích lũy an toàn trong hàng đợi Outbox và tự động đồng bộ bù ngay khi kết nối Internet được phục hồi.
3. **Chính sách sao lưu dữ liệu tự động:**
   * Sao lưu toàn phần (Full Backup) cơ sở dữ liệu và cấu hình hệ thống tự động vào khung giờ thấp điểm lúc **02:00 sáng Chủ nhật hàng tuần**, lưu trữ an toàn tối thiểu 6 tháng tại kho lưu trữ độc lập.
   * Sao lưu gia tăng (Incremental Backup) nhật ký ghi trước Write-Ahead Logging (WAL) liên tục hàng ngày, cho phép khôi phục hệ thống về bất kỳ mốc thời gian chính xác nào trong quá khứ.

---

### 4.4. Yêu Cầu Về Khả Năng Tương Thích và Tích Hợp Hệ Sinh Thái

1. **Chuẩn hóa Giao diện Lập trình Ứng dụng (API):**
   * Toàn bộ các API tích hợp mở được đặc tả đầy đủ theo chuẩn **OpenAPI 3.0 (Swagger)**, hỗ trợ tài liệu tương tác trực quan và tự động sinh mã nguồn máy khách (Client SDK).
   * Định dạng trao đổi dữ liệu chuẩn **JSON UTF-8**, tuân thủ nguyên tắc thiết kế RESTful API chuẩn mực.
2. **Khả năng mở rộng đa điểm trường (Multi-Campus Scalability):**
   * Kiến trúc phần mềm hỗ trợ mô hình cấu hình động phân cấp 4 tầng, sẵn sàng mở rộng từ 1 trường học đơn lẻ lên chuỗi trường học liên cấp với hàng chục cơ sở đào tạo mà không cần thay đổi cấu trúc mã nguồn lõi.
