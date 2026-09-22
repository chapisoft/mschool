-- ==============================================================================
-- MSCHOOL SEED DATA (DỮ LIỆU KHỞI TẠO DEMO CHUẨN DOANH NGHIỆP)
-- 100% Zero-Hardcode, Thống nhất Enums, Không mock tĩnh ở Frontend
-- ==============================================================================

-- 1. Dữ liệu thiết bị Camera IP và Vạch ảo
INSERT INTO device_cameras (id, name, ip_address, rtsp_url, location, status, fps, tripwire_direction) VALUES
('CAM_GATE_01', 'Cổng Chính - Luồng Đi Vào 01', '192.168.10.101', 'rtsp://admin:mschool2026@192.168.10.101:554/live', 'Cổng Chính (Vào)', 'ONLINE', 25, 'CHECK_IN'),
('CAM_GATE_02', 'Cổng Chính - Luồng Đi Ra 02', '192.168.10.102', 'rtsp://admin:mschool2026@192.168.10.102:554/live', 'Cổng Chính (Ra)', 'ONLINE', 25, 'CHECK_OUT'),
('CAM_GATE_03', 'Cổng Phụ Bốt Bảo Vệ - Luồng Xe', '192.168.10.103', 'rtsp://admin:mschool2026@192.168.10.103:554/live', 'Cổng Phụ', 'ONLINE', 25, 'BIDIRECTIONAL'),
('CAM_CLASS_10A1', 'Camera Phòng Học 10A1', '192.168.20.101', 'rtsp://admin:mschool2026@192.168.20.101:554/live', 'Phòng A1-201', 'ONLINE', 20, 'BIDIRECTIONAL')
ON CONFLICT (id) DO NOTHING;

-- 2. Dữ liệu danh mục phòng học và lớp học
INSERT INTO classrooms (id, code, name, grade_level, room, building, floor, homeroom_teacher, total_students) VALUES
('10A1', '10A1', 'Lớp 10 Chuyên Toán', 10, 'A1-201', 'Dãy Nhà A', 2, 'Thầy Nguyễn Văn Nam', 40),
('10A2', '10A2', 'Lớp 10 Chuyên Lý', 10, 'A1-202', 'Dãy Nhà A', 2, 'Cô Nguyễn Thị Bình', 42),
('10A3', '10A3', 'Lớp 10 Chuyên Hóa', 10, 'A1-203', 'Dãy Nhà A', 2, 'Cô Phạm Thị Lan', 40),
('11A1', '11A1', 'Lớp 11 Tự Nhiên 1', 11, 'B2-301', 'Dãy Nhà B', 3, 'Thầy Lê Hoàng Minh', 44),
('11A2', '11A2', 'Lớp 11 Tự Nhiên 2', 11, 'B2-302', 'Dãy Nhà B', 3, 'Cô Trần Thị Mai', 41),
('12A1', '12A1', 'Lớp 12 Ôn Thi Quốc Gia', 12, 'C3-101', 'Dãy Nhà C', 1, 'Thầy Đặng Phúc Hưng', 40),
('12A2', '12A2', 'Lớp 12 Ban Tự Nhiên', 12, 'C3-102', 'Dãy Nhà C', 1, 'Thầy Vũ Văn Bách', 39)
ON CONFLICT (id) DO NOTHING;

