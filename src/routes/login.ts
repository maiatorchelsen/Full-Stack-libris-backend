import jwt from "jsonwebtoken"
import { prisma } from "../../lib/prisma"
import { Router } from "express"
import bcrypt from 'bcrypt'

const router = Router()

router.post("/", async (req, res) => {
   /*
#swagger.tags = ['Login']
#swagger.summary = 'Realiza o login de um cliente'
#swagger.description = 'Permite que um cliente faça login no sistema.'
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
    const cliente = await prisma.cliente.findFirst({
      where: { email }
    })

    if (cliente == null) {
    
      res.status(400).json({ erro: mensaPadrao })
      return
    }

    // se o e-mail existe, faz-se a comparação dos hashs
    if (bcrypt.compareSync(senha, cliente.senha)) {
      // se confere, gera e retorna o token
      const token = jwt.sign({
        clienteLogadoId: cliente.id,
        clienteLogadoNome: cliente.nome
      },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" }
      )

      res.status(200).json({
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        token
      })
    } else {
      res.status(400).json({ erro: mensaPadrao })
    }
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router