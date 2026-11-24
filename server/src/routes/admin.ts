import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { EVENT_TYPES, type EventType } from '../constants/eventTypes';
import {
  MAX_ADVANCE_PRICE_CENTS,
  MIN_ADVANCE_PRICE_CENTS,
  getPartyTime,
} from '../constants/tickets';
import {
  buildEventFieldsFromBody,
  getActiveEventsFilter,
  parseEventScheduleInput,
  sortEventsForDisplay,
  toMongoUpdatePayload,
} from '../utils/eventSchedule';
import { checkJwt, extractAuth0Sub } from '../middleware/auth';
import { heroVideoUpload } from '../middleware/uploadHero';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Event, SiteSettings, Submission, TicketOrder, User } from '../models';
import type { ITicketOrder } from '../models/TicketOrder';
import type { ISiteSettings } from '../models/SiteSettings';
import { uploadHeroVideo } from '../services/storage';
import { destroyImage, moveToGallery } from '../services/imagePipeline';
import type { ISubmission } from '../models/Submission';

const router = Router();

router.use(checkJwt);

const LINK_TARGETS = ['Events', 'Christmas Party', 'Menu', 'Contact'] as const;
type LinkTarget = (typeof LINK_TARGETS)[number];

function getDaysUntil(date?: Date): number | null {
  if (!date) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function getSettingsDocument() {
  const settings = await SiteSettings.findOne();

  if (!settings) {
    throw createError('Site settings not found', 404);
  }

  return settings;
}

function validateLinkTarget(value: unknown): value is LinkTarget {
  return typeof value === 'string' && LINK_TARGETS.includes(value as LinkTarget);
}

function mergeSiteSettings(
  settings: ISiteSettings,
  body: Record<string, unknown>
): void {
  if (body.announcement !== undefined) {
    if (typeof body.announcement !== 'object' || body.announcement === null) {
      throw createError('announcement must be an object', 400);
    }

    const announcement = body.announcement as Record<string, unknown>;

    if (
      announcement.linkTarget !== undefined &&
      !validateLinkTarget(announcement.linkTarget)
    ) {
      throw createError('Invalid announcement.linkTarget', 400);
    }

    Object.assign(settings.announcement, announcement);
  }

  if (body.christmasParty !== undefined) {
    if (typeof body.christmasParty !== 'object' || body.christmasParty === null) {
      throw createError('christmasParty must be an object', 400);
    }

    const christmasParty = body.christmasParty as Record<string, unknown>;

    if (christmasParty.advancePriceCents !== undefined) {
      const cents = christmasParty.advancePriceCents;
      if (
        typeof cents !== 'number' ||
        !Number.isInteger(cents) ||
        cents < MIN_ADVANCE_PRICE_CENTS ||
        cents > MAX_ADVANCE_PRICE_CENTS
      ) {
        throw createError('Advance price must be between $1.00 and $500.00', 400);
      }
    }

    delete christmasParty.ticketUrl;
    delete christmasParty.paypalClientId;

    if (christmasParty.startTime !== undefined) {
      const startTime = getPartyTime(christmasParty.startTime, '');
      if (!startTime) {
        throw createError('Start time must be a valid time', 400);
      }
      christmasParty.startTime = startTime;
    }

    if (christmasParty.endTime !== undefined) {
      const endTime = getPartyTime(christmasParty.endTime, '');
      if (!endTime) {
        throw createError('End time must be a valid time', 400);
      }
      christmasParty.endTime = endTime;
    }

    if (christmasParty.date !== undefined && christmasParty.date !== null) {
      const parsed = new Date(String(christmasParty.date));
      if (Number.isNaN(parsed.getTime())) {
        throw createError('Invalid christmasParty.date', 400);
      }
      settings.christmasParty.date = parsed;
      delete christmasParty.date;
    }

    Object.assign(settings.christmasParty, christmasParty);
  }

  if (body.hero !== undefined) {
    if (typeof body.hero !== 'object' || body.hero === null) {
      throw createError('hero must be an object', 400);
    }

    const hero = body.hero as Record<string, unknown>;

    if (hero.headline !== undefined && typeof hero.headline !== 'string') {
      throw createError('hero.headline must be a string', 400);
    }

    if (hero.subheadline !== undefined && typeof hero.subheadline !== 'string') {
      throw createError('hero.subheadline must be a string', 400);
    }

    Object.assign(settings.hero, body.hero);
  }

  if (body.hours !== undefined) {
    if (!Array.isArray(body.hours)) {
      throw createError('hours must be an array', 400);
    }
    settings.hours = body.hours as ISiteSettings['hours'];
  }

  if (body.contact !== undefined) {
    if (typeof body.contact !== 'object' || body.contact === null) {
      throw createError('contact must be an object', 400);
    }
    Object.assign(settings.contact, body.contact);
  }

  if (body.tagline !== undefined) {
    if (typeof body.tagline !== 'string') {
      throw createError('tagline must be a string', 400);
    }
    settings.tagline = body.tagline;
  }

  if (body.about !== undefined) {
    if (typeof body.about !== 'string') {
      throw createError('about must be a string', 400);
    }
    settings.about = body.about;
  }

  if (body.instagram !== undefined) {
    if (typeof body.instagram !== 'object' || body.instagram === null) {
      throw createError('instagram must be an object', 400);
    }
    Object.assign(settings.instagram, body.instagram);
  }
}

function formatSubmission(doc: ISubmission | Record<string, unknown>) {
  const createdAt = doc.createdAt as Date | string;

  return {
    _id: doc._id,
    submitterName: doc.submitterName,
    caption: doc.caption,
    thumbnailUrl: doc.thumbnailUrl,
    consent: doc.consent,
    status: doc.status,
    when: new Date(createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

router.get(
  '/overview',
  asyncHandler(async (_req, res: Response) => {
    const now = new Date();
    const settings = await getSettingsDocument();

    const [pendingSubmissions, upcomingEvents] = await Promise.all([
      Submission.countDocuments({ status: 'pending' }),
      Event.countDocuments(getActiveEventsFilter(now)),
    ]);

    res.json({
      data: {
        pendingSubmissions,
        upcomingEvents,
        announcement: {
          enabled: settings.announcement.enabled,
          message: settings.announcement.message,
        },
        christmas: {
          enabled: settings.christmasParty.enabled,
          daysUntil: getDaysUntil(settings.christmasParty.date),
        },
      },
    });
  })
);

router.get(
  '/submissions',
  asyncHandler(async (req, res: Response) => {
    const status = (req.query.status as string) || 'pending';

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw createError('Invalid status filter', 400);
    }

    const submissions = await Submission.find({ status })
      .sort({ createdAt: -1 })
      .select('_id submitterName caption thumbnailUrl consent status createdAt')
      .lean();

    res.json({
      data: submissions.map((doc) => formatSubmission(doc)),
      meta: { count: submissions.length },
    });
  })
);

router.patch(
  '/submissions/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid submission id', 400);
    }

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      throw createError('Invalid status', 400);
    }

    const submission = await Submission.findById(id);

    if (!submission) {
      throw createError('Submission not found', 404);
    }

    const auth0Sub = extractAuth0Sub(req);
    let reviewedBy;

    if (auth0Sub) {
      const user = await User.findOne({ auth0Sub });
      if (user) {
        reviewedBy = user._id;
      }
    }

    if (status === 'approved' && submission.status !== 'approved') {
      if (submission.cloudinaryFolder === 'pending') {
        const moved = await moveToGallery(submission.cloudinaryPublicId);
        submission.imageUrl = moved.imageUrl;
        submission.thumbnailUrl = moved.thumbnailUrl;
        submission.cloudinaryPublicId = moved.cloudinaryPublicId;
        submission.cloudinaryFolder = 'gallery';
      }
    }

    submission.status = status as ISubmission['status'];

    if (status === 'approved' || status === 'rejected') {
      submission.review = {
        reviewedBy,
        reviewedAt: new Date(),
      };
    }

    if (status === 'pending') {
      submission.review = undefined;
    }

    await submission.save();

    res.json({ data: formatSubmission(submission.toObject()) });
  })
);

