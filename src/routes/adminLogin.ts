import jwt from "jsonwebtoken"
import { prisma } from "../../lib/prisma"
import { Router } from "express"
import bcrypt from 'bcrypt'

const router = Router()

router.post("/", async (req, res) => {
  /*
#swagger.tags = ['Login Admin']
#swagger.summary = 'Realiza o login de um administrador'
#swagger.description = 'Permite que um administrador faça login no sistema.'
in: 'body',
required: true,
schema: {
email: { type: 'string', format: 'email' },
senha: { type: 'string', format: 'password' }
}
} 
#swagger.responses[200] = {
description: 'Login realizado com sucesso.'
}
#swagger.responses[500] = {
description: 'Erro interno do servidor.'
}
*/
  const { email, senha } = req.body

  const mensaPadrao = "Login ou senha incorretos"

  if (!email || !senha) {
    res.status(400).json({ erro: mensaPadrao })
    return
  }

  try {
    const admin = await prisma.admin.findFirst({
      where: { email }
    })

    if (admin == null) {
      res.status(400).json({ erro: mensaPadrao })
      return
    }

    if (bcrypt.compareSync(senha, admin.senha)) {
      const token = jwt.sign({
        adminLogadoId: admin.id,
        adminLogadoNome: admin.nome
      },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" }
      )

      res.status(200).json({
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        token
      })
    } else {
      res.status(400).json({ erro: mensaPadrao })
    }
  } catch (error) {
    res.status(400).json({ erro: "Erro ao realizar login" })
  }
})

export default router
