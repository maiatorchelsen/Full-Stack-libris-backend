import { prisma } from "../../lib/prisma"

import { Router } from 'express'
import { z } from 'zod'
import { adminMiddleware } from '../middleware/auth'

const router = Router()

const livroSchema = z.object({
  titulo: z.string().min(2,
    { message: "Título deve possuir, no mínimo, 2 caracteres" }),
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

router.get("/", async (req, res) => {
  try {
    const livros = await prisma.livro.findMany({
      include: {
        avaliacoes: true,
      }
    })
    res.status(200).json(livros)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const livro = await prisma.livro.findFirst({
      where: { id: Number(id) },
      include: {
        avaliacoes: true,
      }
    })
    res.status(200).json(livro)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", adminMiddleware, async (req, res) => {

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
    res.status(400).json({ error })
  }
})

router.delete("/:id", adminMiddleware, async (req, res) => {
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

router.put("/:id", adminMiddleware, async (req, res) => {
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
    res.status(400).json({ error })
  }
})

router.get("/pesquisa/:termo", async (req, res) => {
  const { termo } = req.params

  const termoNumero = Number(termo)

  if (isNaN(termoNumero)) {
    try {
      const livros = await prisma.livro.findMany({
        include: {
          avaliacoes: true,
        },
        where: {
          OR: [
            { titulo: { contains: termo, mode: "insensitive" } },
            { autor: { contains: termo, mode: "insensitive" } },
            { isbn: { contains: termo, mode: "insensitive" } },
            { editora: { contains: termo, mode: "insensitive" } },
            { categoria: { contains: termo, mode: "insensitive" } }
          ]
        }
      })
      res.status(200).json(livros)
    } catch (error) {
      res.status(500).json({ erro: error })
    }
  } else {
    if (termoNumero <= 3000) {
      try {
        const livros = await prisma.livro.findMany({
          include: {
            avaliacoes: true,
          },
          where: { anoPublicacao: termoNumero }
        })
        res.status(200).json(livros)
      } catch (error) {
        res.status(500).json({ erro: error })
      }
    } else {
      try {
        const livros = await prisma.livro.findMany({
          include: {
            avaliacoes: true,
          },
          where: { preco: { lte: termoNumero } }
        })
        res.status(200).json(livros)
      } catch (error) {
        res.status(500).json({ erro: error })
      }
    }
  }
})

export default router
