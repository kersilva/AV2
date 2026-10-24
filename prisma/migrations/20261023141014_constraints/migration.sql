-- ============================================================
-- 1. FUNÇÃO DE VALIDAÇÃO DE CNPJ (dígitos verificadores)
-- ============================================================
CREATE FUNCTION cnpj_valido(c text) RETURNS boolean AS $$
DECLARE
  pesos1 int[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  pesos2 int[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  soma int; resto int; d1 int; d2 int; i int;
BEGIN
  IF c !~ '^[0-9]{14}$' THEN RETURN false; END IF;   -- só 14 dígitos
  IF c ~ '^(\d)\1{13}$' THEN RETURN false; END IF;   -- 11111111111111 etc.

  soma := 0;
  FOR i IN 1..12 LOOP
    soma := soma + substr(c, i, 1)::int * pesos1[i];
  END LOOP;
  resto := soma % 11;
  d1 := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;

  soma := 0;
  FOR i IN 1..13 LOOP
    soma := soma + substr(c, i, 1)::int * pesos2[i];
  END LOOP;
  resto := soma % 11;
  d2 := CASE WHEN resto < 2 THEN 0 ELSE 11 - resto END;

  RETURN d1 = substr(c, 13, 1)::int AND d2 = substr(c, 14, 1)::int;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 2. CHECKS
-- ============================================================
ALTER TABLE "Organizacao"
  ADD CONSTRAINT "organizacao_cnpj_valido" CHECK (cnpj_valido("cnpj")),
  ADD CONSTRAINT "organizacao_razao_social_nao_vazia" CHECK (length(btrim("razaoSocial")) > 0);

ALTER TABLE "Contrato"
  ADD CONSTRAINT "contrato_vencimento_apos_assinatura" CHECK ("dataVencimento" > "dataAssinatura"),
  ADD CONSTRAINT "contrato_valor_mensal_positivo" CHECK ("valorMensal" > 0);

ALTER TABLE "ClausulaContrato"
  ADD CONSTRAINT "clausula_ordem_positiva" CHECK ("ordem" >= 1),
  ADD CONSTRAINT "clausula_texto_nao_vazio" CHECK (length(btrim("texto")) > 0);

ALTER TABLE "Equipamento"
  ADD CONSTRAINT "equipamento_peso_positivo" CHECK ("pesoQuilogramas" > 0),
  ADD CONSTRAINT "equipamento_posicao_positiva" CHECK ("posicaoNoLote" >= 1),
  ADD CONSTRAINT "equipamento_ano_plausivel" CHECK ("anoFabricacao" BETWEEN 1970 AND 2100),
  ADD CONSTRAINT "equipamento_codigo_barras_nao_vazio" CHECK (length(btrim("codigoBarrasInterno")) > 0);

ALTER TABLE "Lote"
  ADD CONSTRAINT "lote_nota_fiscal_nao_vazia" CHECK (length(btrim("notaFiscal")) > 0);

ALTER TABLE "ConfiguracaoSistema"
  ADD CONSTRAINT "configuracao_linha_unica" CHECK ("id" = 1),
  ADD CONSTRAINT "configuracao_aliquota_valida" CHECK ("aliquotaImposto" >= 0 AND "aliquotaImposto" <= 1),
  ADD CONSTRAINT "configuracao_depreciacao_valida" CHECK ("coeficienteDepreciacao" >= 0 AND "coeficienteDepreciacao" <= 1);

ALTER TABLE "Usuario"
  ADD CONSTRAINT "usuario_hash_nao_vazio" CHECK (length("hashSenha") > 0);

-- ============================================================
-- 3. TRIGGER: data de entrada do lote (não futura, máx. 90 dias atrás)
-- ============================================================
CREATE FUNCTION lote_valida_data_entrada() RETURNS trigger AS $$
BEGIN
  IF NEW."dataEntrada" > now() THEN
    RAISE EXCEPTION 'A data de entrada do lote não pode ser futura.';
  END IF;
  IF NEW."dataEntrada" < now() - interval '90 days' THEN
    RAISE EXCEPTION 'A data de entrada do lote não pode ser anterior a 90 dias.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "lote_data_entrada_trg"
  BEFORE INSERT ON "Lote"
  FOR EACH ROW EXECUTE FUNCTION lote_valida_data_entrada();

-- ============================================================
-- 4. TRIGGER: desmonte só depois da triagem
-- ============================================================
CREATE FUNCTION equipamento_valida_transicao() RETURNS trigger AS $$
BEGIN
  IF NEW."statusRastreamento" = OLD."statusRastreamento" THEN
    RETURN NEW;
  END IF;

  IF NEW."statusRastreamento" = 'AGUARDANDO_DESMONTE'
     AND OLD."statusRastreamento" <> 'EM_TRIAGEM' THEN
    RAISE EXCEPTION 'O equipamento só vai para desmonte depois da triagem (estado atual: %).', OLD."statusRastreamento";
  END IF;

  IF NEW."statusRastreamento" = 'EM_DESMONTE'
     AND OLD."statusRastreamento" <> 'AGUARDANDO_DESMONTE' THEN
    RAISE EXCEPTION 'O desmonte só pode começar a partir de AGUARDANDO_DESMONTE (estado atual: %).', OLD."statusRastreamento";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "equipamento_transicao_trg"
  BEFORE UPDATE OF "statusRastreamento" ON "Equipamento"
  FOR EACH ROW EXECUTE FUNCTION equipamento_valida_transicao();

-- ============================================================
-- 5. TRIGGER: journal imutável (remoção só após 180 dias)
-- ============================================================
CREATE FUNCTION journal_protegido() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'O journal de transações é imutável.';
  END IF;
  IF OLD."timestamp" > now() - interval '180 days' THEN
    RAISE EXCEPTION 'O journal deve ser mantido por no mínimo 180 dias.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "journal_protegido_trg"
  BEFORE UPDATE OR DELETE ON "JournalTransacao"
  FOR EACH ROW EXECUTE FUNCTION journal_protegido();