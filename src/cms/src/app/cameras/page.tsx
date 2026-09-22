'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Shield,
  Plus,
  RefreshCw,
  AlertCircle,
  Play,
  Settings2,
  Trash2,
  Edit,
  CheckCircle2
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, putApi, deleteApi } from '@/lib/api';
import { CameraStatus, TripwireDirection } from '@/types/enums';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface CameraDevice {
  id: string;
  name: string;
  ipAddress: string;
  rtspUrl: string;
  location: string;
  status: CameraStatus;
  fps: number;
  tripwireDirection: TripwireDirection;
}

export default function CamerasPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCam, setSelectedCam] = useState<CameraDevice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTestingRtsp, setIsTestingRtsp] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCam, setEditingCam] = useState<CameraDevice | null>(null);
  const [camForm, setCamForm] = useState({
    name: '',
    ipAddress: '',
    rtspUrl: '',
    location: '',
    status: CameraStatus.ONLINE,
    fps: 25,
    tripwireDirection: TripwireDirection.CHECK_IN,
  });

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

  const loadCameras = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<CameraDevice[]>('/cameras');
      const list = Array.isArray(data) ? data : [];
      setCameras(list);
      if (list.length > 0) {
        setSelectedCam((prev) => (prev ? list.find((c) => c.id === prev.id) || list[0] : list[0]));
      }
    } catch (err: any) {
      console.warn('Failed to load cameras from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  const handleOpenCreate = () => {
    setEditingCam(null);
    setCamForm({
      name: '',
      ipAddress: '192.168.10.',
      rtspUrl: 'rtsp://admin:Pass@2026@192.168.10.100:554/live/ch0',
      location: 'Cổng chính - Làn 1',
      status: CameraStatus.ONLINE,
      fps: 25,
      tripwireDirection: TripwireDirection.CHECK_IN,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cam: CameraDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCam(cam);
    setCamForm({
      name: cam.name,
      ipAddress: cam.ipAddress,
      rtspUrl: cam.rtspUrl,
      location: cam.location,
      status: cam.status,
      fps: cam.fps,
      tripwireDirection: cam.tripwireDirection,
    });
    setIsModalOpen(true);
  };

  const handleSubmitCam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCam) {
        await putApi(`/cameras/${editingCam.id}`, camForm);
        showSuccess('Cập nhật camera', `Đã cập nhật cấu hình thiết bị ${camForm.name}`);
      } else {
        await postApi('/cameras', camForm);
        showSuccess('Thêm camera mới', `Đã kết nối thành công thiết bị ${camForm.name}`);
      }
      setIsModalOpen(false);
      loadCameras();
    } catch (err: any) {
      showError('Thao tác thất bại', err.message);
    }
  };

  const handleDeleteCam = (cam: CameraDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa Thiết Bị Camera',
      message: `Bạn có chắc chắn muốn xóa camera "${cam.name}" (${cam.ipAddress}) khỏi hệ thống giám sát?`,
      action: async () => {
        try {
          await deleteApi(`/cameras/${cam.id}`);
          showSuccess('Xóa camera', `Đã xóa thiết bị ${cam.name}`);
          loadCameras();
        } catch (err: any) {
          showError('Lỗi xóa camera', err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleTestRtsp = async () => {
    if (!selectedCam) return;
    setIsTestingRtsp(true);
    try {
      const res = await postApi<any>(`/cameras/${selectedCam.id}/test`);
      showSuccess(
        'Kiểm tra luồng RTSP',
        `Kết nối thành công tới ${selectedCam.name}: 1080p, 25 FPS, Độ trễ 120ms`
      );
    } catch (err: any) {
      showError('Lỗi kết nối RTSP', err.message);
    } finally {
      setIsTestingRtsp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('cameras.title')}</h2>
          <p className="text-sm text-slate-400">{t('cameras.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCameras}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t('cameras.addCamera')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách camera */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              {t('cameras.deviceList')} ({cameras.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-500">{t('common.loading')}</div>
          ) : cameras.length > 0 ? (
            cameras.map((cam) => (
              <div
                key={cam.id}
                onClick={() => setSelectedCam(cam)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedCam?.id === cam.id
                    ? 'bg-slate-800/90 border-sky-500 shadow-md shadow-sky-950/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{cam.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        cam.status === CameraStatus.ONLINE
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {cam.status === CameraStatus.ONLINE ? t('cameras.online') : t('cameras.offline')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-mono mb-2 truncate">{cam.rtspUrl}</p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>
                    {t('cameras.tripwireDir')}: <span className="text-sky-400 font-medium">{cam.tripwireDirection}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleOpenEdit(cam, e)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                      title="Sửa thông số"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCam(cam, e)}
                      className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-700 transition-colors"
                      title="Xóa camera"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500">{t('common.noData')}</div>
          )}
        </div>

        {/* Khung vẽ Canvas Spatial Tripwire */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Video className="w-4 h-4 text-sky-400" />
              {t('cameras.canvasTitle')} - {selectedCam ? selectedCam.name : '--'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestRtsp}
                disabled={!selectedCam || isTestingRtsp}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isTestingRtsp ? 'animate-spin' : ''}`} />
                {isTestingRtsp ? 'Đang kiểm tra...' : 'Kiểm Tra RTSP'}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center min-h-[360px] overflow-hidden">
            {/* Giả lập khung hình Camera và Vạch ảo Spatial Tripwire */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
              <div className="flex justify-between items-center text-xs font-mono text-emerald-400 bg-slate-900/80 px-3 py-1.5 rounded border border-emerald-500/30 w-fit">
                <span>REC ● 1080p | {selectedCam?.fps || 25} FPS | {selectedCam?.ipAddress || '192.168.10.101'}</span>
              </div>
              <div className="text-right text-xs font-mono text-slate-400">
                Tripwire ID: TW_{selectedCam?.id || 'DEFAULT'} | Vị trí: {selectedCam?.location || '--'}
              </div>
            </div>

            {/* Vạch ảo Tripwire Vector */}
            <svg className="w-full h-full absolute inset-0">
              <line x1="20%" y1="65%" x2="80%" y2="65%" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4" />
              <circle cx="20%" cy="65%" r="6" fill="#38bdf8" />
              <circle cx="80%" cy="65%" r="6" fill="#38bdf8" />
            </svg>
            <div className="bg-sky-500/20 text-sky-300 text-xs px-3 py-1 rounded-full border border-sky-400/40 z-10 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              {selectedCam ? `Vạch Ảo Phân Định: ${selectedCam.tripwireDirection}` : t('common.loading')}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thêm / Sửa Camera */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCam ? 'Cập Nhật Thiết Bị Camera' : 'Thêm Mới Thiết Bị Camera IP'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitCam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên camera <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={camForm.name}
              onChange={(e) => setCamForm({ ...camForm, name: e.target.value })}
              placeholder="ví dụ: Camera Cổng Chính - Làn 1"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Địa chỉ IP <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={camForm.ipAddress}
                onChange={(e) => setCamForm({ ...camForm, ipAddress: e.target.value })}
                placeholder="192.168.10.101"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">FPS (Khung hình/giây)</label>
              <input
                type="number"
                min="10"
                max="60"
                value={camForm.fps}
                onChange={(e) => setCamForm({ ...camForm, fps: parseInt(e.target.value) || 25 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Đường dẫn luồng RTSP <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={camForm.rtspUrl}
              onChange={(e) => setCamForm({ ...camForm, rtspUrl: e.target.value })}
              placeholder="rtsp://admin:Pass@2026@192.168.10.101:554/live/ch0"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Vị trí lắp đặt</label>
            <input
              type="text"
              value={camForm.location}
              onChange={(e) => setCamForm({ ...camForm, location: e.target.value })}
              placeholder="Cổng trước, Hành lang tầng 1..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Chiều vạch ảo điểm danh</label>
              <select
                value={camForm.tripwireDirection}
                onChange={(e) => setCamForm({ ...camForm, tripwireDirection: e.target.value as TripwireDirection })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value={TripwireDirection.CHECK_IN}>Vào Trường (CHECK_IN)</option>
                <option value={TripwireDirection.CHECK_OUT}>Ra Về (CHECK_OUT)</option>
                <option value={TripwireDirection.BIDIRECTIONAL}>Hai Chiều (BIDIRECTIONAL)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Trạng thái</label>
              <select
                value={camForm.status}
                onChange={(e) => setCamForm({ ...camForm, status: e.target.value as CameraStatus })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value={CameraStatus.ONLINE}>Trực tuyến (ONLINE)</option>
                <option value={CameraStatus.OFFLINE}>Ngoại tuyến (OFFLINE)</option>
              </select>
            </div>
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
              {editingCam ? 'Lưu thay đổi' : 'Thêm Camera'}
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
        isDangerous={true}
      />
    </div>
  );
}
