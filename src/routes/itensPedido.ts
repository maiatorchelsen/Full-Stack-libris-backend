import { prisma } from "../../lib/prisma"

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get("/", authMiddleware, async (req, res) => {
   /*
#swagger.tags = ['Itens de Pedido']
#swagger.summary = 'Lista todos os itens de pedido'
#swagger.description = 'Retorna uma lista com todos os itens de pedido cadastrados.'
#swagger.responses[200] = {
description: 'Itens de pedido listados com sucesso.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  try {
    const itens = await prisma.itemPedido.findMany({
      where: {
        pedido: { clienteId: req.clienteLogadoId },
      },
      include: {
        pedido: { select: { id: true, dataPedido: true, status: true, valorTotal: true } },
        livro: { select: { id: true, titulo: true, capa: true, autor: true } },
      },
    })
    res.status(200).json(itens)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", authMiddleware, async (req, res) => {
   /*
#swagger.tags = ['Itens de Pedido']
#swagger.summary = 'Retorna um item de pedido específico'
#swagger.description = 'Retorna os detalhes de um item de pedido com base no ID fornecido.'
#swagger.parameters['id'] = {
in: 'path',
required: true,
schema: {
type: 'integer'
}
}
#swagger.responses[200] = {
description: 'Item de pedido retornado com sucesso.'
}
#swagger.responses[404] = {
description: 'Item de pedido não encontrado.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
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

export default router
