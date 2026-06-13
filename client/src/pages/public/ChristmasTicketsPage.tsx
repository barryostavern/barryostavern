import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import ShamrockIcon from '../../components/shared/ShamrockIcon';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import homeStyles from './HomePage.module.css';
import styles from './ChristmasTicketsPage.module.css';

type TicketOption = 'advance' | 'dayOf';

const ADVANCE_PRICE = 15;
const DAY_OF_PRICE = 20;
const DOORS_TIME = '7:00 PM';
const MUSIC_TIME = '8:30 PM';
const BAND_NAME = "Matt Wallace and the Barry O's";
const DEFAULT_DESCRIPTION =
  "Barry O's biggest party of the year! Join us for a night of holiday cheer, great music, cold drinks and good times with friends.";
const MUSIC_DESCRIPTION =
  "A Barry O's tradition for decades. Sing along to all your holiday favorites and a few surprises.";

function formatPartyDateLong(dateStr?: string): string | null {
  if (!dateStr) return null;

  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPartyDateShort(dateStr?: string): { weekday: string; rest: string } | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const rest = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return { weekday, rest };
}

function formatPartyDateUpper(dateStr?: string): string | null {
  const formatted = formatPartyDateLong(dateStr);
  return formatted ? formatted.toUpperCase() : null;
}

