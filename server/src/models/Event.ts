import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  type: 'sports' | 'holiday' | 'shuttle' | 'community';
  title: string;
  description: string;
  date: Date;
  timeLabel: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    type: { type: String, enum: ['sports', 'holiday', 'shuttle', 'community'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 400 },
    date: { type: Date, required: true },
    timeLabel: { type: String, default: 'TBD', maxlength: 60 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EventSchema.index({ date: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
