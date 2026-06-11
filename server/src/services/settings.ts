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
}
