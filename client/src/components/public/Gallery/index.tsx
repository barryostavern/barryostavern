import styles from './Gallery.module.css';

function Gallery() {
  return (
    <section id="gallery" className="section">
      <div className="wrap">
        <h2 className="sec-head">From the Pub</h2>
        <p className={styles.placeholder}>Photo gallery coming soon.</p>
      </div>
    </section>
  );
}

export default Gallery;
