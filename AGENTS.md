# QUY TẮC VẬN HÀNH DỰ ÁN MSCHOOL (WORKSPACE RULES)

Tài liệu này quy định các nguyên tắc vận hành, kiểm soát mã nguồn và tiêu chuẩn kỹ thuật áp dụng cho toàn bộ hoạt động phát triển của hệ thống **mschool**.

---

## 1. NGUYÊN TẮC KIỂM SOÁT MÃ NGUỒN (SOURCE CONTROL RULES)

* **Không tự động commit mã nguồn (No Auto-commit):**
  * Tuyệt đối không tự ý thực hiện lệnh `git add` hoặc `git commit` khi chưa có yêu cầu rõ ràng từ người dùng.
* **Bắt buộc rà soát `git diff` trước khi commit:**
  * Khi được yêu cầu commit, bắt buộc phải chạy lệnh `git diff --cached` (hoặc `git diff`) để tự rà soát lại 100% các thay đổi.
  * Tuyệt đối không commit mù quáng. Đảm bảo các script tự động hoặc refactoring không vô tình xóa code nghiệp vụ thật và thay thế bằng code khung rỗng (skeleton, fixme). Nếu phát hiện bất thường, phải `git restore` ngay lập tức.

---

## 2. NGUYÊN TẮC GIỮ GÌN KHÔNG GIAN LÀM VIỆC SẠCH SẼ (WORKSPACE CLEANLINESS)

* **Không tùy tiện tạo file rác/file tạm ở thư mục gốc (Root Directory):**
  * Bất kỳ file script (`.sh`, `.js`, `.py`, `.sql`), file kiểm tra hệ thống, hoặc file dữ liệu tạm thời nào chỉ dùng 1 lần thì phải được tạo trong thư mục `scratch/` của `brain` hoặc xóa ngay lập tức sau khi kiểm tra xong.
* **Tự động dọn dẹp sau mỗi tác vụ:**
  * Trước khi kết thúc một tác vụ hoặc checkpoint, bắt buộc phải kiểm tra lại toàn bộ các thư mục thao tác và xóa sạch các file tạm, giữ cho cây thư mục dự án luôn tinh gọn, chuẩn mực.

---

## 3. NGUYÊN TẮC HOÀN THÀNH TRỌN VẸN TÁC VỤ 100% (TASK COMPLETENESS)

* **Tuyệt đối không bỏ qua bất kỳ yêu cầu/hạng mục con nào:**
  * Phải hoàn thành 100% tất cả các chi tiết được liệt kê trong yêu cầu (validation, ghi nhật ký log, bảo mật, xử lý ngoại lệ, đa ngôn ngữ).
  * Tuyệt đối không lấy lý do "làm nhanh đợt 1", "chỉ tập trung luồng chính" hay "tạm gác lại" để bỏ qua các yêu cầu của người dùng trừ khi có chỉ định rõ ràng từ người dùng.

---

## 4. NGUYÊN TẮC BẢO TỒN VÀ NÂNG CẤP MÃ NGUỒN (CODE GENERATION & INTEGRITY)

* **Không ghi đè mù quáng (No Blind Overwrite):**
  * Mọi logic sinh mã phải áp dụng cơ chế **Parse & Merge** (đọc hiểu file hiện tại và chỉ chèn/cập nhật những phần cần thiết) để bảo tồn 100% mã nguồn nghiệp vụ đã được triển khai trước đó.
* **Phân tích ảnh hưởng toàn cục khi refactor (Impact Analysis):**
  * Mỗi khi thay đổi định dạng API, tên hàm dùng chung hoặc kiểu dữ liệu, bắt buộc phải dùng `grep_search` để rà soát và cập nhật đồng bộ toàn bộ các tệp liên quan.

---

## 5. NGUYÊN TẮC KIỂM TRA NỘI BỘ TRƯỚC KHI BÀN GIAO (LOCAL VERIFICATION)

* **Kiểm tra biên dịch và kiểm thử tại máy cục bộ:**
  * Trước khi bàn giao công việc, bắt buộc phải thực thi lệnh kiểm tra biên dịch/build (ví dụ: `npm run build`, `mvn test`, linter) để đảm bảo không phát sinh lỗi Type Check hoặc gãy build.
* **Không phó mặc việc phát hiện lỗi cho hệ thống CI/CD.**

---

## 6. DANH MỤC QUY CHUẨN VÀ KỸ NĂNG KẾ THỪA

Dự án áp dụng toàn diện hệ thống quy chuẩn tại [GEMINI.md](file:///Users/micro/Source/chapisoft/mschool/GEMINI.md) và các bộ quy chuẩn chi tiết:
* Quy chuẩn Viết tài liệu toàn cục: [.agents/rules/documentation_guidelines.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/documentation_guidelines.md)
* Quy chuẩn SRS / TKCT: [.agents/rules/srs_authoring_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/srs_authoring_rules.md)
* Quy chuẩn LLD: [.agents/rules/lld_authoring_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/lld_authoring_rules.md)
* Quy chuẩn HLD Viettel: [.agents/rules/hld_authoring_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/hld_authoring_rules.md)
* Quy chuẩn DBDD Viettel: [.agents/rules/db_design_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/db_design_rules.md)
* Quy chuẩn Backend Hexagonal: [.agents/rules/be_process_spec_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/be_process_spec_rules.md)
* Quy chuẩn Frontend UI/UX: [.agents/rules/ui_design_spec_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/ui_design_spec_rules.md)
* Quy chuẩn Kiểm thử tải cao: [.agents/rules/loadtest_concurrency_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/loadtest_concurrency_rules.md)
* Quy chuẩn Nghiệm thu UAT Viettel: [.agents/rules/viettel_uat_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/viettel_uat_rules.md)
* Quy chuẩn Rà soát Bảo mật & Pentest: [.agents/rules/security_review_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/security_review_rules.md) và [.agents/rules/pentest_assessment_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/pentest_assessment_rules.md)
* Quy chuẩn Import/Export Engine: [.agents/rules/enterprise_import_export_rules.md](file:///Users/micro/Source/chapisoft/mschool/.agents/rules/enterprise_import_export_rules.md)
