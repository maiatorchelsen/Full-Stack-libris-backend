import { prisma } from "../../lib/prisma"
import { recomendarLivros, buscarAvaliacoesLivros } from "../../Services/iaServices"
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get("/:clienteId", authMiddleware, async (req, res) => {
  const { clienteId } = req.params as { clienteId: string }

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    })

    if (!cliente) {
      res.status(404).json({ erro: "Cliente nao encontrado" })
      return
    }

    const pedidos = await prisma.pedido.findMany({
      where: { clienteId },
      include: {
        itens: {
          include: {
            livro: true,
          }
        }
      }
    })

    const categoriasCompradas: string[] = []
    const autoresComprados: string[] = []

    for (const pedido of pedidos) {
      for (const item of pedido.itens) {
        const cat = item.livro.categoria
        if (!categoriasCompradas.includes(cat)) {
          categoriasCompradas.push(cat)
        }
        const autor = item.livro.autor
        if (!autoresComprados.includes(autor)) {
          autoresComprados.push(autor)
        }
      }
    }

    const livrosCompradosIds = new Set<number>()
    for (const pedido of pedidos) {
      for (const item of pedido.itens) {
        livrosCompradosIds.add(item.livroId)
      }
    }

    const livrosDisponiveis = await prisma.livro.findMany({
      where: {
        estoque: { gt: 0 },
      }
    })

    const livrosParaIA = livrosDisponiveis
      .filter(l => !livrosCompradosIds.has(l.id))
      .map(l => ({
        id: l.id,
        titulo: l.titulo,
        autor: l.autor,
        categoria: l.categoria,
        preco: Number(l.preco),
        anoPublicacao: l.anoPublicacao,
      }))

    if (livrosParaIA.length === 0) {
      res.status(200).json({
        mensagem: "Nao ha livros disponiveis para recomendacao no momento.",
        recomendacoes: []
      })
      return
    }

    const generosFavoritos = cliente.favoritos
      ? cliente.favoritos.split(",").map(g => g.trim()).filter(g => g.length > 0)
      : []

    let idsRecomendados: number[] = []
    try {
      idsRecomendados = await recomendarLivros(
        {
          generosFavoritos,
          categoriasCompradas,
          autoresComprados,
        },
        livrosParaIA
      )
    } catch (err) {
      console.error("Erro na IA de recomendacoes:", err)
    }

    if (idsRecomendados.length === 0) {
      res.status(200).json({
        cliente: cliente.nome,
        mensagem: "Nao foi possivel gerar recomendacoes no momento.",
        recomendacoes: []
      })
      return
    }

    const livrosRecomendados = await prisma.livro.findMany({
      where: {
        id: { in: idsRecomendados }
      }
    })

    let avaliacoes: { id: number; titulo: string; autor: string; avaliacao: string }[] = []
    try {
      const livrosParaAvaliacao = livrosRecomendados.map(l => ({
        id: l.id,
        titulo: l.titulo,
        autor: l.autor,
      }))
      avaliacoes = await buscarAvaliacoesLivros(livrosParaAvaliacao)
    } catch (err) {
      console.error("Erro ao buscar avaliacoes:", err)
    }

    const recomendacoesComAvaliacao = livrosRecomendados.map(livro => {
      const avaliacao = avaliacoes.find(a => a.id === livro.id)
      return {
        ...livro,
        avaliacao: avaliacao?.avaliacao ?? null,
      }
    })

    res.status(200).json({
      cliente: cliente.nome,
      perfil: {
        generosFavoritos,
        categoriasCompradas,
        autoresComprados,
      },
      recomendacoes: recomendacoesComAvaliacao,
    })
  } catch (error) {
    console.error("Erro no Oraculo:", error)
    res.status(500).json({ erro: "Erro ao gerar recomendacoes" })
  }
})

export default router
