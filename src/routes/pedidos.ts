import { prisma } from "../../lib/prisma"

import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const FRETE_GRATIS_LIMITE = 199
const FRETE_VALOR = 19.9

const itemPedidoSchema = z.object({
  livroId: z.number(),
  quantidade: z.number().int().positive(),
})

const pedidoSchema = z.object({
  clienteId: z.string(),
  adminId: z.number(),
  itens: z.array(itemPedidoSchema).min(1, { message: "Pedido deve ter pelo menos 1 item" }),
})

router.get("/", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Pedidos']
#swagger.summary = 'Lista os pedidos do cliente autenticado'
#swagger.description = 'Retorna apenas os pedidos do cliente autenticado.'
#swagger.security = [
  {
    "bearerAuth": []
  }
]
#swagger.parameters['authorization'] = {
in: 'header',
required: true,
description: 'Token de autenticação (Bearer)',
schema: {
type: 'string'
}
}
#swagger.responses[200] = {
description: 'Lista de pedidos retornada com sucesso.'
}
#swagger.responses[401] = {
description: 'Token não fornecido ou inválido.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { clienteId: req.clienteLogadoId },
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

router.get("/:id", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Pedidos']
#swagger.summary = 'Obtém um pedido pelo ID'
#swagger.description = 'Retorna os detalhes de um pedido específico com base no ID fornecido.'
#swagger.security = [
  {
    "bearerAuth": []
  }
]
#swagger.parameters['authorization'] = {
in: 'header',
required: true,
description: 'Token de autenticação (Bearer)',
schema: {
type: 'string'
}
}
in: 'path',
required: true,
schema: {
type: 'string'
}
#swagger.responses[200] = {
description: 'Pedido retornado com sucesso.'
}
#swagger.responses[401] = {
description: 'Token não fornecido ou inválido.'
}
#swagger.responses[404] = {
description: 'Pedido não encontrado.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  const { id } = req.params

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: Number(id), clienteId: req.clienteLogadoId },
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
    /*
#swagger.tags = ['Pedidos']
#swagger.summary = 'Cria um novo pedido'
#swagger.description = 'Permite a criação de um novo pedido no sistema.'
#swagger.security = [
  {
    "bearerAuth": []
  }
]
#swagger.parameters['authorization'] = {
in: 'header',
required: true,
description: 'Token de autenticação (Bearer)',
schema: {
type: 'string'
}
}
#swagger.requestBody = {
required: true,
schema: {
clienteId: 'string',
adminId: 1,
itens: [
{
livroId: 1,
quantidade: 2
}
]
}
}
#swagger.responses[200] = {
description: 'Pedido criado com sucesso.'
}
#swagger.responses[401] = {
description: 'Token não fornecido ou inválido.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
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

    // Calcula o valor total (subtotal + frete)
    let subtotal = 0
    const itensComPreco = itens.map(item => {
      const livro = livros.find(l => l.id === item.livroId)
      if (!livro) {
        throw new Error(`Livro com id ${item.livroId} não encontrado`)
      }
      if (livro.estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para o livro "${livro.titulo}"`)
      }
      const precoUnitario = Number(livro.preco)
      subtotal += precoUnitario * item.quantidade
      return { ...item, precoUnitario }
    })

    const frete = subtotal < FRETE_GRATIS_LIMITE ? FRETE_VALOR : 0
    const valorTotal = subtotal + frete

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

export default router