router.delete(
  '/submissions/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid submission id', 400);
    }

    const submission = await Submission.findById(id);

    if (!submission) {
      throw createError('Submission not found', 404);
    }

    await destroyImage(submission.cloudinaryPublicId);
    await submission.deleteOne();

    res.json({ data: { id } });
  })
);

router.get(
  '/events',
  asyncHandler(async (_req, res: Response) => {
    const events = await Event.find().lean();
    res.json({ data: sortEventsForDisplay(events) });
  })
);

router.post(
  '/events',
  asyncHandler(async (req, res: Response) => {
    const { type, title, description, timeLabel, scheduleType, date, dayOfWeek, startDate, endDate } =
      req.body as {
        type?: EventType;
        title?: string;
        description?: string;
        timeLabel?: string;
        scheduleType?: string;
        date?: string;
        dayOfWeek?: number;
        startDate?: string;
        endDate?: string;
      };

    if (!type || !title?.trim()) {
      throw createError('type and title are required', 400);
    }

    if (!EVENT_TYPES.includes(type)) {
      throw createError('Invalid event type', 400);
    }

    let schedule;

    try {
      schedule = parseEventScheduleInput({
        scheduleType,
        date,
        dayOfWeek,
        startDate,
        endDate,
      });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid schedule', 400);
    }

    const auth0Sub = extractAuth0Sub(req);
    let createdBy;

    if (auth0Sub) {
      const user = await User.findOne({ auth0Sub });
      if (user) {
        createdBy = user._id;
      }
    }

    const event = await Event.create({
      type,
      scheduleType: schedule.scheduleType,
      title: title.trim(),
      description: description?.trim() ?? '',
      date: schedule.date,
      dayOfWeek: schedule.dayOfWeek,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timeLabel: timeLabel?.trim() ?? 'TBD',
      createdBy,
    });

    res.status(201).json({ data: event.toObject() });
  })
);

