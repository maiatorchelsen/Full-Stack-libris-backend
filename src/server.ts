import express from 'express'
import cors from 'cors'

import routesClientes from './routes/clientes'
import routesLivros from './routes/livros'
import routesLogin from './routes/login'
import routesAdminLogin from './routes/adminLogin'
import routesPedidos from './routes/pedidos'
import routesAdministrador from './routes/administrador'
import routesItensPedido from './routes/itensPedido'
import routesOraculo from './routes/oraculo'

const app = express()
const port = 3000

app.use(express.json())
app.use(cors())

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

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})