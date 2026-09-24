import { prisma } from "../../lib/prisma"

import { Router } from 'express'

const router = Router()

router.get("/", async (req, res) => {
  /*
#swagger.tags = ['Livros']
#swagger.summary = 'Lista todos os livros'
#swagger.description = 'Retorna uma lista com todos os livros cadastrados.'
#swagger.responses[200] = {
description: 'Lista de livros retornada com sucesso.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
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
  /*
#swagger.tags = ['Livros']
#swagger.summary = 'Retorna um livro específico'
#swagger.description = 'Retorna os detalhes de um livro com base no ID fornecido.'
#swagger.parameters['id'] = {
in: 'path',
required: true,
schema: {
type: 'integer'
}
}
#swagger.responses[200] = {
description: 'Livro retornado com sucesso.'  
}
#swagger.responses[404] = {
description: 'Livro não encontrado.'
}
*/
  const { id } = req.params

  try {
    const livro = await prisma.livro.findFirst({
      where: { id: Number(id) },
      include: {
        avaliacoes: true,
      }
    })

    if (!livro) {
      res.status(404).json({ erro: 'Livro não encontrado' })
      return
    }

    res.status(200).json(livro)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/pesquisa/:termo", async (req, res) => {
  /*
#swagger.tags = ['Livros - Pesquisa']
#swagger.summary = 'Retorna um livro específico por termo de pesquisa'
#swagger.description = 'Retorna os detalhes de um livro com base no termo de pesquisa fornecido.'
#swagger.parameters['termo'] = {
in: 'path',
required: true,
schema: {
type: 'string'
}
}
#swagger.responses[200] = {
description: 'Lista de livros encontrada com sucesso.'
}
*/
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
