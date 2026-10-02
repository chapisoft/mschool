'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Radar,
  Network,
  Cpu,
  ArrowRight,
  Search,
  Check,
  Sparkles,
  Eye,
  Zap,
  MapPin,
  Clock
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, putApi, deleteApi } from '@/lib/api';
import {
  CameraStatus,
  TripwireDirection,
  CameraVendor,
  DiscoveryProtocol,
  DiscoveryMode,
  DiscoveryFilter,
  SystemConfigKey,
  SystemConfigGroup,
} from '@/types/enums';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FaceRecognitionTestModal from '@/features/face-test/FaceRecognitionTestModal';

interface SystemParameterItem {
  id?: string;
  paramKey: string;
  paramValue: string;
  paramGroup: string;
  description?: string;
}

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

interface DiscoveredCamera {
  ipAddress: string;
  macAddress: string;
  vendor: CameraVendor;
  model: string;
  onvifPort: number;
  rtspPort: number;
  suggestedRtspUrl: string;
  suggestedName: string;
  declared: boolean;
  existingCameraId?: string;
  existingLocation?: string;
  resolution: string;
  fps: number;
  discoveryProtocol: DiscoveryProtocol;
}

export default function CamerasPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCam, setSelectedCam] = useState<CameraDevice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTestingRtsp, setIsTestingRtsp] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State Modal Thêm / Sửa thủ công (Zero Fake Default Values)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCam, setEditingCam] = useState<CameraDevice | null>(null);
  const [selectedDiscoveredId, setSelectedDiscoveredId] = useState<string | null>(null);
  const [camForm, setCamForm] = useState({
    name: '',
    ipAddress: '',
    rtspUrl: '',
    location: '',
    status: CameraStatus.ONLINE,
    fps: 0,
    tripwireDirection: TripwireDirection.CHECK_IN,
  });

  // State kiểm tra RTSP trong Form Thêm Mới
  const [formTestStatus, setFormTestStatus] = useState<{
    testing: boolean;
    result: string | null;
    success?: boolean;
  }>({
    testing: false,
    result: null,
  });

  // State Cấu hình mạng động từ DB (Zero-Hardcode & Zero Fake Default Values)
  const [networkConfigs, setNetworkConfigs] = useState<SystemParameterItem[]>([]);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [subnetInput, setSubnetInput] = useState<string>('');
  const [rtspCredentials, setRtspCredentials] = useState<string>('');
  const [discoveredList, setDiscoveredList] = useState<DiscoveredCamera[]>([]);
  const [discoveryFilter, setDiscoveryFilter] = useState<DiscoveryFilter>(DiscoveryFilter.UNDECLARED);

  // State Modal Khai báo nhanh từ Auto-Discovery (Zero Fake Default Values)
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState<boolean>(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    ipAddress: '',
    rtspUrl: '',
    location: '',
    fps: 0,
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

  // State Trực quan hóa hình ảnh Camera thật trên Canvas (Live Snapshot & Streaming Preview)
  const [snapshotKey, setSnapshotKey] = useState<number>(Date.now());
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null);
  const [liveFrameUrl, setLiveFrameUrl] = useState<string | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState<boolean>(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [currentClock, setCurrentClock] = useState<string>('');
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasReceivedLiveFrameRef = useRef<boolean>(false);

  // State Thử nghiệm nhận diện khuôn mặt & Tự động điểm danh
  const [isFaceTestModalOpen, setIsFaceTestModalOpen] = useState<boolean>(false);
  const [isAutoAttendanceEnabled, setIsAutoAttendanceEnabled] = useState<boolean>(true);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const timeStr = d.toLocaleTimeString('vi-VN', { hour12: false });
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      setCurrentClock(`${timeStr} · ${dateStr}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAutoAttendanceStatus = async () => {
      try {
        const resp = await fetchApi<{ status?: string; data?: { enabled?: boolean } }>('/biometrics/auto-attendance/status');
        if (resp && resp.data && typeof resp.data.enabled === 'boolean') {
          setIsAutoAttendanceEnabled(resp.data.enabled);
        }
      } catch (ignored) {}
    };
    fetchAutoAttendanceStatus();
  }, []);

  const handleToggleAutoAttendance = async () => {
    const nextState = !isAutoAttendanceEnabled;
    try {
      await postApi(`/biometrics/auto-attendance/toggle?enabled=${nextState}`, {});
      setIsAutoAttendanceEnabled(nextState);
      showSuccess(
        'Chế độ tự động điểm danh qua Camera',
        nextState ? 'Đã kích hoạt quét khuôn mặt và tự động ghi nhận điểm danh' : 'Đã tạm dừng tự động điểm danh'
      );
    } catch (err: any) {
      showError('Lỗi cập nhật chế độ điểm danh tự động', err.message);
    }
  };

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

  const loadNetworkConfig = async () => {
    try {
      const data = await fetchApi<SystemParameterItem[]>(`/system-configs?group=${SystemConfigGroup.CAMERA_NETWORK}`);
      if (Array.isArray(data)) {
        setNetworkConfigs(data);
        const subnetParam = data.find((p) => p.paramKey === SystemConfigKey.CAMERA_SUBNET);
        const credParam = data.find((p) => p.paramKey === SystemConfigKey.CAMERA_RTSP_CREDENTIALS);
        if (subnetParam?.paramValue) {
          setSubnetInput(subnetParam.paramValue);
          runDiscoveryScan(false, subnetParam.paramValue);
        }
        if (credParam?.paramValue) {
          setRtspCredentials(credParam.paramValue);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load camera network parameters from system-configs:', err.message);
    }
  };

  useEffect(() => {
    loadCameras();
    loadNetworkConfig();
  }, []);

  useEffect(() => {
    if (selectedCam) {
      setSnapshotError(null);
      setIsSnapshotLoading(true);
      setSnapshotKey(Date.now());
      setActiveFrameUrl(null);
      setLiveFrameUrl(null);

      // Tự động gỡ bỏ loading overlay sau 1.5s để không bao giờ che khuất luồng stream
      const loadTimeout = setTimeout(() => {
        setIsSnapshotLoading(false);
      }, 1500);
      return () => clearTimeout(loadTimeout);
    }
  }, [selectedCam?.id]);

  const handleRefreshSnapshot = () => {
    setSnapshotError(null);
    setIsSnapshotLoading(true);
    setSnapshotKey(Date.now());
    setTimeout(() => setIsSnapshotLoading(false), 1200);
  };

  // Luồng nhận video WebSocket thời gian thực (Zero Accumulated Latency, Direct Canvas Render)
  useEffect(() => {
    if (!selectedCam || !isLiveStream) {
      setIsWsConnected(false);
      return;
    }

    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    hasReceivedLiveFrameRef.current = false;

    const connectWs = () => {
      if (!isMounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/cameras/${selectedCam.id}`;
        ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
          if (!isMounted) return;
          setIsWsConnected(true);
          setSnapshotError(null);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          if (event.data instanceof ArrayBuffer && event.data.byteLength > 1024) {
            const blob = new Blob([event.data], { type: 'image/jpeg' });
            if (typeof createImageBitmap !== 'undefined') {
              createImageBitmap(blob)
                .then((bitmap) => {
                  if (!isMounted) {
                    bitmap.close();
                    return;
                  }
                  const canvas = videoCanvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                    }
                  }
                  bitmap.close();
                  if (!hasReceivedLiveFrameRef.current) {
                    hasReceivedLiveFrameRef.current = true;
                    setIsSnapshotLoading(false);
                    setSnapshotError(null);
                  }
                })
                .catch(() => {});
            } else {
              const url = URL.createObjectURL(blob);
              const img = new Image();
              img.onload = () => {
                if (!isMounted) {
                  URL.revokeObjectURL(url);
                  return;
                }
                const canvas = videoCanvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  }
                }
                URL.revokeObjectURL(url);
                if (!hasReceivedLiveFrameRef.current) {
                  hasReceivedLiveFrameRef.current = true;
                  setIsSnapshotLoading(false);
                  setSnapshotError(null);
                }
              };
              img.src = url;
            }
          }
        };

        ws.onerror = (err) => {
          console.warn('WebSocket camera stream error:', err);
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 2000);
        };
      } catch (err) {
        console.warn('Failed to connect camera WebSocket stream:', err);
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
      setIsWsConnected(false);
    };
  }, [selectedCam?.id, isLiveStream]);

  // Vòng lặp lấy snapshot mượt mà không nhấp nháy đen (Preload Double-Buffering khi ở chế độ Snapshot)
  useEffect(() => {
    if (!selectedCam || isLiveStream) return;

    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const fetchNextFrame = () => {
      const nextUrl = `/api/v1/cameras/${selectedCam.id}/snapshot?t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        if (!isMounted) return;
        setActiveFrameUrl(nextUrl);
        setIsSnapshotLoading(false);
        setSnapshotError(null);
        timer = setTimeout(fetchNextFrame, 1500);
      };
      img.onerror = () => {
        if (!isMounted) return;
        if (!activeFrameUrl) {
          setSnapshotError(t('cameras.streamConnectFailedHint'));
        }
        setIsSnapshotLoading(false);
        timer = setTimeout(fetchNextFrame, 3000);
      };
      img.src = nextUrl;
    };

    fetchNextFrame();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [selectedCam?.id, isLiveStream, snapshotKey]);

  const runDiscoveryScan = async (showNotification = true, customSubnet?: string) => {
    const targetSubnet = customSubnet || subnetInput;
    if (!targetSubnet || !targetSubnet.trim()) {
      if (showNotification) {
        showError(t('cameras.toastMissingParams'), t('cameras.toastMissingParams'));
      }
      return;
    }
    setIsScanning(true);
    try {
      const res = await postApi<DiscoveredCamera[]>('/cameras/discover', {
        subnet: targetSubnet,
        discoveryMode: DiscoveryMode.ALL,
      });
      const list = Array.isArray(res) ? res : [];
      setDiscoveredList(list);

      const undeclaredCount = list.filter((c) => !c.declared).length;
      if (showNotification) {
        if (undeclaredCount > 0) {
          showSuccess(
            t('cameras.toastDiscoveryDone'),
            `${t('cameras.toastDiscoveryFound')} (${undeclaredCount})`
          );
        } else {
          showInfo(t('cameras.toastDiscoveryDone'), t('cameras.toastDiscoveryNone'));
        }
      }
    } catch (err: any) {
      if (showNotification) {
        showError(t('cameras.toastDiscoveryError'), err.message);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCam(null);
    setSelectedDiscoveredId(null);
    setFormTestStatus({ testing: false, result: null });
    setCamForm({
      name: '',
      ipAddress: '',
      rtspUrl: '',
      location: '',
      status: CameraStatus.ONLINE,
      fps: 0,
      tripwireDirection: TripwireDirection.CHECK_IN,
    });
    setIsModalOpen(true);
    // Nếu danh sách dò chưa có, chạy dò ngay
    if (discoveredList.length === 0 && !isScanning) {
      runDiscoveryScan(false);
    }
  };

  const handleOpenEdit = (cam: CameraDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCam(cam);
    setSelectedDiscoveredId(null);
    setFormTestStatus({ testing: false, result: null });
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
        showSuccess(t('cameras.toastUpdateSuccess'), camForm.name);
      } else {
        await postApi('/cameras', camForm);
        showSuccess(t('cameras.toastCreateSuccess'), camForm.name);
        // Cập nhật trạng thái camera này thành đã khai báo trong danh sách dò
        setDiscoveredList((prev) =>
          prev.map((c) =>
            c.ipAddress === camForm.ipAddress
              ? { ...c, declared: true, existingLocation: camForm.location }
              : c
          )
        );
      }
      setIsModalOpen(false);
      loadCameras();
    } catch (err: any) {
      showError(t('common.errorLoading'), err.message);
    }
  };

  const handleDeleteCam = (cam: CameraDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: t('cameras.deleteConfirmTitle'),
      message: `${t('cameras.deleteConfirmMsg')} (${cam.name} - ${cam.ipAddress})`,
      action: async () => {
        try {
          await deleteApi(`/cameras/${cam.id}`);
          showSuccess(t('cameras.toastDeleteSuccess'), cam.name);
          loadCameras();
        } catch (err: any) {
          showError(t('cameras.toastDiscoveryError'), err.message);
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
      await postApi<any>(`/cameras/${selectedCam.id}/test`);
      showSuccess(t('cameras.toastRtspSuccess'), selectedCam.name);
    } catch (err: any) {
      showError(t('cameras.toastRtspError'), err.message);
    } finally {
      setIsTestingRtsp(false);
    }
  };

  // Áp dụng thông số từ camera tự dò vào Form thêm mới (Zero-Hardcode & i18n)
  const handleApplyDiscoveredToForm = (cam: DiscoveredCamera) => {
    setCamForm((prev) => ({
      ...prev,
      name: cam.suggestedName.replace(/^\[.*?\]\s*/, ''),
      ipAddress: cam.ipAddress,
      rtspUrl: cam.suggestedRtspUrl,
      fps: cam.fps || 0,
    }));
    setSelectedDiscoveredId(cam.ipAddress);
    setFormTestStatus({ testing: false, result: null });
    showSuccess(t('cameras.toastAutoFilled'), `${cam.vendor} (${cam.ipAddress})`);
  };

  const vendorConfigKeyMap: Record<CameraVendor, SystemConfigKey> = {
    [CameraVendor.HIKVISION]: SystemConfigKey.RTSP_TEMPLATE_HIKVISION,
    [CameraVendor.DAHUA]: SystemConfigKey.RTSP_TEMPLATE_DAHUA,
    [CameraVendor.UNIVIEW]: SystemConfigKey.RTSP_TEMPLATE_UNIVIEW,
    [CameraVendor.TIANDY]: SystemConfigKey.RTSP_TEMPLATE_TIANDY,
    [CameraVendor.GENERIC_ONVIF]: SystemConfigKey.RTSP_TEMPLATE_GENERIC_ONVIF,
  };

  // Áp dụng định dạng RTSP mẫu theo hãng từ CSDL bằng Enum (Zero Hardcode URLs)
  const handleApplyVendorRtspTemplate = (vendor: CameraVendor) => {
    const targetKey = vendorConfigKeyMap[vendor] || SystemConfigKey.RTSP_TEMPLATE_GENERIC_ONVIF;
    const configItem = networkConfigs.find((c) => c.paramKey === targetKey);
    const ip = camForm.ipAddress.trim() || '[IP_CAMERA]';
    const authPrefix = rtspCredentials ? `${rtspCredentials}@` : '';
    if (configItem?.paramValue) {
      const newUrl = configItem.paramValue.replace('{auth}', authPrefix).replace('{ip}', ip);
      setCamForm((prev) => ({ ...prev, rtspUrl: newUrl }));
      setFormTestStatus({ testing: false, result: null });
    }
  };

  // Thử kết nối RTSP trực tiếp bằng Socket TCP thực chứng qua Backend API (Zero Mock Data)
  const handleTestFormRtsp = async () => {
    if (!camForm.ipAddress || !camForm.rtspUrl) {
      showError(t('cameras.toastMissingParams'), t('cameras.toastMissingParams'));
      return;
    }
    setFormTestStatus({ testing: true, result: null });
    try {
      const probeRes = await postApi<any>('/cameras/probe', {
        ipAddress: camForm.ipAddress,
        rtspUrl: camForm.rtspUrl,
      });
      const latency = probeRes?.latencyMs || 0;
      const isConnected = probeRes?.status === 'CONNECTED';
      setFormTestStatus({
        testing: false,
        result: `${isConnected ? t('cameras.toastRtspSuccess') : t('cameras.toastRtspError')} (${probeRes?.status}, ${latency}ms)`,
        success: isConnected,
      });
      if (isConnected) {
        showSuccess(t('cameras.toastRtspSuccess'), `${camForm.ipAddress} (${latency}ms)`);
      } else {
        showError(t('cameras.toastRtspError'), `${camForm.ipAddress}: OFFLINE`);
      }
    } catch (err: any) {
      setFormTestStatus({
        testing: false,
        result: t('cameras.toastRtspError'),
        success: false,
      });
      showError(t('cameras.toastRtspError'), err.message);
    }
  };

  // -------------------------------------------------------------
  // Các hàm xử lý Tự Dò Camera Mạng (Auto-Discovery) Modal riêng
  // -------------------------------------------------------------
  const handleOpenDiscovery = () => {
    setIsDiscoveryOpen(true);
    if (discoveredList.length === 0) {
      runDiscoveryScan(true);
    }
  };

  const handleOpenQuickOnboard = (cam: DiscoveredCamera) => {
    setOnboardForm({
      name: cam.suggestedName.replace(/^\[.*?\]\s*/, ''),
      ipAddress: cam.ipAddress,
      rtspUrl: cam.suggestedRtspUrl,
      location: '',
      fps: cam.fps || 0,
      tripwireDirection: TripwireDirection.CHECK_IN,
    });
    setIsOnboardModalOpen(true);
  };

  const handleSubmitQuickOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postApi('/cameras/quick-onboard', onboardForm);
      showSuccess(t('cameras.onboardSuccessMsg'), `${onboardForm.name} (${onboardForm.ipAddress})`);
      setDiscoveredList((prev) =>
        prev.map((c) =>
          c.ipAddress === onboardForm.ipAddress
            ? { ...c, declared: true, existingLocation: onboardForm.location }
            : c
        )
      );
      setIsOnboardModalOpen(false);
      loadCameras();
    } catch (err: any) {
      showError(t('cameras.onboardErrorTitle'), err.message);
    }
  };

  const filteredDiscovered = discoveredList.filter((cam) => {
    if (discoveryFilter === DiscoveryFilter.UNDECLARED) return !cam.declared;
    if (discoveryFilter === DiscoveryFilter.DECLARED) return cam.declared;
    return true;
  });

  const undeclaredCameras = discoveredList.filter((c) => !c.declared);
  const undeclaredCount = undeclaredCameras.length;
  const declaredCount = discoveredList.filter((c) => c.declared).length;

  // Trích xuất danh mục vị trí thực tế trong trường học từ camera đã quản trị
  const existingLocations = Array.from(
    new Set(cameras.map((c) => c.location).filter((loc) => Boolean(loc && loc.trim())))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('cameras.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('cameras.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCameras}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
            {t('common.refresh')}
          </button>

          {/* Nút Tự Dò Camera Mạng */}
          <button
            onClick={handleOpenDiscovery}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <Radar className="w-4 h-4" />
            <span>{t('cameras.autoDiscovery')}</span>
            {undeclaredCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold">
                {undeclaredCount}
              </span>
            )}
          </button>

          {/* Nút Thêm Mới */}
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('cameras.addCamera')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách camera */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('cameras.deviceList')} ({cameras.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400">{t('common.loading')}</div>
          ) : cameras.length > 0 ? (
            cameras.map((cam) => (
              <div
                key={cam.id}
                onClick={() => setSelectedCam(cam)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xs ${
                  selectedCam?.id === cam.id
                    ? 'bg-sky-50/70 border-sky-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-sm">{cam.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        cam.status === CameraStatus.ONLINE
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {cam.status === CameraStatus.ONLINE ? t('cameras.online') : t('cameras.offline')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                  <span className="font-semibold text-slate-700">{cam.location}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-500">{cam.ipAddress}</span>
                </div>

                <p className="text-xs text-slate-400 font-mono mb-2 truncate">{cam.rtspUrl}</p>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>
                    {t('cameras.tripwireDir')}: <span className="text-sky-700 font-semibold">{cam.tripwireDirection}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleOpenEdit(cam, e)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCam(cam, e)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400">{t('common.noData')}</div>
          )}
        </div>

        {/* Khung vẽ Canvas Spatial Tripwire */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 min-w-0">
              <Video className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="truncate">{t('cameras.canvasTitle')} - {selectedCam ? selectedCam.name : '--'}</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-xs font-mono text-slate-700 border border-slate-200 shadow-xs">
                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>{currentClock}</span>
              </div>

              {/* Nút Bật/Tắt Tự động Điểm danh qua Camera */}
              <button
                type="button"
                onClick={handleToggleAutoAttendance}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-xs whitespace-nowrap cursor-pointer ${
                  isAutoAttendanceEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Bật/Tắt chế độ tự động quét khuôn mặt và điểm danh học sinh từ camera"
              >
                <span className={`w-2 h-2 rounded-full ${isAutoAttendanceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{isAutoAttendanceEnabled ? 'Tự động điểm danh: BẬT' : 'Tự động: TẮT'}</span>
              </button>

              {/* Nút Thử nghiệm Nhận diện khuôn mặt */}
              <button
                type="button"
                onClick={() => setIsFaceTestModalOpen(true)}
                disabled={!selectedCam}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 border border-indigo-200 shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                title="Thử nghiệm nhận diện khuôn mặt độc lập từ Camera hoặc tải ảnh"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thử nghiệm nhận diện</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextMode = !isLiveStream;
                  setIsLiveStream(nextMode);
                  setIsSnapshotLoading(!activeFrameUrl);
                  setSnapshotError(null);
                  setSnapshotKey(Date.now());
                }}
                disabled={!selectedCam}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-xs whitespace-nowrap cursor-pointer ${
                  isLiveStream
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isLiveStream ? t('cameras.liveStreamMode') : t('cameras.snapshotMode')}
              >
                <span className={`w-2 h-2 rounded-full ${isLiveStream ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{isLiveStream ? t('cameras.liveStreamMode') : t('cameras.snapshotMode')}</span>
              </button>
              <button
                type="button"
                onClick={handleRefreshSnapshot}
                disabled={!selectedCam || isSnapshotLoading}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs text-slate-700 border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                title={t('cameras.refreshSnapshotBtn')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSnapshotLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
                <span>{t('cameras.refreshSnapshotBtn')}</span>
              </button>
              <button
                type="button"
                onClick={handleTestRtsp}
                disabled={!selectedCam || isTestingRtsp}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs text-slate-700 border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Play className={`w-3.5 h-3.5 ${isTestingRtsp ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
                <span>{isTestingRtsp ? t('cameras.testingRtsp') : t('cameras.testRtsp')}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 relative flex items-center justify-center min-h-[380px] overflow-hidden">
            {/* TH1: Khi có lỗi kết nối luồng hình ảnh */}
            {snapshotError ? (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center z-20">
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-400 mb-3 shadow-inner">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white mb-2">{t('cameras.streamConnectFailed')}</h4>
                <p className="text-xs text-slate-300 max-w-lg leading-relaxed mb-6 bg-slate-900/70 p-3 rounded-xl border border-slate-800 font-mono">
                  {snapshotError}
                </p>
                <div className="flex items-center gap-3">
                  {selectedCam && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(selectedCam, e)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{t('cameras.editCredentialsBtn')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshSnapshot}
                    disabled={isSnapshotLoading}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSnapshotLoading ? 'animate-spin' : ''}`} />
                    <span>{t('cameras.refreshSnapshotBtn')}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TH2: Khi luồng hoạt động bình thường hoặc đang tải */
              <>
                {/* Luồng trực tiếp: Vẽ trực tiếp lên HTML5 Canvas với Zero-Lag (< 80ms) */}
                <canvas
                  ref={videoCanvasRef}
                  width={1280}
                  height={720}
                  className={`w-full h-full object-contain pointer-events-none absolute inset-0 z-0 ${
                    isLiveStream ? 'block' : 'hidden'
                  }`}
                />

                {/* Chế độ Snapshot tĩnh hoặc dự phòng */}
                {selectedCam && !isLiveStream && (
                  <img
                    key={`${selectedCam.id}-snap`}
                    src={activeFrameUrl || `/api/v1/cameras/${selectedCam.id}/snapshot?t=${snapshotKey}`}
                    alt=""
                    className="w-full h-full object-contain absolute inset-0 opacity-100 select-none pointer-events-none z-0"
                    onLoad={() => {
                      setIsSnapshotLoading(false);
                      setSnapshotError(null);
                    }}
                    onError={() => {
                      if (!activeFrameUrl) {
                        setIsSnapshotLoading(false);
                        setSnapshotError(t('cameras.streamConnectFailedHint'));
                      }
                    }}
                  />
                )}

                {/* Trạng thái đang tải khung hình (chỉ hiển thị khi đang kết nối) */}
                {isSnapshotLoading && (
                  <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
                    <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
                    <span className="text-xs text-slate-300 font-mono">{t('cameras.snapshotLoading')}</span>
                  </div>
                )}

                {/* Thông tin Overlay thời gian thực - Đặt ở đáy để không che khuất đồng hồ cam ở góc trên bên trái */}
                <div className="absolute inset-x-0 bottom-0 p-3 flex flex-wrap justify-between items-end gap-2 pointer-events-none z-10">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-slate-900/85 px-3 py-1.5 rounded-lg border border-emerald-500/30 backdrop-blur-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {isLiveStream ? `${t('cameras.liveBadge')} · 15 FPS HD` : 'SNAPSHOT · HD'}
                      {selectedCam?.ipAddress ? ` | ${selectedCam.ipAddress}` : ''}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 bg-slate-900/75 px-2.5 py-1.5 rounded-lg border border-slate-800 backdrop-blur-xs">
                    Tripwire ID: TW_{selectedCam?.id || 'DEFAULT'} | {t('cameras.locationLabel')}: {selectedCam?.location || '--'}
                  </div>
                </div>

                {/* Vạch ảo Tripwire Vector */}
                <svg className="w-full h-full absolute inset-0 pointer-events-none z-10">
                  <line x1="20%" y1="65%" x2="80%" y2="65%" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4" />
                  <circle cx="20%" cy="65%" r="6" fill="#38bdf8" />
                  <circle cx="80%" cy="65%" r="6" fill="#38bdf8" />
                </svg>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: TỰ ĐỘNG DÒ QUÉT CAMERA IP (AUTO-DISCOVERY DRAWER)    */}
      {/* ============================================================= */}
      <Modal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        title={t('cameras.discoveryModalTitle')}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Thanh công cụ quét Subnet */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-start gap-3">
            <div className="w-full">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                {t('cameras.scanSubnetLabel')}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Network className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={subnetInput}
                    onChange={(e) => setSubnetInput(e.target.value)}
                    placeholder="192.168.1.0/24, 192.168.10.0/24"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => runDiscoveryScan(true)}
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  <Radar className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? t('cameras.rescanScanning') : t('cameras.startScanBtn')}</span>
                </button>
              </div>

              {/* Gợi ý dải mạng và IP thiết bị */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">{t('cameras.suggestedSubnets')}:</span>
                {['192.168.1.0/24', '192.168.10.0/24', '192.168.1.64'].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSubnetInput(sub);
                      runDiscoveryScan(true, sub);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-colors ${
                      subnetInput === sub
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trạng thái đang quét */}
          {isScanning && (
            <div className="p-6 text-center bg-indigo-50/50 border border-indigo-100 rounded-2xl">
              <div className="inline-flex p-3 rounded-full bg-indigo-100 text-indigo-600 mb-3 animate-bounce">
                <Radar className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-xs font-bold text-indigo-900 mb-1">{t('cameras.scanningText')}</p>
              <p className="text-[11px] text-indigo-600 font-mono">{t('cameras.probingPortsNotice')} {subnetInput}</p>
            </div>
          )}

          {/* Kết quả thống kê & Tabs lọc */}
          {!isScanning && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscoveryFilter(DiscoveryFilter.UNDECLARED)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      discoveryFilter === DiscoveryFilter.UNDECLARED
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t('cameras.tabUndeclared')} ({undeclaredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscoveryFilter(DiscoveryFilter.DECLARED)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      discoveryFilter === DiscoveryFilter.DECLARED
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t('cameras.tabDeclared')} ({declaredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscoveryFilter(DiscoveryFilter.ALL)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      discoveryFilter === DiscoveryFilter.ALL
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t('cameras.tabAll')} ({discoveredList.length})
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  {t('cameras.supportedProtocolsLabel')}: <strong>ONVIF Profile S/T & RTSP H.264/H.265</strong>
                </span>
              </div>

              {/* Danh sách camera dò thấy */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredDiscovered.length > 0 ? (
                  filteredDiscovered.map((cam, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        !cam.declared
                          ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              cam.vendor === CameraVendor.HIKVISION
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : cam.vendor === CameraVendor.DAHUA
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : cam.vendor === CameraVendor.UNIVIEW
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {cam.vendor}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{cam.model || cam.vendor || '--'}</span>
                        </div>
                        <div>
                          {!cam.declared ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              {t('cameras.undeclaredBadge')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {t('cameras.declaredBadge')} ({cam.existingLocation || t('cameras.assignedBadge')})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 mb-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('cameras.ipLabel')}:</span>
                          <span className="font-mono font-bold text-slate-800">{cam.ipAddress}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('cameras.macLabel')}:</span>
                          <span className="font-mono text-slate-600">{cam.macAddress || '--'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('cameras.resolutionFpsLabel')}:</span>
                          <span className="text-slate-700">
                            {cam.resolution ? `${cam.resolution}${cam.fps ? ` @ ${cam.fps}fps` : ''}` : (cam.fps ? `${cam.fps}fps` : '--')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('cameras.protocolLabel')}:</span>
                          <span className="text-indigo-700 font-semibold">{cam.discoveryProtocol}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-100/80">
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-[420px]" title={cam.suggestedRtspUrl}>
                          {cam.suggestedRtspUrl}
                        </div>
                        {!cam.declared ? (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickOnboard(cam)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{t('cameras.quickOnboardBtn')}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {t('cameras.activeStatus')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {t('cameras.noUndeclaredFound')}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDiscoveryOpen(false)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: KHAI BÁO NHANH TỪ AUTO-DISCOVERY                     */}
      {/* ============================================================= */}
      <Modal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        title={t('cameras.onboardModalTitle')}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitQuickOnboard} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              {t('cameras.onboardModalNotice')} (IP: <strong>{onboardForm.ipAddress}</strong>)
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('cameras.nameLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={onboardForm.name}
              onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
              placeholder={t('cameras.namePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('cameras.ipLabel')}
              </label>
              <input
                type="text"
                readOnly
                value={onboardForm.ipAddress}
                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('cameras.locationLabel')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={onboardForm.location}
                onChange={(e) => setOnboardForm({ ...onboardForm, location: e.target.value })}
                placeholder={t('cameras.locationPlaceholder')}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('cameras.rtspUrlLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={onboardForm.rtspUrl}
              onChange={(e) => setOnboardForm({ ...onboardForm, rtspUrl: e.target.value })}
              placeholder={t('cameras.rtspPlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('cameras.tripwireDir')}
              </label>
              <select
                value={onboardForm.tripwireDirection}
                onChange={(e) =>
                  setOnboardForm({ ...onboardForm, tripwireDirection: e.target.value as TripwireDirection })
                }
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value={TripwireDirection.CHECK_IN}>{t('cameras.dirCheckIn')}</option>
                <option value={TripwireDirection.CHECK_OUT}>{t('cameras.dirCheckOut')}</option>
                <option value={TripwireDirection.BIDIRECTIONAL}>{t('cameras.dirBidirectional')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('cameras.fps')}</label>
              <input
                type="number"
                value={onboardForm.fps}
                onChange={(e) => setOnboardForm({ ...onboardForm, fps: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOnboardModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
            >
              {t('cameras.quickOnboardBtn')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: THÊM MỚI / CHỈNH SỬA CAMERA (TỰ ĐỘNG GỢI Ý THÔNG MINH)*/}
      {/* ============================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCam ? t('cameras.updateModalTitle') : t('cameras.createModalTitle')}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitCam} className="space-y-4">
          
          {/* KHỐI TỰ ĐỘNG DÒ TÌM & GỢI Ý CAMERA CHƯA KHAI BÁO (CHỈ HIỂN THỊ KHI THÊM MỚI) */}
          {!editingCam && (
            <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-purple-50/80 border border-indigo-200/90 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Radar className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  </div>
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    {t('cameras.autoDiscoveryBoxTitle')} ({subnetInput})
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => runDiscoveryScan(true)}
                  disabled={isScanning}
                  className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`} />
                  <span>{isScanning ? t('cameras.rescanScanning') : t('cameras.rescanBtn')}</span>
                </button>
              </div>

              {isScanning ? (
                <div className="py-2.5 text-center text-xs text-indigo-700 flex items-center justify-center gap-2">
                  <Radar className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>{t('cameras.scanningText')}</span>
                </div>
              ) : undeclaredCameras.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-700 mb-1.5">
                    <span>
                      {t('cameras.detectedUndeclaredPrefix')}{' '}
                      <strong>{undeclaredCameras.length} {t('cameras.detectedUndeclaredSuffix')}</strong>
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold font-mono">{t('cameras.autoFillTag')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {undeclaredCameras.map((cam, idx) => {
                      const isSelected = selectedDiscoveredId === cam.ipAddress || camForm.ipAddress === cam.ipAddress;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyDiscoveredToForm(cam)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-300'
                              : 'bg-white hover:bg-indigo-50/70 text-slate-800 border-indigo-100 hover:border-indigo-300 shadow-xs'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : cam.vendor === CameraVendor.HIKVISION
                                    ? 'bg-red-100 text-red-700'
                                    : cam.vendor === CameraVendor.DAHUA
                                    ? 'bg-blue-100 text-blue-700'
                                    : cam.vendor === CameraVendor.UNIVIEW
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {cam.vendor}
                              </span>
                              <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                {cam.model}
                              </span>
                            </div>
                            <div className={`text-[10px] font-mono ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                              IP: {cam.ipAddress} • {cam.resolution}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-bold">
                                {t('cameras.selectCameraBtn')}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 py-1">
                  {t('cameras.noUndeclaredFound')}
                </div>
              )}
            </div>
          )}

          {/* Ô TÊN CAMERA */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('cameras.nameLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={camForm.name}
              onChange={(e) => setCamForm({ ...camForm, name: e.target.value })}
              placeholder={t('cameras.namePlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Ô ĐỊA CHỈ IP VÀ FPS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t('cameras.ipLabel')} <span className="text-rose-500">*</span>
                </label>
                {selectedDiscoveredId && (
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> {t('cameras.autoFilledBadge')}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={camForm.ipAddress}
                  onChange={(e) => {
                    const newIp = e.target.value;
                    setCamForm({ ...camForm, ipAddress: newIp });
                    // So khớp xem IP có nằm trong danh sách dò quét không
                    const matched = discoveredList.find((c) => c.ipAddress === newIp.trim());
                    if (matched) {
                      setSelectedDiscoveredId(matched.ipAddress);
                    } else {
                      setSelectedDiscoveredId(null);
                    }
                  }}
                  placeholder={t('cameras.ipPlaceholder')}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('cameras.fps')}</label>
              <input
                type="number"
                min={1}
                max={60}
                value={camForm.fps}
                onChange={(e) => setCamForm({ ...camForm, fps: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Ô ĐƯỜNG DẪN RTSP VÀ GỢI Ý CHUẨN THEO VENDOR */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {t('cameras.rtspUrlLabel')} <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleTestFormRtsp}
                disabled={formTestStatus.testing}
                className="text-[10px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Play className={`w-3 h-3 ${formTestStatus.testing ? 'animate-spin' : ''}`} />
                <span>{formTestStatus.testing ? t('cameras.probeRtspTesting') : t('cameras.probeRtspBtn')}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={camForm.rtspUrl}
              onChange={(e) => {
                setCamForm({ ...camForm, rtspUrl: e.target.value });
                setFormTestStatus({ testing: false, result: null });
              }}
              placeholder={t('cameras.rtspPlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
            />

            {/* Thông báo kết quả thử kết nối RTSP */}
            {formTestStatus.result && (
              <div
                className={`mt-1.5 p-2 rounded-xl text-xs flex items-center gap-1.5 ${
                  formTestStatus.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {formTestStatus.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                )}
                <span>{formTestStatus.result}</span>
              </div>
            )}

            {/* Các nút bấm chọn nhanh mẫu RTSP theo hãng phổ biến */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">{t('cameras.vendorTemplateLabel')}</span>
              <button
                type="button"
                onClick={() => handleApplyVendorRtspTemplate(CameraVendor.HIKVISION)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 border border-slate-200 transition-colors"
              >
                Hikvision (/Streaming/101)
              </button>
              <button
                type="button"
                onClick={() => handleApplyVendorRtspTemplate(CameraVendor.DAHUA)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 transition-colors"
              >
                Dahua (/cam/realmonitor)
              </button>
              <button
                type="button"
                onClick={() => handleApplyVendorRtspTemplate(CameraVendor.UNIVIEW)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 border border-slate-200 transition-colors"
              >
                Uniview (/media/video1)
              </button>
              <button
                type="button"
                onClick={() => handleApplyVendorRtspTemplate(CameraVendor.TIANDY)}
                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
              >
                Tiandy / ONVIF (/live/ch0)
              </button>
            </div>
          </div>

          {/* Ô VỊ TRÍ LẮP ĐẶT VÀ GỢI Ý CHỌN NHANH TỪ CƠ SỞ DỮ LIỆU THỰC TẾ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('cameras.locationLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={camForm.location}
              onChange={(e) => setCamForm({ ...camForm, location: e.target.value })}
              placeholder={t('cameras.locationPlaceholder')}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 mb-1.5"
            />
            {/* Chip vị trí lấy từ camera thực tế */}
            {existingLocations.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">{t('cameras.suggestedLocationsLabel')}</span>
                {existingLocations.map((loc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCamForm((prev) => ({ ...prev, location: loc }))}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors ${
                      camForm.location === loc
                        ? 'bg-sky-50 text-sky-700 border-sky-300 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CHIỀU QUÉT VÀ TRẠNG THÁI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('cameras.tripwireDir')}</label>
              <select
                value={camForm.tripwireDirection}
                onChange={(e) => setCamForm({ ...camForm, tripwireDirection: e.target.value as TripwireDirection })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value={TripwireDirection.CHECK_IN}>{t('cameras.dirCheckIn')}</option>
                <option value={TripwireDirection.CHECK_OUT}>{t('cameras.dirCheckOut')}</option>
                <option value={TripwireDirection.BIDIRECTIONAL}>{t('cameras.dirBidirectional')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('cameras.statusLabel')}</label>
              <select
                value={camForm.status}
                onChange={(e) => setCamForm({ ...camForm, status: e.target.value as CameraStatus })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value={CameraStatus.ONLINE}>{t('cameras.online')}</option>
                <option value={CameraStatus.OFFLINE}>{t('cameras.offline')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-sm"
            >
              {editingCam ? t('common.save') : t('cameras.addCamera')}
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

      {/* Modal Thử nghiệm Nhận diện khuôn mặt & Đối soát Điểm danh */}
      <FaceRecognitionTestModal
        isOpen={isFaceTestModalOpen}
        onClose={() => setIsFaceTestModalOpen(false)}
        selectedCameraId={selectedCam?.id}
        cameraName={selectedCam?.name}
        tripwireDirection={selectedCam?.tripwireDirection}
        onAttendanceSuccess={() => {
          showInfo('Điểm danh tự động', 'Bản ghi điểm danh vừa được lưu vào Sổ cái hệ thống');
        }}
      />
    </div>
  );
}
