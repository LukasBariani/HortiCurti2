import * as service from "../services/client_service"
import { Request, Response } from "express"

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
        res.status(500).json({ error: "Erro interno" })
    }
}
export const deleteClient = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.deleteClient(req.params.id as string)
        res.status(200).json(httpResponse)
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}