import { prisma } from "../../lib/prisma"

import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = Router()

const itemPedidoSchema = z.object({
  livroId: z.number(),
  quantidade: z.number().int().positive(),
})

const pedidoSchema = z.object({
  clienteId: z.number(),
  adminId: z.number(),
  itens: z.array(itemPedidoSchema).min(1, { message: "Pedido deve ter pelo menos 1 item" }),
})

router.get("/", async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        admin: { select: { id: true, nome: true, email: true } },
        itens: {
          include: {
            livro: { select: { id: true, titulo: true, capa: true } },
          }
        },
      },
      orderBy: { dataPedido: "desc" },
    })
    res.status(200).json(pedidos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: Number(id) },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        admin: { select: { id: true, nome: true, email: true } },
        itens: {
          include: {
            livro: { select: { id: true, titulo: true, capa: true, preco: true } },
          }
        },
      },
    })

    if (!pedido) {
      res.status(404).json({ erro: "Pedido não encontrado" })
      return
    }

    res.status(200).json(pedido)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", authMiddleware, async (req, res) => {
  const valida = pedidoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { clienteId, adminId, itens } = valida.data

  try {
    // Busca os preços dos livros
    const livrosIds = itens.map(item => item.livroId)
    const livros = await prisma.livro.findMany({
      where: { id: { in: livrosIds } },
    })

    // Calcula o valor total
    let valorTotal = 0
    const itensComPreco = itens.map(item => {
      const livro = livros.find(l => l.id === item.livroId)
      if (!livro) {
        throw new Error(`Livro com id ${item.livroId} não encontrado`)
      }
      if (livro.estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para o livro "${livro.titulo}"`)
      }
      const precoUnitario = Number(livro.preco)
      valorTotal += precoUnitario * item.quantidade
      return { ...item, precoUnitario }
    })

    // Cria o pedido com os itens em uma transação
    const pedido = await prisma.$transaction(async (tx) => {
      
      const novoPedido = await tx.pedido.create({
        data: {
          clienteId,
          adminId,
          valorTotal,
          itens: {
            create: itensComPreco.map(item => ({
              livroId: item.livroId,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
            })),
          },
        },
        include: {
          itens: true,
        },
      })

      // Atualiza o estoque dos livros
      for (const item of itensComPreco) {
        await tx.livro.update({
          where: { id: item.livroId },
          data: { estoque: { decrement: item.quantidade } },
        })
      }

      return novoPedido
    })

    res.status(201).json(pedido)
  } catch (error: any) {
    res.status(400).json({ erro: error.message || "Erro ao criar pedido" })
  }
})

router.put("/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const statusValidos = ["PENDENTE", "PROCESSANDO", "ENVIADO", "ENTREGUE", "CANCELADO"]
  if (!status || !statusValidos.includes(status)) {
    res.status(400).json({ erro: `Status inválido. Valores aceitos: ${statusValidos.join(", ")}` })
    return
  }

  try {
    const pedido = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        itens: true,
      },
    })
    res.status(200).json(pedido)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    // Deleta os itens primeiro
    await prisma.itemPedido.deleteMany({
      where: { pedidoId: Number(id) },
    })

    const pedido = await prisma.pedido.delete({
      where: { id: Number(id) },
    })
    res.status(200).json(pedido)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
