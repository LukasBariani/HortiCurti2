import * as service from '../services/order_service';
import { Request, Response } from 'express';
import { DeliveryDateError } from '../lib/delivery_date';

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.findAllOrders();
    res.status(200).json(httpResponse);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.findOrderById(req.params.id as string);
    if (httpResponse == null) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.status(200).json(httpResponse);
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
};
export const createOrder = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.createOrder(req.body);
    res.status(201).json(httpResponse);
  } catch (error) {
    if (error instanceof DeliveryDateError || error instanceof service.OrderError) {
      res.status(error instanceof service.OrderError ? error.statusCode : 400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  }
};

export const getOrdersByDeliveryDate = async (req: Request, res: Response) => {
  try {
    res.status(200).json(await service.getOrdersByDeliveryDate(req.query.date));
  } catch (error) {
    res.status(error instanceof DeliveryDateError ? 400 : 500).json({
      error: error instanceof DeliveryDateError ? error.message : 'Erro ao buscar entregas',
    });
  }
};
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.deleteOrder(req.params.id as string, req.body?.version);
    res.status(200).json(httpResponse);
  } catch (error) {
    res.status(error instanceof service.OrderError ? error.statusCode : 500).json({ error: error instanceof service.OrderError ? error.message : 'Erro interno' });
  }
};

export const patchStatus = async (req: Request, res: Response) => {
  try { res.json(await service.changeOrderStatus(String(req.params.id), req.body?.status, req.body?.version)); }
  catch (error) { res.status(error instanceof service.OrderError ? error.statusCode : 500).json({ error: error instanceof service.OrderError ? error.message : 'Erro interno' }); }
};
export const deliverOrder = async (req: Request, res: Response) => {
  try { res.json(await service.deliverOrder(String(req.params.id), req.body)); }
  catch (error) { res.status(error instanceof service.OrderError ? error.statusCode : 500).json({ error: error instanceof service.OrderError ? error.message : 'Erro interno' }); }
};
export const patchOrder = async (req: Request, res: Response) => {
  try { res.json(await service.editOrder(String(req.params.id), req.body)); }
  catch (error) { res.status(error instanceof service.OrderError ? error.statusCode : error instanceof DeliveryDateError ? 400 : 500).json({ error: error instanceof Error ? error.message : 'Erro interno' }); }
};

export const getTodayOrders = async (req: Request, res: Response) => {
  try {
    const httpResponse = await service.getTodayOrders();
    return res.status(200).json(httpResponse);
  } catch (error) {
    return res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.message : 'unknown',
    });
  }
};
