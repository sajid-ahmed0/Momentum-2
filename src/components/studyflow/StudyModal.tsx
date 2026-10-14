import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, Trash2, Check, X } from 'lucide-react';

export interface ModalConfig {
  isOpen: boolean;
  type?: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  hideCancel?: boolean;
}

interface StudyModalProps {
  config: ModalConfig;
  onClose: () => void;
}

export const StudyModal: React.FC<StudyModalProps> = ({ config, onClose }) => {
  const {
    isOpen,
    type = 'danger',
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    hideCancel = false
  } = config;

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="w-5 h-5 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20';
      case 'success':
        return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20';
      case 'info':
      default:
        return 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 shrink-0">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                {title}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {message}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            {!hideCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 ${getConfirmButtonClasses()}`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
