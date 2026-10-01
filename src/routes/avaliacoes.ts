import { prisma } from "../../lib/prisma"

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const avaliacaoSchema = z.object({
  itemPedidoId: z.number().int().positive({ message: "itemPedidoId deve ser um inteiro positivo" }),
  nota: z.number().int().min(1, { message: "Nota deve ser de 1 a 5" }).max(5, { message: "Nota deve ser de 1 a 5" }),
  comentario: z.string().max(500, { message: "Comentário deve ter no máximo 500 caracteres" }).nullable().optional(),
})

const avaliacaoEdicaoSchema = z.object({
  nota: z.number().int().min(1, { message: "Nota deve ser de 1 a 5" }).max(5, { message: "Nota deve ser de 1 a 5" }),
  comentario: z.string().max(500, { message: "Comentário deve ter no máximo 500 caracteres" }).nullable().optional(),
})

function idDoCliente(req: Request, res: Response): string | null {
  if (!req.clienteLogadoId) {
    res.status(403).json({ erro: "Apenas clientes autenticados podem avaliar" })
    return null
  }
  return req.clienteLogadoId
}

router.post("/", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Avaliações']
#swagger.summary = 'Cria uma avaliação de um livro comprado'
#swagger.description = 'O cliente só pode avaliar um item de um pedido que seja dele e cujo status esteja como ENTREGUE. Cada item comprado pode ser avaliado apenas uma vez.'
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
content: {
"application/json": {
schema: {
type: "object",
required: ["itemPedidoId", "nota"],
properties: {
itemPedidoId: { type: "integer", example: 1 },
nota: { type: "integer", minimum: 1, maximum: 5, example: 5 },
comentario: { type: "string", nullable: true, example: "Excelente leitura!" }
}
}
}
}
}
#swagger.responses[201] = {
description: 'Avaliação criada com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos ou pedido ainda não entregue.'
}
#swagger.responses[401] = {
description: 'Token não fornecido ou inválido.'
}
#swagger.responses[403] = {
description: 'Somente clientes autenticados podem avaliar.'
}
#swagger.responses[404] = {
description: 'Item do pedido não encontrado para este cliente.'
}
#swagger.responses[409] = {
description: 'Este item já foi avaliado.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  const clienteId = idDoCliente(req, res)
  if (!clienteId) return

  const valida = avaliacaoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { itemPedidoId, nota, comentario } = valida.data

  try {
    const item = await prisma.itemPedido.findFirst({
      where: { id: itemPedidoId, pedido: { clienteId } },
      include: { pedido: { select: { status: true } } },
    })

    if (!item) {
      res.status(404).json({ erro: "Item do pedido não encontrado" })
      return
    }

    if (item.pedido.status !== "ENTREGUE") {
      res.status(400).json({ erro: "Só é possível avaliar após o pedido ser entregue" })
      return
    }

    const jaAvaliou = await prisma.avaliacao.findFirst({
      where: { itemPedidoId, clienteId },
      select: { id: true },
    })

    if (jaAvaliou) {
      res.status(409).json({ erro: "Este item já foi avaliado" })
      return
    }

    const avaliacao = await prisma.avaliacao.create({
      data: {
        nota,
        comentario: comentario ?? null,
        livroId: item.livroId,
        clienteId,
        itemPedidoId,
      },
      include: { livro: { select: { id: true, titulo: true, autor: true, capa: true } } },
    })

    res.status(201).json(avaliacao)
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ erro: "Este item já foi avaliado" })
      return
    }
    res.status(500).json({ erro: error?.message || "Erro ao criar avaliação" })
  }
})

