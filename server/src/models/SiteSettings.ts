import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteSettings extends Document {
  announcement: {
    enabled: boolean;
    message: string;
    linkTarget: 'Events' | 'Christmas Party' | 'Menu' | 'Contact';
  };
  christmasParty: {
    enabled: boolean;
    title: string;
    date?: Date;
    note: string;
    ticketUrl: string;
  };
  hero: { videoUrl?: string; posterUrl?: string };
  hours: Array<{ label: string; value: string; order: number }>;
  contact: { address: string; phone: string };
  about: string;
  instagram: { handle: string; showApprovedInGallery: boolean };
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    announcement: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      linkTarget: {
        type: String,
        enum: ['Events', 'Christmas Party', 'Menu', 'Contact'],
        default: 'Events',
      },
    },
    christmasParty: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: 'Annual Christmas Party' },
      date: { type: Date },
      note: { type: String, default: '' },
      ticketUrl: { type: String, default: '' },
    },
    hero: { videoUrl: String, posterUrl: String },
    hours: [{ label: String, value: String, order: Number }],
    contact: { address: String, phone: String },
    about: { type: String, default: '' },
    instagram: {
      handle: { type: String, default: '' },
      showApprovedInGallery: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
