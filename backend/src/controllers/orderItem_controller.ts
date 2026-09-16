import { Request, Response } from 'express';
import { updatePricing } from '../services/orderItem_service';
import { OrderError } from '../services/order_service';

export const putPricing = async (req: Request, res: Response) => {
  try {
    const result = await updatePricing(String(req.params.id), Number(req.body.costPrice), Number(req.body.margin));
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dados inválidos.';
    res.status(error instanceof OrderError ? error.statusCode : message.includes('inválid') ? 400 : 500).json({ error: message });
  }
};
