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

const MODULE_CODES = [
  'DASHBOARD',
  'CLASSROOM_MATRIX',
  'GUARD_DESK',
  'ATTENDANCE_LEDGER',
  'BIOMETRICS',
  'CAMERAS',
  'CLASSES',
  'AUDIT_LOGS',
  'WEBHOOKS',
  'USERS',
  'CONFIG',
];

export default function RolesPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [roles, setRoles] = useState<SystemRoleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
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
      console.warn('Failed to load roles:', err.message);
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
      MODULE_CODES.forEach((code) => {
        const isAdmin = roleCode === 'ROLE_ADMIN';
        permMap[code] = {
          moduleCode: code,
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
      console.warn('Failed to load permissions:', err.message);
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
        t('roles.saveSuccessTitle'),
        t('roles.saveSuccessDesc', {
          role: roles.find((r) => r.roleCode === selectedRole)?.roleName || selectedRole,
        })
      );
    } catch (err: any) {
      showError(t('roles.saveErrorTitle'), err.message);
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
      showSuccess(t('roles.createSuccessTitle'), t('roles.createSuccessDesc', { name: newRoleData.roleName }));
      setIsModalOpen(false);
      setNewRoleData({ roleCode: '', roleName: '', description: '' });
      loadRoles();
    } catch (err: any) {
      showError(t('roles.createErrorTitle'), err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-sky-600" />
            {t('roles.title')}
          </h2>
          <p className="text-sm text-slate-500">
            {t('roles.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            <span>{t('roles.addRole')}</span>
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? t('roles.saving') : t('roles.saveMatrix')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
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
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-sky-50/80 border-sky-500 shadow-xs ring-1 ring-sky-500'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                  {role.roleName}
                </span>
                {role.isSystem && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono border border-slate-200">
                    {t('roles.systemBadge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{role.description || '--'}</p>
            </div>
          );
        })}
      </div>

      {/* Bảng Ma Trận Phân Quyền */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
              {t('roles.matrixForRole')}{' '}
              <span className="text-sky-600">
                {roles.find((r) => r.roleCode === selectedRole)?.roleName || selectedRole}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('roles.matrixHelp')}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-6 font-semibold w-1/3">{t('roles.colModule')}</th>
                <th className="py-3.5 px-3 text-center font-semibold">{t('roles.colView')}</th>
                <th className="py-3.5 px-3 text-center font-semibold">{t('roles.colCreate')}</th>
                <th className="py-3.5 px-3 text-center font-semibold">{t('roles.colEdit')}</th>
                <th className="py-3.5 px-3 text-center font-semibold">{t('roles.colDelete')}</th>
                <th className="py-3.5 px-3 text-center font-semibold">{t('roles.colApprove')}</th>
                <th className="py-3.5 px-3 text-center font-semibold">{t('roles.colExport')}</th>
                <th className="py-3.5 px-4 text-center font-semibold">{t('roles.colAll')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODULE_CODES.map((code) => {
                const perm = permissions[code] || {
                  moduleCode: code,
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
                  <tr key={code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900 text-sm">
                        {t(`roles.module_${code}_name`)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t(`roles.module_${code}_desc`)}
                      </div>
                    </td>

                    {/* Cột Xem */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(code, 'canView')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canView
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Thêm */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(code, 'canCreate')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canCreate
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Sửa */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(code, 'canEdit')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canEdit
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Xóa */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(code, 'canDelete')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canDelete
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Duyệt */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(code, 'canApprove')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canApprove
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Xuất Excel */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePerm(code, 'canExport')}
                        className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                          perm.canExport
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 border border-slate-300 text-transparent hover:border-slate-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Cột Chọn Tất cả dòng */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRowAll(code)}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-colors ${
                          isAll
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isAll ? t('roles.deselectAll') : t('roles.selectAll')}
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
        title={t('roles.modalTitle')}
        maxWidth="md"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('roles.modalRoleCode')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newRoleData.roleCode}
              onChange={(e) => setNewRoleData({ ...newRoleData, roleCode: e.target.value })}
              placeholder={t('roles.modalRoleCodePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 uppercase font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">{t('roles.modalRoleCodeHelp')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('roles.modalRoleName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newRoleData.roleName}
              onChange={(e) => setNewRoleData({ ...newRoleData, roleName: e.target.value })}
              placeholder={t('roles.modalRoleNamePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('roles.modalRoleDesc')}</label>
            <textarea
              rows={3}
              value={newRoleData.description}
              onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
              placeholder={t('roles.modalRoleDescPlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

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
              {t('roles.modalSubmit')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
