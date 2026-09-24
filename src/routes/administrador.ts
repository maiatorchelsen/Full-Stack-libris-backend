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
  /*
#swagger.tags = ['Pedidos Admin']
#swagger.summary = 'Consulta todos os pedidos'
#swagger.description = 'Consulta todos os pedidos registrados.'
#swagger.responses[201] = {
description: 'Pedidos consultados com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
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
  /*
#swagger.tags = ['Pedidos Admin']
#swagger.summary = 'Consulta um pedido'
#swagger.description = 'Consulta os dados de um pedido.'
#swagger.parameters['id'] = {
in: 'path',
required: true,
schema: {
type: 'string'
}
}
#swagger.parameters['body'] = {
in: 'body',
required: true,
schema: {
id: 1
}
}
#swagger.responses[201] = {
description: 'Pedido consultado com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
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
  /*
#swagger.tags = ['Pedidos Admin']
#swagger.summary = 'Envia um pedido'
#swagger.description = 'Envia um pedido para o cliente.'
#swagger.parameters['id'] = {
in: 'path',
required: true,
schema: {
type: 'string'
}
}
#swagger.parameters['body'] = {
in: 'body',
required: true,
schema: {
id: 1
}
}
#swagger.responses[201] = {
description: 'Pedido enviado com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
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
  /*
#swagger.tags = ['Pedidos Admin']
#swagger.summary = 'Exclui um pedido'
#swagger.description = 'Exclui um pedido existente.'
#swagger.parameters['id'] = {
in: 'path',
required: true,
schema: {
type: 'string'
}
}
#swagger.parameters['body'] = {
in: 'body',
required: true,
schema: {
id: 1
}
}
#swagger.responses[200] = {
description: 'Pedido excluído com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
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
  /*
#swagger.tags = ['Livros Admin']
#swagger.summary = 'Cadastra um livro'
#swagger.description = 'Realiza o cadastro de um novo livro.'
#swagger.parameters['body'] = {
in: 'body',
required: true,
schema: {
titulo: 'O Senhor dos Anéis',
isbn: '978-0-345-33968-9',
preco: 29.99,
autor: 'J.R.R. Tolkien',
editora: 'HarperCollins',
categoria: 'Fantasia',
capa: 'https://example.com/capa.jpg',
descricao: 'Um clássico da literatura fantástica.',
anoPublicacao: 1954,
estoque: 10,
adminId: 1
}
}
#swagger.responses[201] = {
description: 'Livro cadastrado com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
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
  /*
#swagger.tags = ['Livros Admin']
#swagger.summary = 'Exclui um livro'
#swagger.description = 'Realiza a exclusão de um livro existente.'
#swagger.parameters['body'] = {
in: 'body',
required: true,
schema: {
id: 1
}
}
#swagger.responses[200] = {
description: 'Livro excluído com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/

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
  /*
#swagger.tags = ['Livros Admin']
#swagger.summary = 'Atualiza um livro'
#swagger.description = 'Realiza a atualização de um livro existente.'
#swagger.parameters['body'] = {
in: 'body',
required: true,
schema: {
titulo: 'O Senhor dos Anéis',
isbn: '978-0-345-33968-9',
preco: 29.99,
autor: 'J.R.R. Tolkien',
editora: 'HarperCollins',
categoria: 'Fantasia',
capa: 'https://example.com/capa.jpg',
descricao: 'Um clássico da literatura fantástica.',
anoPublicacao: 1954,
estoque: 10,
adminId: 1
}
}
#swagger.responses[201] = {
description: 'Livro atualizado com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
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