-- 3. Hồ sơ sinh trắc học học sinh và giáo viên
INSERT INTO face_biometric_profiles (identity_code, subject_type, full_name, department_or_class, embedding_primary, quality_score, is_active) VALUES
('HS10A101', 'STUDENT', 'Nguyễn Hoàng Long', '10A1', array_fill(0.045::real, ARRAY[512])::vector, 0.95, true),
('HS10A102', 'STUDENT', 'Lê Tuấn Kiệt', '10A1', array_fill(0.042::real, ARRAY[512])::vector, 0.92, true),
('HS10A103', 'STUDENT', 'Phạm Quỳnh Chi', '10A1', array_fill(0.048::real, ARRAY[512])::vector, 0.96, true),
('HS10A104', 'STUDENT', 'Lê Mai', '10A1', array_fill(0.041::real, ARRAY[512])::vector, 0.89, true),
('HS10A105', 'STUDENT', 'Trần Đức', '10A1', array_fill(0.043::real, ARRAY[512])::vector, 0.91, true),
('HS11A205', 'STUDENT', 'Trần Thị Mai Phương', '11A2', array_fill(0.044::real, ARRAY[512])::vector, 0.93, true),
('HS12A110', 'STUDENT', 'Vũ Quốc Anh', '12A1', array_fill(0.046::real, ARRAY[512])::vector, 0.94, true),
('GV_TOAN01', 'TEACHER', 'Thầy Nguyễn Văn Nam', 'Tổ Toán - Tin', array_fill(0.050::real, ARRAY[512])::vector, 0.98, true),
('GV_LY01', 'TEACHER', 'Thầy Vũ Văn 1', 'Tổ Vật Lý', array_fill(0.049::real, ARRAY[512])::vector, 0.97, true),
('CB_BV01', 'STAFF', 'Trần Văn Bảo (Bảo vệ)', 'Tổ Bảo Vệ', array_fill(0.040::real, ARRAY[512])::vector, 0.91, true)
ON CONFLICT (identity_code) DO NOTHING;

