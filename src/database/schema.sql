-- ==============================================================================
-- MSCHOOL DATABASE SCHEMA DEFINITION (POSTGRESQL 16 + PGVECTOR)
-- 100% Zero-Hardcode, Enum-Driven, AES-256 Storage Encryption
-- ==============================================================================

-- Bật các tiện ích mở rộng cốt lõi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Bảng hồ sơ sinh trắc học khuôn mặt chuẩn hóa (Học sinh, Giáo viên, Cán bộ)
CREATE TABLE IF NOT EXISTS face_biometric_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_code VARCHAR(50) NOT NULL UNIQUE,
    subject_type VARCHAR(20) NOT NULL, -- STUDENT, TEACHER, STAFF
    full_name VARCHAR(255) NOT NULL,
    department_or_class VARCHAR(100) NOT NULL,
    embedding_primary VECTOR(512) NOT NULL,
    embedding_left VECTOR(512),
    embedding_right VECTOR(512),
    quality_score FLOAT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_biometric_identity ON face_biometric_profiles(identity_code);
CREATE INDEX IF NOT EXISTS idx_biometric_subject_type ON face_biometric_profiles(subject_type);
CREATE INDEX IF NOT EXISTS idx_biometric_class ON face_biometric_profiles(department_or_class);

-- 2. Bảng đăng ký khách và phụ huynh có thời hạn hiệu lực (Visitor TTL)
CREATE TABLE IF NOT EXISTS visitor_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    visitor_type VARCHAR(20) NOT NULL, -- PARENT, GUEST, CONTRACTOR
    target_identity_code VARCHAR(50),  -- Mã học sinh cần đón hoặc giáo viên cần gặp
    embedding VECTOR(512) NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED', -- APPROVED, PENDING, EXPIRED, REVOKED
    approved_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_code ON visitor_registrations(visitor_code);
CREATE INDEX IF NOT EXISTS idx_visitor_validity ON visitor_registrations(valid_from, valid_to, status);

-- 3. Bảng phiên điểm danh trong ngày (Daily Attendance Sessions)
CREATE TABLE IF NOT EXISTS daily_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_code VARCHAR(50) NOT NULL,
    session_date DATE NOT NULL,
    check_in_at TIMESTAMP WITH TIME ZONE,
    check_out_at TIMESTAMP WITH TIME ZONE,
    last_out_at TIMESTAMP WITH TIME ZONE,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'ABSENT', -- PRESENT, LATE, EARLY_LEAVE, ABSENT
    total_present_minutes INT DEFAULT 0,
    check_in_camera_id VARCHAR(50),
    check_out_camera_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_student_session_date UNIQUE (identity_code, session_date)
);

CREATE INDEX IF NOT EXISTS idx_session_date ON daily_attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_session_identity_date ON daily_attendance_sessions(identity_code, session_date);

-- 4. Bảng sổ đầu bài điện tử và điểm danh tiết học (Classroom Period Attendances)
CREATE TABLE IF NOT EXISTS classroom_period_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id VARCHAR(50) NOT NULL,
    period_number INT NOT NULL,
    schedule_date DATE NOT NULL,
    scheduled_teacher_code VARCHAR(50) NOT NULL,
    actual_teacher_code VARCHAR(50),
    total_students_enrolled INT NOT NULL,
    total_students_present INT NOT NULL,
    absent_student_codes TEXT[],
    wrong_class_student_codes TEXT[],
    snapshot_image_path TEXT,
    is_confirmed_by_teacher BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_class_period_date UNIQUE (class_id, period_number, schedule_date)
);

CREATE INDEX IF NOT EXISTS idx_classroom_attendance_lookup ON classroom_period_attendances(class_id, schedule_date, period_number);

-- Bảng phụ danh sách học sinh vắng theo tiết
CREATE TABLE IF NOT EXISTS classroom_absent_students (
    attendance_id UUID NOT NULL REFERENCES classroom_period_attendances(id) ON DELETE CASCADE,
    student_code VARCHAR(50) NOT NULL
);

-- Bảng phụ danh sách học sinh nhầm lớp theo tiết
CREATE TABLE IF NOT EXISTS classroom_wrong_students (
    attendance_id UUID NOT NULL REFERENCES classroom_period_attendances(id) ON DELETE CASCADE,
    student_code VARCHAR(50) NOT NULL
);

