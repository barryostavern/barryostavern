import mongoose, { Document, Schema } from 'mongoose';

export type TicketOrderStatus = 'pending' | 'paid';

export interface ITicketOrder extends Document {
  paypalOrderId: string;
  captureId?: string;
  confirmationToken: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
  currency: 'USD';
  payerName: string;
  payerEmail: string;
  status: TicketOrderStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketOrderSchema = new Schema<ITicketOrder>(
  {
    paypalOrderId: { type: String, required: true, unique: true },
    captureId: { type: String },
    confirmationToken: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    unitAmountCents: { type: Number, required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, enum: ['USD'], default: 'USD', required: true },
    payerName: { type: String, default: '' },
    payerEmail: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending', required: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

TicketOrderSchema.index({ status: 1, paidAt: -1 });

export const TicketOrder = mongoose.model<ITicketOrder>('TicketOrder', TicketOrderSchema);
