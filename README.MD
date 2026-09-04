# Libris — Backend da Livraria Online

API REST do projeto **Libris**, uma livraria online que permite cadastro de clientes e administradores, catálogo de livros, avaliações, carrinho/pedidos e recomendações personalizadas geradas por **Inteligência Artificial**.

## Funcionalidades

- Cadastro, listagem, edição e remoção de **clientes**
- Autenticação de **clientes** e **administradores** com **JWT**
- CRUD de **livros** (restrito a administradores)
- CRUD de **pedidos** e **itens de pedido**, com cálculo automático do valor total e atualização de estoque
- Atualização de **status de pedidos**: `PENDENTE`, `PROCESSANDO`, `ENVIADO`, `ENTREGUE`, `CANCELADO`
- **Pesquisa de livros** por título, autor, ISBN, editora, categoria, ano de publicação ou preço máximo
- **Oraculo**: sistema de recomendação de livros por cliente usando o **Google Gemini (IA)**
- Geração de resumos de **avaliações/opiniões** de leitores e críticos sobre livros, também via IA

## Tecnologias

- **Node.js** + **TypeScript** (execução via `tsx`)
- **Express 5**
- **Prisma ORM** com banco **PostgreSQL** (Neon)
- **Zod** para validação de dados
- **JWT** (`jsonwebtoken`) para autenticação
- **bcrypt** para hash de senhas
- **Google GenAI** (Gemini) para recomendações e resumos

## Requisitos

- Node.js 20+ e npm
- Uma instância PostgreSQL (local ou hospedada)

## Como executar

### 1. Instalar dependências

```bash
npm install
```

O `postinstall` roda `prisma generate` automaticamente para gerar o client Prisma.

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto a partir do exemplo abaixo (valores fictícios apenas para ilustrar):

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/seubanco?sslmode=require"
JWT_KEY="sua_chave_secreta_jwt"
GEMINI_API_KEY="sua_chave_da_api_google_genai"
```

> **Importante:** nunca versione o arquivo `.env` no repositório.

### 3. Aplicar as migrations e popular o banco (opcional)

```bash
npx prisma migrate deploy
npx prisma db seed
```

O seed cria um administrador padrão e dois livros de exemplo:

- **Admin:** `admin@email.com` / `admin123`
- **Livros:** "Não é Ela" e "It a coisa"

### 4. Rodar o servidor

```bash
npm run dev        # modo desenvolvimento (watch)
npm start          # produção
```

O servidor fica disponível em `http://localhost:3000`.

## Scripts

| Comando            | Descrição                              |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Inicia o servidor com hot-reload (`tsx watch`) |
| `npm start`        | Inicia o servidor                      |
| `npm run seed`     | Executa o seed do banco (`prisma db seed`) |

## Estrutura do projeto

```
├─ prisma/
│  ├─ migrations/          # Migrations do banco
│  ├─ schema.prisma        # Modelos de dados
│  └─ seed.ts              # Dados iniciais
├─ src/
│  ├─ middleware/auth.ts   # Middlewares de autenticação (cliente e admin)
│  ├─ routes/              # Rotas da API
│  └─ server.ts            # Bootstrap do Express
├─ Services/
│  └─ iaServices.ts        # Integração com o Google Gemini
├─ lib/
│  └─ prisma.ts            # Instância do Prisma Client
└─ package.json
```

## Modelo de dados

| Modelo      | Descrição                                    |
| ----------- | -------------------------------------------- |
| `Cliente`   | Clientes da livraria (nome, email, endereço, favoritos) |
| `Admin`     | Administradores do sistema                   |
| `Livro`     | Livros do catálogo (título, ISBN, preço, estoque, autor, editora, categoria) |
| `avaliacao` | Avaliações de clientes sobre livros          |
| `Pedido`    | Pedidos realizados por clientes              |
| `ItemPedido`| Itens que compõem um pedido                  |

## Endpoints

Autenticação é feita via header `Authorization: Bearer <token>`.

### Clientes — `/clientes`

