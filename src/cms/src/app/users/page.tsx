'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Lock,
  Unlock,
  Trash2,
  Edit2,
  Shield
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, putApi, deleteApi } from '@/lib/api';
import { UserRole } from '@/types/enums';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface SystemUserItem {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roleCode: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [users, setUsers] = useState<SystemUserItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUserItem | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    roleCode: UserRole.ROLE_TEACHER,
    password: '',
  });

  // State ConfirmDialog (Xóa, Đặt lại mật khẩu)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = `/users?`;
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      if (selectedRole) query += `role=${encodeURIComponent(selectedRole)}&`;
      const data = await fetchApi<SystemUserItem[]>(query);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Lỗi tải danh sách người dùng:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchTerm, selectedRole]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      roleCode: UserRole.ROLE_TEACHER,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: SystemUserItem) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      roleCode: user.roleCode,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await putApi(`/users/${editingUser.id}`, {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          roleCode: formData.roleCode,
        });
        showSuccess('Cập nhật người dùng', `Đã cập nhật thông tin tài khoản ${formData.username}`);
      } else {
        await postApi(`/users`, formData);
        showSuccess('Tạo người dùng mới', `Đã tạo tài khoản ${formData.username} thành công`);
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      showError('Thao tác thất bại', err.message);
    }
  };

  const handleToggleStatus = async (user: SystemUserItem) => {
    try {
      await postApi(`/users/${user.id}/toggle-status`);
      showSuccess(
        'Đổi trạng thái',
        `Tài khoản ${user.username} đã được ${user.isActive ? 'khóa' : 'mở khóa'}`
      );
      loadUsers();
    } catch (err: any) {
      showError('Lỗi cập nhật trạng thái', err.message);
    }
  };

  const handleResetPassword = (user: SystemUserItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Đặt lại mật khẩu mặc định',
      message: `Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản "${user.username}" về mặc định "Admin@2026" không?`,
      action: async () => {
        try {
          await postApi(`/users/${user.id}/reset-password`);
          showSuccess('Đặt lại mật khẩu', `Mật khẩu mới của ${user.username} là: Admin@2026`);
        } catch (err: any) {
          showError('Lỗi đặt lại mật khẩu', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
      isDangerous: false,
    });
  };

  const handleDeleteUser = (user: SystemUserItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa tài khoản người dùng',
      message: `Hành động này sẽ xóa vĩnh viễn tài khoản "${user.username}". Bạn có chắc chắn muốn tiếp tục?`,
      action: async () => {
        try {
          await deleteApi(`/users/${user.id}`);
          showSuccess('Xóa người dùng', `Đã xóa tài khoản ${user.username}`);
          loadUsers();
        } catch (err: any) {
          showError('Lỗi xóa người dùng', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
      isDangerous: true,
    });
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ROLE_ADMIN:
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case UserRole.ROLE_SUPERVISOR:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case UserRole.ROLE_TEACHER:
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case UserRole.ROLE_SECURITY_GUARD:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ROLE_ADMIN:
        return 'Quản trị viên';
      case UserRole.ROLE_SUPERVISOR:
        return 'Ban Giám Hiệu';
      case UserRole.ROLE_TEACHER:
        return 'Giáo viên';
      case UserRole.ROLE_SECURITY_GUARD:
        return 'Nhân viên bảo vệ';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-sky-600" />
            Quản Trị Người Dùng Hệ Thống
          </h2>
          <p className="text-sm text-slate-500">
            Quản lý danh sách tài khoản, trạng thái hoạt động và phân định vai trò truy cập
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Tài Khoản</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên đăng nhập, họ tên, email, SĐT..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
          >
            <option value="">-- Tất cả vai trò --</option>
            <option value={UserRole.ROLE_ADMIN}>Quản trị viên</option>
            <option value={UserRole.ROLE_SUPERVISOR}>Ban Giám Hiệu</option>
            <option value={UserRole.ROLE_TEACHER}>Giáo viên</option>
            <option value={UserRole.ROLE_SECURITY_GUARD}>Nhân viên bảo vệ</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu người dùng */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Tài khoản</th>
                <th className="py-3.5 px-4 font-semibold">Họ và tên</th>
                <th className="py-3.5 px-4 font-semibold">Liên hệ (Email / SĐT)</th>
                <th className="py-3.5 px-4 font-semibold">Vai trò</th>
                <th className="py-3.5 px-4 font-semibold">Trạng thái</th>
                <th className="py-3.5 px-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-bold text-xs">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{u.fullName}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      <div>{u.email || '--'}</div>
                      <div className="text-[11px] text-slate-400">{u.phone || '--'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${getRoleBadge(u.roleCode)}`}>
                        {getRoleLabel(u.roleCode)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          title="Chỉnh sửa thông tin"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isActive
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {u.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          title="Đặt lại mật khẩu mặc định"
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Xóa tài khoản"
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    {isLoading ? t('common.loading') : t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh sửa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Chỉnh Sửa Thông Tin Người Dùng' : 'Thêm Mới Tài Khoản Người Dùng'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đăng nhập <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!!editingUser}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="ví dụ: gv_nguyenvanan"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="ví dụ: Nguyễn Văn An"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="an.nv@mschool.edu.vn"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0912345678"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vai trò phân quyền <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.roleCode}
              onChange={(e) => setFormData({ ...formData, roleCode: e.target.value as UserRole })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            >
              <option value={UserRole.ROLE_ADMIN}>Quản trị viên</option>
              <option value={UserRole.ROLE_SUPERVISOR}>Ban Giám Hiệu</option>
              <option value={UserRole.ROLE_TEACHER}>Giáo viên</option>
              <option value={UserRole.ROLE_SECURITY_GUARD}>Nhân viên bảo vệ</option>
            </select>
          </div>

          {!editingUser && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu khởi tạo (Để trống sẽ mặc định là Admin@2026)
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Admin@2026"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs"
            >
              {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog Xác nhận */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={confirmDialog.isDangerous}
      />
    </div>
  );
}
