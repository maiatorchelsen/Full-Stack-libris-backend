import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

interface LivroInfo {
  id: number
  titulo: string
  autor: string
  categoria: string
  preco: number
  anoPublicacao: number | null
}

interface ClienteGostos {
  generosFavoritos: string[]
  categoriasCompradas: string[]
  autoresComprados: string[]
}

interface AvaliacaoLivro {
  id: number
  titulo: string
  autor: string
  avaliacao: string
}

export async function recomendarLivros(
  cliente: ClienteGostos,
  livrosDisponiveis: LivroInfo[]
): Promise<number[]> {

  const listaLivros = livrosDisponiveis.map(l =>
    `ID: ${l.id} | Titulo: ${l.titulo} | Autor: ${l.autor} | Categoria: ${l.categoria} | Preco: R$${l.preco} | Ano: ${l.anoPublicacao ?? "N/A"}`
  ).join("\n")

  const prompt = `
Voce e o Oraculo da Livraria Online. Sua funcao e recomendar livros com base nos gostos do cliente.

GOSTOS DO CLIENTE:
- Generos favoritos selecionados no cadastro: ${cliente.generosFavoritos.length > 0 ? cliente.generosFavoritos.join(", ") : "Nenhum selecionado"}
- Categorias que ja comprou: ${cliente.categoriasCompradas.length > 0 ? cliente.categoriasCompradas.join(", ") : "Nenhuma compra ainda"}
- Autores que ja comprou: ${cliente.autoresComprados.length > 0 ? cliente.autoresComprados.join(", ") : "Nenhum"}

LIVROS DISPONIVEIS NA LOJA:
${listaLivros}

REGRAS:
1. Recomende entre 3 e 5 livros.
2. Priorize livros de CATEGORIAS que correspondam aos generos favoritos do cliente.
3. Tambem priorize livros de autores que o cliente ja comprou.
4. NAO recomende livros que o cliente ja comprou.
5. Retorne APENAS os IDs dos livros recomendados, separados por virgula.
6. Formato da resposta: apenas numeros separados por virgula. Exemplo: 1,3,5
7. Nao inclua nenhum texto explicativo, apenas os IDs.
`

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  })

  const texto = response.text ?? ""

  const ids = texto
    .split(",")
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id))

  return ids
}

export async function buscarAvaliacoesLivros(
  livros: { id: number; titulo: string; autor: string }[]
): Promise<AvaliacaoLivro[]> {

  const listaLivros = livros.map(l =>
    `- ID: ${l.id} | Titulo: "${l.titulo}" | Autor: ${l.autor}`
  ).join("\n")

  const prompt = `
Voce e um especialista em livros. Pesquise em seu conhecimento sobre avaliações, resenhas e opiniões de leitores e críticos sobre os seguintes livros:

${listaLivros}

Para cada livro, retorne um resumo curto (2 a 3 frases) com o que os leitores e críticos geralmente dizem sobre a obra. Inclua aspectos como: nota geral, pontos fortes, para quem é indicado.

Retorne EXATAMENTE neste formato JSON (sem texto antes ou depois, sem markdown):
[
  {"id": 1, "titulo": "...", "autor": "...", "avaliacao": "resumo aqui"},
  {"id": 2, "titulo": "...", "autor": "...", "avaliacao": "resumo aqui"}
]

Se não encontrar avaliações para um livro, escreva "Ainda não há avaliações disponíveis para este livro."
`

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  })

  const texto = response.text ?? ""

  const jsonMatch = texto.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return livros.map(l => ({
      id: l.id,
      titulo: l.titulo,
      autor: l.autor,
      avaliacao: "Ainda não há avaliações disponíveis para este livro.",
    }))
  }

  try {
    const avaliacoes: AvaliacaoLivro[] = JSON.parse(jsonMatch[0])
    return avaliacoes
  } catch {
    return livros.map(l => ({
      id: l.id,
      titulo: l.titulo,
      autor: l.autor,
      avaliacao: "Ainda não há avaliações disponíveis para este livro.",
    }))
  }
}
