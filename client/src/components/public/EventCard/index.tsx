import { getEventIconPath, usesColoredEventIcon } from '../../../constants/eventTypes';
import {
  formatSpecificDateLabel,
  formatWeekdayRange,
  formatWeeklyDayLabel,
} from '../../../constants/eventSchedule';
import type { Event } from '../../../types';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: Event;
}

function EventCard({ event }: EventCardProps) {
  const isWeekly = event.scheduleType === 'weekly' && event.dayOfWeek !== undefined;
  const isMultiDay = event.scheduleType === 'multi_day';
  const weeklyLabel = isWeekly ? formatWeeklyDayLabel(event.dayOfWeek!) : null;
  const multiDayLabel = isMultiDay
    ? formatWeekdayRange(event.startDate, event.endDate)
    : null;
  const specificDate = !isWeekly && !isMultiDay ? formatSpecificDateLabel(event.date) : null;
  const eyebrow = weeklyLabel ?? multiDayLabel ?? specificDate;
  const iconPath = getEventIconPath(event.type);
  const coloredIcon = usesColoredEventIcon(event.type);

  return (
    <article className={styles.card}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}

      <div className={`${styles.iconWrap} ${eyebrow ? '' : styles.iconWrapNoEyebrow}`}>
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
