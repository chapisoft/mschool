# mschool — HỆ THỐNG ĐIỂM DANH KHÔNG DỪNG VÀ KIỂM SOÁT RA VÀO QUA CAMERA IP

**mschool (Smart Campus)** là giải pháp chuyển đổi số toàn diện công tác quản trị trường học thông minh và doanh nghiệp, ứng dụng công nghệ thị giác máy tính và trí tuệ nhân tạo (AI) chạy trực tiếp tại biên trên hạ tầng máy chủ cục bộ (`micro-server`: GPU NVIDIA RTX 3060 12GB VRAM, CPU Intel Xeon 32 luồng, 62GB RAM).

---

## 1. TỔNG QUAN HỆ THỐNG TÀI LIỆU KỸ THUẬT

Toàn bộ tài liệu của dự án đã được hợp nhất và chuẩn hóa tinh gọn thành 4 tài liệu chính thức:

| STT | Tài liệu | Loại tài liệu | Mô tả tóm tắt nội dung | Đường dẫn liên kết |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Kế Hoạch Triển Khai & Tiến Độ Đợt 1** | Round 1 Plan & Progress | Phân rã 4 Phase, 6 Sprints, 20 Tasks (22 Man-Days); phân định rõ ràng giữa UPDATE MIAI và NEW MSCHOOL kèm báo cáo tiến độ thực tế 65% hoàn thành. | [round1.md](file:///Users/micro/Source/chapisoft/mschool/docs/plan/round1.md) |
| 2 | **Báo Cáo Đánh Giá Tiền Khả Thi** | Feasibility Study Report | Đánh giá năng lực mã nguồn codebase sẵn có (`base-ai`, `base-be`, `base-sdk`), kiểm chứng tải máy chủ `micro-server` (RTX 3060), phân tích Gap Analysis (22 Man-Days), TCO & ROI. | [feasibility_report.md](file:///Users/micro/Source/chapisoft/mschool/docs/feasibility_report.md) |
| 3 | **Giải Pháp Tổng Thể & Kế Hoạch Triển Khai** | Master Solution & Proposal | Bối cảnh, mục tiêu SMART, bản đồ năng lực, kiến trúc 4 tầng, ma trận đáp ứng REQ-01 đến REQ-09, lộ trình phân kỳ 6 tuần, đo kiểm 3 tầng thực chứng, quản trị rủi ro và cam kết SLA. | [master_solution.md](file:///Users/micro/Source/chapisoft/mschool/docs/master_solution.md) |
| 4 | **Thiết Kế Kỹ Thuật & Thuật Toán Hệ Thống** | Technical Solution / HLD | Phân vùng mạng an ninh, sơ đồ phân rã chức năng dạng cây 3 tầng, thuật toán ByteTrack, eDifFIQA, Cooldown 90s, Daily Session State Machine, điểm danh 40 HS/ảnh trong lớp, định cỡ tải máy chủ và lược đồ CSDL PostgreSQL. | [technical_solution.md](file:///Users/micro/Source/chapisoft/mschool/docs/technical_solution.md) |

---

## 2. BỘ SƠ ĐỒ KIẾN TRÚC & QUY TRÌNH TƯƠNG TÁC (ARCHIFY)

Hệ thống cung cấp trọn bộ 5 sơ đồ trực quan tương tác cao, kết xuất đa định dạng (PNG, SVG, HTML tương tác và JSON nguồn):

1. **Bản Đồ Năng Lực Nghiệp Vụ Toàn Diện:**
   * Hình ảnh: `docs/diagrams/png/business_capability.png`
   * Bản vẽ vector: `docs/diagrams/svg/business_capability.svg`
   * Sơ đồ tương tác: `docs/diagrams/html/business_capability.html`
2. **Kiến Trúc Kỹ Thuật Hệ Thống 4 Tầng:**
   * Hình ảnh: `docs/diagrams/png/system_architecture.png`
   * Bản vẽ vector: `docs/diagrams/svg/system_architecture.svg`
   * Sơ đồ tương tác: `docs/diagrams/html/system_architecture.html`
3. **Quy Trình Điểm Danh Không Dừng & State Machine Cổng:**
   * Hình ảnh: `docs/diagrams/png/gate_attendance_flow.png`
   * Bản vẽ vector: `docs/diagrams/svg/gate_attendance_flow.svg`
   * Sơ đồ tương tác: `docs/diagrams/html/gate_attendance_flow.html`
4. **Lộ Trình Phân Kỳ Triển Khai Thực Nghiệm 6 Tuần:**
   * Hình ảnh: `docs/diagrams/png/rollout_roadmap.png`
   * Bản vẽ vector: `docs/diagrams/svg/rollout_roadmap.svg`
   * Sơ đồ tương tác: `docs/diagrams/html/rollout_roadmap.html`
5. **Bản Đồ Giá Trị Hệ Sinh Thái Học Đường:**
   * Hình ảnh: `docs/diagrams/png/value_map.png`
   * Bản vẽ vector: `docs/diagrams/svg/value_map.svg`
   * Sơ đồ tương tác: `docs/diagrams/html/value_map.html`

---

## 3. CÁC THÔNG SỐ VẬN HÀNH TRỌNG TÂM

* **Tỷ lệ nhận diện đúng (TAR):** Đạt **≥ 98.5%** trong điều kiện ánh sáng tự nhiên tại cổng trường.
* **Tỷ lệ nhận diện sai (FAR):** Tuyệt đối **≤ 0.01%** (dưới 1 trên 10.000 lượt quét).
* **Độ trễ nhận diện và mở cổng:** **≤ 300ms** khi học sinh đang bước đi bình thường (cự ly 2m – 5m).
* **Thời gian điểm danh 1 lớp học 40 học sinh:** **≤ 0.8 giây** qua 1 ảnh góc rộng toàn cảnh.
* **Thời gian thông báo đến Phụ huynh:** Đẩy thông báo biến động điểm danh về ứng dụng di động trong vòng **≤ 2.0 giây**.
* **Năng lực máy chủ:** 1 máy chủ `micro-server` duy nhất phục vụ trọn vẹn trường học quy mô từ 1.500 đến 3.000 học sinh cùng 50 phòng học.
* **Bảo vệ dữ liệu cá nhân:** Tuân thủ 100% **Nghị định số 13/2023/NĐ-CP**, không lưu ảnh gốc (Zero Raw Face Storage), mã hóa vector chuẩn AES-256 và tự hủy dữ liệu người lạ sau 24 giờ.