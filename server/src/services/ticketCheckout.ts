import crypto from 'crypto';
import { IncomingHttpHeaders } from 'http';
import { MAX_TICKETS_PER_ORDER, getAdvancePriceCents } from '../constants/tickets';
import { createError } from '../middleware/errorHandler';
import { SiteSettings, TicketOrder } from '../models';
import type { ITicketOrder } from '../models/TicketOrder';
import { capturePayPalOrder, createPayPalOrder, verifyWebhookEvent } from './paypal';

const PAYPAL_ORDER_ID = /^[A-Za-z0-9]{10,36}$/;

export interface TicketConfirmation {
  quantity: number;
  amountCents: number;
  payerName: string;
  payerEmail: string;
  paidAt: string | null;
  reference: string;
}

export function parseTicketQuantity(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TICKETS_PER_ORDER
  ) {
    throw createError(
      `Quantity must be a whole number from 1 to ${MAX_TICKETS_PER_ORDER}`,
      400
    );
  }

  return value;
}

export function assertPayPalOrderId(orderId: string): void {
  if (!PAYPAL_ORDER_ID.test(orderId)) {
    throw createError('Invalid PayPal order', 400);
  }
}

function toConfirmation(order: ITicketOrder): TicketConfirmation {
  return {
    quantity: order.quantity,
    amountCents: order.amountCents,
    payerName: order.payerName,
    payerEmail: order.payerEmail,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    reference: order.captureId || order.paypalOrderId,
  };
}

async function markOrderPaid(order: ITicketOrder): Promise<ITicketOrder> {
  if (order.status === 'paid') return order;

  const capture = await capturePayPalOrder(order.paypalOrderId);
  if (capture.currency !== 'USD' || capture.amountCents !== order.amountCents) {
    console.error('PayPal amount mismatch', order.paypalOrderId);
    throw createError('Payment amount did not match the ticket price', 400);
  }

  if (capture.status !== 'COMPLETED') {
    throw createError('Payment was not completed', 400);
  }

  const updated = await TicketOrder.findOneAndUpdate(
    { _id: order._id, status: 'pending' },
    {
      $set: {
        status: 'paid',
        captureId: capture.captureId,
        payerName: capture.payerName,
        payerEmail: capture.payerEmail,
        paidAt: new Date(),
      },
    },
    { new: true }
  );

  if (updated) return updated;

  const current = await TicketOrder.findById(order._id);
  if (current?.status === 'paid') return current;

  throw createError('Could not record this payment', 500);
}

export async function createTicketOrder(quantity: number): Promise<string> {
  const settings = await SiteSettings.findOne();
  if (!settings?.christmasParty.enabled) {
    throw createError('Christmas party tickets are not on sale', 400);
  }

  const unitAmountCents = getAdvancePriceCents(settings.christmasParty.advancePriceCents);
  const paypalOrderId = await createPayPalOrder({
    quantity,
    unitAmountCents,
    totalAmountCents: unitAmountCents * quantity,
    description: settings.christmasParty.title || "Barry O's Christmas Party",
  });

  try {
    await TicketOrder.create({
      paypalOrderId,
      confirmationToken: crypto.randomBytes(32).toString('hex'),
      quantity,
      unitAmountCents,
      amountCents: unitAmountCents * quantity,
      currency: 'USD',
      status: 'pending',
    });
  } catch (error) {
    console.error('Could not save ticket order', paypalOrderId, error);
    throw createError('Ticket checkout is not available right now', 503);
  }

  return paypalOrderId;
}

export async function captureTicketOrder(paypalOrderId: string): Promise<string> {
  assertPayPalOrderId(paypalOrderId);

  const order = await TicketOrder.findOne({ paypalOrderId });
  if (!order) {
    throw createError('Order not found', 404);
  }

  const paid = await markOrderPaid(order);
  return paid.confirmationToken;
}

export async function getTicketConfirmation(token: string): Promise<TicketConfirmation> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw createError('Ticket not found', 404);
  }

  const order = await TicketOrder.findOne({ confirmationToken: token, status: 'paid' });
  if (!order) {
    throw createError('Ticket not found', 404);
  }

  return toConfirmation(order);
}

export async function handlePayPalWebhook(
  rawBody: Buffer,
  headers: IncomingHttpHeaders
): Promise<void> {
  const event = await verifyWebhookEvent(rawBody, headers);
  const orderId =
    event.event_type === 'PAYMENT.CAPTURE.COMPLETED'
      ? event.resource?.supplementary_data?.related_ids?.order_id
      : event.resource?.id;

  if (
    (event.event_type !== 'CHECKOUT.ORDER.APPROVED' &&
      event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') ||
    !orderId ||
    !PAYPAL_ORDER_ID.test(orderId)
  ) {
    return;
  }

  const order = await TicketOrder.findOne({ paypalOrderId: orderId });
  if (!order || order.status === 'paid') return;

  await markOrderPaid(order);
}
