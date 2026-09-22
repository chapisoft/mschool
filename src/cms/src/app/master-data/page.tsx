'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Building2,
  Clock,
  GraduationCap,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, deleteApi } from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface CampusItem {
  id: string;
  campusCode: string;
  campusName: string;
  address: string;
  phone: string;
  isActive: boolean;
}

interface ShiftItem {
  id: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function MasterDataPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'CAMPUSES' | 'SHIFTS' | 'GRADES'>('CAMPUSES');
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Thêm Cơ Sở
  const [isCampusModalOpen, setIsCampusModalOpen] = useState<boolean>(false);
  const [campusForm, setCampusForm] = useState({
    campusCode: '',
    campusName: '',
    address: '',
    phone: '',
  });

  // Modal Thêm Ca Học
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [shiftForm, setShiftForm] = useState({
    shiftCode: '',
    shiftName: '',
    startTime: '07:00',
    endTime: '11:30',
  });

  // ConfirmDialog Xóa
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [campusesData, shiftsData] = await Promise.all([
        fetchApi<CampusItem[]>('/master-data/campuses'),
        fetchApi<ShiftItem[]>('/master-data/shifts'),
      ]);
      setCampuses(Array.isArray(campusesData) ? campusesData : []);
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
    } catch (err: any) {
      console.warn('Lỗi tải danh mục dùng chung:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postApi('/master-data/campuses', campusForm);
      showSuccess('Thêm cơ sở mới', `Đã thêm ${campusForm.campusName}`);
      setIsCampusModalOpen(false);
      setCampusForm({ campusCode: '', campusName: '', address: '', phone: '' });
      loadData();
    } catch (err: any) {
      showError('Lỗi thêm cơ sở', err.message);
    }
  };

  const handleDeleteCampus = (campus: CampusItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa Cơ Sở Trường Học',
      message: `Bạn có chắc chắn muốn xóa cơ sở "${campus.campusName}"?`,
      action: async () => {
        try {
          await deleteApi(`/master-data/campuses/${campus.id}`);
          showSuccess('Xóa cơ sở', `Đã xóa cơ sở ${campus.campusName}`);
          loadData();
        } catch (err: any) {
          showError('Lỗi xóa cơ sở', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postApi('/master-data/shifts', shiftForm);
      showSuccess('Thêm ca học mới', `Đã thêm ca ${shiftForm.shiftName}`);
      setIsShiftModalOpen(false);
      setShiftForm({ shiftCode: '', shiftName: '', startTime: '07:00', endTime: '11:30' });
      loadData();
    } catch (err: any) {
      showError('Lỗi thêm ca học', err.message);
    }
  };

  const handleDeleteShift = (shift: ShiftItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa Ca Học',
      message: `Bạn có chắc chắn muốn xóa ca học "${shift.shiftName}"?`,
      action: async () => {
        try {
          await deleteApi(`/master-data/shifts/${shift.id}`);
          showSuccess('Xóa ca học', `Đã xóa ca ${shift.shiftName}`);
          loadData();
        } catch (err: any) {
          showError('Lỗi xóa ca học', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-sky-400" />
            Danh Mục Dùng Chung Hệ Thống
          </h2>
          <p className="text-sm text-slate-400">
            Quản trị danh mục các cơ sở trường học, ca học sáng/chiều và khối lớp định biên
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          {activeTab === 'CAMPUSES' && (
            <button
              onClick={() => setIsCampusModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Cơ Sở Mới</span>
            </button>
          )}
          {activeTab === 'SHIFTS' && (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Ca Học Mới</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('CAMPUSES')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'CAMPUSES'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Cơ Sở Trường Học ({campuses.length})
        </button>
        <button
          onClick={() => setActiveTab('SHIFTS')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'SHIFTS'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Ca Học & Khung Giờ ({shifts.length})
        </button>
        <button
          onClick={() => setActiveTab('GRADES')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'GRADES'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Khối Lớp & Niên Khóa (3 Khối)
        </button>
      </div>

      {/* Content */}
      {activeTab === 'CAMPUSES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campuses.map((c) => (
            <div key={c.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono font-bold text-xs">
                    {c.campusCode}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    HOẠT ĐỘNG
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mb-1.5">{c.campusName}</h3>
                <p className="text-xs text-slate-400 mb-1">{c.address || 'Chưa cập nhật địa chỉ'}</p>
                <p className="text-xs text-slate-500 font-mono">Điện thoại: {c.phone || '--'}</p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => handleDeleteCampus(c)}
                  className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 transition-colors"
                  title="Xóa cơ sở"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'SHIFTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map((s) => (
            <div key={s.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono font-bold text-xs">
                    {s.shiftCode}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ÁP DỤNG
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mb-2">{s.shiftName}</h3>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                  <div>Bắt đầu: <span className="text-sky-400 font-bold">{s.startTime}</span></div>
                  <div>Kết thúc: <span className="text-emerald-400 font-bold">{s.endTime}</span></div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => handleDeleteShift(s)}
                  className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 transition-colors"
                  title="Xóa ca học"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'GRADES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="font-bold text-white text-base mb-2">Khối 10 (THPT)</h3>
            <p className="text-xs text-slate-400 mb-3">Năm học 2026-2027 • Chương trình GDPT 2018</p>
            <div className="space-y-1 text-xs text-slate-300 pt-3 border-t border-slate-800">
              <div className="flex justify-between"><span>Số lớp học:</span><span className="font-bold text-sky-400">17 Lớp</span></div>
              <div className="flex justify-between"><span>Sĩ số định biên:</span><span className="font-bold text-white">765 Học sinh</span></div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="font-bold text-white text-base mb-2">Khối 11 (THPT)</h3>
            <p className="text-xs text-slate-400 mb-3">Năm học 2026-2027 • Chương trình GDPT 2018</p>
            <div className="space-y-1 text-xs text-slate-300 pt-3 border-t border-slate-800">
              <div className="flex justify-between"><span>Số lớp học:</span><span className="font-bold text-sky-400">17 Lớp</span></div>
              <div className="flex justify-between"><span>Sĩ số định biên:</span><span className="font-bold text-white">765 Học sinh</span></div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="font-bold text-white text-base mb-2">Khối 12 (THPT)</h3>
            <p className="text-xs text-slate-400 mb-3">Năm học 2026-2027 • Chương trình GDPT 2018</p>
            <div className="space-y-1 text-xs text-slate-300 pt-3 border-t border-slate-800">
              <div className="flex justify-between"><span>Số lớp học:</span><span className="font-bold text-sky-400">16 Lớp</span></div>
              <div className="flex justify-between"><span>Sĩ số định biên:</span><span className="font-bold text-white">720 Học sinh</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Cơ Sở */}
      <Modal
        isOpen={isCampusModalOpen}
        onClose={() => setIsCampusModalOpen(false)}
        title="Thêm Mới Cơ Sở Trường Học"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCampus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mã cơ sở <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={campusForm.campusCode}
              onChange={(e) => setCampusForm({ ...campusForm, campusCode: e.target.value.toUpperCase() })}
              placeholder="ví dụ: CAMPUS_03"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 uppercase font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên cơ sở <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={campusForm.campusName}
              onChange={(e) => setCampusForm({ ...campusForm, campusName: e.target.value })}
              placeholder="ví dụ: Cơ sở 3 - Phân hiệu Nam Từ Liêm"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Địa chỉ</label>
            <input
              type="text"
              value={campusForm.address}
              onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
              placeholder="ví dụ: Đường Lê Đức Thọ, Nam Từ Liêm, Hà Nội"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Số điện thoại liên hệ</label>
            <input
              type="text"
              value={campusForm.phone}
              onChange={(e) => setCampusForm({ ...campusForm, phone: e.target.value })}
              placeholder="024-3999-1111"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCampusModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-lg shadow-sky-600/20"
            >
              Thêm Cơ Sở
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Thêm Ca Học */}
      <Modal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title="Thêm Mới Ca Học & Khung Giờ"
        maxWidth="md"
      >
        <form onSubmit={handleCreateShift} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mã ca học <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={shiftForm.shiftCode}
              onChange={(e) => setShiftForm({ ...shiftForm, shiftCode: e.target.value.toUpperCase() })}
              placeholder="ví dụ: SHIFT_EVENING"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 uppercase font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên ca học <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={shiftForm.shiftName}
              onChange={(e) => setShiftForm({ ...shiftForm, shiftName: e.target.value })}
              placeholder="ví dụ: Ca Tối (Bồi Dưỡng Học Sinh Giỏi)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Giờ kết thúc</label>
              <input
                type="time"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-lg shadow-sky-600/20"
            >
              Thêm Ca Học
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog Xác nhận xóa */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={true}
      />
    </div>
  );
}
