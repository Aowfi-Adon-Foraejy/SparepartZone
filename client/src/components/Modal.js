import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children, 
  size = 'md',
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className={`modal-content ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="flex justify-between items-start mb-6">
              <div>
                {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
                {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors mt-1"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;