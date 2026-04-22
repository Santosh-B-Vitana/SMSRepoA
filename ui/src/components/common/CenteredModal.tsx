import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CenteredModalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}

export function CenteredModal({ open, onClose, ariaLabel = 'Dialog', children }: CenteredModalProps) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div role="dialog" aria-label={ariaLabel} className="relative w-full max-w-md md:max-w-lg">
        {children}
      </div>
    </div>,
    document.body
  );
}
