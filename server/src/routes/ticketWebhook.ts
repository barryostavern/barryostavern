import { Router, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { handlePayPalWebhook } from '../services/ticketCheckout';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res: Response) => {
    if (!Buffer.isBuffer(req.body)) {
      throw createError('Invalid PayPal webhook payload', 400);
    }

    await handlePayPalWebhook(req.body, req.headers);
    res.json({ data: { received: true } });
  })
);

export default router;
