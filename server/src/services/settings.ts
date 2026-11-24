import {
  DEFAULT_ADVANCE_PRICE_CENTS,
  DEFAULT_PARTY_END_TIME,
  DEFAULT_PARTY_START_TIME,
} from '../constants/tickets';
import { SiteSettings } from '../models';

export async function ensureSettings(): Promise<void> {
  const existing = await SiteSettings.findOne();

  if (!existing) {
    await SiteSettings.create({
      hours: [
        { label: 'Mon – Thu', value: '11AM – 2AM', order: 1 },
        { label: 'Fri – Sat', value: '11AM – 2:30AM', order: 2 },
        { label: 'Sun', value: '11AM – 2AM', order: 3 },
      ],
      contact: {
        address: '324 S. Main St., Royal Oak, MI 48067',
        phone: '(248) 541-3539',
      },
    });
  }

  await SiteSettings.updateMany(
    {
      $or: [
        { 'christmasParty.advancePriceCents': { $exists: false } },
        { 'christmasParty.advancePriceCents': null },
      ],
    },
    { $set: { 'christmasParty.advancePriceCents': DEFAULT_ADVANCE_PRICE_CENTS } }
  );

  await SiteSettings.updateMany(
    {
      $or: [
        { 'christmasParty.startTime': { $exists: false } },
        { 'christmasParty.startTime': null },
        { 'christmasParty.startTime': '' },
      ],
    },
    { $set: { 'christmasParty.startTime': DEFAULT_PARTY_START_TIME } }
  );

  await SiteSettings.updateMany(
    {
      $or: [
        { 'christmasParty.endTime': { $exists: false } },
        { 'christmasParty.endTime': null },
        { 'christmasParty.endTime': '' },
      ],
    },
    { $set: { 'christmasParty.endTime': DEFAULT_PARTY_END_TIME } }
  );
}