function buildGoogleCalendarUrl(title: string, dateStr?: string): string | null {
  if (!dateStr) return null;

  const start = new Date(dateStr);
  start.setHours(19, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 30, 0, 0);

  const format = (value: Date) =>
    value
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${format(start)}/${format(end)}`,
    details: DEFAULT_DESCRIPTION,
    location: "Barry O's Old Market Tavern, 324 S. Main St., Royal Oak, MI 48067",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? styles.inlineIcon}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className={styles.logisticsIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className={styles.logisticsIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className={styles.inlineIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0V8z" />
    </svg>
  );
}

function ChristmasTicketsPage() {
  const { settings, loading } = useSiteSettings();
  const [ticketOption, setTicketOption] = useState<TicketOption>('advance');

  if (loading) {
    return (
      <div className={homeStyles.loading}>
        <div className={homeStyles.spinner} aria-hidden="true" />
        <p className={homeStyles.loadingText}>Loading…</p>
      </div>
    );
  }

  if (!settings?.christmasParty.enabled) {
    return (
      <>
        <Nav />
        <main id="main" className={`section ${styles.unavailable}`}>
          <div className="wrap">
            <div className={styles.unavailablePanel}>
              <h1 className={styles.unavailableTitle}>Christmas Party tickets aren&apos;t available yet</h1>
              <p className={styles.unavailableText}>
                Check back closer to the holidays or follow us on social for updates.
              </p>
              <Link to="/" className="btn btn-green">
                Back to home
              </Link>
            </div>
          </div>
        </main>
        {settings ? <Footer settings={settings} /> : null}
      </>
    );
  }

  const { christmasParty, contact, hero } = settings;
  const formattedDateUpper = formatPartyDateUpper(christmasParty.date);
  const formattedDateShort = formatPartyDateShort(christmasParty.date);
  const calendarUrl = buildGoogleCalendarUrl(christmasParty.title, christmasParty.date);
  const description = christmasParty.note?.trim() || DEFAULT_DESCRIPTION;
  const selectedPrice = ticketOption === 'advance' ? ADVANCE_PRICE : DAY_OF_PRICE;
  const checkoutUrl = christmasParty.ticketUrl?.trim();
  const canCheckout = ticketOption === 'advance' && Boolean(checkoutUrl);

  return (
    <>
      <Nav />
      <main id="main">
        <section className={styles.hero} aria-labelledby="christmas-party-title">
          {hero.posterUrl ? (
            <img
              src={hero.posterUrl}
              alt=""
              aria-hidden="true"
              className={styles.heroBg}
            />
          ) : null}
          <div className={styles.heroOverlay} aria-hidden="true" />

          <div className={`wrap ${styles.heroInner}`}>
            <div className={styles.heroArt}>
              <img
                src={BRAND_ASSETS.christmasParty}
                alt=""
                aria-hidden="true"
                className={styles.ticketArt}
                width={320}
                height={320}
              />
            </div>

            <div className={styles.heroContent}>
              <h1 id="christmas-party-title" className={styles.heroTitle}>
                {christmasParty.title}
              </h1>
              {formattedDateUpper ? (
                <p className={styles.heroDate}>{formattedDateUpper}</p>
              ) : null}
              <p className={styles.heroDescription}>{description}</p>
            </div>
          </div>
        </section>

        <section className={styles.main} aria-labelledby="entertainment-heading">
          <div className={`wrap ${styles.mainGrid}`}>
            <div className={styles.entertainment}>
              <p className={styles.eyebrow}>Live Music All Night</p>
              <h2 id="entertainment-heading" className={styles.bandTitle}>
                {BAND_NAME}
              </h2>
              <p className={`script ${styles.bandScript}`}>Christmas Band</p>

              <div className={styles.shamrockDivider} aria-hidden="true">
                <span className={styles.dividerLine} />
                <ShamrockIcon className={styles.dividerShamrock} />
                <span className={styles.dividerLine} />
              </div>

              <p className={styles.entertainmentCopy}>{MUSIC_DESCRIPTION}</p>

              {calendarUrl ? (
                <a
                  href={calendarUrl}
                  className={`btn btn-outline ${styles.calendarBtn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarIcon />
                  Add to Calendar
                </a>
              ) : null}
            </div>

            <div className={styles.ticketCard} aria-labelledby="ticket-card-heading">
              <div className={styles.ticketCardHeader}>
                <span className={styles.ticketCardLine} aria-hidden="true" />
                <h2 id="ticket-card-heading" className={styles.ticketCardTitle}>
                  Get Your Tickets
                </h2>
                <span className={styles.ticketCardLine} aria-hidden="true" />
              </div>
              <ShamrockIcon className={styles.ticketCardShamrock} />

              <fieldset className={styles.ticketOptions}>
                <legend className="sr-only">Choose a ticket type</legend>

                <label
                  className={
                    ticketOption === 'advance'
                      ? `${styles.ticketOption} ${styles.ticketOptionSelected}`
                      : styles.ticketOption
                  }
                >
                  <input
                    type="radio"
                    name="ticketType"
                    value="advance"
                    checked={ticketOption === 'advance'}
                    onChange={() => setTicketOption('advance')}
                    className={styles.ticketRadio}
                  />
                  <span className={styles.ticketOptionBody}>
                    <span className={styles.ticketOptionTop}>
                      <span className={styles.ticketOptionName}>Advance Ticket</span>
                      <span className={styles.ticketOptionPrice}>${ADVANCE_PRICE.toFixed(2)} + fees</span>
                    </span>
                    <span className={styles.ticketOptionSub}>General Admission</span>
                    <span className={styles.ticketOptionHighlight}>Recommended: Save $5!</span>
                  </span>
                </label>

                <label
                  className={
                    ticketOption === 'dayOf'
                      ? `${styles.ticketOption} ${styles.ticketOptionSelected}`
                      : styles.ticketOption
                  }
                >
                  <input
                    type="radio"
                    name="ticketType"
                    value="dayOf"
                    checked={ticketOption === 'dayOf'}
                    onChange={() => setTicketOption('dayOf')}
                    className={styles.ticketRadio}
                  />
                  <span className={styles.ticketOptionBody}>
                    <span className={styles.ticketOptionTop}>
                      <span className={styles.ticketOptionName}>Day Of Show</span>
                      <span className={styles.ticketOptionPrice}>${DAY_OF_PRICE.toFixed(2)} at the door</span>
                    </span>
                    <span className={styles.ticketOptionSub}>At The Door</span>
                  </span>
                </label>
              </fieldset>

              {canCheckout ? (
                <a
                  href={checkoutUrl}
                  className={`btn btn-green ${styles.buyBtn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buy Tickets — ${selectedPrice.toFixed(2)}
                  <ArrowIcon />
                </a>
              ) : (
                <button type="button" className={`btn btn-green ${styles.buyBtn}`} disabled>
                  {ticketOption === 'dayOf'
                    ? `Pay at the Door — $${selectedPrice.toFixed(2)}`
                    : 'Ticket checkout coming soon'}
                </button>
              )}

              <p className={styles.checkoutNote}>
                <LockIcon />
                Secure checkout powered by <strong>Stripe</strong>
              </p>
            </div>
          </div>
        </section>

        <section className={styles.logistics} aria-label="Event details">
          <div className={`wrap ${styles.logisticsGrid}`}>
            <div className={styles.logisticsItem}>
              <CalendarIcon className={styles.logisticsIcon} />
              <div>
                <p className={styles.logisticsLabel}>Date</p>
                {formattedDateShort ? (
                  <>
                    <p className={styles.logisticsValue}>{formattedDateShort.weekday},</p>
                    <p className={styles.logisticsValue}>{formattedDateShort.rest}</p>
                  </>
                ) : (
                  <p className={styles.logisticsValue}>TBA</p>
                )}
              </div>
            </div>

            <div className={styles.logisticsItem}>
              <ClockIcon />
              <div>
                <p className={styles.logisticsLabel}>Time</p>
                <p className={styles.logisticsValue}>Doors at {DOORS_TIME}</p>
                <p className={styles.logisticsValue}>Music starts at {MUSIC_TIME}</p>
              </div>
            </div>

            <div className={styles.logisticsItem}>
              <MapPinIcon />
              <div>
                <p className={styles.logisticsLabel}>Location</p>
                <p className={styles.logisticsValue}>Barry O&apos;s Old Market Tavern</p>
                <p className={styles.logisticsValue}>{contact.address}</p>
              </div>
            </div>
          </div>

          <p className={styles.disclaimer}>
            Tickets are non-refundable. This is a 21+ event.
          </p>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}

export default ChristmasTicketsPage;
