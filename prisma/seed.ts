import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

async function main() {
  try {
    // 1. Busca ou cria o Administrador primeiro
    const admin = await prisma.admin.upsert({
      where: { email: "admin@email.com" },
      update: {},
      create: {
        nome: "Administrador Principal",
        email: "admin@email.com",
        senha: bcrypt.hashSync("admin123", 10),
      },
    });

    // 2. Cadastra os livros com upsert (não duplica pelo ISBN)
    const livros = [
      {
        titulo: "Não é Ela",
        isbn: "6555986042",
        descricao:
          "Um thriller psicológico avassalador que transforma férias tranquilas em um pesadelo inesquecível. Courtney Gray planejou as férias na expectativa de passar dias tranquilos na companhia de seus familiares em um resort bucólico à beira de um belo lago no norte de Wisconsin.",
        preco: 69.90,
        estoque: 5,
        capa: "https://m.media-amazon.com/images/I/919sHAWyurL._SL1500_.jpg",
        anoPublicacao: 2026,
        autor: "Mary Kubica",
        editora: "DarkSide Books",
        categoria: "Suspense",
        adminId: admin.id,
      },
      {
        titulo: "It a coisa",
        isbn: "8560280944",
        descricao:
          "Durante as férias de 1958, em uma pacata cidadezinha chamada Derry, um grupo de sete amigos começa a ver coisas estranhas. Um conta que viu um palhaço, outro que viu uma múmia. Finalmente, acabam descobrindo que estavam todos vendo a mesma coisa: um ser sobrenatural e maligno que pode assumir várias formas.",
        preco: 98.90,
        estoque: 5,
        capa: "https://m.media-amazon.com/images/I/91g9Dvtf+jL._SY425_.jpg",
        anoPublicacao: 2014,
        autor: "Stephen King",
        editora: "Suma de Letras",
        categoria: "Suspense, Terror",
        adminId: admin.id,
      }
    ];

    for (const livro of livros) {
      await prisma.livro.upsert({
        where: { isbn: livro.isbn },
        update: {},
        create: livro,
      });
    }

    console.log(`${livros.length} Livros Cadastrados...`);
  } catch (error) {
    console.error("Erro nas Inclusões (Seeds):", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

await main();