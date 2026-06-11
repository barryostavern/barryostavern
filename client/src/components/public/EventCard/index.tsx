import { getEventIconPath, usesColoredEventIcon } from '../../../constants/eventTypes';
import {
  formatSpecificDateLabel,
  formatWeeklyDayLabel,
} from '../../../constants/eventSchedule';
import type { Event } from '../../../types';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: Event;
}

function EventCard({ event }: EventCardProps) {
  const isWeekly = event.scheduleType === 'weekly' && event.dayOfWeek !== undefined;
  const specificDate = !isWeekly ? formatSpecificDateLabel(event.date) : null;
  const iconPath = getEventIconPath(event.type);
  const coloredIcon = usesColoredEventIcon(event.type);

  return (
    <article className={styles.card}>
      {isWeekly ? <p className={styles.eyebrow}>{formatWeeklyDayLabel(event.dayOfWeek!)}</p> : null}
      {!isWeekly && specificDate ? <p className={styles.eyebrow}>{specificDate}</p> : null}

      <div className={`${styles.iconWrap} ${isWeekly || specificDate ? '' : styles.iconWrapNoEyebrow}`}>
        <img
          src={iconPath}
          alt=""
          aria-hidden="true"
          className={coloredIcon ? styles.iconLogo : styles.icon}
        />
      </div>

      <h3 className={styles.title}>{event.title}</h3>
      <p className={styles.time}>{event.timeLabel}</p>
    </article>
  );
}

export default EventCard;