-- 4. Phiên điểm danh trong ngày hôm nay (Daily Attendance Sessions)
INSERT INTO daily_attendance_sessions (identity_code, session_date, check_in_at, attendance_status, total_present_minutes, check_in_camera_id) VALUES
('HS10A101', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '2 hour', 'PRESENT', 120, 'CAM_GATE_01'),
('HS10A102', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minute', 'LATE', 105, 'CAM_GATE_02'),
('HS10A103', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '2 hour 10 minute', 'PRESENT', 130, 'CAM_GATE_01'),
('HS11A205', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '2 hour 5 minute', 'PRESENT', 125, 'CAM_GATE_01'),
('HS12A110', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minute', 'LATE', 90, 'CAM_GATE_02'),
('HS10A104', CURRENT_DATE, NULL, 'ABSENT', 0, NULL),
('HS10A105', CURRENT_DATE, NULL, 'ABSENT', 0, NULL)
ON CONFLICT (identity_code, session_date) DO NOTHING;

-- 5. Sổ đầu bài điện tử và điểm danh tiết học (Classroom Period Attendances)
INSERT INTO classroom_period_attendances (class_id, period_number, schedule_date, scheduled_teacher_code, actual_teacher_code, total_students_enrolled, total_students_present, absent_student_codes, wrong_class_student_codes, is_confirmed_by_teacher) VALUES
('10A1', 1, CURRENT_DATE, 'GV_TOAN01', 'GV_TOAN01', 40, 40, ARRAY[]::text[], ARRAY[]::text[], true),
('10A1', 2, CURRENT_DATE, 'GV_LY01', 'GV_LY01', 40, 38, ARRAY['HS10A104', 'HS10A105'], ARRAY[]::text[], false),
('10A1', 3, CURRENT_DATE, 'GV_HOA01', 'GV_HOA01', 40, 38, ARRAY['HS10A104', 'HS10A105'], ARRAY[]::text[], false),
('10A1', 4, CURRENT_DATE, 'GV_VAN01', 'GV_VAN01', 40, 38, ARRAY['HS10A104', 'HS10A105'], ARRAY[]::text[], false)
ON CONFLICT (class_id, period_number, schedule_date) DO NOTHING;

-- 6. Đăng ký khách và phụ huynh có thời hạn hiệu lực (Visitor Registrations)
INSERT INTO visitor_registrations (visitor_code, full_name, phone_number, visitor_type, target_identity_code, embedding, valid_from, valid_to, status, approved_by) VALUES
('VIS_092201', 'Nguyễn Văn Hùng (Bố)', '0912345678', 'PARENT', 'HS10A101', array_fill(0.040::real, ARRAY[512])::vector, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '8 hour', 'APPROVED', 'GiamThi.Nguyen'),
('VIS_092202', 'Trần Thị Thảo (Mẹ)', '0988765432', 'PARENT', 'HS11A205', array_fill(0.041::real, ARRAY[512])::vector, CURRENT_TIMESTAMP - INTERVAL '30 minute', CURRENT_TIMESTAMP + INTERVAL '8 hour', 'APPROVED', 'GiamThi.Nguyen'),
('VIS_092203', 'Công ty Cung cấp Thiết bị Điện máy', '0903112233', 'CONTRACTOR', 'GV_TOAN01', array_fill(0.039::real, ARRAY[512])::vector, CURRENT_TIMESTAMP - INTERVAL '2 hour', CURRENT_TIMESTAMP + INTERVAL '4 hour', 'CHECKED_IN', 'BaoVe.Tran')
ON CONFLICT (visitor_code) DO NOTHING;

-- 7. Nhật ký người lạ lảng vảng (Stranger Access Logs)
INSERT INTO stranger_access_logs (camera_id, captured_image_path, embedding, appeared_at, is_alerted, is_resolved) VALUES
('CAM_GATE_01', 's3://attendance-snapshots/strangers/20260922_gate01_01.jpg', array_fill(0.035::real, ARRAY[512])::vector, CURRENT_TIMESTAMP - INTERVAL '25 minute', true, false),
('CAM_GATE_03', 's3://attendance-snapshots/strangers/20260922_gate03_01.jpg', array_fill(0.036::real, ARRAY[512])::vector, CURRENT_TIMESTAMP - INTERVAL '10 minute', true, false);

-- 8. Nhật ký kiểm toán mẫu (Audit Logs)
INSERT INTO audit_logs (tenant_id, user_name, action_code, entity_name, entity_id, reason, ip_address, created_at) VALUES
('DEFAULT_SCHOOL', 'giamthi.lethanh', 'OVERRIDE_ATTENDANCE', 'daily_attendance_sessions', 'HS10A104', 'Phụ huynh nộp giấy khám bệnh của viện nhi', '192.168.1.45', CURRENT_TIMESTAMP - INTERVAL '3 hour'),
('DEFAULT_SCHOOL', 'admin.kythuat', 'CAMERA_CONFIG_UPDATE', 'device_cameras', 'CAM_GATE_01', 'Điều chỉnh tọa độ vạch ảo cổng chính tránh góc chết', '192.168.1.10', CURRENT_TIMESTAMP - INTERVAL '4 hour'),
('DEFAULT_SCHOOL', 'baove.tranvan', 'VISITOR_APPROVE', 'visitor_registrations', 'VIS_092201', 'Phụ huynh đón học sinh sớm có đơn xác nhận', '192.168.10.50', CURRENT_TIMESTAMP - INTERVAL '1 hour');

-- 9. Đăng ký Webhook tích hợp đối tác (Webhook Subscriptions)
INSERT INTO webhook_subscriptions (name, target_url, secret_key, subscribed_events, is_active, status, last_delivery_status, last_delivery_at) VALUES
('VnEdu Cloud Sync', 'https://api.vnedu.vn/v1/webhook/attendance', 'sec_vnedu_live_9921', ARRAY['ATTENDANCE_CHECKIN', 'ATTENDANCE_CHECKOUT'], true, 'ACTIVE', '200 OK', CURRENT_TIMESTAMP - INTERVAL '5 minute'),
('SMAS Viettel School Connector', 'https://smas.edu.vn/api/integration/mschool', 'sec_smas_prod_8812', ARRAY['CLASSROOM_EVALUATED'], true, 'ACTIVE', '200 OK', CURRENT_TIMESTAMP - INTERVAL '15 minute'),
('Hệ thống Quản lý Học đường SIS Nội Bộ', 'https://sis.school.edu.vn/webhook/stranger-alert', 'sec_sis_local_1102', ARRAY['STRANGER_DETECTED'], true, 'ACTIVE', '200 OK', CURRENT_TIMESTAMP - INTERVAL '10 minute');
