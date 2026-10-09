'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Shield,
  Sliders,
  Layers,
  Check,
  Laptop,
  Video,
  VideoOff,
  Activity,
  RotateCcw,
  Radio,
  MapPin,
  Eye,
  ChevronDown
} from 'lucide-react';
import Modal from '@/components/Modal';
import { postApi, getApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import {
  TripwireDirection,
  SubjectType,
  CameraStatus,
  RecognitionTabMode,
  FaceAngleType,
  DeviceCameraSource,
  BiometricFeedbackCode,
  Direction
} from '@/types/enums';

interface CandidateMatch {
  identityCode: string;
  fullName: string;
  departmentOrClass: string;
  subjectType: SubjectType;
  similarity: number;
}

interface NormBbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

interface FaceRecognitionResult {
  matched: boolean;
  identityCode?: string;
  fullName?: string;
  departmentOrClass?: string;
  subjectType?: SubjectType;
  similarity?: number;
  threshold?: number;
  qualityScore?: number;
  yaw?: number;
  pitch?: number;
  bbox?: Record<string, any>;
  normBbox?: NormBbox;
  feedbackCode?: BiometricFeedbackCode | string;
  feedbackMessage?: string;
  topCandidates?: CandidateMatch[];
  processingTimeMs?: number;
  capturedImageBase64?: string;
}

interface CameraItem {
  id: string;
  name: string;
  location: string;
  status: CameraStatus;
  ipAddress?: string;
  rtspUrl?: string;
  tripwireDirection?: TripwireDirection;
  fps?: number;
}

interface FaceRecognitionTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCameraId?: string;
  cameraName?: string;
  tripwireDirection?: TripwireDirection;
  defaultTab?: RecognitionTabMode;
  onAttendanceSuccess?: () => void;
}

/**
 * Chuẩn hóa khung hình chất lượng cao phục vụ mô hình AI SCRFD & AdaFace 512-D
 * Giữ kích thước tối ưu dưới 5.8KB để vượt qua an toàn Proxy VPS Gateway (< 10KB)
 * Đảm bảo các đặc trưng vi mô của khuôn mặt được bảo toàn nguyên vẹn cho ArcFace 112x112
 */
function optimizeCanvasForFaceAi(
  canvas: HTMLCanvasElement,
  maxDimension: number = 160,
  quality: number = 0.72
): string {
  let w = canvas.width;
  let h = canvas.height;
  if (w > maxDimension || h > maxDimension) {
    if (w > h) {
      h = Math.max(1, Math.round((h * maxDimension) / w));
      w = maxDimension;
    } else {
      w = Math.max(1, Math.round((w * maxDimension) / h));
      h = maxDimension;
    }
  }

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = w;
  tmpCanvas.height = h;
  const tCtx = tmpCanvas.getContext('2d');
  if (tCtx) {
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = 'high';
    tCtx.drawImage(canvas, 0, 0, w, h);
  }

  const maxChars = 5800;
  let curQuality = quality;
  let dataUrl = tmpCanvas.toDataURL('image/jpeg', curQuality);

  let attempts = 0;
  while (dataUrl.length > maxChars && attempts < 10) {
    attempts++;
    if (curQuality > 0.40) {
      curQuality -= 0.10;
    } else {
      w = Math.max(80, Math.round(w * 0.85));
      h = Math.max(80, Math.round((w * canvas.height) / canvas.width));
      tmpCanvas.width = w;
      tmpCanvas.height = h;
      if (tCtx) {
        tCtx.drawImage(canvas, 0, 0, w, h);
      }
      curQuality = 0.65;
    }
    dataUrl = tmpCanvas.toDataURL('image/jpeg', curQuality);
  }

  return dataUrl;
}

