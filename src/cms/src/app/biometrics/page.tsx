'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Cpu,
  Trash2,
  Camera,
  CheckCircle2,
  Upload,
  Pencil,
  RotateCcw,
  Sparkles,
  Video,
  VideoOff,
  Bot,
  Zap,
  Activity
} from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { fetchApi, postApi, putApi, deleteApi } from '@/lib/api';
import { SubjectType } from '@/types/enums';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FaceRecognitionTestModal from '@/features/face-test/FaceRecognitionTestModal';

interface ProfileItem {
  id: string;
  identityCode: string;
  fullName: string;
  subjectType: SubjectType;
  departmentOrClass: string;
  qualityScore: number;
  isActive: boolean;
  photoStraight?: string;
  photoLeft?: string;
  photoRight?: string;
  createdAt?: string;
  updatedAt?: string;
}

type AngleType = 'straight' | 'left' | 'right';

interface AiVerifyResult {
  isValid?: boolean;
  valid?: boolean;
  qualityScore: number;
  angleMatched: boolean;
  headPose?: { pitch?: number; yaw?: number; roll?: number };
  faceState?: { has_mask?: boolean; has_sunglasses?: boolean };
  bbox?: { x1?: number; y1?: number; x2?: number; y2?: number };
  embedding?: number[];
  feedbackCode?: string;
  feedbackMessage: string;
  processingTimeMs?: number;
}

const formatImageSrc = (b64?: string | null): string => {
  if (!b64 || !b64.trim()) return '';
  const trimmed = b64.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
};

