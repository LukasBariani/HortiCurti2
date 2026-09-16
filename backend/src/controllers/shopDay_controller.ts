import * as service from '../services/shopDay_service';
import { Request, Response } from 'express';
import { DeliveryDateError } from '../lib/delivery_date';

export const getConsolidatedByDeliveryDate = async (req: Request, res: Response) => {
  try {
    res.status(200).json(await service.getConsolidatedByDeliveryDate(req.query.date));
  } catch (error) {
    res.status(error instanceof DeliveryDateError ? 400 : 500).json({
      error: error instanceof DeliveryDateError ? error.message : 'Erro ao buscar lista de entregas',
    });
  }
};

export const getAllShopDay = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.findAllShopDay();
    res.status(200).json(httpResponse);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};
export const getShopDayById = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.findShopDayById(req.params.id as string);
    if (httpResponse == null) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.status(200).json(httpResponse);
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};
export const createShopDay = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.createShopDay(req.body);
    res.status(201).json(httpResponse);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};
export const deleteShopDay = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.deleteShopDay(req.params.id as string);
    res.status(200).json(httpResponse);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};
export const getTodayConsolidatedList = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.getTodayConsolidatedList();
    res.status(200).json(httpResponse);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Erro interno no shopDay_controller',
    });
  }
};
