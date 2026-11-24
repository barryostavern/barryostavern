import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { getTicketConfirmation, type TicketConfirmation } from '../../services/tickets';
import homeStyles from './HomePage.module.css';
import styles from './ChristmasConfirmationPage.module.css';

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatPaidAt(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ChristmasConfirmationPage() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [confirmation, setConfirmation] = useState<TicketConfirmation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setConfirmation(null);
      setError('This page needs the confirmation link from checkout.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    getTicketConfirmation(token)
      .then((result) => {
        if (active) setConfirmation(result);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setConfirmation(null);
        setError(loadError instanceof Error ? loadError.message : 'We could not find that ticket.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (settingsLoading || loading) {
    return (
      <div className={homeStyles.loading}>
        <div className={homeStyles.spinner} aria-hidden="true" />
        <p className={homeStyles.loadingText}>Loading…</p>
      </div>
    );
  }

  const partyTitle = settings?.christmasParty.title;

  return (
    <>
      <Nav />
      <main id="main" className={styles.main}>
        <div className="wrap">
          <div className={styles.card}>
            {confirmation ? (
              <>
                <h1 className={styles.title}>You&apos;re on the list</h1>
                <p className={styles.message}>
                  {confirmation.payerName ? `${confirmation.payerName}, your` : 'Your'}{' '}
                  {partyTitle ? `${partyTitle} ` : ''}
                  {confirmation.quantity === 1 ? 'ticket is' : 'tickets are'} confirmed. Bring this
                  page to the door.
                </p>
                <dl className={styles.details}>
                  <div>
                    <dt>Tickets</dt>
                    <dd>{confirmation.quantity}</dd>
                  </div>
                  <div>
                    <dt>Total paid</dt>
                    <dd>${formatCents(confirmation.amountCents)}</dd>
                  </div>
                  {confirmation.payerEmail ? (
                    <div>
                      <dt>Email</dt>
                      <dd>{confirmation.payerEmail}</dd>
                    </div>
                  ) : null}
                  {confirmation.paidAt ? (
                    <div>
                      <dt>Paid</dt>
                      <dd>{formatPaidAt(confirmation.paidAt)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Order number</dt>
                    <dd>{confirmation.reference}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <>
                <h1 className={styles.title}>Ticket not found</h1>
                <p className={styles.message}>{error}</p>
              </>
            )}
            <Link to="/christmas-party" className="btn btn-green">
              Back to the party
            </Link>
          </div>
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default ChristmasConfirmationPage;
