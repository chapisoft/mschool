// ==============================================================================
// MSCHOOL UNIFIED ENUMS (FRONTEND & BACKEND SYNCHRONIZED)
// 100% Zero-Hardcode, Type-Safe, Không so sánh chuỗi tự do
// ==============================================================================

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  ABSENT = 'ABSENT',
}

export enum Direction {
  IN = 'IN',
  OUT = 'OUT',
}

export enum SubjectType {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  STAFF = 'STAFF',
}

export enum VisitorType {
  PARENT = 'PARENT',
  GUEST = 'GUEST',
  CONTRACTOR = 'CONTRACTOR',
}

export enum VisitorStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  CHECKED_IN = 'CHECKED_IN',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum CameraStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export enum TripwireDirection {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum ClassroomPeriodStatus {
  FULL = 'FULL',
  MISSING = 'MISSING',
  WRONG_CLASS = 'WRONG_CLASS',
  SUBSTITUTE = 'SUBSTITUTE',
}

export enum AuditActionCode {
  OVERRIDE_ATTENDANCE = 'OVERRIDE_ATTENDANCE',
  CAMERA_CONFIG_UPDATE = 'CAMERA_CONFIG_UPDATE',
  VISITOR_APPROVE = 'VISITOR_APPROVE',
  VISITOR_REVOKE = 'VISITOR_REVOKE',
  SYSTEM_SYNC = 'SYSTEM_SYNC',
  CLASSROOM_PERIOD_CONFIRM = 'CLASSROOM_PERIOD_CONFIRM',
}

export enum WebhookStatus {
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export enum WebhookEventType {
  ATTENDANCE_CHECKIN = 'ATTENDANCE_CHECKIN',
  ATTENDANCE_CHECKOUT = 'ATTENDANCE_CHECKOUT',
  CLASSROOM_EVALUATED = 'CLASSROOM_EVALUATED',
  STRANGER_DETECTED = 'STRANGER_DETECTED',
}

export enum AnomalyType {
  HIGH_ABSENCE_RATE = 'HIGH_ABSENCE_RATE',
  TEACHER_MISSING = 'TEACHER_MISSING',
  STRANGER_IN_CLASSROOM = 'STRANGER_IN_CLASSROOM',
}

export enum SeverityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum OverrideReasonCategory {
  MEDICAL_NOTE = 'MEDICAL_NOTE',
  FAMILY_EMERGENCY = 'FAMILY_EMERGENCY',
  OFFICIAL_DISPATCH = 'OFFICIAL_DISPATCH',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum UserRole {
  ROLE_ADMIN = 'ROLE_ADMIN',
  ROLE_SUPERVISOR = 'ROLE_SUPERVISOR',
  ROLE_TEACHER = 'ROLE_TEACHER',
  ROLE_SECURITY_GUARD = 'ROLE_SECURITY_GUARD',
}

export enum StorageBucket {
  SNAPSHOTS = 'mschool-snapshots',
  BIOMETRICS = 'mschool-biometrics',
  EVIDENCE = 'mschool-evidence',
}

export enum TenantScope {
  DEFAULT_SCHOOL = 'a1000000-0000-0000-0000-000000000001',
  SYSTEM_ADMIN = '00000000-0000-0000-0000-000000000000',
}

export enum SecurityHeader {
  X_SCHOOL_ID = 'X-School-Id',
  X_USER_ROLE = 'X-User-Role',
  X_USER_NAME = 'X-User-Name',
  X_ASSIGNED_CLASSROOM = 'X-Assigned-Classroom',
}
