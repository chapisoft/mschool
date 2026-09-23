'use client';

import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  isDangerous = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl flex-shrink-0 ${
            isDangerous
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
          }`}
        >
          {isDangerous ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <Info className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 shadow-xs transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl font-medium text-xs transition-colors shadow-sm flex items-center gap-2 ${
            isDangerous
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          {isLoading && (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          <span>{confirmText}</span>
        </button>
      </div>
    </Modal>
  );
}
