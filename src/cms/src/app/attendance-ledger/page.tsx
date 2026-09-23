'use client';

import React, { useState, useEffect } from 'react';
import { BookOpenCheck, Check, RefreshCw, AlertCircle, FileSpreadsheet, Edit } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi } from '@/lib/api';
import { AttendanceStatus } from '@/types/enums';
import AttendanceOverrideModal from '@/features/attendance-override/AttendanceOverrideModal';

interface PeriodRecord {
  id: string;
  classId: string;
  periodNumber: number;
  scheduledTeacherCode: string;
  actualTeacherCode: string;
  totalStudentsEnrolled: number;
  totalStudentsPresent: number;
  absentStudentCodes: string[];
  wrongClassStudentCodes: string[];
  isConfirmedByTeacher: boolean;
}

interface ClassroomItem {
  id: string;
  code: string;
  name: string;
}

export default function AttendanceLedgerPage() {
  const { t } = useTranslation();
  const [classList, setClassList] = useState<ClassroomItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State cho Modal Override
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [overrideTarget, setOverrideTarget] = useState<{ id: string; name: string; code: string; status: string } | null>(null);

  // Tải danh mục lớp học thật từ API
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const data = await fetchApi<ClassroomItem[]>('/classrooms');
        setClassList(data);
        if (data.length > 0 && !selectedClass) {
          setSelectedClass(data[0].id);
        }
      } catch (err: any) {
        console.warn('Failed to load classrooms:', err.message);
      }
    };
    fetchClassrooms();
  }, []);

  const loadLedgerData = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<PeriodRecord[]>(`/classroom-attendance?date=${selectedDate}`);
      const filtered = data.filter((r) => r.classId === selectedClass);
      setRecords(filtered);
    } catch (err: any) {
      console.warn('Failed to load ledger from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadLedgerData();
    }
  }, [selectedClass, selectedDate]);

  const { showSuccess, showError, showInfo } = useToast();

  const handleConfirm = async (id: string) => {
    try {
      await fetchApi(`/classroom-attendance/${id}/confirm`, { method: 'POST' });
      showSuccess('Xác nhận sổ đầu bài', 'Đã ghi nhận chữ ký số xác nhận tiết học thành công');
      loadLedgerData();
    } catch (err: any) {
      showError('Lỗi xác nhận tiết học', err.message);
    }
  };

  const handleExportExcel = () => {
    showInfo('Xuất báo cáo Excel', `Đang kết xuất sổ điểm danh ngày ${selectedDate}...`);
    window.open(`/api/v1/attendance/export/excel?date=${selectedDate}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('attendanceLedger.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('attendanceLedger.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLedgerData}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('attendanceLedger.exportExcel')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Bộ lọc lớp và ngày */}
      <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">{t('attendanceLedger.selectClass')}</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
          >
            {classList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">{t('attendanceLedger.selectDate')}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Danh sách các tiết học */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">{t('common.loading')}</div>
        ) : records.length > 0 ? (
          records.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-sm">
                    {r.periodNumber}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Tiết {r.periodNumber} - Lớp {r.classId}</h3>
                    <p className="text-xs text-slate-500">{t('attendanceLedger.teacher')}: {r.actualTeacherCode}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    r.isConfirmedByTeacher
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {r.isConfirmedByTeacher ? t('attendanceLedger.confirmed') : t('attendanceLedger.unconfirmed')}
                  </span>
                  {!r.isConfirmedByTeacher && (
                    <button
                      onClick={() => handleConfirm(r.id)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t('attendanceLedger.confirmBtn')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-100">
                <div>
                  <span className="text-slate-500">{t('attendanceLedger.presentEnrolled')}: </span>
                  <span className="font-bold text-emerald-600">{r.totalStudentsPresent} / {r.totalStudentsEnrolled}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('attendanceLedger.absentList')}: </span>
                  <span className="font-mono font-medium text-rose-600">
                    {r.absentStudentCodes && r.absentStudentCodes.length > 0 ? r.absentStudentCodes.join(', ') : t('attendanceLedger.none')}
                  </span>
                  {r.absentStudentCodes && r.absentStudentCodes.length > 0 && (
                    <button
                      onClick={() => {
                        setOverrideTarget({ id: r.id, name: t('attendanceLedger.absentStudent'), code: r.absentStudentCodes[0], status: AttendanceStatus.ABSENT });
                        setIsOverrideOpen(true);
                      }}
                      className="ml-2 text-sky-600 hover:underline font-semibold"
                    >
                      {t('attendanceLedger.overrideBtn')}
                    </button>
                  )}
                </div>
                <div>
                  <span className="text-slate-500">{t('attendanceLedger.wrongClassList')}: </span>
                  <span className="font-mono font-medium text-amber-600">
                    {r.wrongClassStudentCodes && r.wrongClassStudentCodes.length > 0 ? r.wrongClassStudentCodes.join(', ') : t('attendanceLedger.none')}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400">{t('common.noData')}</div>
        )}
      </div>

      {/* Modal Override Maker-Checker */}
      {overrideTarget && (
        <AttendanceOverrideModal
          isOpen={isOverrideOpen}
          onClose={() => setIsOverrideOpen(false)}
          recordId={overrideTarget.id}
          studentName={overrideTarget.name}
          identityCode={overrideTarget.code}
          classroomCode={selectedClass}
          currentStatus={overrideTarget.status}
          onSuccess={() => {
            setIsOverrideOpen(false);
            loadLedgerData();
          }}
        />
      )}
    </div>
  );
}
