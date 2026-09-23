'use client';

import React, { useState, useEffect } from 'react';
import {
  School,
  Users,
  Plus,
  RefreshCw,
  AlertCircle,
  Edit2,
  Trash2,
  Eye,
  GraduationCap
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, putApi, deleteApi } from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ClassroomItem {
  id: string;
  code: string;
  name: string;
  gradeLevel: number;
  room: string;
  building: string;
  floor: number;
  homeroomTeacher: string;
  totalStudents: number;
}

interface StudentInClass {
  id: string;
  identityCode: string;
  fullName: string;
  subjectType: string;
  departmentOrClass: string;
  qualityScore: number;
  isActive: boolean;
}

export default function ClassesPage() {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [classes, setClasses] = useState<ClassroomItem[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State Modal Thêm / Sửa lớp
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<ClassroomItem | null>(null);
  const [classForm, setClassForm] = useState({
    code: '',
    name: '',
    gradeLevel: 10,
    room: 'P.101',
    building: 'Nhà A',
    floor: 1,
    homeroomTeacher: '',
    totalStudents: 45,
  });

  // State Modal Chi tiết học sinh của lớp
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailClass, setDetailClass] = useState<ClassroomItem | null>(null);
  const [studentsInClass, setStudentsInClass] = useState<StudentInClass[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);

  // State ConfirmDialog Xóa
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

  const loadClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = selectedGrade ? `/classrooms?grade=${selectedGrade}` : '/classrooms';
      const data = await fetchApi<ClassroomItem[]>(query);
      setClasses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load classrooms from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [selectedGrade]);

  const handleOpenCreate = () => {
    setEditingClass(null);
    setClassForm({
      code: '',
      name: '',
      gradeLevel: 10,
      room: 'P.101',
      building: 'Nhà A',
      floor: 1,
      homeroomTeacher: '',
      totalStudents: 45,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassroomItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClass(cls);
    setClassForm({
      code: cls.code,
      name: cls.name,
      gradeLevel: cls.gradeLevel,
      room: cls.room,
      building: cls.building,
      floor: cls.floor,
      homeroomTeacher: cls.homeroomTeacher,
      totalStudents: cls.totalStudents,
    });
    setIsModalOpen(true);
  };

  const handleSubmitClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await putApi(`/classrooms/${editingClass.id}`, classForm);
        showSuccess('Cập nhật lớp học', `Đã lưu thay đổi cho lớp ${classForm.name}`);
      } else {
        await postApi('/classrooms', {
          ...classForm,
          id: classForm.code,
        });
        showSuccess('Thêm lớp học mới', `Đã tạo lớp ${classForm.name} thành công`);
      }
      setIsModalOpen(false);
      loadClasses();
    } catch (err: any) {
      showError('Thao tác thất bại', err.message);
    }
  };

  const handleDeleteClass = (cls: ClassroomItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa Lớp Học',
      message: `Bạn có chắc chắn muốn xóa lớp học "${cls.name}" (${cls.code}) khỏi hệ thống?`,
      action: async () => {
        try {
          await deleteApi(`/classrooms/${cls.id}`);
          showSuccess('Xóa lớp học', `Đã xóa lớp ${cls.name}`);
          loadClasses();
        } catch (err: any) {
          showError('Lỗi xóa lớp học', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleOpenDetails = async (cls: ClassroomItem) => {
    setDetailClass(cls);
    setDetailModalOpen(true);
    setIsLoadingStudents(true);
    try {
      const data = await fetchApi<StudentInClass[]>(`/classrooms/${cls.id}/students`);
      setStudentsInClass(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Lỗi tải danh sách học sinh:', err.message);
      setStudentsInClass([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('classes.title')}</h2>
          <p className="text-sm text-slate-500">{t('classes.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadClasses}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('classes.addClass')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Lọc theo khối lớp */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <label className="text-xs font-semibold text-slate-600">Lọc theo khối lớp:</label>
        <div className="flex gap-2">
          {['', '10', '11', '12'].map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedGrade === grade
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {grade ? `Khối ${grade}` : 'Tất cả khối'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500 font-medium">{t('common.loading')}</div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold text-sm border border-sky-200">
                    {cls.code}
                  </span>
                  <span className="text-xs text-slate-500">
                    {t('classes.room')} {cls.room} ({cls.building || 'Nhà A'})
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">{cls.name}</h3>
                <p className="text-xs text-slate-500 mb-3">
                  {t('classes.homeroomTeacher')}:{' '}
                  <span className="text-slate-800 font-medium">{cls.homeroomTeacher || 'Chưa phân công'}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-mono font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> {cls.totalStudents} HS
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenDetails(cls)}
                    className="p-1.5 text-sky-600 hover:text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
                    title="Xem chi tiết học sinh"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleOpenEdit(cls, e)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Chỉnh sửa thông tin"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClass(cls, e)}
                    className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Xóa lớp học"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 font-medium">{t('common.noData')}</div>
      )}

      {/* Modal Thêm / Sửa Lớp */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Cập Nhật Lớp Học' : 'Thêm Mới Lớp Học'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitClass} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã lớp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!!editingClass}
                value={classForm.code}
                onChange={(e) => setClassForm({ ...classForm, code: e.target.value.toUpperCase() })}
                placeholder="10A1"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase font-mono focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khối lớp <span className="text-rose-500">*</span>
              </label>
              <select
                value={classForm.gradeLevel}
                onChange={(e) => setClassForm({ ...classForm, gradeLevel: parseInt(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value={10}>Khối 10</option>
                <option value={11}>Khối 11</option>
                <option value={12}>Khối 12</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên lớp học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              placeholder="Lớp 10 Chuyên Toán"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Giáo viên chủ nhiệm</label>
            <input
              type="text"
              value={classForm.homeroomTeacher}
              onChange={(e) => setClassForm({ ...classForm, homeroomTeacher: e.target.value })}
              placeholder="Thầy Nguyễn Hoàng Nam"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng học</label>
              <input
                type="text"
                value={classForm.room}
                onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
                placeholder="P.101"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tòa nhà</label>
              <input
                type="text"
                value={classForm.building}
                onChange={(e) => setClassForm({ ...classForm, building: e.target.value })}
                placeholder="Nhà A"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sĩ số</label>
              <input
                type="number"
                min="1"
                max="60"
                value={classForm.totalStudents}
                onChange={(e) => setClassForm({ ...classForm, totalStudents: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
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
              {editingClass ? 'Lưu thay đổi' : 'Thêm Lớp Học'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chi Tiết Học Sinh Trong Lớp */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Chi Tiết Lớp Học - ${detailClass?.name || ''} (${detailClass?.code || ''})`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500">Giáo viên chủ nhiệm: </span>
              <span className="font-bold text-slate-900 block mt-0.5">{detailClass?.homeroomTeacher || '--'}</span>
            </div>
            <div>
              <span className="text-slate-500">Phòng & Vị trí: </span>
              <span className="font-bold text-slate-900 block mt-0.5">Phòng {detailClass?.room} ({detailClass?.building}, Tầng {detailClass?.floor})</span>
            </div>
            <div>
              <span className="text-slate-500">Sĩ số định biên: </span>
              <span className="font-bold text-emerald-600 block mt-0.5">{detailClass?.totalStudents} Học sinh</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-600" />
              Danh Sách Học Sinh Có Hồ Sơ Sinh Trắc
            </h4>

            {isLoadingStudents ? (
              <div className="py-8 text-center text-slate-500 text-xs font-medium">Đang tải danh sách học sinh...</div>
            ) : studentsInClass.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 sticky top-0 uppercase text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Mã định danh</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Chất lượng AI</th>
                      <th className="py-2.5 px-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentsInClass.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-sky-600 font-bold">{st.identityCode}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium">{st.fullName}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 font-bold">
                          {Math.round((st.qualityScore || 0.9) * 100)}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            HOẠT ĐỘNG
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                Chưa có dữ liệu khuôn mặt đăng ký cho lớp này
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              onClick={() => setDetailModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Dialog Xác nhận Xóa */}
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