router.patch(
  '/events/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid event id', 400);
    }

    const body = req.body as Record<string, unknown>;

    if (body.type !== undefined && !EVENT_TYPES.includes(body.type as EventType)) {
      throw createError('Invalid event type', 400);
    }

    let fields;

    try {
      fields = buildEventFieldsFromBody(body);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid event data', 400);
    }

    if (Object.keys(fields.set).length === 0 && fields.unset.length === 0) {
      throw createError('No valid fields to update', 400);
    }

    const event = await Event.findByIdAndUpdate(id, toMongoUpdatePayload(fields), {
      new: true,
      runValidators: true,
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    res.json({ data: event.toObject() });
  })
);

router.delete(
  '/events/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid event id', 400);
    }

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      throw createError('Event not found', 404);
    }

    res.json({ data: { id } });
  })
);

router.get(
  '/site',
  asyncHandler(async (_req, res: Response) => {
    const settings = await getSettingsDocument();
    res.json({ data: settings.toObject() });
  })
);

router.put(
  '/site',
  asyncHandler(async (req, res: Response) => {
    const settings = await getSettingsDocument();
    mergeSiteSettings(settings, req.body);
    await settings.save();
    res.json({ data: settings.toObject() });
  })
);

router.post(
  '/media/hero',
  (req, res, next) => {
    heroVideoUpload(req, res, (err: unknown) => {
      if (err instanceof Error) {
        next(createError(err.message, 400));
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res: Response) => {
    if (!req.file) {
      throw createError('No video file provided', 400);
    }

    if (!process.env.CLOUDINARY_URL) {
      throw createError('Cloudinary is not configured', 500);
    }

    const videoUrl = await uploadHeroVideo(req.file.buffer);
    const settings = await getSettingsDocument();
    settings.hero.videoUrl = videoUrl;
    await settings.save();

    res.json({ data: { videoUrl } });
  })
);

function toAdminTicket(order: ITicketOrder) {
  return {
    _id: String(order._id),
    payerName: order.payerName,
    payerEmail: order.payerEmail,
    quantity: order.quantity,
    amountCents: order.amountCents,
    paidAt: (order.paidAt ?? order.updatedAt).toISOString(),
    reference: order.captureId || order.paypalOrderId,
  };
}

router.get(
  '/tickets',
  asyncHandler(async (_req, res: Response) => {
    const [orders, summary] = await Promise.all([
      TicketOrder.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(200),
      TicketOrder.aggregate<{ tickets: number; orders: number }>([
        { $match: { status: 'paid' } },
        { $group: { _id: null, tickets: { $sum: '$quantity' }, orders: { $sum: 1 } } },
      ]),
    ]);

    const totals = summary[0] ?? { tickets: 0, orders: 0 };

    res.json({
      data: {
        orders: orders.map(toAdminTicket),
        ticketsSold: totals.tickets,
        orderCount: totals.orders,
      },
    });
  })
);

export default router;