| Método | Rota      | Descrição                     | Auth     |
| ------ | --------- | ----------------------------- | -------- |
| GET    | `/`       | Lista todos os clientes       | —        |
| POST   | `/`       | Cadastra um cliente           | —        |
| PUT    | `/:id`    | Atualiza um cliente           | —        |
| DELETE | `/:id`    | Remove um cliente             | —        |

### Login — `/login` e `/admin/login`

| Método | Rota          | Descrição                        |
| ------ | ------------- | -------------------------------- |
| POST   | `/login`      | Autentica um cliente (retorna JWT) |
| POST   | `/admin/login`| Autentica um admin (retorna JWT) |

### Livros — `/livros`

| Método | Rota             | Descrição                          | Auth    |
| ------ | ---------------- | ---------------------------------- | ------- |
| GET    | `/`              | Lista todos os livros (com avaliações) | — |
| GET    | `/:id`           | Busca um livro	                     | —       |
| GET    | `/pesquisa/:termo` | Busca por título, autor, ISBN, editora, categoria, ano ou preço | — |
| POST   | `/`              | Cria um livro                      | Admin   |
| PUT    | `/:id`           | Atualiza um livro                  | Admin   |
| DELETE | `/:id`           | Remove um livro                    | Admin   |

### Pedidos — `/pedidos`

| Método | Rota   | Descrição                                  | Auth      |
| ------ | ------ | ------------------------------------------ | --------- |
| GET    | `/`    | Lista todos os pedidos                     | —         |
| GET    | `/:id` | Busca um pedido                            | —         |
| POST   | `/`    | Cria um pedido com itens (calcula total e baixa estoque) | Cliente |
| PUT    | `/:id` | Atualiza o status do pedido                | Admin     |
| DELETE | `/:id` | Remove um pedido (e seus itens)            | Admin     |

### Itens de pedido — `/itens-pedido`

| Método | Rota   | Descrição                 | Auth      |
| ------ | ------ | ------------------------- | --------- |
| GET    | `/`    | Lista itens de pedidos    | Cliente   |
| GET    | `/:id` | Busca um item             | Cliente   |
| POST   | `/`    | Cria um item              | Admin     |
| PUT    | `/:id` | Atualiza um item          | Admin     |
| DELETE | `/:id` | Remove um item            | Admin     |

### Administração — `/administrador`

Todas as rotas exigem autenticação de **admin**.

| Método | Rota                   | Descrição                            |
| ------ | ---------------------- | ------------------------------------ |
| GET    | `/pedidos`             | Lista todos os pedidos (detalhado)   |
| GET    | `/pedidos/:id`         | Busca um pedido detalhado            |
| PUT    | `/pedidos/:id/enviar`  | Marca um pedido como `ENVIADO`       |
| DELETE | `/pedidos/:id`         | Remove um pedido (e seus itens)      |
| POST   | `/livros`              | Cria um livro                        |
| PUT    | `/livros/:id`          | Atualiza um livro                    |
| DELETE | `/livros/:id`          | Remove um livro                      |

### Oraculo (IA) — `/oraculo`

| Método | Rota          | Descrição                                          | Auth    |
| ------ | ------------- | -------------------------------------------------- | ------- |
| GET    | `/:clienteId` | Recomenda livros com base no perfil e histórico do cliente, incluindo resumos de avaliações gerados por IA | Cliente |

## Segurança

- Senhas armazenadas com hash **bcrypt** (custo 10)
- Tokens **JWT** com expiração de 1 hora
- Middleware `adminMiddleware` protege rotas administrativas
- Mensagens de erro de login padronizadas para evitar enumeração de usuários
- Validação de entrada com **Zod**

## Observações

- O serviço de IA (`Services/iaServices.ts`) usa o modelo da classe `gemini` do Google GenAI — o nome do modelo é configurado no código (`model: 'gemini-3.6-flash'`).
- O diretório `generated/` (Prisma Client) e o `.env` não devem ser versionados.

## Trabalho da disciplina de  Full Stack
- Autoria de 
  Maiara Torchelsen Saraiva