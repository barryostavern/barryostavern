import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import ChristmasCTA from '../../components/public/ChristmasCTA';
import NoteEditor from '../../components/admin/NoteEditor';
import Toggle from '../../components/admin/shared/Toggle';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import { API_BASE_URL } from '../../config/api';
import type { AdminTicketOrder, SiteSettings } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './ChristmasPage.module.css';

type ChristmasForm = {
  enabled: boolean;
  title: string;
  note: string;
  advancePriceCents: number;
  startTime: string;
  endTime: string;
  calloutPlacement: 'standard' | 'belowHero';
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

function normalizeTimeInput(value: string): string | null {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
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
  const { getAccessTokenSilently } = useAuth0();
  const { toast } = useToast();
  const [form, setForm] = useState<ChristmasForm>({
    enabled: false,
    title: 'Annual Christmas Party',
    note: '',
    advancePriceCents: 1500,
    startTime: '19:00',
    endTime: '23:30',
    calloutPlacement: 'standard',
  });
  const [dateInput, setDateInput] = useState('');
  const [priceInput, setPriceInput] = useState('15.00');
  const [posterUrl, setPosterUrl] = useState('');
  const [uploadingPoster, setUploadingPoster] = useState(false);
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
          startTime: normalizeTimeInput(settings.christmasParty.startTime ?? '') ?? '19:00',
          endTime: normalizeTimeInput(settings.christmasParty.endTime ?? '') ?? '23:30',
          calloutPlacement:
            settings.christmasParty.calloutPlacement === 'belowHero' ? 'belowHero' : 'standard',
        });
        setDateInput(toDateInputValue(settings.christmasParty.date));
        setPriceInput(centsToPriceInput(cents));
        setPosterUrl(settings.christmasParty.posterUrl ?? '');
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
      posterUrl,
    }),
    [form, dateInput, posterUrl]
  );

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    const advancePriceCents = priceInputToCents(priceInput);
    if (advancePriceCents === null) {
      toast('Advance price must be between $1.00 and $500.00', 'error');
      return;
    }

    const startTime = normalizeTimeInput(form.startTime);
    const endTime = normalizeTimeInput(form.endTime);
    if (!startTime || !endTime) {
      toast('Enter a start time and an end time', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        advancePriceCents,
        startTime,
        endTime,
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
        startTime: normalizeTimeInput(updated.christmasParty.startTime ?? '') ?? startTime,
        endTime: normalizeTimeInput(updated.christmasParty.endTime ?? '') ?? endTime,
        calloutPlacement:
          updated.christmasParty.calloutPlacement === 'belowHero' ? 'belowHero' : 'standard',
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

  const uploadPoster = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Use a JPEG, PNG, or WebP image', 'error');
      return;
    }

    setUploadingPoster(true);

    try {
      const token = await getAccessTokenSilently();
      const body = new FormData();
      body.append('poster', file);
      const response = await fetch(`${API_BASE_URL}/admin/media/christmas-poster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Could not upload the poster');
      }

      const json = (await response.json()) as { data: { posterUrl: string } };
      setPosterUrl(json.data.posterUrl);
      toast('Poster uploaded', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not upload the poster', 'error');
    } finally {
      setUploadingPoster(false);
    }
  };

  const removePoster = async () => {
    setUploadingPoster(true);

    try {
      await adminFetch<{ posterUrl: string }>('/admin/media/christmas-poster', { method: 'DELETE' });
      setPosterUrl('');
      toast('Poster removed', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove the poster', 'error');
    } finally {
      setUploadingPoster(false);
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

            <div className={styles.timeRow}>
              <div>
                <label className={formStyles.fieldLabel} htmlFor="christmas-start">
                  Start time
                </label>
                <input
                  id="christmas-start"
                  type="time"
                  className={formStyles.input}
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className={formStyles.fieldLabel} htmlFor="christmas-end">
                  End time
                </label>
                <input
                  id="christmas-end"
                  type="time"
                  className={formStyles.input}
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <fieldset className={styles.placement}>
              <legend className={formStyles.fieldLabel}>Homepage spot</legend>
              <label className={styles.placementOption}>
                <input
                  type="radio"
                  name="calloutPlacement"
                  checked={form.calloutPlacement === 'standard'}
                  onChange={() => setForm({ ...form, calloutPlacement: 'standard' })}
                />
                After the events list
              </label>
              <label className={styles.placementOption}>
                <input
                  type="radio"
                  name="calloutPlacement"
                  checked={form.calloutPlacement === 'belowHero'}
                  onChange={() => setForm({ ...form, calloutPlacement: 'belowHero' })}
                />
                Below the hero video
              </label>
            </fieldset>

            <NoteEditor
              id="christmas-note"
              label="Event details"
              value={form.note}
              onChange={(note) => setForm({ ...form, note })}
            />

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

          <div className={styles.posterBlock}>
            <p className={formStyles.fieldLabel}>Poster</p>
            {posterUrl ? (
              <img src={posterUrl} alt="Christmas party poster" className={styles.posterPreview} />
            ) : (
              <p className={styles.fieldHint}>
                No poster yet. The decorative artwork shows until you upload one.
              </p>
            )}
            <div className={styles.posterActions}>
              <label className={`btn btn-green ${styles.posterUpload}`}>
                {uploadingPoster ? 'Working…' : 'Upload poster'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadPoster}
                  disabled={uploadingPoster}
                  hidden
                />
              </label>
              {posterUrl ? (
                <button
                  type="button"
                  className={formStyles.btnDanger}
                  onClick={removePoster}
                  disabled={uploadingPoster}
                >
                  Remove poster
                </button>
              ) : null}
            </div>
            <p className={styles.fieldHint}>JPEG, PNG, or WebP. Up to 8 MB.</p>
          </div>
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
