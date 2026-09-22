'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  RefreshCw,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
  KeyRound,
  Check
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, putApi } from '@/lib/api';
import Modal from '@/components/Modal';

interface SystemRoleItem {
  id: string;
  roleCode: string;
  roleName: string;
  description: string;
  isSystem: boolean;
}

interface RolePermissionItem {
  moduleCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

const MODULE_DEFINITIONS = [
  { code: 'DASHBOARD', name: 'Tổng quan Sĩ số', desc: 'Bảng điều khiển sĩ số toàn trường' },
  { code: 'CLASSROOM_MATRIX', name: 'Ma trận 50 Phòng học', desc: 'Giám sát sĩ số và giáo viên thời gian thực' },
  { code: 'GUARD_DESK', name: 'Bốt Bảo Vệ Ra Vào', desc: 'Kiểm soát khách, phụ huynh và cảnh báo người lạ' },
  { code: 'ATTENDANCE_LEDGER', name: 'Sổ Đầu Bài Điện Tử', desc: 'Xác nhận tiết học và đối soát vắng/nhầm lớp' },
  { code: 'BIOMETRICS', name: 'Hồ sơ Sinh trắc học', desc: 'Đăng ký khuôn mặt và đồng bộ vector camera' },
  { code: 'CAMERAS', name: 'Camera & Vạch Ảo', desc: 'Cấu hình luồng RTSP và vạch ảo Spatial Tripwire' },
  { code: 'CLASSES', name: 'Danh mục Lớp học', desc: 'Quản lý phòng học, khối lớp và phân công giáo viên' },
  { code: 'AUDIT_LOGS', name: 'Nhật ký Kiểm toán', desc: 'Truy vết thay đổi, can thiệp Maker-Checker' },
  { code: 'WEBHOOKS', name: 'Cổng Webhook & API', desc: 'Tích hợp vnEdu, Viettel SMAS và SIS' },
  { code: 'USERS', name: 'Quản trị Người dùng', desc: 'Quản lý tài khoản và phân vai trò' },
  { code: 'CONFIG', name: 'Tham số & Danh mục', desc: 'Cấu hình ngưỡng AI FIQA, Cooldown, ca học' },
];

export default function RolesPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [roles, setRoles] = useState<SystemRoleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('ROLE_ADMIN');
  const [permissions, setPermissions] = useState<Record<string, RolePermissionItem>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Thêm nhóm quyền mới
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newRoleData, setNewRoleData] = useState({
    roleCode: '',
    roleName: '',
    description: '',
  });

  const loadRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<SystemRoleItem[]>('/roles');
      const list = Array.isArray(data) ? data : [];
      setRoles(list);
      if (list.length > 0 && !selectedRole) {
        setSelectedRole(list[0].roleCode);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh mục vai trò:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async (roleCode: string) => {
    if (!roleCode) return;
    try {
      const data = await fetchApi<RolePermissionItem[]>(`/roles/${roleCode}/permissions`);
      const permMap: Record<string, RolePermissionItem> = {};

      // Khởi tạo mặc định cho tất cả module
      MODULE_DEFINITIONS.forEach((mod) => {
        const isAdmin = roleCode === 'ROLE_ADMIN';
        permMap[mod.code] = {
          moduleCode: mod.code,
          canView: isAdmin,
          canCreate: isAdmin,
          canEdit: isAdmin,
          canDelete: isAdmin,
          canApprove: isAdmin,
          canExport: isAdmin,
        };
      });

      // Ghi đè nếu trong CSDL đã có lưu
      if (Array.isArray(data)) {
        data.forEach((p) => {
          if (permMap[p.moduleCode]) {
            permMap[p.moduleCode] = { ...p };
          }
        });
      }

      setPermissions(permMap);
    } catch (err: any) {
      console.warn('Lỗi tải phân quyền:', err.message);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadPermissions(selectedRole);
    }
  }, [selectedRole]);

  const handleTogglePerm = (moduleCode: string, field: keyof Omit<RolePermissionItem, 'moduleCode'>) => {
    setPermissions((prev) => {
      const current = prev[moduleCode] || {
        moduleCode,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canExport: false,
      };
      return {
        ...prev,
        [moduleCode]: {
          ...current,
          [field]: !current[field],
        },
      };
    });
  };

  const handleToggleRowAll = (moduleCode: string) => {
    setPermissions((prev) => {
      const current = prev[moduleCode];
      const allChecked =
        current.canView &&
        current.canCreate &&
        current.canEdit &&
        current.canDelete &&
        current.canApprove &&
        current.canExport;

      const nextVal = !allChecked;
      return {
        ...prev,
        [moduleCode]: {
          moduleCode,
          canView: nextVal,
          canCreate: nextVal,
          canEdit: nextVal,
          canDelete: nextVal,
          canApprove: nextVal,
          canExport: nextVal,
        },
      };
    });
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    try {
      const permList = Object.values(permissions);
      await putApi(`/roles/${selectedRole}/permissions`, { permissions: permList });
      showSuccess(
        'Lưu ma trận phân quyền',
        `Đã lưu cấu hình quyền cho vai trò ${roles.find((r) => r.roleCode === selectedRole)?.roleName || selectedRole}`
      );
    } catch (err: any) {
      showError('Lỗi lưu phân quyền', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedCode = newRoleData.roleCode.startsWith('ROLE_')
        ? newRoleData.roleCode.toUpperCase()
        : 'ROLE_' + newRoleData.roleCode.toUpperCase();

      await postApi('/roles', {
        ...newRoleData,
        roleCode: formattedCode,
      });
      showSuccess('Tạo nhóm quyền mới', `Đã tạo vai trò ${newRoleData.roleName}`);
      setIsModalOpen(false);
      setNewRoleData({ roleCode: '', roleName: '', description: '' });
      loadRoles();
    } catch (err: any) {
      showError('Tạo vai trò thất bại', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-sky-400" />
            Nhóm Quyền & Ma Trận Phân Quyền (RBAC)
          </h2>
          <p className="text-sm text-slate-400">
            Thiết lập quyền truy cập chi tiết (Xem, Thêm, Sửa, Xóa, Duyệt, Xuất dữ liệu) theo từng vai trò
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Thêm Vai Trò Mới</span>
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-600/20"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Ma Trận Quyền'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs chọn vai trò */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {roles.map((role) => {
          const isSelected = selectedRole === role.roleCode;
          return (
            <div
              key={role.roleCode}
              onClick={() => setSelectedRole(role.roleCode)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-950/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                  {role.roleName}
                </span>
                {role.isSystem && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    Hệ thống
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{role.description || '--'}</p>
            </div>
          );
        })}
      </div>

      {/* Bảng Ma Trận Phân Quyền */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Bảng Phân Quyền Cho:{' '}
              <span className="text-sky-400">
                {roles.find((r) => r.roleCode === selectedRole)?.roleName || selectedRole}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Nhấp vào từng ô để cấp hoặc thu hồi quyền hạn đối với từng phân hệ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6 font-semibold w-1/3">Phân hệ chức năng</th>
                <th className="py-3.5 px-3 text-center font-semibold">Xem</th>
                <th className="py-3.5 px-3 text-center font-semibold">Thêm</th>
                <th className="py-3.5 px-3 text-center font-semibold">Sửa</th>
                <th className="py-3.5 px-3 text-center font-semibold">Xóa</th>
                <th className="py-3.5 px-3 text-center font-semibold">Duyệt</th>
                <th className="py-3.5 px-3 text-center font-semibold">Xuất Excel</th>
                <th className="py-3.5 px-4 text-center font-semibold">Tất cả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {MODULE_DEFINITIONS.map((mod) => {
                const perm = permissions[mod.code] || {
                  moduleCode: mod.code,
                  canView: false,
                  canCreate: false,
                  canEdit: false,
                  canDelete: false,
                  canApprove: false,
                  canExport: false,
                };
                const isAll =
                  perm.canView &&
                  perm.canCreate &&
                  perm.canEdit &&
                  perm.canDelete &&
                  perm.canApprove &&
                  perm.canExport;

                return (
                  <tr key={mod.code} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-white text-sm">{mod.name}</div>
                      <div className="text-[11px] text-slate-400">{mod.desc}</div>
                    </td>

                    {/* Cột Xem */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(mod.code, 'canView')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canView
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Thêm */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(mod.code, 'canCreate')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canCreate
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Sửa */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(mod.code, 'canEdit')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canEdit
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Xóa */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(mod.code, 'canDelete')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canDelete
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Duyệt */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(mod.code, 'canApprove')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canApprove
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Xuất Excel */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(mod.code, 'canExport')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canExport
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-slate-800 border border-slate-700 text-transparent hover:border-slate-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Chọn Tất cả dòng */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRowAll(mod.code)}
                        className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                          isAll
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isAll ? 'Bỏ chọn' : 'Toàn quyền'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm Vai Trò Mới */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm Nhóm Quyền / Vai Trò Mới"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mã vai trò (Role Code) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newRoleData.roleCode}
              onChange={(e) => setNewRoleData({ ...newRoleData, roleCode: e.target.value })}
              placeholder="ví dụ: ACCOUNTANT hoặc PARENT"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 uppercase font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Hệ thống sẽ tự động thêm tiền tố ROLE_ nếu chưa có</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên hiển thị nhóm quyền <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newRoleData.roleName}
              onChange={(e) => setNewRoleData({ ...newRoleData, roleName: e.target.value })}
              placeholder="ví dụ: Kế Toán Trưởng hoặc Ban Phụ Huynh"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mô tả nhiệm vụ quyền hạn</label>
            <textarea
              rows={3}
              value={newRoleData.description}
              onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
              placeholder="Mô tả phạm vi quyền hạn và trách nhiệm..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-lg shadow-sky-600/20"
            >
              Tạo Vai Trò
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