export default function BiometricsPage() {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Checkbox chọn nhiều & Xóa nhiều (Batch selection)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal Thử nghiệm nhận diện khuôn mặt
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);

  // Modal Đăng ký mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createFormData, setCreateFormData] = useState({
    identityCode: '',
    fullName: '',
    subjectType: SubjectType.STUDENT,
    departmentOrClass: '10A1',
    qualityScore: 0.95,
  });

  // Chế độ thu thập khuôn mặt: 'camera' hoặc 'upload'
  const [captureMode, setCaptureMode] = useState<'camera' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentAngleStep, setCurrentAngleStep] = useState<AngleType>('straight');

  // Dữ liệu ảnh và vector 512D đã thu thập theo 3 góc
  const [capturedImages, setCapturedImages] = useState<{
    straight?: string;
    left?: string;
    right?: string;
  }>({});
  const [capturedVectors, setCapturedVectors] = useState<{
    straight?: number[];
    left?: number[];
    right?: number[];
  }>({});

  // TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI MIAI ENGINE)
  const [isAiAssisted, setIsAiAssisted] = useState<boolean>(true);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiVerifyResult | null>(null);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);

  // Tiến trình tải ảnh phân đoạn độ nét cao (Chunked Base64 Upload)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');

  // Modal Chỉnh sửa hồ sơ & Cập nhật khuôn mặt
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<ProfileItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    subjectType: SubjectType.STUDENT,
    departmentOrClass: '',
    isActive: true,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ConfirmDialog Xóa mềm (Đơn lẻ & Hàng loạt)
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

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoCaptureTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const cycleRef = useRef<(() => Promise<void>) | null>(null);

  // Helper dịch ĐỐI TƯỢNG đa ngôn ngữ
  const getSubjectTypeLabel = (st: SubjectType) => {
    switch (st) {
      case SubjectType.STUDENT:
        return t('biometrics.subjectStudent');
      case SubjectType.TEACHER:
        return t('biometrics.subjectTeacher');
      case SubjectType.STAFF:
        return t('biometrics.subjectStaff');
      case SubjectType.VISITOR:
        return t('biometrics.subjectVisitor');
      default:
        return st;
    }
  };

  // Helper dịch TRẠNG THÁI đa ngôn ngữ
  const getStatusLabel = (isActive: boolean) => {
    return isActive ? t('biometrics.statusActive') : t('biometrics.statusInactive');
  };

  // Tải danh sách hồ sơ
  const loadProfiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi<ProfileItem[]>(
        `/biometrics/profiles${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`
      );
      setProfiles(Array.isArray(data) ? data : []);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.warn('Failed to load profiles from API:', err.message);
      setError(t('common.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [searchTerm]);


  // Điều khiển Camera: Bật / Tắt an toàn
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(t('biometrics.cameraPermissionError'));
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setAiResult(null);
    setAutoCaptureCountdown(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Nén canvas thích ứng bảo đảm nghiêm ngặt dưới ngân sách byte để vượt qua Nginx Proxy Gateway (< 6KB)
  const compressCanvasUnderBudget = (
    srcCanvas: HTMLCanvasElement,
    targetWidth = 160,
    maxChars = 5600
  ): string => {
    let curWidth = targetWidth;
    let curHeight = Math.max(1, Math.round((targetWidth * srcCanvas.height) / srcCanvas.width));
    let canvas = document.createElement('canvas');
    canvas.width = curWidth;
    canvas.height = curHeight;
    let ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(srcCanvas, 0, 0, curWidth, curHeight);
    }

    let quality = 0.72;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);

    let attempts = 0;
    while (dataUrl.length > maxChars && attempts < 10) {
      attempts++;
      if (quality > 0.40) {
        quality -= 0.10;
      } else {
        curWidth = Math.max(80, Math.round(curWidth * 0.85));
        curHeight = Math.max(80, Math.round((curWidth * srcCanvas.height) / srcCanvas.width));
        canvas = document.createElement('canvas');
        canvas.width = curWidth;
        canvas.height = curHeight;
        ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(srcCanvas, 0, 0, curWidth, curHeight);
        }
        quality = 0.65;
      }
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return dataUrl;
  };

  // Lấy frame từ Video sang Data URL Base64
  // scaleDown = true: Dành riêng cho chu kỳ AI 500ms (Frame nhỏ 180px < 5.5KB)
  // scaleDown = false: Dành cho ảnh chụp hồ sơ chính thức (Độ nét cao HD 480px, JPEG chất lượng 0.85)
  const grabCurrentFrame = (scaleDown = false): string | null => {
    const video = videoRef.current;
    if (!video) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) return null;

    try {
      const canvas = document.createElement('canvas');
      if (scaleDown) {
        const targetWidth = 180;
        const targetHeight = Math.round((targetWidth * video.videoHeight) / video.videoWidth);
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Khống chế dưới 5500 ký tự cho chu kỳ AI để không ảnh hưởng đường truyền
        return compressCanvasUnderBudget(canvas, targetWidth, 5500);
      } else {
        // Frame độ nét cao cho ảnh hồ sơ lưu trữ chính thức (HD 480px)
        const targetWidth = Math.min(video.videoWidth || 640, 480);
        const targetHeight = Math.round((targetWidth * video.videoHeight) / video.videoWidth);
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (err) {
      console.error('Lỗi trích xuất frame từ video:', err);
      return null;
    }
  };

  // Tải ảnh chân dung độ nét cao theo cơ chế phân đoạn (Chunked Base64 Upload)
  // Mỗi chunk tối đa 6,000 ký tự (~6KB payload) bảo đảm tuyệt đối vượt qua giới hạn đệm 10.5KB của Nginx VPS Gateway
  const uploadPhotoInChunks = async (profileId: string, angleType: AngleType, base64Data: string) => {
    if (!profileId || !base64Data) return;
    const chunkSize = 6000;
    const totalChunks = Math.ceil(base64Data.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunkData = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
      await postApi(`/biometrics/profiles/${profileId}/photo-chunk`, {
        chunkIndex: i,
        totalChunks,
        chunkData,
        angleType,
      });
    }
  };


  // CHỤP HÌNH & GỌI AI TRÍCH XUẤT VECTOR 512D
  const executeCapture = async (angle: AngleType, verifiedResult?: AiVerifyResult | null) => {
    const fullDataUrl = grabCurrentFrame(false);
    if (!fullDataUrl) return;

    let vector = verifiedResult?.embedding;
    let score = typeof verifiedResult?.qualityScore === 'number' ? verifiedResult.qualityScore : 0.94;

    // Nếu chưa có vector từ AI, gọi trực tiếp backend để trích xuất qua miai bằng frame nén nhẹ
    if (!vector || vector.length === 0) {
      try {
        const compactFrame = grabCurrentFrame(true);
        if (compactFrame) {
          const resp = await postApi<AiVerifyResult>('/biometrics/ai/verify-and-extract', {
            imageBase64: compactFrame,
            angleType: angle,
          });
          if (resp && resp.embedding) {
            vector = resp.embedding;
            score = typeof resp.qualityScore === 'number' ? resp.qualityScore : 0.94;
          }
        }
      } catch (e) {
        console.warn('AI extraction warning:', e);
      }
    }

    setCapturedImages((prev) => ({ ...prev, [angle]: fullDataUrl }));
    if (vector) {
      setCapturedVectors((prev) => ({ ...prev, [angle]: vector }));
    }

    // Hiệu ứng hoàn tất và tự động chuyển sang góc tiếp theo
    setAutoCaptureCountdown(null);
    if (angle === 'straight') {
      setCurrentAngleStep('left');
    } else if (angle === 'left') {
      setCurrentAngleStep('right');
    }
  };

  // VÒNG LẶP AI MIAI THỜI GIAN THỰC (REAL-TIME VISION AI INSPECTION)
  const runAiVerificationCycle = useCallback(async () => {
    if (!isCameraActive || !isAiAssisted || isAnalyzingRef.current || (!isCreateModalOpen && !isEditModalOpen)) return;

    const frameBase64 = grabCurrentFrame(true);
    if (!frameBase64) return;

    isAnalyzingRef.current = true;
    setIsAiAnalyzing(true);
    try {
      const resp = await postApi<AiVerifyResult>('/biometrics/ai/verify-and-extract', {
        imageBase64: frameBase64,
        angleType: currentAngleStep,
      });

      if (resp) {
        const isFaceValid = Boolean(resp.isValid ?? (resp as any).valid ?? false);
        const score = typeof resp.qualityScore === 'number' ? resp.qualityScore : 0;
        const normalizedResp: AiVerifyResult = {
          ...resp,
          isValid: isFaceValid,
          qualityScore: score,
        };

        setAiResult(normalizedResp);

        // CƠ CHẾ AUTO-CAPTURE SIÊU TỐC: Khi đạt chuẩn eDifFIQA (>= 0.60) và đúng góc quay
        if (isFaceValid && resp.angleMatched && score >= 0.60) {
          if (!autoCaptureCountdown) {
            setAutoCaptureCountdown(1);
            if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current);
            autoCaptureTimerRef.current = setTimeout(() => {
              executeCapture(currentAngleStep, normalizedResp);
            }, 400);
          }
        } else {
          setAutoCaptureCountdown(null);
          if (autoCaptureTimerRef.current) {
            clearTimeout(autoCaptureTimerRef.current);
            autoCaptureTimerRef.current = null;
          }
        }
      }
    } catch (err: any) {
      console.warn('Lỗi kiểm chuẩn AI Vision:', err?.message || err);
    } finally {
      isAnalyzingRef.current = false;
      setIsAiAnalyzing(false);
    }
  }, [isCameraActive, isAiAssisted, isCreateModalOpen, isEditModalOpen, currentAngleStep, autoCaptureCountdown]);

  // Luôn cập nhật tham chiếu chu kỳ quét mới nhất để tránh Stale Closure
  cycleRef.current = runAiVerificationCycle;

  // Thiết lập chu kỳ quét AI phản hồi nhanh mỗi 500ms khi Camera đang mở
  useEffect(() => {
    const isModalOpen = isCreateModalOpen || isEditModalOpen;
    if (isCameraActive && isAiAssisted && isModalOpen) {
      // Quét ngay frame đầu tiên sau 250ms khi stream video ổn định
      const initTimer = setTimeout(() => {
        cycleRef.current?.();
      }, 250);

      aiIntervalRef.current = setInterval(() => {
        cycleRef.current?.();
      }, 500);


      return () => {
        clearTimeout(initTimer);
        if (aiIntervalRef.current) {
          clearInterval(aiIntervalRef.current);
          aiIntervalRef.current = null;
        }
      };
    } else {
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
    }
  }, [isCameraActive, isAiAssisted, isCreateModalOpen, isEditModalOpen]);

  const handleRetakeAngle = (angle: AngleType) => {
    setCapturedImages((prev) => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
    setCapturedVectors((prev) => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
    setCurrentAngleStep(angle);
    setAutoCaptureCountdown(null);
  };

  const handleStartCameraForRetake = () => {
    setCapturedImages((prev) => {
      const next = { ...prev };
      delete next[currentAngleStep];
      return next;
    });
    setCapturedVectors((prev) => {
      const next = { ...prev };
      delete next[currentAngleStep];
      return next;
    });
    setAiResult(null);
    setAutoCaptureCountdown(null);
    startCamera();
  };

  const hasAllAngles = Boolean(capturedImages.straight && capturedImages.left && capturedImages.right);

  // Mở modal Đăng ký mới
  const handleOpenCreate = () => {
    setCreateFormData({
      identityCode: 'HS' + Math.floor(100000 + Math.random() * 900000),
      fullName: '',
      subjectType: SubjectType.STUDENT,
      departmentOrClass: '10A1',
      qualityScore: 0.95,
    });
    setCapturedImages({});
    setCapturedVectors({});
    setCurrentAngleStep('straight');
    setCaptureMode('camera');
    setAiResult(null);
    setAutoCaptureCountdown(null);
    setIsCreateModalOpen(true);
    setTimeout(() => {
      startCamera();
    }, 150);
  };

  const handleCloseCreateModal = () => {
    stopCamera();
    setIsCreateModalOpen(false);
  };

  // Submit Đăng ký mới kèm Véc-tơ 512D từ Core AI miai và Tải ảnh phân đoạn độ nét cao
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUploadingPhoto(true);
      setUploadProgressText('Đang khởi tạo hồ sơ sinh trắc...');

      const finalScore = hasAllAngles ? 0.98 : (capturedImages.straight ? 0.95 : createFormData.qualityScore);
      const roundVec = (vec?: number[]) => (vec && vec.length === 512 ? vec.map((v) => Number(v.toFixed(3))) : null);
      
      // Bước 1: Tạo hồ sơ với thông tin nghiệp vụ và véc-tơ ban đầu (Payload nhẹ < 2KB, KHÔNG kèm ảnh to)
      const createPayload: any = {
        identityCode: createFormData.identityCode.trim().toUpperCase(),
        fullName: createFormData.fullName.trim(),
        subjectType: createFormData.subjectType,
        departmentOrClass: createFormData.departmentOrClass.trim(),
        qualityScore: finalScore,
      };

      if (capturedVectors.straight && capturedVectors.straight.length === 512) {
        createPayload.embeddingPrimary = roundVec(capturedVectors.straight);
      }

      const resp: any = await postApi('/biometrics/profiles', createPayload);
      const newId = resp?.id || resp?.data?.id;

      // Bước 2: Tải ảnh chân dung độ nét cao theo cơ chế phân đoạn (Chunked Base64 Upload)
      if (newId) {
        if (capturedImages.straight) {
          setUploadProgressText('Đang tải ảnh chính diện độ nét cao...');
          await uploadPhotoInChunks(newId, 'straight', capturedImages.straight);
        }
        if (capturedImages.left) {
          setUploadProgressText('Đang tải ảnh nghiêng trái độ nét cao...');
          await uploadPhotoInChunks(newId, 'left', capturedImages.left);
        }
        if (capturedImages.right) {
          setUploadProgressText('Đang tải ảnh nghiêng phải độ nét cao...');
          await uploadPhotoInChunks(newId, 'right', capturedImages.right);
        }
      }

      showSuccess(
        t('biometrics.createTitle'),
        t('biometrics.createSuccessMsg')
          .replace('{name}', createFormData.fullName)
          .replace('{code}', createFormData.identityCode)
          .replace('{score}', Math.round(finalScore * 100).toString())
      );
      handleCloseCreateModal();
      loadProfiles();
    } catch (err: any) {
      showError(t('biometrics.createError'), err.message);
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgressText('');
    }
  };

  // Mở modal Chỉnh sửa
  const handleOpenEdit = (p: ProfileItem) => {
    setEditingProfile(p);
    setEditFormData({
      fullName: p.fullName,
      subjectType: p.subjectType,
      departmentOrClass: p.departmentOrClass || '',
      isActive: p.isActive,
    });
    // Nạp ảnh cũ để hiển thị xem trước, ghi nhớ không gửi lại nếu không thay đổi
    setCapturedImages({
      straight: p.photoStraight,
      left: p.photoLeft,
      right: p.photoRight,
    });
    setCapturedVectors({});
    setCurrentAngleStep('straight');
    setCaptureMode('camera');
    setAiResult(null);
    setAutoCaptureCountdown(null);
    setIsCameraActive(false); // Ban đầu không tự động bật camera để tránh tốn tài nguyên
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    stopCamera();
    setIsEditModalOpen(false);
    setEditingProfile(null);
  };

  // Tải ảnh chân dung từ tệp và trích xuất véc-tơ qua AI
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawBase64 = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        // 1. Tạo ảnh chân dung độ nét cao 480px (JPEG chất lượng 0.85) để lưu hồ sơ
        const hdCanvas = document.createElement('canvas');
        const maxDim = 480;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        hdCanvas.width = w;
        hdCanvas.height = h;
        const hdCtx = hdCanvas.getContext('2d');
        if (hdCtx) {
          hdCtx.drawImage(img, 0, 0, w, h);
        }
        const hdDataUrl = hdCanvas.toDataURL('image/jpeg', 0.85);

        // 2. Tạo frame nén siêu nhẹ < 5.5KB để gửi AI kiểm chuẩn góc quay & khuôn mặt
        const compactB64 = compressCanvasUnderBudget(hdCanvas, 180, 5500);

        try {
          const resp = await postApi<AiVerifyResult>('/biometrics/ai/verify-and-extract', {
            imageBase64: compactB64,
            angleType: currentAngleStep,
          });
          setCapturedImages((prev) => ({ ...prev, [currentAngleStep]: hdDataUrl }));
          if (resp && resp.embedding) {
            setCapturedVectors((prev) => ({ ...prev, [currentAngleStep]: resp.embedding }));
          }
          setAiResult(resp);
          showSuccess('Tải ảnh thành công', `Đã nạp ảnh độ nét cao và trích xuất đặc trưng AI cho góc ${currentAngleStep}`);
        } catch (err: any) {
          setCapturedImages((prev) => ({ ...prev, [currentAngleStep]: hdDataUrl }));
          showInfo('Đã nhận ảnh', 'Ảnh chân dung độ nét cao đã được tải lên');
        }
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Submit Chỉnh sửa kèm Tải ảnh phân đoạn độ nét cao
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    try {
      setIsUploadingPhoto(true);
      setUploadProgressText('Đang cập nhật thông tin hồ sơ...');

      const finalScore = hasAllAngles ? 0.98 : (capturedImages.straight ? 0.95 : (editingProfile.qualityScore || 0.90));
      const roundVec = (vec?: number[]) => (vec && vec.length === 512 ? vec.map((v) => Number(v.toFixed(3))) : null);
      
      const isNewStraight = Boolean(capturedImages.straight && capturedImages.straight !== editingProfile.photoStraight);
      const isNewLeft = Boolean(capturedImages.left && capturedImages.left !== editingProfile.photoLeft);
      const isNewRight = Boolean(capturedImages.right && capturedImages.right !== editingProfile.photoRight);

      // Bước 1: Cập nhật thông tin cơ bản + véc-tơ mới (Payload nhẹ < 2KB, KHÔNG kèm ảnh to)
      const basePayload: any = {
        fullName: editFormData.fullName,
        subjectType: editFormData.subjectType,
        departmentOrClass: editFormData.departmentOrClass,
        isActive: editFormData.isActive,
        qualityScore: finalScore,
      };

      if (capturedVectors.straight && capturedVectors.straight.length === 512) {
        basePayload.embeddingPrimary = roundVec(capturedVectors.straight);
      }

      await putApi(`/biometrics/profiles/${editingProfile.id}`, basePayload);

      // Bước 2: Tải ảnh mới độ nét cao theo cơ chế phân đoạn (Chunked Base64 Upload)
      if (isNewStraight && capturedImages.straight) {
        setUploadProgressText('Đang đồng bộ ảnh chính diện độ nét cao...');
        await uploadPhotoInChunks(editingProfile.id, 'straight', capturedImages.straight);
      }
      if (isNewLeft && capturedImages.left) {
        setUploadProgressText('Đang đồng bộ ảnh nghiêng trái độ nét cao...');
        await uploadPhotoInChunks(editingProfile.id, 'left', capturedImages.left);
      }
      if (isNewRight && capturedImages.right) {
        setUploadProgressText('Đang đồng bộ ảnh nghiêng phải độ nét cao...');
        await uploadPhotoInChunks(editingProfile.id, 'right', capturedImages.right);
      }

      if (isNewStraight || capturedVectors.straight) {
        showSuccess(
          t('biometrics.editTitle'),
          `Đã cập nhật thông tin và làm mới ảnh chân dung độ nét cao cho ${editFormData.fullName}`
        );
      } else {
        showSuccess(t('biometrics.editTitle'), t('biometrics.updateSuccess'));
      }

      handleCloseEditModal();
      loadProfiles();
    } catch (err: any) {
      showError(t('biometrics.editError'), err.message);
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgressText('');
    }
  };

  // Xóa mềm 1 hồ sơ
  const handleDeleteProfile = (p: ProfileItem) => {
    setConfirmDialog({
      isOpen: true,
      title: t('biometrics.deleteSingleConfirmTitle'),
      message: t('biometrics.deleteSingleConfirmMsg')
        .replace('{name}', p.fullName)
        .replace('{code}', p.identityCode),
      action: async () => {
        try {
          await deleteApi(`/biometrics/profiles/${p.id}`);
          showSuccess(t('biometrics.deleteSuccess'), p.fullName);
          loadProfiles();
        } catch (err: any) {
          showError(t('biometrics.deleteError'), err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Checkbox: Chọn tất cả
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(profiles.map((p) => p.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // Checkbox: Chọn/Bỏ chọn một dòng
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Xóa mềm hàng loạt (Batch Soft Delete)
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmDialog({
      isOpen: true,
      title: t('biometrics.batchDeleteConfirmTitle'),
      message: t('biometrics.batchDeleteConfirmMsg').replace('{count}', count.toString()),
      action: async () => {
        try {
          await postApi('/biometrics/profiles/batch-delete', {
            ids: Array.from(selectedIds),
          });
          showSuccess(
            t('biometrics.batchDeleteBtn'),
            t('biometrics.batchDeleteSuccess').replace('{count}', count.toString())
          );
          setSelectedIds(new Set());
          loadProfiles();
        } catch (err: any) {
          showError(t('biometrics.batchDeleteError'), err.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Đồng bộ Camera Edge
  const handleSyncEdge = async () => {
    setIsSyncing(true);
    try {
      const res = await postApi<any>('/biometrics/sync-edge');
      showSuccess(
        t('biometrics.syncEdgeSuccessTitle'),
        t('biometrics.syncEdgeSuccessMsg').replace(
          '{count}',
          (res.syncedProfiles || profiles.length).toString()
        )
      );
    } catch (err: any) {
      showError(t('biometrics.syncEdgeError'), err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const isAllSelected = profiles.length > 0 && selectedIds.size === profiles.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < profiles.length;

  // Tính toán màu sắc Face Oval dựa trên phân tích AI (ngưỡng thực tế 60%)
  const isCurrentAngleSatisfied = Boolean(
    aiResult && (aiResult.isValid ?? (aiResult as any).valid) && aiResult.angleMatched && (aiResult.qualityScore || 0) >= 0.60
  );

  const guideStrokeColor = isCurrentAngleSatisfied
    ? '#10b981' // Xanh lục ĐẠT
    : (aiResult && aiResult.qualityScore > 0.45)
    ? '#f59e0b' // Vàng ĐANG CĂN CHỈNH
    : '#38bdf8'; // Xanh ngọc MẶC ĐỊNH

  // Hàm render giao diện thu thập khuôn mặt 3 góc tích hợp AI miai dùng chung 100% cho cả Create và Edit Modal
  const renderFaceCaptureSection = () => (
    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
      {/* Ẩn file input để tải ảnh lên */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCaptureMode('camera');
              startCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              captureMode === 'camera'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t('biometrics.captureDirect')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCaptureMode('upload');
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              captureMode === 'upload'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('biometrics.uploadFile')}</span>
          </button>
        </div>

        {/* Bật / Tắt Hỗ trợ AI Core miai */}
        {captureMode === 'camera' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAiAssisted(!isAiAssisted)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                isAiAssisted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600 border border-slate-300'
              }`}
              title={t('biometrics.aiAssistantTooltip')}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAiAssisted ? t('biometrics.aiStatusOn') : t('biometrics.aiStatusOff')}</span>
            </button>
          </div>
        )}
      </div>

      {/* CHẾ ĐỘ 1: BẬT CAMERA TRỰC TIẾP VỚI KHUÔN MẪU & AI ASSISTANT */}
      {captureMode === 'camera' && (
        <div className="space-y-3">
          {/* Khung hướng dẫn xoay mặt 3 bước */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentAngleStep('straight');
                setAutoCaptureCountdown(null);
              }}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                currentAngleStep === 'straight'
                  ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-200'
                  : capturedImages.straight
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">{t('biometrics.angleStraightTitle')}</span>
                {capturedImages.straight ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('biometrics.turnStraight')}</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentAngleStep('left');
                setAutoCaptureCountdown(null);
              }}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                currentAngleStep === 'left'
                  ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-200'
                  : capturedImages.left
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">{t('biometrics.angleLeftTitle')}</span>
                {capturedImages.left ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('biometrics.turnLeft')}</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentAngleStep('right');
                setAutoCaptureCountdown(null);
              }}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                currentAngleStep === 'right'
                  ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-200'
                  : capturedImages.right
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">{t('biometrics.angleRightTitle')}</span>
                {capturedImages.right ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('biometrics.turnRight')}</p>
            </button>
          </div>

          {/* Viewfinder Camera với Face Oval Guide Overlay & AI Vision HUD */}
          <div className="relative aspect-video w-full max-h-[300px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
            {cameraError ? (
              <div className="text-center p-6 text-slate-400">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
                >
                  {t('biometrics.cameraStart')}
                </button>
              </div>
            ) : !isCameraActive && capturedImages[currentAngleStep] ? (
              /* Hiển thị ảnh cũ của hồ sơ khi camera đang tắt */
              <div className="relative w-full h-full flex items-center justify-center bg-slate-900 group">
                <img
                  src={formatImageSrc(capturedImages[currentAngleStep])}
                  alt="Ảnh khuôn mặt hồ sơ"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-700 text-[10px] text-white flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-slate-200">Ảnh hồ sơ đã lưu:</span>
                  <span className="text-emerald-400 font-medium">
                    {currentAngleStep === 'straight'
                      ? t('biometrics.angleStraightTitle')
                      : currentAngleStep === 'left'
                      ? t('biometrics.angleLeftTitle')
                      : t('biometrics.angleRightTitle')}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3">
                  <button
                    type="button"
                    onClick={handleStartCameraForRetake}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Bật Camera để chụp lại</span>
                  </button>
                </div>
              </div>
            ) : !isCameraActive ? (
              /* Camera tắt và góc này chưa có ảnh */
              <div className="text-center p-6 text-slate-400">
                <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-300">Camera đang tắt</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{t('biometrics.cameraStart')}</span>
                </button>
              </div>
            ) : (
              <>
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
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* Khuôn mẫu Face Oval Guide (SVG viền bầu dục động theo AI) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 640 360" preserveAspectRatio="none">
                    <defs>
                      <mask id="face-mask">
                        <rect width="640" height="360" fill="white" />
                        <ellipse cx="320" cy="180" rx="105" ry="140" fill="black" />
                      </mask>
                    </defs>
                    <rect
                      width="640"
                      height="360"
                      fill="rgba(15, 23, 42, 0.45)"
                      mask="url(#face-mask)"
                    />

                    {/* Viền bầu dục căn mặt - Đổi màu theo kết quả phân tích AI */}
                    <ellipse
                      cx="320"
                      cy="180"
                      rx="105"
                      ry="140"
                      fill="none"
                      stroke={guideStrokeColor}
                      strokeWidth="2.5"
                      strokeDasharray={isCurrentAngleSatisfied ? 'none' : '6 4'}
                      className={isCurrentAngleSatisfied ? '' : 'animate-pulse'}
                    />

                    {/* 4 Góc căn chỉnh mục tiêu */}
                    <path d="M 200 60 L 200 40 L 220 40" fill="none" stroke={guideStrokeColor} strokeWidth="3" />
                    <path d="M 440 60 L 440 40 L 420 40" fill="none" stroke={guideStrokeColor} strokeWidth="3" />
                    <path d="M 200 300 L 200 320 L 220 320" fill="none" stroke={guideStrokeColor} strokeWidth="3" />
                    <path d="M 440 300 L 440 320 L 420 320" fill="none" stroke={guideStrokeColor} strokeWidth="3" />

                    {/* Đường tâm chữ thập */}
                    <line x1="320" y1="165" x2="320" y2="195" stroke={guideStrokeColor} strokeWidth="1.5" strokeOpacity="0.7" />
                    <line x1="305" y1="180" x2="335" y2="180" stroke={guideStrokeColor} strokeWidth="1.5" strokeOpacity="0.7" />
                  </svg>

                  {/* HUD Thông số AI eDifFIQA & Góc quay đầu thời gian thực */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-700 text-[10px] text-white space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Activity className={`w-3 h-3 ${isAiAnalyzing ? 'animate-spin text-sky-400' : 'text-emerald-400'}`} />
                      <span className="font-semibold text-slate-200">AI miai Vision:</span>
                      <span className="font-mono text-emerald-400">
                        {aiResult ? `${Math.round(aiResult.qualityScore * 100)}% FIQA` : t('biometrics.scanningFace')}
                      </span>
                    </div>
                    {aiResult?.headPose && (
                      <div className="text-slate-300 font-mono text-[9px]">
                        Yaw {aiResult.headPose.yaw ? aiResult.headPose.yaw.toFixed(1) : 0}° | Pitch {aiResult.headPose.pitch ? aiResult.headPose.pitch.toFixed(1) : 0}°
                      </div>
                    )}
                  </div>

                  {/* Thông báo Auto-Capture hoặc Hướng Dẫn AI */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[85%] text-center">
                    {autoCaptureCountdown ? (
                      <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold animate-bounce shadow-lg flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>{t('biometrics.autoCaptureTriggered')}</span>
                      </div>
                    ) : (
                      <div className="bg-slate-900/85 backdrop-blur-xs px-3.5 py-1 rounded-full text-[11px] text-sky-200 border border-sky-400/40 font-medium">
                        {aiResult?.feedbackMessage || (
                          currentAngleStep === 'straight'
                            ? t('biometrics.turnStraight')
                            : currentAngleStep === 'left'
                            ? t('biometrics.turnLeft')
                            : t('biometrics.turnRight')
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Các nút thao tác Camera & Chụp thủ công */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer"
                >
                  <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('biometrics.cameraStop')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 px-2.5 py-1.5 rounded-lg border border-sky-200 bg-sky-50 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-sky-600" />
                  <span>{t('biometrics.cameraStart')}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => executeCapture(currentAngleStep, aiResult)}
              disabled={!isCameraActive}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{t('biometrics.captureAngleBtn')}</span>
            </button>
          </div>

          {/* Danh mục 3 ảnh góc đã thu thập */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
            {(['straight', 'left', 'right'] as AngleType[]).map((angle) => {
              const img = capturedImages[angle];
              const hasVector = Boolean(capturedVectors[angle]);
              const label =
                angle === 'straight'
                  ? t('biometrics.angleStraight')
                  : angle === 'left'
                  ? t('biometrics.angleLeft')
                  : t('biometrics.angleRight');
              return (
                <div
                  key={angle}
                  onClick={() => {
                    setCurrentAngleStep(angle);
                    setAutoCaptureCountdown(null);
                  }}
                  className={`relative rounded-xl border overflow-hidden p-1 text-center cursor-pointer transition-all ${
                    currentAngleStep === angle
                      ? 'border-sky-500 ring-2 ring-sky-200 bg-sky-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {img ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
                      <img src={formatImageSrc(img)} alt={label} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetakeAngle(angle);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                        title={t('biometrics.retakeAngleBtn')}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-emerald-600/90 text-[8px] text-white px-1.5 py-0.2 rounded font-mono">
                        {hasVector ? '512D AI' : 'Đã lưu'}
                      </span>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span className="text-[10px]">{t('biometrics.notCaptured')}</span>
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-slate-600 block mt-1">{label}</span>
                </div>
              );
            })}
          </div>

          {hasAllAngles && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{t('biometrics.completedAnglesMsg')}</span>
            </div>
          )}
        </div>
      )}

      {/* CHẾ ĐỘ 2: TẢI TỆP ẢNH LÊN */}
      {captureMode === 'upload' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-6 text-center transition-colors cursor-pointer bg-white"
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-700 font-medium">
            {t('biometrics.dragDropPhoto')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {t('biometrics.supportedFormats')}
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 text-xs font-semibold hover:bg-sky-100 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Chọn ảnh từ máy tính</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang & Các nút hành động chính */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{t('biometrics.title')}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('biometrics.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={loadProfiles}
            disabled={isLoading}
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-slate-500' : 'text-slate-500'}`} />
            {t('common.refresh')}
          </button>
          <button
            onClick={handleSyncEdge}
            disabled={isSyncing}
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <Cpu className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? t('biometrics.syncing') : t('biometrics.syncEdgeBtn')}</span>
          </button>
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-xs whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thử nghiệm nhận diện</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('biometrics.registerNew')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Ô tìm kiếm & Thanh công cụ Xóa nhiều (Batch Actions Bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('biometrics.searchPlaceholder')}
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
          />
        </div>

        {/* Thanh công cụ khi có checkbox được chọn */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 px-4 py-1.5 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-xs font-semibold text-sky-900">
              {t('biometrics.selectedCount').replace('{count}', selectedIds.size.toString())}
            </span>
            <div className="h-4 w-px bg-sky-200" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              {t('biometrics.deselectAll')}
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('biometrics.batchDeleteBtn')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bảng danh sách Hồ sơ Sinh trắc học */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs text-slate-600">
            <thead className="bg-slate-50 uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                    title={t('biometrics.selectAll')}
                  />
                </th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t('biometrics.identityCode')}</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t('biometrics.fullName')}</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t('biometrics.subjectType')}</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t('biometrics.departmentOrClass')}</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t('biometrics.qualityScore')}</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t('common.status')}</th>
                <th className="py-3.5 px-4 font-semibold text-right whitespace-nowrap">{t('biometrics.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.length > 0 ? (
                profiles.map((p) => {
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-sky-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p.id)}
                          className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-sky-600 whitespace-nowrap">{p.identityCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {p.photoStraight ? (
                            <img
                              src={formatImageSrc(p.photoStraight)}
                              alt={p.fullName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold border border-sky-200">
                              {p.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span>{p.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px] whitespace-nowrap inline-block">
                          {getSubjectTypeLabel(p.subjectType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">{p.departmentOrClass || '—'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold whitespace-nowrap inline-block">
                          {Math.round((p.qualityScore || 0.9) * 100)}% FIQA
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap inline-block ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {getStatusLabel(p.isActive)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Nút Sửa hồ sơ */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-sky-600 hover:text-sky-700 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
                            title={t('biometrics.editProfile')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {/* Nút Xóa mềm hồ sơ */}
                          <button
                            onClick={() => handleDeleteProfile(p)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title={t('biometrics.deleteProfileTooltip')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {isLoading ? t('common.loading') : t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ĐĂNG KÝ HỒ SƠ KHUÔN MẶT MỚI TÍCH HỢP AI MIAI ENGINE */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title={t('biometrics.createTitle')}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.identityCode')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createFormData.identityCode}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, identityCode: e.target.value.toUpperCase() })
                }
                placeholder="HS100293 hoặc GV0012"
                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.fullName')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createFormData.fullName}
                onChange={(e) => setCreateFormData({ ...createFormData, fullName: e.target.value })}
                placeholder="Nguyễn Văn Bảo"
                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.subjectType')}
              </label>
              <select
                value={createFormData.subjectType}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, subjectType: e.target.value as SubjectType })
                }
                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value={SubjectType.STUDENT}>{t('biometrics.subjectStudent')}</option>
                <option value={SubjectType.TEACHER}>{t('biometrics.subjectTeacher')}</option>
                <option value={SubjectType.STAFF}>{t('biometrics.subjectStaff')}</option>
                <option value={SubjectType.VISITOR}>{t('biometrics.subjectVisitor')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.departmentOrClass')}
              </label>
              <input
                type="text"
                value={createFormData.departmentOrClass}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, departmentOrClass: e.target.value })
                }
                placeholder="10A1 hoặc Tổ Toán"
                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* KHỐI ĐĂNG KÝ KHUÔN MẶT ĐỒNG BỘ 100% */}
          {renderFaceCaptureSection()}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseCreateModal}
              disabled={isUploadingPhoto}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 text-xs font-medium cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isUploadingPhoto}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isUploadingPhoto && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isUploadingPhoto ? (uploadProgressText || 'Đang xử lý...') : t('biometrics.registerNew')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CHỈNH SỬA HỒ SƠ SINH TRẮC HỌC & CẬP NHẬT KHUÔN MẶT */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={t('biometrics.editTitle')}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.identityCode')}
              </label>
              <input
                type="text"
                disabled
                value={editingProfile?.identityCode || ''}
                className="w-full h-10 bg-slate-100 border border-slate-200 rounded-xl px-3 text-xs text-slate-500 font-mono uppercase cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.fullName')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.subjectType')}
              </label>
              <select
                value={editFormData.subjectType}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, subjectType: e.target.value as SubjectType })
                }
                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value={SubjectType.STUDENT}>{t('biometrics.subjectStudent')}</option>
                <option value={SubjectType.TEACHER}>{t('biometrics.subjectTeacher')}</option>
                <option value={SubjectType.STAFF}>{t('biometrics.subjectStaff')}</option>
                <option value={SubjectType.VISITOR}>{t('biometrics.subjectVisitor')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('biometrics.departmentOrClass')}
              </label>
              <input
                type="text"
                value={editFormData.departmentOrClass}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, departmentOrClass: e.target.value })
                }
                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Trạng thái hoạt động */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700">{t('common.status')}</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  checked={editFormData.isActive === true}
                  onChange={() => setEditFormData({ ...editFormData, isActive: true })}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-800 font-medium">{t('biometrics.statusActive')}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  checked={editFormData.isActive === false}
                  onChange={() => setEditFormData({ ...editFormData, isActive: false })}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-800 font-medium">{t('biometrics.statusInactive')}</span>
              </label>
            </div>
          </div>

          {/* KHỐI ĐĂNG KÝ / CẬP NHẬT KHUÔN MẶT ĐỒNG BỘ 100% VỚI MODAL THÊM MỚI */}
          {renderFaceCaptureSection()}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseEditModal}
              disabled={isUploadingPhoto}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 text-xs font-medium cursor-pointer transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isUploadingPhoto}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              {isUploadingPhoto ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                capturedImages.straight && <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              )}
              <span>{isUploadingPhoto ? (uploadProgressText || 'Đang lưu...') : t('biometrics.saveChanges')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DIALOG XÁC NHẬN XÓA MỀM (ĐƠN LẺ HOẶC HÀNG LOẠT) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={true}
      />

      {/* MODAL THỬ NGHIỆM NHẬN DIỆN KHUÔN MẶT */}
      <FaceRecognitionTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onAttendanceSuccess={() => {
          showSuccess('Ghi nhận thành công', 'Dữ liệu điểm danh đã được ghi nhận vào sổ cái.');
        }}
      />
    </div>
  );
}
