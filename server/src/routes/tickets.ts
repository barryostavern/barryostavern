import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ticketRateLimit } from '../middleware/rateLimit';
import {
  captureTicketOrder,
  createTicketOrder,
  getTicketConfirmation,
  parseTicketQuantity,
} from '../services/ticketCheckout';

const router = Router();

router.get(
  '/confirmation/:token',
  asyncHandler(async (req, res: Response) => {
    const confirmation = await getTicketConfirmation(req.params.token);
    res.json({ data: confirmation });
  })
);

router.post(
  '/orders',
  ticketRateLimit,
  asyncHandler(async (req, res: Response) => {
    const quantity = parseTicketQuantity(req.body?.quantity);
    const orderId = await createTicketOrder(quantity);
    res.status(201).json({ data: { orderId } });
  })
);

router.post(
  '/orders/:orderId/capture',
  ticketRateLimit,
  asyncHandler(async (req, res: Response) => {
    const confirmationToken = await captureTicketOrder(req.params.orderId);
    res.json({ data: { confirmationToken } });
  })
);

export default router;
