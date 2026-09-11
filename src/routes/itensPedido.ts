import { prisma } from "../../lib/prisma"

import { Router } from 'express'
import { z } from 'zod'
import { adminMiddleware, authMiddleware } from '../middleware/auth'

const router = Router()

const itemPedidoSchema = z.object({
  quantidade: z.number().int().positive(),
  precoUnitario: z.number().positive(),
  pedidoId: z.number(),
  livroId: z.number(),
})

router.get("/", authMiddleware, async (req, res) => {
  try {
    const itens = await prisma.itemPedido.findMany({
      where: {
        pedido: { clienteId: req.clienteLogadoId },
      },
      include: {
        pedido: { select: { id: true, dataPedido: true, status: true } },
        livro: { select: { id: true, titulo: true, capa: true, autor: true } },
      },
    })
    res.status(200).json(itens)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    const item = await prisma.itemPedido.findFirst({
      where: {
        id: Number(id),
        pedido: { clienteId: req.clienteLogadoId },
      },
      include: {
        pedido: { select: { id: true, dataPedido: true, status: true, valorTotal: true } },
        livro: { select: { id: true, titulo: true, capa: true, autor: true, preco: true } },
      },
    })

    if (!item) {
      res.status(404).json({ erro: "Item não encontrado" })
      return
    }

    res.status(200).json(item)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", adminMiddleware, async (req, res) => {
  const valida = itemPedidoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { quantidade, precoUnitario, pedidoId, livroId } = valida.data

  try {
    const item = await prisma.itemPedido.create({
      data: { quantidade, precoUnitario, pedidoId, livroId },
    })
    res.status(201).json(item)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params
  const valida = itemPedidoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { quantidade, precoUnitario, pedidoId, livroId } = valida.data

  try {
    const item = await prisma.itemPedido.update({
      where: { id: Number(id) },
      data: { quantidade, precoUnitario, pedidoId, livroId },
    })
    res.status(200).json(item)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    const item = await prisma.itemPedido.delete({
      where: { id: Number(id) },
    })
    res.status(200).json(item)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
