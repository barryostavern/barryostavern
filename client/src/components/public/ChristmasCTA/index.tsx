import { Link } from 'react-router-dom';
import RichNote from '../../shared/RichNote';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import { formatPartyTimeRange } from '../../../utils/partyDisplay';
import type { SiteSettings } from '../../../types';
import styles from './ChristmasCTA.module.css';

export interface ChristmasCTAProps {
  christmasParty: SiteSettings['christmasParty'];
}

function formatPartyDate(dateStr?: string): string | null {
  if (!dateStr) return null;

  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function ChristmasCTA({ christmasParty }: ChristmasCTAProps) {
  if (!christmasParty.enabled) return null;

  const formattedDate = formatPartyDate(christmasParty.date);
  const timeRange = formatPartyTimeRange(christmasParty.startTime, christmasParty.endTime);
  const posterUrl = christmasParty.posterUrl?.trim();

  return (
    <section id="christmas" className={styles.section}>
      <div className="wrap">
        <div className={posterUrl ? `${styles.banner} ${styles.bannerWithPoster}` : styles.banner}>
          {posterUrl ? (
            <div className={styles.posterWrap}>
              <img src={posterUrl} alt={`${christmasParty.title} poster`} className={styles.poster} />
            </div>
          ) : (
            <div className={styles.left}>
              <img
                src={BRAND_ASSETS.christmasParty}
                alt=""
                aria-hidden="true"
                className={styles.partyArt}
                width={220}
                height={220}
              />
            </div>
          )}

          <div className={styles.center}>
            <h2 className={styles.title}>{christmasParty.title}</h2>
            {formattedDate ? <p className={styles.date}>{formattedDate}</p> : null}
            {timeRange ? <p className={styles.time}>{timeRange}</p> : null}
            <RichNote value={christmasParty.note} className={styles.note} />
            <Link to="/christmas-party" className={`btn btn-green ${styles.ticketBtn}`}>
              Get Tickets
            </Link>
          </div>

          {posterUrl ? null : (
            <div className={styles.right}>
              <img
                src={BRAND_ASSETS.christmasTickets}
                alt=""
                aria-hidden="true"
                className={styles.ticketArt}
                width={280}
                height={220}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ChristmasCTA;
