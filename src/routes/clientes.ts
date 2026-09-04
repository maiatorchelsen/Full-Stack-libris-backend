import { prisma } from "../../lib/prisma";

import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'

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

router.get("/", async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany()
    res.status(200).json(clientes)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

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

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const cliente = await prisma.cliente.delete({
      where: { id }
    })
    res.status(200).json(cliente)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params

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