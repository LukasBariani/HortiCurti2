import * as service from "../services/client_service"
import { Request, Response } from "express"
import { findOrdersByClientId } from '../services/order_service';

export const getAllClients = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.findAllClients()
        res.status(200).json(httpResponse)
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}
export const getClientById = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.findCLientById(req.params.id as string)
        if (httpResponse == null){ 
            res.status(404).json({error: "Not found" })
        }else{
            res.status(200).json(httpResponse)
        }
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}
export const createClient = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.createClient(req.body)
        res.status(201).json(httpResponse)
    } catch (error) {
        if (error instanceof service.ClientInputError) { res.status(400).json({ error: error.message }); return; }
        if ((error as { code?: string }).code === 'P2002') { res.status(409).json({ error: 'Esse WhatsApp já está cadastrado em outro cliente.' }); return; }
        res.status(500).json({ error: "Erro interno" })
    }
}
export const updateClient = async (req: Request, res: Response) => {
    try { res.json(await service.updateClient(String(req.params.id), req.body)); }
    catch (error) {
        if (error instanceof service.ClientInputError) { res.status(400).json({ error: error.message }); return; }
        const code = (error as { code?: string }).code;
        if (code === 'P2002') { res.status(409).json({ error: 'Esse WhatsApp já está cadastrado em outro cliente.' }); return; }
        if (code === 'P2025') { res.status(404).json({ error: 'Cliente não encontrado.' }); return; }
        res.status(500).json({ error: 'Não foi possível salvar o cliente.' });
    }
};
export const updateClientMarkup = async (req: Request, res: Response) => {
    try {
        res.status(200).json(await service.updateClientMarkup(String(req.params.id), req.body?.defaultMarkupPercent));
    } catch (error) {
        if (error instanceof service.ClientInputError) { res.status(400).json({ error: error.message }); return; }
        if ((error as { code?: string }).code === 'P2025') { res.status(404).json({ error: 'Cliente não encontrado.' }); return; }
        res.status(500).json({ error: 'Não foi possível salvar o acréscimo.' });
    }
};
export const deleteClient = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.deleteClient(req.params.id as string)
        res.status(200).json(httpResponse)
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}
export const getClientOrders = async (req: Request, res: Response) => {
    try {
        res.status(200).json(await findOrdersByClientId(req.params.id as string))
    } catch {
        res.status(500).json({ error: "Erro interno" })
    }
}
