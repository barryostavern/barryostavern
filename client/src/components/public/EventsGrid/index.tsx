import { Link } from 'react-router-dom';
import type { Event } from '../../../types';
import EventCard from '../EventCard';
import styles from './EventsGrid.module.css';

export interface EventsGridProps {
  events: Event[];
}

function EventsGrid({ events }: EventsGridProps) {
  return (
    <>
      <div className={styles.grid}>
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>

      <div className={styles.footer}>
        <Link to="/calendar" className="btn btn-outline">
          View Full Calendar
        </Link>
      </div>
    </>
  );
}

export default EventsGrid;
