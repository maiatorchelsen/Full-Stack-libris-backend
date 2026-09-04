import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('.env', import.meta.url), 'utf8');
const match = env.match(/DATABASE_URL="([^"]+)"/);
const client = new pg.Client({ connectionString: match[1] });
await client.connect();

const admin = await client.query(
  'INSERT INTO admins (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
  ['Administrador', 'admin@livraria.com', 'admin123']
);
console.log('Admin criado:', admin.rows[0]);

const r = await client.query(`
  INSERT INTO "livros" (
    "titulo", "isbn", "descricao", "preco", "estoque", "capa",
    "anoPublicacao", "autor", "editora", "categoria", "adminId"
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  RETURNING id, titulo
`, [
  'A seca',
  '978-8592795818',
  'Não chove em Kiewarra, Austrália, há dois anos. As tensões na comunidade agrícola tornam-se insuportáveis quando três membros da família Hadler são encontrados mortos em sua propriedade. Todos acham que Luke Hadler matou a esposa e o filho de seis anos de idade e depois cometeu suicídio. Apenas a filha mais nova, ainda bebê, sobrevive.',
  '43.00',
  5,
  'https://m.media-amazon.com/images/I/9169OzMk8qL._SL1500_.jpg',
  2020,
  'Jane Harper',
  'Morro Branco',
  'Suspense',
  admin.rows[0].id
]);
console.log('Livro inserido:', r.rows[0]);

await client.end();
