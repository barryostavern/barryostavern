import {
  EVENT_TYPE_LABELS,
  getEventIconPath,
  usesColoredEventIcon,
} from '../../../constants/eventTypes';
import {
  formatDateRange,
  formatWeekdayRange,
  formatWeeklyDayLabel,
  TAVERN_TIME_ZONE,
  toCalendarDateString,
} from '../../../constants/eventSchedule';
import type { Event } from '../../../types';
import styles from './EventCalendarList.module.css';

export interface EventCalendarListProps {
  events: Event[];
}

function formatFullDate(dateStr?: string): string | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: TAVERN_TIME_ZONE,
  });
}

function formatMonthHeading(dateStr: string): string {
  const date = new Date(dateStr);

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: TAVERN_TIME_ZONE,
  });
}

function groupDatedEventsByMonth(events: Event[]): Array<{ monthKey: string; events: Event[] }> {
  const groups = new Map<string, Event[]>();

  for (const event of events) {
    if (!event.date) continue;

    const monthKey = toCalendarDateString(event.date).slice(0, 7);
    const bucket = groups.get(monthKey);

    if (bucket) {
      bucket.push(event);
    } else {
      groups.set(monthKey, [event]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, monthEvents]) => ({ monthKey, events: monthEvents }));
}

function EventIcon({ event }: { event: Event }) {
  const iconPath = getEventIconPath(event.type);
  const coloredIcon = usesColoredEventIcon(event.type);

  return (
    <div className={styles.iconWrap}>
      <img
        src={iconPath}
        alt=""
        aria-hidden="true"
        className={coloredIcon ? styles.iconLogo : styles.icon}
      />
    </div>
  );
}

function DatedEventRow({ event }: { event: Event }) {
  const fullDate = formatFullDate(event.date);
  const typeLabel = EVENT_TYPE_LABELS[event.type];

  return (
    <article className={styles.row}>
      <EventIcon event={event} />

      <div className={styles.body}>
        <div className={styles.meta}>
          {fullDate ? <p className={styles.date}>{fullDate}</p> : null}
          <span className={styles.typeBadge}>{typeLabel}</span>
        </div>

        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.time}>{event.timeLabel}</p>
        {event.description ? <p className={styles.description}>{event.description}</p> : null}
      </div>
    </article>
  );
}

function WeeklyEventRow({ event }: { event: Event }) {
  const dayLabel =
    event.dayOfWeek !== undefined ? formatWeeklyDayLabel(event.dayOfWeek) : 'WEEKLY';
  const seasonRange = formatDateRange(event.startDate, event.endDate);
  const typeLabel = EVENT_TYPE_LABELS[event.type];

  return (
    <article className={styles.row}>
      <EventIcon event={event} />

      <div className={styles.body}>
        <div className={styles.meta}>
          <p className={styles.date}>{dayLabel}</p>
          <span className={`${styles.typeBadge} ${styles.recurringBadge}`}>Every week</span>
          <span className={styles.typeBadge}>{typeLabel}</span>
        </div>

        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.time}>{event.timeLabel}</p>
        {seasonRange ? <p className={styles.season}>Season: {seasonRange}</p> : null}
        {event.description ? <p className={styles.description}>{event.description}</p> : null}
      </div>
    </article>
  );
}

function MultiDayEventRow({ event }: { event: Event }) {
  const dateRange = formatDateRange(event.startDate, event.endDate);
  const weekdayRange = formatWeekdayRange(event.startDate, event.endDate);
  const typeLabel = EVENT_TYPE_LABELS[event.type];

  return (
    <article className={styles.row}>
      <EventIcon event={event} />

      <div className={styles.body}>
        <div className={styles.meta}>
          {weekdayRange ? <p className={styles.date}>{weekdayRange}</p> : null}
          <span className={`${styles.typeBadge} ${styles.recurringBadge}`}>Multiple days</span>
          <span className={styles.typeBadge}>{typeLabel}</span>
        </div>

        <h3 className={styles.title}>{event.title}</h3>
        {dateRange ? <p className={styles.time}>{dateRange}</p> : null}
        <p className={styles.scheduleTime}>{event.timeLabel}</p>
        {event.description ? <p className={styles.description}>{event.description}</p> : null}
      </div>
    </article>
  );
}

function EventCalendarList({ events }: EventCalendarListProps) {
  const datedEvents = events.filter(
    (event) => event.scheduleType !== 'weekly' && event.scheduleType !== 'multi_day'
  );
  const multiDayEvents = events.filter((event) => event.scheduleType === 'multi_day');
  const weeklyEvents = events.filter((event) => event.scheduleType === 'weekly');
  const datedGroups = groupDatedEventsByMonth(datedEvents);
  const multiDayGroups = groupDatedEventsByMonth(
    multiDayEvents.map((event) => ({
      ...event,
      date: event.startDate ?? event.date,
    }))
  );

  return (
    <div className={styles.list}>
      {datedGroups.map(({ monthKey, events: monthEvents }) => (
        <section key={monthKey} className={styles.monthGroup} aria-labelledby={`month-${monthKey}`}>
          <h2 id={`month-${monthKey}`} className={styles.monthHeading}>
            {monthEvents[0]?.date ? formatMonthHeading(monthEvents[0].date) : monthKey}
          </h2>

          <div className={styles.rows}>
            {monthEvents.map((event) => (
              <DatedEventRow key={event._id} event={event} />
            ))}
          </div>
        </section>
      ))}

      {multiDayGroups.map(({ monthKey, events: monthEvents }) => (
        <section key={`multi-${monthKey}`} className={styles.monthGroup} aria-labelledby={`multi-month-${monthKey}`}>
          <h2 id={`multi-month-${monthKey}`} className={styles.monthHeading}>
            {monthEvents[0]?.date ? formatMonthHeading(monthEvents[0].date) : monthKey}
          </h2>

          <div className={styles.rows}>
            {monthEvents.map((event) => (
              <MultiDayEventRow key={event._id} event={event} />
            ))}
          </div>
        </section>
      ))}

      {weeklyEvents.length > 0 ? (
        <section className={styles.monthGroup} aria-labelledby="recurring-events">
          <h2 id="recurring-events" className={styles.monthHeading}>
            Every Week
          </h2>

          <div className={styles.rows}>
            {weeklyEvents.map((event) => (
              <WeeklyEventRow key={event._id} event={event} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default EventCalendarList;