router.put("/:id", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Avaliações']
#swagger.summary = 'Atualiza a avaliação do cliente'
#swagger.description = 'Permite editar a nota e o comentário de uma avaliação que pertence ao cliente autenticado.'
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
#swagger.parameters['id'] = {
in: 'path',
required: true,
schema: {
type: 'integer'
}
}
#swagger.requestBody = {
required: true,
content: {
"application/json": {
schema: {
type: "object",
required: ["nota"],
properties: {
nota: { type: "integer", minimum: 1, maximum: 5, example: 4 },
comentario: { type: "string", nullable: true, example: "Bom, mas o final é lento." }
}
}
}
}
}
#swagger.responses[200] = {
description: 'Avaliação atualizada com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
#swagger.responses[401] = {
description: 'Token não fornecido ou inválido.'
}
#swagger.responses[403] = {
description: 'Somente clientes autenticados podem avaliar.'
}
#swagger.responses[404] = {
description: 'Avaliação não encontrada para este cliente.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  const clienteId = idDoCliente(req, res)
  if (!clienteId) return

  const { id } = req.params

  const valida = avaliacaoEdicaoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nota, comentario } = valida.data

  try {
    const existente = await prisma.avaliacao.findFirst({
      where: { id: Number(id), clienteId },
      select: { id: true },
    })

    if (!existente) {
      res.status(404).json({ erro: "Avaliação não encontrada" })
      return
    }

    const avaliacao = await prisma.avaliacao.update({
      where: { id: Number(id) },
      data: { nota, comentario: comentario ?? null },
      include: { livro: { select: { id: true, titulo: true, autor: true, capa: true } } },
    })

    res.status(200).json(avaliacao)
  } catch (error: any) {
    res.status(500).json({ erro: error?.message || "Erro ao atualizar avaliação" })
  }
})

router.delete("/:id", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Avaliações']
#swagger.summary = 'Exclui a avaliação do cliente'
#swagger.description = 'Remove uma avaliação que pertence ao cliente autenticado.'
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
#swagger.parameters['id'] = {
in: 'path',
required: true,
schema: {
type: 'integer'
}
}
#swagger.responses[200] = {
description: 'Avaliação excluída com sucesso.'
}
#swagger.responses[401] = {
description: 'Token não fornecido ou inválido.'
}
#swagger.responses[403] = {
description: 'Somente clientes autenticados podem avaliar.'
}
#swagger.responses[404] = {
description: 'Avaliação não encontrada para este cliente.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  const clienteId = idDoCliente(req, res)
  if (!clienteId) return

  const { id } = req.params

  try {
    const deletadas = await prisma.avaliacao.deleteMany({
      where: { id: Number(id), clienteId },
    })

    if (deletadas.count === 0) {
      res.status(404).json({ erro: "Avaliação não encontrada" })
      return
    }

    res.status(200).json({ mensagem: "Avaliação excluída com sucesso" })
  } catch (error: any) {
    res.status(500).json({ erro: error?.message || "Erro ao excluir avaliação" })
  }
})

router.get("/minhas", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Avaliações']
#swagger.summary = 'Lista as avaliações do cliente autenticado'
#swagger.description = 'Retorna todas as avaliações feitas pelo cliente, com os dados do livro e do pedido.'
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
description: 'Avaliações listadas com sucesso.'
}
#swagger.responses[401] = {
description: 'Token não fornecido ou inválido.'
}
#swagger.responses[403] = {
description: 'Somente clientes autenticados.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  const clienteId = idDoCliente(req, res)
  if (!clienteId) return

  try {
    const avaliacoes = await prisma.avaliacao.findMany({
      where: { clienteId },
      orderBy: { criadoEm: "desc" },
      include: {
        livro: { select: { id: true, titulo: true, autor: true, capa: true } },
        itemPedido: {
          select: { id: true, pedido: { select: { id: true, status: true, dataPedido: true } } },
        },
      },
    })

    res.status(200).json(avaliacoes)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/livro/:livroId", async (req, res) => {
  /*
#swagger.tags = ['Avaliações']
#swagger.summary = 'Lista as avaliações de um livro'
#swagger.description = 'Retorna as avaliações públicas de um livro, com o nome do cliente, a nota média e o total de avaliações.'
#swagger.parameters['livroId'] = {
in: 'path',
required: true,
schema: {
type: 'integer'
}
}
#swagger.responses[200] = {
description: 'Avaliações do livro retornadas com sucesso.'
}
#swagger.responses[404] = {
description: 'Livro não encontrado.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  const { livroId } = req.params

  try {
    const livro = await prisma.livro.findUnique({
      where: { id: Number(livroId) },
      select: { id: true },
    })

    if (!livro) {
      res.status(404).json({ erro: "Livro não encontrado" })
      return
    }

    const avaliacoes = await prisma.avaliacao.findMany({
      where: { livroId: Number(livroId) },
      orderBy: { criadoEm: "desc" },
      include: { cliente: { select: { nome: true } } },
    })

    const total = avaliacoes.length
    const soma = avaliacoes.reduce((acc, a) => acc + a.nota, 0)

    res.status(200).json({
      livroId: Number(livroId),
      notaMedia: total > 0 ? Math.round((soma / total) * 10) / 10 : null,
      totalAvaliacoes: total,
      avaliacoes,
    })
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

export default router
