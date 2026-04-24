import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable Confirmation Dialog for destructive or important actions.
 * Supports a11y focus trapping and escape key dismissal.
 */
export const ConfirmDialog = ({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, isDestructive = false }) => {
  const modalRef = useRef(null);

  // Focus trap and Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the modal to start trapping
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface/80 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div 
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        tabIndex="-1"
        className="relative w-full max-w-md bg-surface-container border border-outline-variant rounded-2xl shadow-elevated overflow-hidden animate-scale-in"
      >
        <div className="p-6 sm:p-8">
          <h3 id="confirm-dialog-title" className="text-xl font-headline font-bold text-on-surface mb-2">
            {title}
          </h3>
          <p id="confirm-dialog-desc" className="text-on-surface-variant mb-6 leading-relaxed">
            {message}
          </p>
          
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-2">
            <button
              onClick={onCancel}
              className="btn-secondary w-full sm:w-auto"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold transition-all ${
                isDestructive
                  ? 'bg-error/15 text-error border border-error/30 hover:bg-error/25 hover:border-error/50'
                  : 'btn-primary'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
