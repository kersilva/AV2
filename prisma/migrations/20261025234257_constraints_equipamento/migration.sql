-- ============================================================
-- 6. ÍNDICES ÚNICOS PARCIAIS (só equipamentos ativos)
-- ============================================================
CREATE UNIQUE INDEX "equipamento_codigo_ativo_key"
  ON "Equipamento" ("codigoBarrasInterno")
  WHERE "excluidoEm" IS NULL;

CREATE UNIQUE INDEX "equipamento_posicao_ativa_key"
  ON "Equipamento" ("loteId", "posicaoNoLote")
  WHERE "excluidoEm" IS NULL;