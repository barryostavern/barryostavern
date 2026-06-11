import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  auth0Sub: string;
  role: 'manager' | 'staff';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    auth0Sub: { type: String, required: true, unique: true },
    role: { type: String, enum: ['manager', 'staff'], default: 'staff' },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
