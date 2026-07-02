import React from 'react';
import { X, AlertTriangle, HelpCircle, Archive, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'default',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  // Icons and color scheme based on the type of confirmation
  let icon = <HelpCircle className="w-6 h-6 text-blue-600" />;
  let headerBg = 'bg-blue-50';
  let confirmBtnBg = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  if (type === 'danger') {
    icon = <Trash2 className="w-6 h-6 text-rose-600" />;
    headerBg = 'bg-rose-50';
    confirmBtnBg = 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500';
  } else if (type === 'warning') {
    icon = <AlertTriangle className="w-6 h-6 text-amber-600" />;
    headerBg = 'bg-amber-50';
    confirmBtnBg = 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
  } else if (type === 'info') {
    icon = <Archive className="w-6 h-6 text-emerald-600" />;
    headerBg = 'bg-emerald-50';
    confirmBtnBg = 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500';
  }

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={onCancel}
    >
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-in border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className={`p-5 flex items-start gap-4 ${headerBg}`}>
          <div className="p-2 rounded-xl bg-white shadow-xs shrink-0">
            {icon}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">{message}</p>
          </div>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 hover:bg-black/5 p-1 rounded-lg cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Panel */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-extrabold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-extrabold text-white rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${confirmBtnBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
