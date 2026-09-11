import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const modelo = process.env.GEMINI_MODEL || "gemini-3.5-flash"

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
    model: modelo,
    contents: prompt,
  })

  const texto = response.text ?? ""

  const idsValidos = new Set(livrosDisponiveis.map(l => l.id))
  const ids = texto
    .split(",")
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && idsValidos.has(id))

  return [...new Set(ids)].slice(0, 5)
}

export async function buscarAvaliacoesLivros(
  livros: { id: number; titulo: string; autor: string }[]
): Promise<AvaliacaoLivro[]> {

  const listaLivros = livros.map(l =>
    `- ID: ${l.id} | Titulo: "${l.titulo}" | Autor: ${l.autor}`
  ).join("\n")

  const prompt = `
Voce e um especialista em livros e leitor assiduo. Pesquise em seu conhecimento sobre avaliacoes, resenhas e opinioes reais de leitores e criticos sobre os seguintes livros:

${listaLivros}

REGRA IMPORTANTE: para cada livro, escreva um comentario com OPINIAO de leitor/critico. NUNCA escreva uma sinopse ou descricao da historia. O comentario deve:
1. Ter tom de quem ja leu o livro (primeira pessoa, ex.: "Li este livro e...").
2. Incluir uma nota geral (ex.: 4.5/5).
3. Citar 1 ponto forte e 1 ponto fraco.
4. Dizer para que tipo de leitor e indicado.
5. Ter no maximo 3 frases curtas.

Retorne EXATAMENTE neste formato JSON (sem texto antes ou depois, sem markdown):
[
  {"id": 1, "titulo": "...", "autor": "...", "avaliacao": "comentario aqui"},
  {"id": 2, "titulo": "...", "autor": "...", "avaliacao": "comentario aqui"}
]

Inclua TODOS os livros listados acima, usando os MESMOS IDs fornecidos. Se nao houver opinioes disponiveis para um livro, escreva: "Ainda nao ha avaliacoes disponiveis para este livro."
`

  const response = await ai.models.generateContent({
    model: modelo,
    contents: prompt,
  })

  const texto = response.text ?? ""
  const avaliacoes = extraiJSON(texto)
  const porId = new Map(avaliacoes.map(a => [a.id, a]))

  return livros.map(l => {
    const achado = porId.get(l.id)
    if (!achado || !achado.avaliacao.trim()) {
      return {
        id: l.id,
        titulo: l.titulo,
        autor: l.autor,
        avaliacao: "Ainda não há avaliações disponíveis para este livro.",
      }
    }
    return {
      id: l.id,
      titulo: l.titulo,
      autor: l.autor,
      avaliacao: achado.avaliacao,
    }
  })
}

function extraiJSON(texto: string): AvaliacaoLivro[] {
  const semFence = texto.replace(/```json/gi, "").replace(/```/g, "").trim()
  const inicio = semFence.indexOf("[")
  const fim = semFence.lastIndexOf("]")
  if (inicio === -1 || fim === -1 || fim <= inicio) return []

  const trecho = semFence.slice(inicio, fim + 1)

  try {
    const dados = JSON.parse(trecho)
    if (!Array.isArray(dados)) return []
    return dados.filter(d =>
      d && typeof d.id === "number" && typeof d.avaliacao === "string"
    )
  } catch {
    try {
      const reparado = JSON.parse(trecho.replace(/,\s*([\]}])/g, "$1"))
      return Array.isArray(reparado) ? reparado : []
    } catch {
      return []
    }
  }
}
