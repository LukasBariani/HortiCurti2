import { Request, Response } from 'express';
import { getSalesSummary } from '../services/dashboard_service';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days ?? 30);
    if (!Number.isFinite(days)) return res.status(400).json({ error: 'days deve ser um número.' });
    return res.status(200).json(await getSalesSummary(days));
  } catch (error) {
    console.error('Erro ao montar resumo:', error);
    return res.status(500).json({ error: 'Não foi possível carregar o resumo.' });
  }
};