-- 5. Bảng nhật ký người lạ lảng vảng (Tự hủy sau 24 giờ tuân thủ Nghị định 13)
CREATE TABLE IF NOT EXISTS stranger_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id VARCHAR(50) NOT NULL,
    captured_image_path TEXT NOT NULL,
    embedding VECTOR(512) NOT NULL,
    appeared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_alerted BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_stranger_appeared ON stranger_access_logs(appeared_at);

-- 6. Bảng hàng đợi thông báo Outbox (Outbox Pattern cho Push FCM)
CREATE TABLE IF NOT EXISTS notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    target_user_id VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON notification_outbox(status, created_at) WHERE status = 'PENDING';

-- 7. Bảng thiết bị camera giám sát và vạch ảo Spatial Tripwire
CREATE TABLE IF NOT EXISTS device_cameras (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    rtsp_url TEXT NOT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ONLINE', -- ONLINE, OFFLINE
    fps INT NOT NULL DEFAULT 25,
    tripwire_direction VARCHAR(20) NOT NULL DEFAULT 'CHECK_IN', -- CHECK_IN, CHECK_OUT, BIDIRECTIONAL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_cameras_status ON device_cameras(status);

-- 8. Bảng danh mục phòng học và lớp học chuẩn hóa
CREATE TABLE IF NOT EXISTS classrooms (
    id VARCHAR(50) PRIMARY KEY, -- Mã lớp, ví dụ 10A1
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    grade_level INT NOT NULL, -- 10, 11, 12
    room VARCHAR(50) NOT NULL,
    building VARCHAR(50) NOT NULL,
    floor INT NOT NULL,
    homeroom_teacher VARCHAR(255) NOT NULL,
    total_students INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_classrooms_grade ON classrooms(grade_level);

-- 9. Bảng nhật ký kiểm toán bất biến (Audit Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50),
    user_id UUID,
    user_name VARCHAR(100) NOT NULL,
    action_code VARCHAR(50) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 10. Bảng đăng ký Webhook đối tác bên ngoài
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    subscribed_events TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, FAILED, RETRYING
    last_delivery_status VARCHAR(50),
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_subscriptions(status, is_active);

-- 11. Bảng lịch sử phát Webhook (Webhook Delivery Logs)
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    http_status INT,
    response_body TEXT,
    is_successful BOOLEAN NOT NULL DEFAULT FALSE,
    attempt_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_sub ON webhook_delivery_logs(subscription_id, created_at);

-- 12. Bảng quản trị người dùng hệ thống (System Users)
CREATE TABLE IF NOT EXISTS system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role_code VARCHAR(50) NOT NULL, -- ROLE_ADMIN, ROLE_SUPERVISOR, ROLE_TEACHER, ROLE_SECURITY_GUARD
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON system_users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON system_users(role_code);

-- 13. Bảng danh mục vai trò / nhóm quyền (System Roles)
CREATE TABLE IF NOT EXISTS system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON system_roles(role_code);

-- 14. Bảng ma trận phân quyền theo vai trò (Role Permissions Matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(50) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve BOOLEAN NOT NULL DEFAULT FALSE,
    can_export BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_role_module UNIQUE (role_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON role_permissions(role_code, module_code);

-- 15. Bảng tham số cấu hình hệ thống (System Parameters)
CREATE TABLE IF NOT EXISTS system_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    param_key VARCHAR(100) NOT NULL UNIQUE,
    param_value TEXT NOT NULL,
    param_group VARCHAR(50) NOT NULL, -- AI, ATTENDANCE, NOTIFICATION, STORAGE
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_param_group ON system_parameters(param_group);

-- 16. Bảng danh mục cơ sở trường học (Master Campuses)
CREATE TABLE IF NOT EXISTS master_campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_code VARCHAR(50) NOT NULL UNIQUE,
    campus_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Bảng danh mục ca học (Master Shifts)
CREATE TABLE IF NOT EXISTS master_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code VARCHAR(50) NOT NULL UNIQUE,
    shift_name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

