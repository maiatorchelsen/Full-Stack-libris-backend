import { prisma } from "../../lib/prisma";

import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const clienteSchema = z.object({
  nome: z.string().min(3,
    { message: "Nome deve possuir, no mínimo, 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  senha: z.string().min(6, { message: "Senha deve possuir, no mínimo, 6 caracteres" }),
  tel: z.string().nullable().optional(),
  rua: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  favoritos: z.string().nullable().optional(),
})

router.get("/", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Clientes']
#swagger.summary = 'Consulta um cliente'
#swagger.description = 'Consulta os dados de um cliente.'
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
nome: 'João da Silva',
email: 'joao@email.com',
senha: '123456'
}
}
#swagger.responses[201] = {
description: 'Cliente consultado com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
  try {
    const clientes = await prisma.cliente.findMany()
    res.status(200).json(clientes)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {
  /*
#swagger.tags = ['Clientes']
#swagger.summary = 'Cadastra um cliente'
#swagger.description = 'Realiza o cadastro de um novo cliente.'
#swagger.parameters['body'] = {
in: 'body',
required: true,
schema: {
nome: 'João da Silva',
email: 'joao@email.com',
senha: '123456',
tel: '123456789',
rua: 'Rua Exemplo',
numero: '123',
bairro: 'Bairro Exemplo',
cidade: 'Cidade Exemplo',
cep: '12345-678',
favoritos: 'Livro1, Livro2' 
}
}
#swagger.responses[201] = {
description: 'Cliente cadastrado com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/

  const valida = clienteSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, email, senha, tel, rua, numero, bairro, cidade, cep, favoritos } = valida.data

  try {
    const senhaHash = bcrypt.hashSync(senha, 10)
    const clientes = await prisma.cliente.create({
      data: { nome, email, senha: senhaHash, tel, rua, numero, bairro, cidade, cep, favoritos }
    })
    res.status(201).json(clientes)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Clientes']
#swagger.summary = 'Exclui um cliente'
#swagger.description = 'Exclui um cliente existente.'
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
nome: 'João da Silva',
email: 'joao@email.com',
senha: '123456'
}
}
#swagger.responses[200] = {
description: 'Cliente excluído com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
  const { id } = req.params

  if (id !== req.clienteLogadoId) {
    res.status(403).json({ erro: "Acesso negado. Você só pode excluir a própria conta." })
    return
  }

  try {
    const cliente = await prisma.cliente.delete({
      where: { id }
    })
    res.status(200).json(cliente)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", authMiddleware, async (req, res) => {
  /*
#swagger.tags = ['Clientes']
#swagger.summary = 'Atualiza um cliente'
#swagger.description = 'Atualiza os dados de um cliente existente.'
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
nome: 'João da Silva',
email: 'joao@email.com',
senha: '123456',
tel: '123456789',
rua: 'Rua Exemplo',
numero: '123',
bairro: 'Bairro Exemplo',
cidade: 'Cidade Exemplo',
cep: '12345-678',
favoritos: 'Livro1, Livro2' 
}
}
#swagger.responses[201] = {
description: 'Cliente atualizado com sucesso.'
}
#swagger.responses[400] = {
description: 'Dados inválidos.'
}
*/
  const { id } = req.params

  if (id !== req.clienteLogadoId) {
    res.status(403).json({ erro: "Acesso negado. Você só pode atualizar a própria conta." })
    return
  }

  const valida = clienteSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, email, senha, tel, rua, numero, bairro, cidade, cep, favoritos } = valida.data

  try {
    const senhaHash = bcrypt.hashSync(senha, 10)
    const cliente = await prisma.cliente.update({
      where: { id },
      data: { nome, email, senha: senhaHash, tel, rua, numero, bairro, cidade, cep, favoritos }

    })
    res.status(200).json(cliente)
  } catch (error) {
    res.status(400).json({ error })
  }
})

export default router