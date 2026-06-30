import * as service from "../services/order_service"
import { Request, Response } from "express"

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.findAllOrders()
        res.status(200).json(httpResponse)
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.findOrderById(req.params.id as string)
        if (httpResponse == null){ 
            res.status(404).json({error: "Not found" })
        }else{
            res.status(200).json(httpResponse)
        }
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}
export const createOrder = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.createOrder(req.body)
        res.status(201).json(httpResponse)
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}
export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const httpResponse = await service.deleteOrder(req.params.id as string)
        res.status(200).json(httpResponse)
    } catch (error) {
        res.status(500).json({ error: "Erro interno" })
    }
}