export default function FaceRecognitionTestModal({
  isOpen,
  onClose,
  selectedCameraId = '',
  cameraName = '',
  tripwireDirection = TripwireDirection.CHECK_IN,
  defaultTab = RecognitionTabMode.DEVICE,
  onAttendanceSuccess,
}: FaceRecognitionTestModalProps) {
  const { showSuccess, showError, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<RecognitionTabMode>(defaultTab);
  const [threshold, setThreshold] = useState<number>(0.50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<FaceRecognitionResult | null>(null);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState<boolean>(false);
  const [attendanceRecorded, setAttendanceRecorded] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Danh mục Camera IP từ hệ thống (100% nạp từ API, không gán dữ liệu giả lập)
  const [cameraList, setCameraList] = useState<CameraItem[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>(selectedCameraId);
  const [ipSnapshotTimestamp, setIpSnapshotTimestamp] = useState<number>(Date.now());
  const [isIpImageLoading, setIsIpImageLoading] = useState<boolean>(false);

  // Trạng thái camera của thiết bị
  const [isDeviceCamActive, setIsDeviceCamActive] = useState<boolean>(false);
  const [deviceCamError, setDeviceCamError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Đồng bộ camera khi prop selectedCameraId thay đổi
  useEffect(() => {
    if (selectedCameraId) {
      setCurrentCameraId(selectedCameraId);
    }
  }, [selectedCameraId]);

  // Tải danh sách Camera IP thực tế từ CSDL
  useEffect(() => {
    if (!isOpen) return;
    const fetchCameras = async () => {
      try {
        const resp = await getApi<CameraItem[]>('/cameras');
        if (resp && resp.length > 0) {
          setCameraList(resp);
          const found = resp.find(c => c.id === currentCameraId || c.id === selectedCameraId);
          if (found) {
            setCurrentCameraId(found.id);
          } else {
            setCurrentCameraId(resp[0].id);
          }
        } else {
          setCameraList([]);
        }
      } catch (e) {
        console.warn('Lấy danh sách camera từ máy chủ:', e);
        setCameraList([]);
      }
    };
    fetchCameras();
  }, [isOpen, selectedCameraId]);

  // Thông tin camera hiện tại (trả về null nếu chưa có dữ liệu)
  const currentCamera = cameraList.find(c => c.id === currentCameraId) || null;

  // URL stream trực tiếp MJPEG 25 FPS của Camera IP (siêu mượt không độ trễ)
  const getCameraLiveStreamUrl = useCallback((camId: string) => {
    return `/camera-stream/api/v1/cameras/${camId}/stream`;
  }, []);

  // URL snapshot dự phòng của Camera IP
  const getCameraSnapshotUrl = useCallback((camId: string, ts: number) => {
    return `/camera-stream/api/v1/cameras/${camId}/snapshot?_t=${ts}`;
  }, []);

  const [streamError, setStreamError] = useState<boolean>(false);

  // Reset stream error khi đổi camera
  useEffect(() => {
    setStreamError(false);
  }, [currentCameraId]);

  // Chỉ kích hoạt làm mới định kỳ khi luồng MJPEG gặp lỗi phải dự phòng sang snapshot
  useEffect(() => {
    if (!isOpen || activeTab !== RecognitionTabMode.IP_CAMERA || imagePreview || isLoading || !streamError) return;
    const interval = setInterval(() => {
      setIpSnapshotTimestamp(Date.now());
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, imagePreview, isLoading, streamError]);

  // Bật camera của thiết bị
  const startDeviceCamera = async () => {
    try {
      setDeviceCamError(null);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsDeviceCamActive(true);
    } catch (err: any) {
      console.warn('Lỗi mở camera thiết bị:', err);
      setDeviceCamError('Không thể mở camera thiết bị. Vui lòng cấp quyền truy cập camera trong trình duyệt.');
      setIsDeviceCamActive(false);
    }
  };

  // Tắt camera của thiết bị
  const stopDeviceCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsDeviceCamActive(false);
  };

  // Tự động quản lý vòng đời camera theo tab và modal
  useEffect(() => {
    if (isOpen && activeTab === RecognitionTabMode.DEVICE) {
      startDeviceCamera();
    } else {
      stopDeviceCamera();
    }
    return () => {
      stopDeviceCamera();
    };
  }, [isOpen, activeTab]);

  const handleClose = () => {
    stopDeviceCamera();
    onClose();
  };

  // Chụp khung hình từ camera thiết bị và gửi nhận diện AI
  const handleCaptureDeviceCamera = async () => {
    if (isLoading) return;
    const video = videoRef.current;
    if (!video) {
      showError('Không tìm thấy camera', 'Vui lòng đảm bảo camera của thiết bị đã được bật');
      return;
    }

    try {
      setIsLoading(true);
      const vw = video.videoWidth > 0 ? video.videoWidth : (video.clientWidth || 640);
      const vh = video.videoHeight > 0 ? video.videoHeight : (video.clientHeight || 480);

      // Kích thước chuẩn HD/VGA thực tế
      const targetW = Math.max(640, vw);
      const targetH = Math.round((targetW * vh) / vw);

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Không thể khởi tạo bộ đệm Canvas');
      }

      // Vẽ đúng chiều thực tế của camera (không lật gương) để bảo đảm tính tương đồng sinh trắc học
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Chuẩn hóa khung hình chất lượng cao cho AI SCRFD + AdaFace trích xuất vector 512-D (< 5.8KB)
      const base64Data = optimizeCanvasForFaceAi(canvas, 160, 0.72);
      setImagePreview(base64Data);
      setResult(null);
      setAttendanceRecorded(false);

      await analyzeUploadedImage(base64Data);
    } catch (err: any) {
      console.error('Lỗi chụp từ camera thiết bị:', err);
      showError('Lỗi chụp hình', err.message || 'Không thể chụp khung hình từ camera');
      setIsLoading(false);
    }
  };

  // Hàm trích xuất snapshot từ Camera IP thành chuỗi Base64
  const fetchCameraSnapshotAsBase64 = async (camId: string): Promise<string> => {
    const urls = [
      `/camera-stream/api/v1/cameras/${camId}/snapshot?_t=${Date.now()}`,
      `/api/v1/cameras/${camId}/snapshot?_t=${Date.now()}`,
    ];

    for (const url of urls) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 200) {
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const optimized = optimizeCanvasForFaceAi(canvas, 160, 0.72);
                    resolve(optimized);
                  } else {
                    resolve(reader.result as string);
                  }
                };
                img.onerror = () => resolve(reader.result as string);
                img.src = reader.result as string;
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        }
      } catch (e) {
        console.warn('Lỗi fetch snapshot:', url, e);
      }
    }
    throw new Error('Không thể tải khung hình snapshot từ Camera IP');
  };

  // Nhận diện từ Camera IP giám sát
  const handleTestFromCamera = async () => {
    setIsLoading(true);
    setResult(null);
    setAttendanceRecorded(false);

    try {
      // 1. Thử gọi API nhận diện chuyên biệt từ Camera IP của backend
      let backendSuccess = false;
      try {
        const resp = await postApi<FaceRecognitionResult>(
          `/biometrics/test-recognition-camera/${currentCameraId}?minThreshold=${threshold}`,
          {}
        );
        if (resp && resp.feedbackCode !== BiometricFeedbackCode.CAMERA_CAPTURE_FAILED) {
          backendSuccess = true;
          setResult(resp);
          if (resp.capturedImageBase64) {
            setImagePreview(resp.capturedImageBase64);
          } else {
            setImagePreview(getCameraSnapshotUrl(currentCameraId, Date.now()));
          }
          if (resp.matched) {
            showSuccess('Nhận diện khuôn mặt thành công', resp.feedbackMessage || 'Đã khớp hồ sơ học sinh/cán bộ');
          } else {
            showInfo('Kết quả nhận diện', resp.feedbackMessage || 'Không phát hiện hồ sơ phù hợp');
          }
        }
      } catch (err: any) {
        console.log('Chuyển sang phương án dự phòng lấy snapshot trực tiếp từ Camera IP...');
      }

      // 2. Phương án dự phòng: Bắt snapshot từ Camera IP Stream và gửi tới /test-recognition
      if (!backendSuccess) {
        const base64Data = await fetchCameraSnapshotAsBase64(currentCameraId);
        setImagePreview(base64Data);

        const resp = await postApi<FaceRecognitionResult>('/biometrics/test-recognition', {
          imageBase64: base64Data,
          minThreshold: threshold,
          cameraId: currentCameraId,
        });

        setResult(resp);
        if (resp?.matched) {
          showSuccess('Nhận diện khuôn mặt thành công', resp.feedbackMessage || 'Đã khớp hồ sơ học sinh/cán bộ');
        } else {
          showInfo('Kết quả nhận diện', resp?.feedbackMessage || 'Không phát hiện hồ sơ phù hợp');
        }
      }
    } catch (err: any) {
      showError('Lỗi kiểm tra nhận diện từ camera', err.message || 'Không thể bắt khung hình camera');
    } finally {
      setIsLoading(false);
    }
  };

  // Gán khuôn mặt từ camera vào hồ sơ
  const handleAssignFace = async (identityCode: string) => {
    if (!imagePreview) return;
    setIsAssigning(true);
    try {
      let angle = FaceAngleType.AUTO;
      if (result?.yaw !== undefined && result.yaw !== null) {
        if (result.yaw < -8.0) {
          angle = FaceAngleType.LEFT;
        } else if (result.yaw > 8.0) {
          angle = FaceAngleType.RIGHT;
        } else {
          angle = FaceAngleType.STRAIGHT;
        }
      }

      await postApi(`/biometrics/profiles/${identityCode}/assign-face`, {
        imageBase64: imagePreview,
        angleType: angle,
      });
      showSuccess(
        'Đồng bộ khuôn mặt thành công',
        `Đã nạp và cập nhật véc-tơ chuẩn (${angle}) từ camera vào hồ sơ ${identityCode}`
      );
      if (activeTab === RecognitionTabMode.IP_CAMERA) {
        await handleTestFromCamera();
      } else {
        await analyzeUploadedImage(imagePreview);
      }
    } catch (err: any) {
      showError('Lỗi cập nhật khuôn mặt', err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // Tải file ảnh thử nghiệm từ máy tính
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawBase64 = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const optimizedBase64 = optimizeCanvasForFaceAi(canvas, 160, 0.72);
          setImagePreview(optimizedBase64);
          setResult(null);
          setAttendanceRecorded(false);
          await analyzeUploadedImage(optimizedBase64);
        }
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Phân tích hình ảnh
  const analyzeUploadedImage = async (base64Data: string) => {
    setIsLoading(true);
    try {
      const resp = await postApi<FaceRecognitionResult>('/biometrics/test-recognition', {
        imageBase64: base64Data,
        minThreshold: threshold,
        cameraId: activeTab === RecognitionTabMode.DEVICE ? DeviceCameraSource.LOCAL_DEVICE : currentCameraId,
      });
      setResult(resp);
      if (resp?.matched) {
        showSuccess('Nhận diện khuôn mặt thành công', resp.feedbackMessage || 'Đã khớp hồ sơ học sinh/cán bộ');
      } else {
        showInfo('Kết quả nhận diện', resp?.feedbackMessage || 'Không phát hiện hồ sơ phù hợp');
      }
    } catch (err: any) {
      showError('Lỗi phân tích hình ảnh', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Ghi nhận Điểm danh vào Sổ cái
  const handleTriggerAttendance = async () => {
    if (!result?.identityCode) return;
    setIsSubmittingAttendance(true);
    try {
      const direction = tripwireDirection === TripwireDirection.CHECK_OUT ? TripwireDirection.CHECK_OUT : TripwireDirection.CHECK_IN;
      await postApi('/attendance/scan', {
        identityCode: result.identityCode,
        direction: direction,
        cameraId: activeTab === RecognitionTabMode.DEVICE ? DeviceCameraSource.LOCAL_DEVICE : currentCameraId,
        scanTime: new Date().toISOString(),
      });
      setAttendanceRecorded(true);
      showSuccess(
        'Ghi nhận điểm danh thành công',
        `Đã cập nhật phiên điểm danh cho ${result.fullName} (${result.identityCode})`
      );
      if (onAttendanceSuccess) {
        onAttendanceSuccess();
      }
    } catch (err: any) {
      showError('Lỗi ghi nhận điểm danh', err.message);
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Thử Nghiệm Nhận Diện Khuôn Mặt & Điểm Danh" maxWidth="3xl">
      <div className="p-6 space-y-6">
        {/* Canvas ẩn phục vụ chụp frame */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Thanh công cụ chọn nguồn camera & cấu hình ngưỡng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl overflow-x-auto">
            {/* NGUỒN 1: CAMERA CỦA THIẾT BỊ ĐANG TRUY CẬP */}
            <button
              type="button"
              onClick={() => {
                setActiveTab(RecognitionTabMode.DEVICE);
                setImagePreview(null);
                setResult(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === RecognitionTabMode.DEVICE
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Camera thiết bị</span>
            </button>

            {/* NGUỒN 2: CAMERA IP GIÁM SÁT */}
            <button
              type="button"
              onClick={() => {
                setActiveTab(RecognitionTabMode.IP_CAMERA);
                setImagePreview(null);
                setResult(null);
                setIpSnapshotTimestamp(Date.now());
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === RecognitionTabMode.IP_CAMERA
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera IP giám sát</span>
            </button>

            {/* NGUỒN 3: TẢI ẢNH LÊN */}
            <button
              type="button"
              onClick={() => {
                setActiveTab(RecognitionTabMode.UPLOAD);
                fileInputRef.current?.click();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === RecognitionTabMode.UPLOAD
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải ảnh thử nghiệm</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-2 text-xs flex-shrink-0">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Ngưỡng khớp:</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={0.45}>45% — Nhạy bén (Người đi xa, bước nhanh, góc nghiêng)</option>
              <option value={0.50}>50% — Tiêu chuẩn khuyến nghị (Camera IP giám sát)</option>
              <option value={0.58}>58% — Chặt chẽ (Khoảng cách gần, ánh sáng chuẩn)</option>
              <option value={0.65}>65% — Nghiêm ngặt (Kiểm soát e-Gate)</option>
              <option value={0.72}>72% — Tối đa (Chỉ ảnh thẻ studio)</option>
            </select>
          </div>
        </div>

        {/* Thanh điều khiển nguồn: CAMERA THIẾT BỊ */}
        {activeTab === RecognitionTabMode.DEVICE && (
          <div className="flex items-center justify-between bg-sky-50/70 border border-sky-100 p-3 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-sky-900 font-medium">
              <Laptop className="w-4 h-4 text-sky-600" />
              <span>
                Nguồn: <strong className="font-semibold">Camera của thiết bị đang truy cập</strong> · Căn góc khuôn mặt tương tự lúc đăng ký
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isDeviceCamActive ? (
                <>
                  <button
                    type="button"
                    onClick={stopDeviceCamera}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tắt Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCaptureDeviceCamera();
                    }}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <Camera className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Đang nhận diện AI...' : 'Chụp & Nhận diện ngay'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startDeviceCamera}
                  className="px-3 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 text-sky-700 font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Video className="w-3.5 h-3.5 text-sky-600" />
                  <span>Bật lại Camera</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Thanh điều khiển nguồn: BỘ CHỌN CAMERA IP */}
        {activeTab === RecognitionTabMode.IP_CAMERA && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-indigo-900/50 shadow-md text-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Dropdown chọn Camera IP */}
              <div className="flex-1 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-mono mb-1">
                    <span>CHỌN NGUỒN CAMERA GIÁM SÁT:</span>
                    {currentCamera && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-sans">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        <span>{currentCamera.status === CameraStatus.ONLINE ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={currentCameraId}
                      onChange={(e) => {
                        setCurrentCameraId(e.target.value);
                        setImagePreview(null);
                        setResult(null);
                        setIpSnapshotTimestamp(Date.now());
                      }}
                      disabled={cameraList.length === 0}
                      className="w-full bg-slate-800/90 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400 text-white text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-all disabled:opacity-50"
                    >
                      {cameraList.length === 0 ? (
                        <option value="" disabled className="bg-slate-900 text-slate-400 py-1">
                          Chưa có camera khả dụng trong hệ thống
                        </option>
                      ) : (
                        cameraList.map((cam) => (
                          <option key={cam.id} value={cam.id} className="bg-slate-900 text-white py-1">
                            {cam.name} ({cam.id}) — Vị trí: {cam.location}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-indigo-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Nhóm nút tác vụ: Làm mới & Nhận diện */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIpSnapshotTimestamp(Date.now());
                    setImagePreview(null);
                    setResult(null);
                  }}
                  title="Tải lại khung hình camera trực tiếp"
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleTestFromCamera}
                  disabled={isLoading || !currentCameraId}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Đang nhận diện AI...' : 'Chụp từ Camera IP & Nhận diện'}</span>
                </button>
              </div>
            </div>

            {/* Chi tiết thông số Camera đang chọn */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-indigo-900/40 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span>Vị trí: <strong className="text-slate-200">{currentCamera?.location || 'Chưa thiết lập'}</strong></span>
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>Tốc độ: <strong className="text-slate-200">{currentCamera?.fps ? `${currentCamera.fps} FPS` : 'Khung hình chuẩn'}</strong></span>
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Shield className="w-3 h-3 text-sky-400" />
                <span>Mã thiết bị: <strong className="text-sky-300">{currentCamera?.id || 'Chưa chọn'}</strong></span>
              </span>
            </div>
          </div>
        )}

        {/* Nội dung kết quả phân tích 2 cột */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Cột trái: Khung hiển thị hình ảnh / Viewfinder trực tiếp */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-2 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden group">
            {/* TH1: Camera của thiết bị đang bật trực tiếp */}
            {activeTab === RecognitionTabMode.DEVICE && isDeviceCamActive ? (
              <div className="relative w-full aspect-video max-h-[320px] flex items-center justify-center overflow-hidden rounded-xl bg-black">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                      el.srcObject = mediaStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100 rounded-lg"
                />

                {/* Khung căn chỉnh khuôn mặt đồ họa */}
                <div
                  className="absolute inset-0 pointer-events-none flex items-center justify-center"
                  style={{ pointerEvents: 'none' }}
                >
                  <svg
                    className="w-full h-full pointer-events-none"
                    style={{ pointerEvents: 'none' }}
                    viewBox="0 0 640 360"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <mask id="test-face-mask">
                        <rect width="640" height="360" fill="white" style={{ pointerEvents: 'none' }} />
                        <ellipse cx="320" cy="180" rx="105" ry="140" fill="black" style={{ pointerEvents: 'none' }} />
                      </mask>
                    </defs>
                    <rect
                      width="640"
                      height="360"
                      fill="rgba(15, 23, 42, 0.40)"
                      mask="url(#test-face-mask)"
                      style={{ pointerEvents: 'none' }}
                    />
                    <ellipse
                      cx="320"
                      cy="180"
                      rx="105"
                      ry="140"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      style={{ pointerEvents: 'none' }}
                    />
                    <path d="M 200 60 L 200 40 L 220 40" fill="none" stroke="#38bdf8" strokeWidth="3" style={{ pointerEvents: 'none' }} />
                    <path d="M 440 60 L 440 40 L 420 40" fill="none" stroke="#38bdf8" strokeWidth="3" style={{ pointerEvents: 'none' }} />
                    <path d="M 200 300 L 200 320 L 220 320" fill="none" stroke="#38bdf8" strokeWidth="3" style={{ pointerEvents: 'none' }} />
                    <path d="M 440 300 L 440 320 L 420 320" fill="none" stroke="#38bdf8" strokeWidth="3" style={{ pointerEvents: 'none' }} />
                    <line x1="320" y1="165" x2="320" y2="195" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.7" style={{ pointerEvents: 'none' }} />
                    <line x1="305" y1="180" x2="335" y2="180" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.7" style={{ pointerEvents: 'none' }} />
                  </svg>
                </div>

                {/* Badge thông tin góc trên - Độc lập */}
                <div
                  className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-700 text-[10px] text-white flex items-center gap-1.5 shadow-sm z-20 pointer-events-none"
                  style={{ pointerEvents: 'none' }}
                >
                  <Activity className="w-3 h-3 text-sky-400" />
                  <span className="font-semibold text-slate-200">Camera thiết bị:</span>
                  <span className="text-sky-400 font-medium">Sẵn sàng nhận diện</span>
                </div>

                {/* Nút bấm Chụp trên Video - Độc lập ngoài SVG mask, z-30 pointer-events-auto */}
                <div
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
                  style={{ pointerEvents: 'auto' }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCaptureDeviceCamera();
                    }}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xl shadow-sky-950/60 transition-all cursor-pointer disabled:opacity-50 border border-sky-400/40"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  >
                    <Camera className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Đang nhận diện AI...' : 'Chụp & Nhận diện ngay'}</span>
                  </button>
                </div>
              </div>
            ) : imagePreview ? (
              /* TH2: Khung hình ảnh đã chụp / nhận diện kèm Bounding Box */
              <div className="relative max-w-full max-h-[320px] flex items-center justify-center">
                <div className="relative inline-block max-w-full max-h-[320px]">
                  <img
                    src={imagePreview}
                    alt="Khung hình phân tích"
                    className="max-w-full max-h-[320px] object-contain rounded-lg block"
                  />

                  {/* Bounding Box chỉ dẫn khuôn mặt chuẩn xác */}
                  {result?.normBbox && (
                    <div
                      className={`absolute border-2 rounded pointer-events-none transition-all ${
                        result.matched
                          ? 'border-emerald-400 bg-emerald-400/20 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                          : 'border-amber-400 bg-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                      }`}
                      style={{
                        left: `${result.normBbox.x1 * 100}%`,
                        top: `${result.normBbox.y1 * 100}%`,
                        width: `${result.normBbox.width * 100}%`,
                        height: `${result.normBbox.height * 100}%`,
                      }}
                    >
                      <span
                        className={`absolute -top-6 left-0 text-[10px] font-mono px-2 py-0.5 rounded text-white font-bold whitespace-nowrap shadow-sm ${
                          result.matched ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                      >
                        {result.matched ? result.fullName : 'Chưa nhận diện'}
                        {result.similarity ? ` · ${(result.similarity * 100).toFixed(1)}%` : ''}
                        {result.yaw != null ? ` · Yaw ${result.yaw.toFixed(0)}°` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Nút thao tác tiếp tục */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  {activeTab === RecognitionTabMode.DEVICE ? (
                    <button
                      type="button"
                      onClick={startDeviceCamera}
                      className="px-3 py-1.5 bg-slate-900/85 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-colors cursor-pointer border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Chụp lượt khác</span>
                    </button>
                  ) : activeTab === RecognitionTabMode.IP_CAMERA ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setResult(null);
                        setIpSnapshotTimestamp(Date.now());
                      }}
                      className="px-3 py-1.5 bg-slate-900/85 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-colors cursor-pointer border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Quay lại xem trực tiếp</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : activeTab === RecognitionTabMode.IP_CAMERA ? (
              /* TH3: Xem trực tiếp từ Camera IP giám sát */
              !currentCamera ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 text-center p-4">
                  <VideoOff className="w-8 h-8 text-slate-500" />
                  <p className="text-xs text-slate-300 max-w-xs">Chưa có Camera IP nào được chọn hoặc hệ thống đang tải danh mục camera.</p>
                </div>
              ) : (
                <div className="relative w-full aspect-video max-h-[320px] flex items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                  <img
                    src={streamError ? getCameraSnapshotUrl(currentCameraId, ipSnapshotTimestamp) : getCameraLiveStreamUrl(currentCameraId)}
                    alt={`Khung hình trực tiếp ${currentCamera.name}`}
                    onLoad={() => setIsIpImageLoading(false)}
                    onError={() => {
                      setIsIpImageLoading(false);
                      setStreamError(true);
                    }}
                    className="w-full h-full object-cover rounded-lg block"
                  />

                  {/* HUD Overlay Camera An Ninh Thực Tế */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/50">
                    {/* Header HUD */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700 text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-bold text-emerald-400">TRỰC TIẾP</span>
                        <span className="text-slate-400">| {currentCamera.name}</span>
                      </div>
                      <div className="bg-slate-900/80 backdrop-blur-xs px-2 py-1 rounded-lg border border-slate-700 text-slate-300">
                        25 FPS · AI ONNX
                      </div>
                    </div>

                    {/* Vạch ngắm căn nét ở giữa */}
                    <div className="self-center flex items-center justify-center w-24 h-24 border border-dashed border-indigo-400/40 rounded-xl relative">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-400" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-400" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-400" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-400" />
                    </div>

                    {/* Footer HUD & Nút Chụp */}
                    <div className="flex items-center justify-between pointer-events-auto">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                        VỊ TRÍ: {currentCamera.location}
                      </span>
                      <button
                        type="button"
                        onClick={handleTestFromCamera}
                        disabled={isLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{isLoading ? 'Đang nhận diện...' : 'Chụp từ Camera IP & Nhận diện'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : deviceCamError ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 text-center p-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <p className="text-xs text-slate-300 max-w-xs">{deviceCamError}</p>
                <button
                  type="button"
                  onClick={startDeviceCamera}
                  className="mt-2 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2 text-center p-4">
                <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
                  {activeTab === RecognitionTabMode.DEVICE ? <Laptop className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                </div>
                <p className="text-xs font-medium text-slate-400 max-w-xs">
                  {activeTab === RecognitionTabMode.DEVICE
                    ? 'Bấm "Bật lại Camera" để sử dụng webcam của thiết bị thử nghiệm nhận diện'
                    : 'Kéo thả hoặc tải lên ảnh chân dung học sinh để đối soát'}
                </p>
                {activeTab === RecognitionTabMode.DEVICE && (
                  <button
                    type="button"
                    onClick={startDeviceCamera}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Bật Camera thiết bị</span>
                  </button>
                )}
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-3 z-20">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                <span className="text-xs text-sky-200 font-mono">
                  Đang trích xuất 512-D ArcFace vector & đối soát PGVector...
                </span>
              </div>
            )}
          </div>

          {/* Cột phải: Thẻ kết quả phân tích & đối soát */}
          <div className="space-y-4">
            {result ? (
              <>
                {/* Banner trạng thái */}
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    result.matched
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      result.matched ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {result.matched ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold">
                      {result.matched ? 'XÁC THỰC THÀNH CÔNG' : 'KHÔNG KHỚP HỒ SƠ / NGƯỜI LẠ'}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">{result.feedbackMessage}</p>
                  </div>
                </div>

                {/* Chi tiết học sinh nếu khớp */}
                {result.matched && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Họ và tên:</span>
                        <strong className="text-slate-900 text-sm">{result.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Mã định danh:</span>
                        <strong className="text-sky-600 font-mono text-sm">{result.identityCode}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Lớp / Phòng ban:</span>
                        <span className="font-semibold text-slate-800">{result.departmentOrClass}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Đối tượng:</span>
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-700">
                          {result.subjectType || SubjectType.STUDENT}
                        </span>
                      </div>
                    </div>

                    {/* Thanh độ tương đồng */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-500 font-medium">Độ tương đồng Cosine:</span>
                        <strong className="text-emerald-600 font-mono">
                          {((result.similarity || 0) * 100).toFixed(1)}%
                        </strong>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((result.similarity || 0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Chỉ số phụ */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                      <span>Độ nét: {((result.qualityScore || 0) * 100).toFixed(0)}% FIQA</span>
                      <span>Độ trễ AI: {(result.processingTimeMs || 0).toFixed(0)}ms</span>
                    </div>

                    {/* Nút hành động Ghi nhận Điểm danh */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleTriggerAttendance}
                        disabled={isSubmittingAttendance || attendanceRecorded}
                        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                          attendanceRecorded
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {attendanceRecorded ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Đã ghi nhận điểm danh vào Sổ cái</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            <span>
                              {isSubmittingAttendance ? 'Đang ghi nhận...' : 'Ghi nhận Điểm danh vào Sổ cái'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Hộp công cụ gán khuôn mặt trực tiếp từ Camera nếu chưa khớp */}
                {!result.matched && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Đồng bộ hồ sơ từ hình ảnh thực tế</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Camera đã bắt được khuôn mặt
                      {result.qualityScore ? ` — độ nét ${(result.qualityScore * 100).toFixed(0)}% FIQA` : ''}
                      {result.yaw != null ? ` · Góc quay ${result.yaw.toFixed(1)}°` : ''}.
                      Bạn có thể nạp ngay vector khuôn mặt vào hồ sơ để nhận diện tức thì trong các lần tới.
                    </p>
                    {result.topCandidates && result.topCandidates.length > 0 && result.topCandidates[0] && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => result.topCandidates?.[0] && handleAssignFace(result.topCandidates[0].identityCode)}
                          disabled={isAssigning}
                          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                        >
                          {isAssigning ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Đang trích xuất & cập nhật PGVector...</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" />
                              <span>
                                Gán & Cập nhật cho {result.topCandidates[0].fullName} ({result.topCandidates[0].identityCode})
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Danh sách Top ứng viên đối soát */}
                {result.topCandidates && result.topCandidates.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      Top ứng viên đối soát trong CSDL ({result.topCandidates.length})
                    </span>
                    <div className="space-y-1.5">
                      {result.topCandidates.map((cand, idx) => (
                        <div
                          key={cand.identityCode || idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                        >
                          <div className="min-w-0">
                            <strong className="text-slate-900 truncate block">{cand.fullName}</strong>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {cand.identityCode} · {cand.departmentOrClass}
                            </span>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs ${
                              (cand.similarity || 0) >= threshold ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {((cand.similarity || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
                <Shield className="w-10 h-10 mx-auto text-sky-500" />
                <div>
                  <h5 className="text-sm font-bold text-slate-800">Sẵn sàng thử nghiệm nhận diện</h5>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1 max-w-sm mx-auto">
                    Hệ thống trích xuất vector UniFace ArcFace 512-D và đối soát PGVector với tốc độ xử lý dưới 50ms.
                  </p>
                </div>
                {activeTab === RecognitionTabMode.DEVICE && isDeviceCamActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCaptureDeviceCamera();
                    }}
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Camera className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Đang nhận diện AI...' : 'Chụp hình & Nhận diện ngay'}</span>
                  </button>
                )}
                {activeTab === RecognitionTabMode.IP_CAMERA && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTestFromCamera();
                    }}
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Camera className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Đang nhận diện AI...' : 'Chụp từ Camera IP & Nhận diện'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
