import { API_BASE_URL } from '../config/api';

export interface TicketConfirmation {
  quantity: number;
  amountCents: number;
  payerName: string;
  payerEmail: string;
  paidAt: string | null;
  reference: string;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // The response was not JSON.
  }

  return fallback;
}

export async function createTicketOrder(quantity: number): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/tickets/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Could not start checkout. Try again.'));
  }

  const json = (await response.json()) as { data: { orderId: string } };
  return json.data.orderId;
}

export async function captureTicketOrder(orderId: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/tickets/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'PayPal could not complete this payment.'));
  }

  const json = (await response.json()) as { data: { confirmationToken: string } };
  return json.data.confirmationToken;
}

export async function getTicketConfirmation(token: string): Promise<TicketConfirmation> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/confirmation/${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    throw new Error(await readError(response, 'We could not find that ticket.'));
  }

  const json = (await response.json()) as { data: TicketConfirmation };
  return json.data;
}
