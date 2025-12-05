import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast toast-${toast.type} animate-slide-in`}>
                        <div className="toast-icon">
                            {toast.type === 'success' && <CheckCircle size={20} />}
                            {toast.type === 'error' && <AlertCircle size={20} />}
                            {toast.type === 'info' && <Info size={20} />}
                        </div>
                        <span className="toast-message">{toast.message}</span>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
            <style>{`
        .toast-container {
          position: fixed;
          bottom: 80px; /* Above mobile nav */
          right: 1rem;
          left: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          z-index: 1000;
          pointer-events: none;
        }
        
        @media (min-width: 768px) {
          .toast-container {
            bottom: 2rem;
            left: auto;
            width: 350px;
          }
        }
        
        .toast {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 1rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: var(--shadow-lg);
          pointer-events: auto;
          overflow: hidden;
        }
        
        .toast-success { border-left: 4px solid var(--success); }
        .toast-error { border-left: 4px solid var(--danger); }
        .toast-info { border-left: 4px solid var(--accent-primary); }
        
        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .toast-success .toast-icon { color: var(--success); }
        .toast-error .toast-icon { color: var(--danger); }
        .toast-info .toast-icon { color: var(--accent-primary); }
        
        .toast-message {
          flex: 1;
          font-size: 0.875rem;
        }
        
        .toast-close {
          background: none;
          color: var(--text-secondary);
          padding: 0.25rem;
          cursor: pointer;
        }
        
        .toast-close:hover {
          color: var(--text-primary);
        }
        
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </ToastContext.Provider>
    );
}
