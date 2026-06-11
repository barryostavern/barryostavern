import type { Event, EventType } from '../../../types';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: Event;
}

const TYPE_LABELS: Record<EventType, string> = {
  sports: 'Sports',
  holiday: 'Holiday',
  shuttle: 'Shuttle',
  community: 'Community',
};

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);

  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
  };
}

function EventCard({ event }: EventCardProps) {
  const { month, day, weekday } = formatEventDate(event.date);

  return (
    <article className={styles.card}>
      <div className={styles.dateBlock}>
        <span className={styles.month}>{month}</span>
        <span className={styles.day}>{day}</span>
        <span className={styles.weekday}>{weekday}</span>
      </div>

      <div className={styles.body}>
        <span className={`${styles.badge} ${styles[event.type]}`}>{TYPE_LABELS[event.type]}</span>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.time}>{event.timeLabel}</p>
        {event.description ? <p className={styles.description}>{event.description}</p> : null}
      </div>
    </article>
  );
}

export default EventCard;
