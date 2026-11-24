import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import PayPalTicketButton from '../../components/public/PayPalTicketButton';
import ShamrockIcon from '../../components/shared/ShamrockIcon';
import { BRAND_ASSETS } from '../../constants/brandAssets';
import RichNote from '../../components/shared/RichNote';
import { formatPartyTimeRange, richNoteHasText } from '../../utils/partyDisplay';
import { getCalendarDateParts, TAVERN_TIME_ZONE } from '../../constants/eventSchedule';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import homeStyles from './HomePage.module.css';
import styles from './ChristmasTicketsPage.module.css';

type TicketOption = 'advance' | 'dayOf';

const DAY_OF_PRICE = 20;
const BAND_NAME = "Matt Wallace and the Barry O's";
const DEFAULT_DESCRIPTION =
  "Barry O's biggest party of the year! Join us for a night of holiday cheer, great music, cold drinks and good times with friends.";
const MUSIC_DESCRIPTION =
  "A Barry O's tradition for decades. Sing along to all your holiday favorites and a few surprises.";

const MAX_TICKETS_PER_ORDER = 10;

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatSavings(cents: number): string {
  if (cents % 100 === 0) return String(cents / 100);
  return (cents / 100).toFixed(2);
}

function isPartyDay(dateStr?: string): boolean {
  if (!dateStr) return false;

  const party = getCalendarDateParts(dateStr);
  const today = getCalendarDateParts(new Date());

  return party.year === today.year && party.month === today.month && party.day === today.day;
}

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

function tavernInstant(year: number, month: number, day: number, time: string): Date | null {
  const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TAVERN_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(utcGuess);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const zonedAsUtc = Date.UTC(
    pick('year'),
    pick('month') - 1,
    pick('day'),
    pick('hour'),
    pick('minute'),
    pick('second')
  );

  return new Date(utcGuess.getTime() - (zonedAsUtc - utcGuess.getTime()));
}

