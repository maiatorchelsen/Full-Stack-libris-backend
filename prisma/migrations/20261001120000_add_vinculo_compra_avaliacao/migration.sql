-- AlterTable
ALTER TABLE "avaliacoes" ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "itemPedidoId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_clienteId_itemPedidoId_key" ON "avaliacoes"("clienteId", "itemPedidoId");

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "itens_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
