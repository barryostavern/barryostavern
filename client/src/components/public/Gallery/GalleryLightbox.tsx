import { useCallback, useEffect, useId, useRef } from 'react';
import type { GallerySubmission } from '../../../types';
import styles from './GalleryLightbox.module.css';

export interface GalleryLightboxProps {
  photos: GallerySubmission[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      {direction === 'prev' ? (
        <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      ) : (
        <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      )}
    </svg>
  );
}

function GalleryLightbox({ photos, activeIndex, onClose, onNavigate }: GalleryLightboxProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[activeIndex];
  const hasMultiple = photos.length > 1;

  const goPrev = useCallback((): void => {
    onNavigate(activeIndex === 0 ? photos.length - 1 : activeIndex - 1);
  }, [activeIndex, onNavigate, photos.length]);

  const goNext = useCallback((): void => {
    onNavigate(activeIndex === photos.length - 1 ? 0 : activeIndex + 1);
  }, [activeIndex, onNavigate, photos.length]);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (!hasMultiple) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [goNext, goPrev, hasMultiple, onClose]);

  if (!photo) return null;

  const altText = photo.caption || `Photo by ${photo.submitterName}`;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close photo"
        >
          <CloseIcon />
        </button>

        <div className={styles.imageWrap}>
          {hasMultiple ? (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.navPrev}`}
                onClick={goPrev}
                aria-label="Previous photo"
              >
                <ChevronIcon direction="prev" />
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.navNext}`}
                onClick={goNext}
                aria-label="Next photo"
              >
                <ChevronIcon direction="next" />
              </button>
            </>
          ) : null}

          <img
            key={photo._id}
            className={styles.image}
            src={photo.imageUrl}
            alt={altText}
          />
        </div>

        <div className={styles.footer}>
          <div className={styles.meta}>
            <p id={titleId} className={styles.name}>
              {photo.submitterName}
            </p>
            {photo.caption ? <p className={styles.caption}>{photo.caption}</p> : null}
          </div>
          {hasMultiple ? (
            <span className={styles.counter}>
              {activeIndex + 1} / {photos.length}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default GalleryLightbox;
