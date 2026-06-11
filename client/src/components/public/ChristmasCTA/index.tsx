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

function TicketGraphic() {
  return (
    <div className={styles.ticket} aria-hidden="true">
      <div className={styles.ticketStub}>
        <span>★</span>
        <span>★</span>
        <span>★</span>
      </div>
      <div className={styles.ticketBody}>
        <span className={styles.ticketLabel}>Admit One</span>
      </div>
    </div>
  );
}

function ChristmasCTA({ christmasParty }: ChristmasCTAProps) {
  if (!christmasParty.enabled) return null;

  const formattedDate = formatPartyDate(christmasParty.date);
  const ticketHref = christmasParty.ticketUrl || '#contact';

  return (
    <section id="christmas" className={styles.section}>
      <div className="wrap">
        <div className={styles.banner}>
          <div className={styles.left}>
            <span className={styles.label}>Barry O&apos;s</span>
            <span className={`script ${styles.script}`}>Christmas</span>
            <span className={styles.party}>Party</span>
          </div>

          <div className={styles.center}>
            <h2 className={styles.title}>{christmasParty.title}</h2>
            {formattedDate ? <p className={styles.date}>{formattedDate}</p> : null}
            {christmasParty.note ? <p className={styles.note}>{christmasParty.note}</p> : null}
          </div>

          <div className={styles.right}>
            <TicketGraphic />
            <a
              href={ticketHref}
              className={styles.ticketBtn}
              target={christmasParty.ticketUrl ? '_blank' : undefined}
              rel={christmasParty.ticketUrl ? 'noopener noreferrer' : undefined}
            >
              Get Tickets
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ChristmasCTA;
