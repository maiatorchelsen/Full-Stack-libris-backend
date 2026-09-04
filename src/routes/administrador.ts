import { prisma } from "../../lib/prisma"

import { Router } from 'express'
import { z } from 'zod'
import { adminMiddleware } from '../middleware/auth'

const router = Router()

// Todas as rotas exigem autenticação de admin
router.use(adminMiddleware)

// ==================== PEDIDOS ====================

// Visualizar todos os pedidos
router.get("/pedidos", async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: {
        cliente: { select: { id: true, nome: true, email: true, tel: true, rua: true, numero: true, bairro: true, cidade: true, cep: true } },
        admin: { select: { id: true, nome: true } },
        itens: {
          include: {
            livro: { select: { id: true, titulo: true, capa: true, preco: true } },
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

// Visualizar pedido por ID
router.get("/pedidos/:id", async (req, res) => {
  const { id } = req.params

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: Number(id) },
      include: {
        cliente: { select: { id: true, nome: true, email: true, tel: true, rua: true, numero: true, bairro: true, cidade: true, cep: true } },
        admin: { select: { id: true, nome: true } },
        itens: {
          include: {
            livro: { select: { id: true, titulo: true, capa: true, preco: true, autor: true } },
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

// Enviar pedido para o cliente (status -> ENVIADO)
router.put("/pedidos/:id/enviar", async (req, res) => {
  const { id } = req.params

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: Number(id) },
    })

    if (!pedido) {
      res.status(404).json({ erro: "Pedido não encontrado" })
      return
    }

    if (pedido.status === "ENTREGUE") {
      res.status(400).json({ erro: "Pedido já foi entregue" })
      return
    }

    if (pedido.status === "CANCELADO") {
      res.status(400).json({ erro: "Pedido cancelado não pode ser enviado" })
      return
    }

    const atualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { status: "ENVIADO" },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        itens: true,
      },
    })

    res.status(200).json({ mensagem: "Pedido enviado com sucesso", pedido: atualizado })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Excluir pedido
router.delete("/pedidos/:id", async (req, res) => {
  const { id } = req.params

  try {
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

// ==================== LIVROS ====================

const livroSchema = z.object({
  titulo: z.string().min(2, { message: "Título deve possuir, no mínimo, 2 caracteres" }),
  isbn: z.string().min(10, { message: "ISBN deve possuir, no mínimo, 10 caracteres" }).optional().or(z.literal('')),
  preco: z.number(),
  autor: z.string().min(2, { message: "Autor deve possuir, no mínimo, 2 caracteres" }),
  editora: z.string().min(2, { message: "Editora deve possuir, no mínimo, 2 caracteres" }),
  categoria: z.string().min(2, { message: "Categoria deve possuir, no mínimo, 2 caracteres" }),
  capa: z.string().optional().or(z.literal('')),
  descricao: z.string().nullable().optional(),
  anoPublicacao: z.number().nullable().optional(),
  estoque: z.number().int().default(0),
  adminId: z.number(),
})

// Incluir livro
router.post("/livros", async (req, res) => {
  const valida = livroSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { titulo, isbn = null, preco, autor, editora, categoria,
    capa = null, descricao = null, anoPublicacao = null, estoque = 0, adminId } = valida.data

  try {
    const livro = await prisma.livro.create({
      data: {
        titulo, isbn, preco, autor, editora, categoria,
        capa, descricao, anoPublicacao, estoque, adminId
      }
    })
    res.status(201).json(livro)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Excluir livro
router.delete("/livros/:id", async (req, res) => {
  const { id } = req.params

  try {
    const livro = await prisma.livro.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(livro)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

// Atualizar livro
router.put("/livros/:id", async (req, res) => {
  const { id } = req.params

  const valida = livroSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { titulo, isbn, preco, autor, editora, categoria,
    capa, descricao, anoPublicacao, estoque, adminId } = valida.data

  try {
    const livro = await prisma.livro.update({
      where: { id: Number(id) },
      data: {
        titulo, isbn, preco, autor, editora, categoria,
        capa, descricao, anoPublicacao, estoque, adminId
      }
    })
    res.status(200).json(livro)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
