import { FormEvent, useEffect, useMemo, useState } from 'react';
import ChristmasCTA from '../../components/public/ChristmasCTA';
import Toggle from '../../components/admin/shared/Toggle';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import type { AdminTicketOrder, SiteSettings } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './ChristmasPage.module.css';

type ChristmasForm = {
  enabled: boolean;
  title: string;
  note: string;
  advancePriceCents: number;
};

interface TicketSales {
  orders: AdminTicketOrder[];
  ticketsSold: number;
  orderCount: number;
}

function toDateInputValue(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 10);
}

function centsToPriceInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function priceInputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const cents = Math.round(Number(trimmed) * 100);
  if (cents < 100 || cents > 50000) return null;
  return cents;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatPaidAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDaysAwayLabel(dateStr: string): string {
  if (!dateStr) return 'No date set';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `${diff} days away`;
}

function ChristmasPage() {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const [form, setForm] = useState<ChristmasForm>({
    enabled: false,
    title: 'Annual Christmas Party',
    note: '',
    advancePriceCents: 1500,
  });
  const [dateInput, setDateInput] = useState('');
  const [priceInput, setPriceInput] = useState('15.00');
  const [sales, setSales] = useState<TicketSales>({ orders: [], ticketsSold: 0, orderCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    adminFetch<SiteSettings>('/admin/site')
      .then((settings) => {
        if (!active) return;
        const cents = settings.christmasParty.advancePriceCents ?? 1500;
        setForm({
          enabled: settings.christmasParty.enabled,
          title: settings.christmasParty.title,
          note: settings.christmasParty.note,
          advancePriceCents: cents,
        });
        setDateInput(toDateInputValue(settings.christmasParty.date));
        setPriceInput(centsToPriceInput(cents));
      })
      .catch(() => {
        if (active) toast('Could not load Christmas settings', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    adminFetch<TicketSales>('/admin/tickets')
      .then((result) => {
        if (active) setSales(result);
      })
      .catch(() => {
        if (active) toast('Could not load ticket sales', 'error');
      });

    return () => {
      active = false;
    };
  }, [adminFetch, toast]);

  const previewParty = useMemo(
    () => ({
      ...form,
      date: dateInput ? `${dateInput}T12:00:00.000Z` : undefined,
    }),
    [form, dateInput]
  );

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    const advancePriceCents = priceInputToCents(priceInput);
    if (advancePriceCents === null) {
      toast('Advance price must be between $1.00 and $500.00', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        advancePriceCents,
        date: dateInput ? `${dateInput}T12:00:00.000Z` : undefined,
      };

      const updated = await adminFetch<SiteSettings>('/admin/site', {
        method: 'PUT',
        body: JSON.stringify({ christmasParty: payload }),
      });

      const cents = updated.christmasParty.advancePriceCents ?? advancePriceCents;
      setForm({
        enabled: updated.christmasParty.enabled,
        title: updated.christmasParty.title,
        note: updated.christmasParty.note,
        advancePriceCents: cents,
      });
      setDateInput(toDateInputValue(updated.christmasParty.date));
      setPriceInput(centsToPriceInput(cents));
      toast('Christmas party saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save Christmas settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading Christmas editor…</p>;
  }

  const soldLabel = sales.ticketsSold === 1 ? '1 ticket sold' : `${sales.ticketsSold} tickets sold`;

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Christmas Party</h1>

      <div className={styles.grid}>
        <section className={`${formStyles.panel} ${styles.editor}`}>
          <form className={styles.form} onSubmit={handleSave}>
            <Toggle
              checked={form.enabled}
              onChange={(enabled) => setForm({ ...form, enabled })}
              label="Christmas party banner"
            />

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-title">
                Headline
              </label>
              <input
                id="christmas-title"
                type="text"
                className={formStyles.input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-date">
                Party date
              </label>
              <input
                id="christmas-date"
                type="date"
                className={formStyles.input}
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
              <p className={styles.daysAway}>{getDaysAwayLabel(dateInput)}</p>
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-note">
                Note
              </label>
              <textarea
                id="christmas-note"
                className={formStyles.textarea}
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-price">
                Advance ticket price
              </label>
              <div className={styles.priceField}>
                <span className={styles.pricePrefix} aria-hidden="true">
                  $
                </span>
                <input
                  id="christmas-price"
                  type="text"
                  inputMode="decimal"
                  className={formStyles.input}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                />
              </div>
              <p className={styles.fieldHint}>Charged in PayPal when someone buys an advance ticket.</p>
            </div>

            <button type="submit" className="btn btn-green" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        <section className={`${formStyles.panel} ${styles.previewPanel}`}>
          <h2 className={formStyles.sectionTitle}>Live preview</h2>
          <div className={styles.previewFrame}>
            {previewParty.enabled ? (
              <ChristmasCTA christmasParty={previewParty} />
            ) : (
              <p className={styles.hiddenNote}>Hidden from the public site.</p>
            )}
          </div>
        </section>
      </div>

      <section className={`${formStyles.panel} ${styles.orders}`}>
        <h2 className={formStyles.sectionTitle}>Paid tickets</h2>
        <p className={styles.ordersSummary}>{soldLabel}</p>
        {sales.orderCount > sales.orders.length ? (
          <p className={styles.fieldHint}>
            Showing the latest {sales.orders.length} of {sales.orderCount} orders.
          </p>
        ) : null}
        {sales.orders.length === 0 ? (
          <p className={styles.hiddenNote}>No tickets sold yet.</p>
        ) : (
          <ul className={styles.orderList}>
            {sales.orders.map((order) => (
              <li key={order._id} className={styles.orderRow}>
                <span>{order.payerName || 'Buyer'}</span>
                <span className={styles.orderEmail}>{order.payerEmail || 'No email'}</span>
                <span>{order.quantity === 1 ? '1 ticket' : `${order.quantity} tickets`}</span>
                <span>${formatCents(order.amountCents)}</span>
                <span>{formatPaidAt(order.paidAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ChristmasPage;
