-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "hashSenha" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "ultimoAcesso" TIMESTAMP(3) NOT NULL,
    "papel" "PapelUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalTransacao" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operacao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "usuarioId" TEXT,
    "usuarioResponsavel" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "JournalTransacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "aliquotaImposto" DECIMAL(5,4) NOT NULL,
    "coeficienteDepreciacao" DECIMAL(5,4) NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ConfiguracaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE INDEX "JournalTransacao_timestamp_idx" ON "JournalTransacao"("timestamp");

-- CreateIndex
CREATE INDEX "JournalTransacao_entidade_timestamp_idx" ON "JournalTransacao"("entidade", "timestamp");

-- CreateIndex
CREATE INDEX "JournalTransacao_usuarioId_idx" ON "JournalTransacao"("usuarioId");

-- AddForeignKey
ALTER TABLE "JournalTransacao" ADD CONSTRAINT "JournalTransacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
