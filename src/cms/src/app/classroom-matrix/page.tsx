'use client';

import React, { useState, useEffect } from 'react';
import { Grid, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { fetchApi } from '@/lib/api';
import { ClassroomPeriodStatus } from '@/types/enums';

interface ClassroomItem {
  id: string;
  name: string;
  grade: string;
  building: string;
  floor: number;
  scheduledTeacher: string;
  actualTeacher: string;
  isSubstitute: boolean;
  totalEnrolled: number;
  totalPresent: number;
  absentCount: number;
  wrongClassCount: number;
  status: ClassroomPeriodStatus;
  lastPeriod: number;
}

export default function ClassroomMatrixPage() {
  const { t } = useTranslation();
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatrixData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<ClassroomItem[]>('/classroom-attendance/matrix');
      setClassrooms(data);
    } catch (err: any) {
      console.warn('Failed to load classroom matrix from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrixData();
  }, []);

  const filteredClassrooms = classrooms.filter((cls) => {
    if (selectedGrade === 'ALL') return true;
    return cls.grade === selectedGrade;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('classroomMatrix.title')}</h2>
          <p className="text-sm text-slate-400">{t('classroomMatrix.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadMatrixData}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bộ lọc khối lớp */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl w-fit">
        {['ALL', '10', '11', '12'].map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedGrade === g
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {g === 'ALL' ? t('classroomMatrix.all') : `${t('classroomMatrix.grade')} ${g}`}
          </button>
        ))}
      </div>

      {/* Lưới 50 phòng học */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500">{t('common.loading')}</div>
      ) : filteredClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredClassrooms.map((cls) => (
            <div
              key={cls.id}
              className={`p-4 rounded-xl border transition-all ${
                cls.status === ClassroomPeriodStatus.MISSING
                  ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700'
                  : (cls.status === ClassroomPeriodStatus.WRONG_CLASS
                      ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-700'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700')
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-sm">{cls.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  cls.status === ClassroomPeriodStatus.FULL
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {cls.status === ClassroomPeriodStatus.FULL ? t('classroomMatrix.full') : t('classroomMatrix.missing')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{cls.scheduledTeacher}</p>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                <span className="text-slate-400">{cls.building} - Tầng {cls.floor}</span>
                <span className="font-bold text-emerald-400">{cls.totalPresent} / {cls.totalEnrolled}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500">{t('common.noData')}</div>
      )}
    </div>
  );
}