function buildGoogleCalendarUrl(
  title: string,
  dateStr: string | undefined,
  startTime: string,
  endTime: string
): string | null {
  if (!dateStr) return null;

  const { year, month, day } = getCalendarDateParts(dateStr);
  const start = tavernInstant(year, month, day, startTime);
  let end = tavernInstant(year, month, day, endTime);
  if (!start || !end) return null;

  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

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

function LockIcon() {
  return (
    <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0V8z" />
    </svg>
  );
}

function ChristmasTicketsPage() {
  const { settings, loading } = useSiteSettings();
  const navigate = useNavigate();
  const [ticketOption, setTicketOption] = useState<TicketOption>('advance');
  const [quantity, setQuantity] = useState(1);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const quantityRef = useRef(quantity);
  quantityRef.current = quantity;

  const handlePaid = useCallback(
    (confirmationToken: string) => {
      navigate(`/christmas-party/confirmation?token=${encodeURIComponent(confirmationToken)}`);
    },
    [navigate]
  );

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
  const calendarUrl = buildGoogleCalendarUrl(
    christmasParty.title,
    christmasParty.date,
    christmasParty.startTime || '19:00',
    christmasParty.endTime || '23:30'
  );
  const description = richNoteHasText(christmasParty.note)
    ? christmasParty.note
    : DEFAULT_DESCRIPTION;
  const timeRange = formatPartyTimeRange(christmasParty.startTime, christmasParty.endTime);
  const posterUrl = christmasParty.posterUrl?.trim();
  const advancePriceCents = christmasParty.advancePriceCents ?? 1500;
  const paypalClientId = christmasParty.paypalClientId?.trim() ?? '';
  const showDayOfPrice = isPartyDay(christmasParty.date);
  const selectedOption: TicketOption = showDayOfPrice ? ticketOption : 'advance';
  const savingsCents = DAY_OF_PRICE * 100 - advancePriceCents;
  const totalCents = advancePriceCents * quantity;
  const canCheckout = selectedOption === 'advance' && Boolean(paypalClientId);

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

          <div className={`wrap ${posterUrl ? `${styles.heroInner} ${styles.heroInnerWithPoster}` : styles.heroInner}`}>
            <div className={styles.heroArt}>
              <img
                src={posterUrl || BRAND_ASSETS.christmasParty}
                alt={posterUrl ? `${christmasParty.title} poster` : ''}
                aria-hidden={posterUrl ? undefined : true}
                className={posterUrl ? styles.posterArt : styles.ticketArt}
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
              {timeRange ? <p className={styles.heroTime}>{timeRange}</p> : null}
              <RichNote value={description} className={styles.heroDescription} />
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
                <legend className="sr-only">
                  {showDayOfPrice ? 'Choose a ticket type' : 'Advance ticket'}
                </legend>

                <label
                  className={
                    selectedOption === 'advance'
                      ? `${styles.ticketOption} ${styles.ticketOptionSelected}`
                      : styles.ticketOption
                  }
                >
                  {showDayOfPrice ? (
                    <input
                      type="radio"
                      name="ticketType"
                      value="advance"
                      checked={selectedOption === 'advance'}
                      onChange={() => {
                        setTicketOption('advance');
                        setCheckoutMessage('');
                      }}
                      className={styles.ticketRadio}
                    />
                  ) : null}
                  <span className={styles.ticketOptionBody}>
                    <span className={styles.ticketOptionTop}>
                      <span className={styles.ticketOptionName}>Advance Ticket</span>
                      <span className={styles.ticketOptionPrice}>
                        ${formatCents(advancePriceCents)} + fees
                      </span>
                    </span>
                    <span className={styles.ticketOptionSub}>General Admission</span>
                    {showDayOfPrice && savingsCents > 0 ? (
                      <span className={styles.ticketOptionHighlight}>
                        Recommended: Save ${formatSavings(savingsCents)}!
                      </span>
                    ) : null}
                  </span>
                </label>

                {showDayOfPrice ? (
                  <label
                    className={
                      selectedOption === 'dayOf'
                        ? `${styles.ticketOption} ${styles.ticketOptionSelected}`
                        : styles.ticketOption
                    }
                  >
                    <input
                      type="radio"
                      name="ticketType"
                      value="dayOf"
                      checked={selectedOption === 'dayOf'}
                      onChange={() => {
                        setTicketOption('dayOf');
                        setCheckoutMessage('');
                      }}
                      className={styles.ticketRadio}
                    />
                    <span className={styles.ticketOptionBody}>
                      <span className={styles.ticketOptionTop}>
                        <span className={styles.ticketOptionName}>Day Of Show</span>
                        <span className={styles.ticketOptionPrice}>
                          ${DAY_OF_PRICE.toFixed(2)} at the door
                        </span>
                      </span>
                      <span className={styles.ticketOptionSub}>At The Door</span>
                    </span>
                  </label>
                ) : null}
              </fieldset>

              {selectedOption === 'advance' ? (
                <div className={styles.quantity}>
                  <span className={styles.quantityLabel} id="ticket-quantity-label">
                    How many
                  </span>
                  <div className={styles.quantityControls}>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      disabled={quantity <= 1}
                      aria-label="Fewer tickets"
                    >
                      −
                    </button>
                    <span className={styles.quantityValue} aria-labelledby="ticket-quantity-label">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() =>
                        setQuantity((current) => Math.min(MAX_TICKETS_PER_ORDER, current + 1))
                      }
                      disabled={quantity >= MAX_TICKETS_PER_ORDER}
                      aria-label="More tickets"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : null}

              {canCheckout ? (
                <>
                  <p className={styles.totalLine}>Total ${formatCents(totalCents)}</p>
                  <div className={styles.paypalSlot}>
                    <PayPalTicketButton
                      clientId={paypalClientId}
                      quantityRef={quantityRef}
                      onPaid={handlePaid}
                      onMessage={setCheckoutMessage}
                    />
                  </div>
                </>
              ) : (
                <button type="button" className={`btn btn-green ${styles.buyBtn}`} disabled>
                  {selectedOption === 'dayOf'
                    ? `Pay at the Door — $${DAY_OF_PRICE.toFixed(2)}`
                    : 'Ticket checkout coming soon'}
                </button>
              )}

              {checkoutMessage ? (
                <p className={styles.checkoutStatus} role="status">
                  {checkoutMessage}
                </p>
              ) : null}

              <p className={styles.checkoutNote}>
                <LockIcon />
                Secure checkout powered by <strong>PayPal</strong>
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
                <p className={styles.logisticsValue}>{timeRange ?? 'Time TBA'}</p>
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
