'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Shield,
  ArrowRight,
  Sliders,
  Clock,
  Layers,
  Check,
  ExternalLink
} from 'lucide-react';
import Modal from '@/components/Modal';
import { postApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { TripwireDirection } from '@/types/enums';

interface CandidateMatch {
  identityCode: string;
  fullName: string;
  departmentOrClass: string;
  subjectType: string;
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
  subjectType?: string;
  similarity?: number;
  threshold?: number;
  qualityScore?: number;
  yaw?: number;
  pitch?: number;
  bbox?: Record<string, any>;
  normBbox?: NormBbox;
  feedbackCode?: string;
  feedbackMessage?: string;
  topCandidates?: CandidateMatch[];
  processingTimeMs?: number;
  capturedImageBase64?: string;
}

interface FaceRecognitionTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCameraId?: string;
  cameraName?: string;
  tripwireDirection?: TripwireDirection;
  onAttendanceSuccess?: () => void;
}

export default function FaceRecognitionTestModal({
  isOpen,
  onClose,
  selectedCameraId = 'CAM_GATE_01',
  cameraName = 'Camera Cổng chính',
  tripwireDirection = TripwireDirection.CHECK_IN,
  onAttendanceSuccess,
}: FaceRecognitionTestModalProps) {
  const { showSuccess, showError, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [threshold, setThreshold] = useState<number>(0.65);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<FaceRecognitionResult | null>(null);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState<boolean>(false);
  const [attendanceRecorded, setAttendanceRecorded] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTestFromCamera = async () => {
    setIsLoading(true);
    setResult(null);
    setAttendanceRecorded(false);
    try {
      const resp = await postApi<FaceRecognitionResult>(
        `/biometrics/test-recognition-camera/${selectedCameraId}?minThreshold=${threshold}`,
        {}
      );
      setResult(resp);
      if (resp?.capturedImageBase64) {
        setImagePreview(resp.capturedImageBase64);
      }
      if (resp?.matched) {
        showSuccess('Nhận diện khuôn mặt thành công', resp.feedbackMessage || 'Đã khớp hồ sơ');
      } else {
        showInfo('Kết quả nhận diện', resp?.feedbackMessage || 'Không phát hiện hồ sơ phù hợp');
      }
    } catch (err: any) {
      showError('Lỗi kiểm tra nhận diện từ camera', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignFace = async (identityCode: string) => {
    if (!imagePreview) return;
    setIsAssigning(true);
    try {
      await postApi(`/biometrics/profiles/${identityCode}/assign-face`, {
        imageBase64: imagePreview,
        angleType: 'straight',
      });
      showSuccess(
        'Đồng bộ khuôn mặt thành công',
        `Đã nạp và cập nhật véc-tơ chuẩn từ camera vào hồ sơ ${identityCode}`
      );
      // Tự động nhận diện lại từ camera hoặc ảnh
      if (activeTab === 'camera') {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawBase64 = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
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
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          let q = 0.50;
          let optimizedBase64 = canvas.toDataURL('image/jpeg', q);
          while (optimizedBase64.length > 6800 && q > 0.15) {
            q -= 0.08;
            optimizedBase64 = canvas.toDataURL('image/jpeg', q);
          }
          if (optimizedBase64.length > 6800) {
            const smallerCanvas = document.createElement('canvas');
            smallerCanvas.width = 160;
            smallerCanvas.height = Math.round((160 * h) / w);
            const sCtx = smallerCanvas.getContext('2d');
            if (sCtx) {
              sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
              optimizedBase64 = smallerCanvas.toDataURL('image/jpeg', 0.35);
            }
          }
          setImagePreview(optimizedBase64);
          setResult(null);
          setAttendanceRecorded(false);
          await analyzeUploadedImage(optimizedBase64);
        }
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const analyzeUploadedImage = async (base64Data: string) => {
    setIsLoading(true);
    try {
      const resp = await postApi<FaceRecognitionResult>('/biometrics/test-recognition', {
        imageBase64: base64Data,
        minThreshold: threshold,
        cameraId: selectedCameraId,
      });
      setResult(resp);
      if (resp?.matched) {
        showSuccess('Nhận diện khuôn mặt thành công', resp.feedbackMessage || 'Đã khớp hồ sơ học sinh');
      } else {
        showInfo('Kết quả nhận diện', resp?.feedbackMessage || 'Không phát hiện hồ sơ phù hợp');
      }
    } catch (err: any) {
      showError('Lỗi phân tích hình ảnh', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerAttendance = async () => {
    if (!result?.identityCode) return;
    setIsSubmittingAttendance(true);
    try {
      const direction = tripwireDirection === TripwireDirection.CHECK_OUT ? 'CHECK_OUT' : 'CHECK_IN';
      await postApi('/attendance/scan', {
        identityCode: result.identityCode,
        direction: direction,
        cameraId: selectedCameraId,
        scanTime: new Date().toISOString(),
      });
      setAttendanceRecorded(true);
      showSuccess(
        'Ghi nhận điểm danh thành công',
        `Đã cập nhật phiên điểm danh cho ${result.fullName} (${result.identityCode}) tại ${cameraName}`
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
    <Modal isOpen={isOpen} onClose={onClose} title="Thử Nghiệm Nhận Diện Khuôn Mặt & Điểm Danh" maxWidth="3xl">
      <div className="p-6 space-y-6">
        {/* Thanh công cụ chọn nguồn & cấu hình ngưỡng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Chụp từ Camera IP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
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

          <div className="flex items-center gap-2 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Ngưỡng khớp:</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={0.60}>60% (Linh hoạt)</option>
              <option value={0.65}>65% (Khuyến nghị)</option>
              <option value={0.70}>70% (Chặt chẽ)</option>
              <option value={0.75}>75% (Nghiêm ngặt)</option>
            </select>
          </div>
        </div>

        {/* Khu vực hành động chính */}
        {activeTab === 'camera' && (
          <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-medium">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>
                Nguồn: <strong className="font-semibold">{cameraName}</strong> ({selectedCameraId})
              </span>
            </div>
            <button
              type="button"
              onClick={handleTestFromCamera}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Đang phân tích...' : 'Chụp & Nhận diện ngay'}</span>
            </button>
          </div>
        )}

        {/* Nội dung kết quả phân tích 2 cột */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Cột trái: Khung hiển thị hình ảnh */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-2 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden group">
            {imagePreview ? (
              <div className="relative max-w-full max-h-[300px] flex items-center justify-center">
                <div className="relative inline-block max-w-full max-h-[300px]">
                  <img
                    src={imagePreview}
                    alt="Khung hình phân tích"
                    className="max-w-full max-h-[300px] object-contain rounded-lg block"
                  />

                  {/* Bounding Box chỉ dẫn khuôn mặt chuẩn xác theo tỷ lệ AI */}
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
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2 text-center p-4">
                <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-slate-400">
                  {activeTab === 'camera'
                    ? 'Bấm nút "Chụp & Nhận diện ngay" để bắt đầu thử nghiệm từ camera'
                    : 'Kéo thả hoặc tải lên ảnh chân dung học sinh để đối soát'}
                </p>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-3 z-20">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-indigo-200 font-mono">
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
                        <span className="text-slate-500 block">Mã học sinh:</span>
                        <strong className="text-indigo-600 font-mono text-sm">{result.identityCode}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Lớp / Phòng ban:</span>
                        <span className="font-semibold text-slate-800">{result.departmentOrClass}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Đối tượng:</span>
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-700">
                          {result.subjectType || 'STUDENT'}
                        </span>
                      </div>
                    </div>

                    {/* Thanh độ tương đồng */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-500 font-medium">Độ tương đồng (Cosine Similarity):</span>
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
                      <span>Độ nét: {((result.qualityScore || 0) * 100).toFixed(0)}%</span>
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
                      <span>Đồng bộ hồ sơ từ hình ảnh thực tế của Camera</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Camera đã bắt được khuôn mặt rõ nét{' '}
                      {result.qualityScore ? `(độ nét ${(result.qualityScore * 100).toFixed(0)}%)` : ''}
                      {result.yaw != null ? ` · Góc quay ${result.yaw.toFixed(1)}°` : ''}.
                      Bạn có thể nạp ngay vector khuôn mặt từ camera vào hồ sơ để nhận diện tức thì trong các lần tới.
                    </p>
                    {result.topCandidates && result.topCandidates.length > 0 && result.topCandidates[0] && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => result.topCandidates?.[0] && handleAssignFace(result.topCandidates[0].identityCode)}
                          disabled={isAssigning}
                          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-400 space-y-2">
                <Shield className="w-8 h-8 mx-auto text-slate-300" />
                <h5 className="text-xs font-bold text-slate-600">Sẵn sàng thử nghiệm</h5>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hệ thống sử dụng bộ trích xuất vector UniFace ArcFace 512-D kết hợp cơ sở dữ liệu véc-tơ pgvector trên
                  PostgreSQL, cho phép nhận diện chính xác từng phần tử khuôn mặt trong vòng dưới 50ms.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
