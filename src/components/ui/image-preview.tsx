'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImagePreview({ src, alt = 'Preview', onClose }: ImagePreviewProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2"
        style={{ zIndex: 10000 }}
      >
        <X size={32} />
      </button>

      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
        点击任意位置或按 ESC 关闭
      </div>
    </div>
  );
}

interface ClickableImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export function ClickableImage({ src, alt, className = '' }: ClickableImageProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setPreviewOpen(true)}
      />
      {previewOpen && (
        <ImagePreview
          src={src}
          alt={alt}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}