import { useEvents } from '../../../hooks/useEvents';
import EvergreenPanel from '../EvergreenPanel';
import EventsGrid from '../EventsGrid';
import styles from './EventsSection.module.css';

function EventsSkeleton() {
  return (
    <div className={styles.skeletonGrid} aria-hidden="true">
      {[0, 1].map((key) => (
        <div key={key} className={styles.skeletonCard} />
      ))}
    </div>
  );
}

function EventsSection() {
  const { events, loading } = useEvents();

  return (
    <section id="events" className="section">
      <div className="wrap">
        <h2 className="sec-head">What&apos;s On at Barry O&apos;s</h2>

        {loading ? (
          <EventsSkeleton />
        ) : events.length > 0 ? (
          <EventsGrid events={events} />
        ) : (
          <EvergreenPanel />
        )}
      </div>
    </section>
  );
}

export default EventsSection;
