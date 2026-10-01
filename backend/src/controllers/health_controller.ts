import { Request, Response } from 'express';
import { getHealth } from '../services/health_service';

export async function health(_req: Request, res: Response) {
  try {
    res.status(200).json(await getHealth());
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
}
