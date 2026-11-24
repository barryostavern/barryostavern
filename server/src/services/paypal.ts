import { IncomingHttpHeaders } from 'http';
import { createError } from '../middleware/errorHandler';

const PAYPAL_LIVE_API = 'https://api-m.paypal.com';
const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';

interface PayPalAmount {
  currency_code?: string;
  value?: string;
}

interface PayPalCapture {
  id?: string;
  status?: string;
  amount?: PayPalAmount;
}

interface PayPalOrder {
  id?: string;
  status?: string;
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  purchase_units?: Array<{
    payments?: { captures?: PayPalCapture[] };
  }>;
}

interface PayPalErrorBody {
  name?: string;
  details?: Array<{ issue?: string }>;
}

export interface PayPalWebhookEvent {
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    amount?: PayPalAmount;
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
  };
}

export interface PaidCapture {
  captureId: string;
  status: string;
  currency: string;
  amountCents: number;
  payerName: string;
  payerEmail: string;
}

interface CreateOrderInput {
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
  description: string;
}

let tokenCache: { value: string; expiresAt: number } | null = null;

export function getPayPalClientId(): string | null {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  return clientId || null;
}

export function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_MODE === 'live' ? PAYPAL_LIVE_API : PAYPAL_SANDBOX_API;
}

function paypalCredentials(): { clientId: string; secret: string } {
  const clientId = getPayPalClientId();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !secret) {
    throw createError('Ticket checkout is not available right now', 503);
  }

  return { clientId, secret };
}

export function centsFromPayPalValue(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw createError('PayPal returned an unexpected amount', 502);
  }

  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function dollarsFromCents(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.value;
  }

  const { clientId, secret } = paypalCredentials();
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  let response: Response;
  try {
    response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.error('PayPal auth request failed', error);
    throw createError('Ticket checkout is not available right now', 503);
  }

  if (!response.ok) {
    console.error('PayPal auth rejected', response.status);
    throw createError('Ticket checkout is not available right now', 503);
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token || !body.expires_in) {
    throw createError('Ticket checkout is not available right now', 503);
  }

  tokenCache = {
    value: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };

  return body.access_token;
}

async function paypalRequest(path: string, init: RequestInit): Promise<Response> {
  const token = await getAccessToken();

  try {
    return await fetch(`${getPayPalBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.error('PayPal request failed', path, error);
    throw createError('Ticket checkout is not available right now', 503);
  }
}

async function paypalIssue(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as PayPalErrorBody;
    return body.details?.[0]?.issue || body.name || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function payerFromOrder(order: PayPalOrder): { payerName: string; payerEmail: string } {
  const given = order.payer?.name?.given_name?.trim() ?? '';
  const surname = order.payer?.name?.surname?.trim() ?? '';

  return {
    payerName: [given, surname].filter(Boolean).join(' '),
    payerEmail: order.payer?.email_address?.trim().toLowerCase() ?? '',
  };
}

function extractPaidCapture(order: PayPalOrder): PaidCapture {
  const capture = order.purchase_units?.[0]?.payments?.captures?.find(
    (entry) => entry.status === 'COMPLETED'
  ) ?? order.purchase_units?.[0]?.payments?.captures?.[0];

  if (!capture?.id || !capture.status || !capture.amount?.value || !capture.amount.currency_code) {
    throw createError('PayPal did not return a completed payment', 502);
  }

  const payer = payerFromOrder(order);

  return {
    captureId: capture.id,
    status: capture.status,
    currency: capture.amount.currency_code,
    amountCents: centsFromPayPalValue(capture.amount.value),
    payerName: payer.payerName,
    payerEmail: payer.payerEmail,
  };
}

export async function createPayPalOrder(input: CreateOrderInput): Promise<string> {
  const description = input.description.trim().slice(0, 127) || "Barry O's Christmas Party";
  const response = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description,
          items: [
            {
              name: description,
              quantity: String(input.quantity),
              category: 'DIGITAL_GOODS',
              unit_amount: {
                currency_code: 'USD',
                value: dollarsFromCents(input.unitAmountCents),
              },
            },
          ],
          amount: {
            currency_code: 'USD',
            value: dollarsFromCents(input.totalAmountCents),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: dollarsFromCents(input.totalAmountCents),
              },
            },
          },
        },
      ],
      application_context: {
        brand_name: "Barry O's Old Market Tavern",
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    }),
  });

  if (!response.ok) {
    console.error('PayPal create order failed', response.status, await paypalIssue(response));
    throw createError('Ticket checkout is not available right now', 503);
  }

  const order = (await response.json()) as PayPalOrder;
  if (!order.id) {
    throw createError('Ticket checkout is not available right now', 503);
  }

  return order.id;
}

async function getPayPalOrder(paypalOrderId: string): Promise<PayPalOrder> {
  const response = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.error('PayPal order lookup failed', response.status, await paypalIssue(response));
    throw createError('PayPal could not complete this payment', 502);
  }

  return (await response.json()) as PayPalOrder;
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<PaidCapture> {
  const response = await paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    { method: 'POST' }
  );

  if (response.ok) {
    return extractPaidCapture((await response.json()) as PayPalOrder);
  }

  const issue = await paypalIssue(response);
  if (issue === 'ORDER_ALREADY_CAPTURED') {
    return extractPaidCapture(await getPayPalOrder(paypalOrderId));
  }

  console.error('PayPal capture failed', response.status, issue);
  throw createError('PayPal could not complete this payment', 502);
}

function headerValue(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw createError('Invalid PayPal webhook signature', 400);
  }

  return value;
}

function assertPayPalCertUrl(certUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(certUrl);
  } catch {
    throw createError('Invalid PayPal webhook signature', 400);
  }

  const host = parsed.hostname.toLowerCase();
  const paypalHost = host === 'paypal.com' || host.endsWith('.paypal.com');
  if (parsed.protocol !== 'https:' || !paypalHost) {
    throw createError('Invalid PayPal webhook signature', 400);
  }
}

export async function verifyWebhookEvent(
  rawBody: Buffer,
  headers: IncomingHttpHeaders
): Promise<PayPalWebhookEvent> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) {
    throw createError('PayPal webhook is not configured', 503);
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as PayPalWebhookEvent;
  } catch {
    throw createError('Invalid PayPal webhook payload', 400);
  }

  const certUrl = headerValue(headers, 'paypal-cert-url');
  assertPayPalCertUrl(certUrl);

  const response = await paypalRequest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      auth_algo: headerValue(headers, 'paypal-auth-algo'),
      cert_url: certUrl,
      transmission_id: headerValue(headers, 'paypal-transmission-id'),
      transmission_sig: headerValue(headers, 'paypal-transmission-sig'),
      transmission_time: headerValue(headers, 'paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  if (!response.ok) {
    console.error('PayPal webhook verification failed', response.status);
    throw createError('Invalid PayPal webhook signature', 400);
  }

  const result = (await response.json()) as { verification_status?: string };
  if (result.verification_status !== 'SUCCESS') {
    throw createError('Invalid PayPal webhook signature', 400);
  }

  return event;
}
