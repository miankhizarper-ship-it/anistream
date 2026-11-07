import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ImageViewerItem {
  id: string;
  title: string;
  subtitle?: string;
  imagePath: string;
  badge?: string;
}

interface ImageViewerModalProps {
  items: ImageViewerItem[];
  /** Index of the open image, or null when the viewer is closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

/**
 * Full-screen centered image viewer used by the Android app page.
 *
 * Opens the clicked screenshot in the middle of the page and completely locks
 * background scrolling (body is fixed in place while open — this also stops
 * iOS Safari rubber-banding behind the overlay). Closes via the X button, the
 * backdrop, or the Escape key. Arrow keys / swipe navigate between images.
 */
export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  items,
  index,
  onClose,
  onNavigate,
}) => {
  const isOpen = index !== null && index >= 0 && index < items.length;
  const item = isOpen ? items[index as number] : null;

  // Lock background scrolling while the viewer is open (iOS-safe: body is
  // pinned with position:fixed instead of just overflow:hidden).
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY || window.pageYOffset;
    const { body, documentElement } = document;

    body.dataset.viewerScrollLock = 'true';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'contain';
    documentElement.style.overflow = 'hidden';

    return () => {
      delete body.dataset.viewerScrollLock;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      body.style.overscrollBehavior = '';
      documentElement.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const goPrev = useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const goNext = useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goPrev, goNext]);

  // Touch swipe navigation
  useEffect(() => {
    if (!isOpen) return;
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 60) {
        if (dx > 0) goPrev();
        else goNext();
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isOpen, goPrev, goNext]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          key="viewer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          onTouchMove={(e) => e.preventDefault()}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-hidden overscroll-contain"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, touchAction: 'none' }}
          role="dialog"
          aria-modal="true"
          aria-label={item.title}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer shadow-lg"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <span className="absolute top-5 left-5 z-30 text-[11px] font-extrabold text-white/70 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
            {(index as number) + 1} / {items.length}
          </span>

          {/* Prev / Next */}
          {items.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/10 hover:bg-[#a855f7] text-white transition-colors cursor-pointer shadow-lg"
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/10 hover:bg-[#a855f7] text-white transition-colors cursor-pointer shadow-lg"
                aria-label="Next screenshot"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Centered card */}
          <motion.div
            key={item.id}
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-20 flex flex-col items-center max-h-full"
          >
            <div className="rounded-3xl border border-[#a855f7]/30 bg-[#0d0a18] p-2 sm:p-3 shadow-2xl shadow-purple-950/50 max-h-[78vh] flex items-center justify-center overflow-hidden">
              <img
                src={item.imagePath}
                alt={item.title}
                draggable={false}
                className="max-h-[70vh] w-auto max-w-[88vw] sm:max-w-md object-contain rounded-2xl select-none"
              />
            </div>

            <div className="text-center mt-4 max-w-md px-2 space-y-1">
              {item.badge && (
                <span className="text-[10px] font-extrabold text-[#c084fc] uppercase tracking-wider bg-[#a855f7]/15 px-2.5 py-0.5 rounded-full border border-[#a855f7]/30 inline-block">
                  {item.badge}
                </span>
              )}
              <h3 className="text-sm sm:text-base font-black text-white">{item.title}</h3>
              {item.subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {item.subtitle}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
