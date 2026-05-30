import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

const ToastNotifications = ({ toasts, onClose }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
          <div className="toast-icon">
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          </div>
          <p className="toast-message">{toast.message}</p>
          <button
            type="button"
            className="toast-close"
            onClick={() => onClose(toast.id)}
            aria-label="Cerrar notificación"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastNotifications;
