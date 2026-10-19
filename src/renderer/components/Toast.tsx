import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(toast => {
        let Icon = CheckCircle2;
        let colorClasses = 'border-emerald-500/40 bg-slate-900/95 text-emerald-300';
        if (toast.type === 'error') {
          Icon = AlertCircle;
          colorClasses = 'border-rose-500/40 bg-slate-900/95 text-rose-300';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClasses = 'border-amber-500/40 bg-slate-900/95 text-amber-300';
        } else if (toast.type === 'info') {
          Icon = Info;
          colorClasses = 'border-sky-500/40 bg-slate-900/95 text-sky-300';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-slide-in ${colorClasses}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-semibold text-slate-100">{toast.title}</div>
              <div className="text-slate-400 mt-0.5 leading-relaxed">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
