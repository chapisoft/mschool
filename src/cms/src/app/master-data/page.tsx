'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Building2,
  Clock,
  GraduationCap,
  Plus,
  RefreshCw,
  AlertCircle,
  Trash2
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
  address: string | null;
  phone: string | null;
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

  // Modal Thêm Cơ Sở (Zero fake defaults)
  const [isCampusModalOpen, setIsCampusModalOpen] = useState<boolean>(false);
  const [campusForm, setCampusForm] = useState({
    campusCode: '',
    campusName: '',
    address: '',
    phone: '',
  });

  // Modal Thêm Ca Học (Zero fake defaults)
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [shiftForm, setShiftForm] = useState({
    shiftCode: '',
    shiftName: '',
    startTime: '',
    endTime: '',
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
      console.warn('Failed to load master data from API:', err.message);
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
      showSuccess(
        t('masterData.addCampusModalTitle'),
        t('masterData.toastAddCampusSuccess').replace('{name}', campusForm.campusName)
      );
      setIsCampusModalOpen(false);
      setCampusForm({ campusCode: '', campusName: '', address: '', phone: '' });
      loadData();
    } catch (err: any) {
      showError(t('masterData.toastAddCampusError'), err.message);
    }
  };

  const handleDeleteCampus = (campus: CampusItem) => {
    setConfirmDialog({
      isOpen: true,
      title: t('masterData.deleteCampusConfirmTitle'),
      message: t('masterData.deleteCampusConfirmMsg').replace('{name}', campus.campusName),
      action: async () => {
        try {
          await deleteApi(`/master-data/campuses/${campus.id}`);
          showSuccess(
            t('masterData.deleteCampusConfirmTitle'),
            t('masterData.toastDeleteCampusSuccess').replace('{name}', campus.campusName)
          );
          loadData();
        } catch (err: any) {
          showError(t('masterData.toastDeleteCampusError'), err.message);
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
      showSuccess(
        t('masterData.addShiftModalTitle'),
        t('masterData.toastAddShiftSuccess').replace('{name}', shiftForm.shiftName)
      );
      setIsShiftModalOpen(false);
      setShiftForm({ shiftCode: '', shiftName: '', startTime: '', endTime: '' });
      loadData();
    } catch (err: any) {
      showError(t('masterData.toastAddShiftError'), err.message);
    }
  };

  const handleDeleteShift = (shift: ShiftItem) => {
    setConfirmDialog({
      isOpen: true,
      title: t('masterData.deleteShiftConfirmTitle'),
      message: t('masterData.deleteShiftConfirmMsg').replace('{name}', shift.shiftName),
      action: async () => {
        try {
          await deleteApi(`/master-data/shifts/${shift.id}`);
          showSuccess(
            t('masterData.deleteShiftConfirmTitle'),
            t('masterData.toastDeleteShiftSuccess').replace('{name}', shift.shiftName)
          );
          loadData();
        } catch (err: any) {
          showError(t('masterData.toastDeleteShiftError'), err.message);
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-sky-600" />
            {t('masterData.listTitle')}
          </h2>
          <p className="text-sm text-slate-500">
            {t('masterData.listSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          {activeTab === 'CAMPUSES' && (
            <button
              onClick={() => setIsCampusModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('masterData.addCampus')}</span>
            </button>
          )}
          {activeTab === 'SHIFTS' && (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('masterData.addShift')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('CAMPUSES')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'CAMPUSES'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          {t('masterData.campusesTab')} ({campuses.length})
        </button>
        <button
          onClick={() => setActiveTab('SHIFTS')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'SHIFTS'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t('masterData.shiftsTab')} ({shifts.length})
        </button>
        <button
          onClick={() => setActiveTab('GRADES')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'GRADES'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          {t('masterData.gradesTab')} ({t('masterData.gradesSummary')})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'CAMPUSES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campuses.map((c) => (
            <div key={c.id} className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 shadow-xs transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-mono font-bold text-xs">
                    {c.campusCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t('masterData.active')}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">{c.campusName}</h3>
                <p className="text-xs text-slate-500 mb-1">{c.address || t('masterData.noAddress')}</p>
                <p className="text-xs text-slate-400 font-mono">{t('masterData.phoneLabel')} {c.phone || '--'}</p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDeleteCampus(c)}
                  className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  title={t('masterData.deleteCampusTooltip')}
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
            <div key={s.id} className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 shadow-xs transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold text-xs">
                    {s.shiftCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t('masterData.applied')}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{s.shiftName}</h3>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                  <div>{t('masterData.startTimeLabel')} <span className="text-sky-600 font-bold">{s.startTime || '--:--'}</span></div>
                  <div>{t('masterData.endTimeLabel')} <span className="text-emerald-600 font-bold">{s.endTime || '--:--'}</span></div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDeleteShift(s)}
                  className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  title={t('masterData.deleteShiftTooltip')}
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
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-2">{t('masterData.grade10Title')}</h3>
            <p className="text-xs text-slate-500 mb-3">{t('masterData.academicYearDesc')}</p>
            <div className="space-y-1 text-xs text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex justify-between"><span>{t('masterData.classCountLabel')}</span><span className="font-bold text-sky-600">{t('masterData.classCount10')}</span></div>
              <div className="flex justify-between"><span>{t('masterData.quotaLabel')}</span><span className="font-bold text-slate-900">{t('masterData.quota10')}</span></div>
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-2">{t('masterData.grade11Title')}</h3>
            <p className="text-xs text-slate-500 mb-3">{t('masterData.academicYearDesc')}</p>
            <div className="space-y-1 text-xs text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex justify-between"><span>{t('masterData.classCountLabel')}</span><span className="font-bold text-sky-600">{t('masterData.classCount11')}</span></div>
              <div className="flex justify-between"><span>{t('masterData.quotaLabel')}</span><span className="font-bold text-slate-900">{t('masterData.quota11')}</span></div>
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-2">{t('masterData.grade12Title')}</h3>
            <p className="text-xs text-slate-500 mb-3">{t('masterData.academicYearDesc')}</p>
            <div className="space-y-1 text-xs text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex justify-between"><span>{t('masterData.classCountLabel')}</span><span className="font-bold text-sky-600">{t('masterData.classCount12')}</span></div>
              <div className="flex justify-between"><span>{t('masterData.quotaLabel')}</span><span className="font-bold text-slate-900">{t('masterData.quota12')}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Cơ Sở */}
      <Modal
        isOpen={isCampusModalOpen}
        onClose={() => setIsCampusModalOpen(false)}
        title={t('masterData.addCampusModalTitle')}
        maxWidth="md"
      >
        <form onSubmit={handleCreateCampus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('masterData.campusCode')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={campusForm.campusCode}
              onChange={(e) => setCampusForm({ ...campusForm, campusCode: e.target.value.toUpperCase() })}
              placeholder={t('masterData.campusCodePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('masterData.campusName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={campusForm.campusName}
              onChange={(e) => setCampusForm({ ...campusForm, campusName: e.target.value })}
              placeholder={t('masterData.campusNamePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('masterData.addressLabel')}</label>
            <input
              type="text"
              value={campusForm.address}
              onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
              placeholder={t('masterData.addressPlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('masterData.contactPhoneLabel')}</label>
            <input
              type="text"
              value={campusForm.phone}
              onChange={(e) => setCampusForm({ ...campusForm, phone: e.target.value })}
              placeholder={t('masterData.contactPhonePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCampusModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs cursor-pointer"
            >
              {t('masterData.createCampusBtn')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Thêm Ca Học */}
      <Modal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title={t('masterData.addShiftModalTitle')}
        maxWidth="md"
      >
        <form onSubmit={handleCreateShift} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('masterData.shiftCode')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={shiftForm.shiftCode}
              onChange={(e) => setShiftForm({ ...shiftForm, shiftCode: e.target.value.toUpperCase() })}
              placeholder={t('masterData.shiftCodePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('masterData.shiftName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={shiftForm.shiftName}
              onChange={(e) => setShiftForm({ ...shiftForm, shiftName: e.target.value })}
              placeholder={t('masterData.shiftNamePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('masterData.shiftStart')}</label>
              <input
                type="time"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('masterData.shiftEnd')}</label>
              <input
                type="time"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs cursor-pointer"
            >
              {t('masterData.createShiftBtn')}
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
