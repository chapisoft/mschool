import React from 'react';

interface MSchoolLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function MSchoolLogo({ size = 36, className = '', showText = false }: MSchoolLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Biểu tượng Vector MSCHOOL Đơn giản Tinh tế Màu sắc Tươi sáng */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 drop-shadow-[0_4px_12px_rgba(6,182,212,0.35)]"
      >
        <defs>
          {/* Gradient Tươi sáng: Xanh Ngọc Lam -> Xanh Dương -> Lục Bảo */}
          <linearGradient id="mschoolGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Nền bo góc tròn mềm mại dạng squircle */}
        <rect
          x="6"
          y="6"
          width="108"
          height="108"
          rx="28"
          fill="url(#mschoolGradient)"
        />

        {/* 4 Góc khung quét nhận diện khuôn mặt sinh trắc học */}
        {/* Góc trên trái */}
        <path
          d="M26 40 V28 C26 26.8954 26.8954 26 28 26 H40"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        {/* Góc trên phải */}
        <path
          d="M80 26 H92 C93.1046 26 94 26.8954 94 28 V40"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        {/* Góc dưới trái */}
        <path
          d="M26 80 V92 C26 93.1046 26.8954 94 28 94 H40"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        {/* Góc dưới phải */}
        <path
          d="M80 94 H92 C93.1046 94 94 93.1046 94 92 V80"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />

        {/* Biểu tượng Mũ Cử nhân kết hợp Chữ M thanh thoát */}
        {/* Đỉnh nón cử nhân */}
        <path
          d="M60 42 L86 54 L60 66 L34 54 Z"
          fill="#FFFFFF"
        />
        {/* Dây tua nón */}
        <path
          d="M78 58 V73 C78 74.1 78.9 75 80 75 C81.1 75 82 74.1 82 73 V59.5"
          stroke="#FDE047"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Vòm dưới chiếc mũ tạo dáng chữ M tinh tế */}
        <path
          d="M44 63.5 V77 C44 80 50 83 60 83 C70 83 76 80 76 77 V63.5"
          fill="#FFFFFF"
          fillOpacity="0.92"
        />

        {/* Điểm sáng AI quét nhận diện ở tâm */}
        <circle cx="60" cy="54" r="3" fill="#38BDF8" />
      </svg>

      {/* Phần nhãn chữ đi kèm khi showText = true */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400">
              MSCHOOL
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              AI
            </span>
          </div>
          <span className="text-[11px] font-medium tracking-wide text-slate-400">
            Hệ thống Trường học Thông minh
          </span>
        </div>
      )}
    </div>
  );
}
