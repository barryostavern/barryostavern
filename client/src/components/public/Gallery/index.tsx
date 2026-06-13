import { useState } from 'react';
import { useGallery } from '../../../hooks/useGallery';
import type { GallerySubmission } from '../../../types';
import GalleryLightbox from './GalleryLightbox';
import styles from './Gallery.module.css';

export interface GalleryProps {
  instagramHandle?: string;
  enabled?: boolean;
}

function GallerySkeleton() {
  return (
    <div className={styles.grid} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((key) => (
        <div key={key} className={`${styles.skeletonTile} skeletonPulse`} />
      ))}
    </div>
  );
}

function Gallery({ instagramHandle = '', enabled = true }: GalleryProps) {
  const { photos, loading } = useGallery();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!enabled) {
    return null;
  }

  if (loading) {
    return (
      <section id="gallery" className="section" aria-busy="true">
        <div className="wrap">
          <h2 className="sec-head">From the Pub</h2>
          <p className="sr-only">Loading gallery…</p>
          <GallerySkeleton />
        </div>
      </section>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const handle = instagramHandle.replace(/^@/, '');
  const instagramUrl = handle ? `https://instagram.com/${handle}` : undefined;

  return (
    <section id="gallery" className="section">
      <div className="wrap">
        <h2 className="sec-head">From the Pub</h2>

        {instagramUrl ? (
          <p className={styles.instagram}>
            Follow us on{' '}
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
              @{handle}
            </a>
          </p>
        ) : null}

        <div className={styles.grid}>
          {photos.map((photo: GallerySubmission, index) => (
            <button
              key={photo._id}
              type="button"
              className={styles.tile}
              onClick={() => setActiveIndex(index)}
              aria-label={`View photo by ${photo.submitterName}${photo.caption ? `: ${photo.caption}` : ''}`}
            >
              <img
                src={photo.thumbnailUrl || photo.imageUrl}
                alt=""
                loading="lazy"
              />
              <span className={styles.overlay} aria-hidden="true">
                <span className={styles.viewHint}>View</span>
                <span className={styles.name}>{photo.submitterName}</span>
                {photo.caption ? <span className={styles.caption}>{photo.caption}</span> : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeIndex !== null ? (
        <GalleryLightbox
          photos={photos}
          activeIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNavigate={setActiveIndex}
        />
      ) : null}
    </section>
  );
}

export default Gallery;
