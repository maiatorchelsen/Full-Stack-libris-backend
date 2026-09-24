import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { readFileSync } from 'node:fs'

import routesClientes from './routes/clientes'
import routesLivros from './routes/livros'
import routesLogin from './routes/login'
import routesAdminLogin from './routes/adminLogin'
import routesPedidos from './routes/pedidos'
import routesAdministrador from './routes/administrador'
import routesItensPedido from './routes/itensPedido'
import routesOraculo from './routes/oraculo'

const app = express()
const port = Number(process.env.PORT) || 3000
const swaggerDocument = JSON.parse(
  readFileSync(new URL('../swagger-output.json', import.meta.url), 'utf8'),
)
swaggerDocument.servers = [{
  url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`,
}]

app.use(express.json())
app.use(cors())
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.get('/docs.json', (req, res) => {
  res.json(swaggerDocument)
})

app.use("/clientes", routesClientes)
app.use("/livros", routesLivros)
app.use("/login", routesLogin)
app.use("/admin/login", routesAdminLogin)
app.use("/pedidos", routesPedidos)
app.use("/administrador", routesAdministrador)
app.use("/itens-pedido", routesItensPedido)
app.use("/oraculo", routesOraculo)

app.get('/', (req, res) => {
  res.send('API: Livraria Online')
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta: ${port}`)
})