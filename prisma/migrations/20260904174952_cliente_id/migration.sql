/*
  Warnings:

  - The primary key for the `clientes` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "avaliacoes" DROP CONSTRAINT "avaliacoes_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "pedidos" DROP CONSTRAINT "pedidos_clienteId_fkey";

-- AlterTable
ALTER TABLE "avaliacoes" ALTER COLUMN "clienteId" SET DATA TYPE VARCHAR(36);

-- AlterTable
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(36),
ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "clientes_id_seq";

-- AlterTable
ALTER TABLE "pedidos" ALTER COLUMN "clienteId" SET DATA TYPE VARCHAR(36);

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
