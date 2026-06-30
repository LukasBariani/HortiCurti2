import * as service from '../services/aiParse_service';
import { Request, Response } from 'express';

export const getRawMessage = async (req: Request, res: Response) => {
  try {
    const { rawMessage } = req.body;
    if (rawMessage == null || rawMessage == '') {
      return res.status(400).json({ error: 'rawMessage é obrigatório' });
    }
    const httpResponse = await service.parseMessage(rawMessage);
    res.status(200).json(httpResponse);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};
