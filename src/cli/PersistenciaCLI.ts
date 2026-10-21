import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Contrato } from "../domain/entities/Contrato.js";
import { Credencial } from "../domain/entities/Credencial.js";
import { Equipamento } from "../domain/entities/Equipamento.js";
import { Lote } from "../domain/entities/Lote.js";
import { Movimentacao } from "../domain/entities/Movimentacao.js";
import { Organizacao } from "../domain/entities/Organizacao.js";
import { CriptografiaArquivo } from "../infrastructure/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../infrastructure/RepositorioArquivo.js";
import type { DadosMestre } from "./SegurancaCLI.js";
import { ServicoConfiguracao, type ConfiguracaoSistema } from "../services/ServicoConfiguracao.js";

export interface DadosDominioCLI {
  organizacoes: Map<string, Organizacao>;
  lotes: Map<string, Lote>;
  equipamentos: Map<string, Equipamento>;
  configuracao: ConfiguracaoSistema;
}

interface DadosOrganizacoes {
  organizacoes: Array<Record<string, unknown>>;
}
interface DadosLotes {
  lotes: Array<Record<string, unknown>>;
}
interface DadosEquipamentos {
  equipamentos: Array<Record<string, unknown>>;
}

export class PersistenciaCLI {
  constructor(
    private readonly diretorioDados: string,
    private readonly criptografia: CriptografiaArquivo,
  ) {}

  async carregar(): Promise<DadosDominioCLI> {
    const ler = async <T>(arquivo: string): Promise<T | null> =>
      new RepositorioArquivo<T>(
        resolve(this.diretorioDados, arquivo),
        this.criptografia,
      ).carregar();
    const orgData = await ler<DadosOrganizacoes>("organizacoes.enc");
    const loteData = await ler<DadosLotes>("lotes.enc");
    const equipData = await ler<DadosEquipamentos>("equipamentos.enc");
    const configuracaoData = await ler<ConfiguracaoSistema>("configuracao.enc");
    const organizacoes = new Map<string, Organizacao>();
    const equipamentos = new Map<string, Equipamento>();
    const lotes = new Map<string, Lote>();

    for (const item of orgData?.organizacoes ?? []) {
      const contratoData = item.contratoVigente as Record<string, unknown>;
      const contrato = new Contrato(
        String(contratoData.id),
        String(contratoData.organizacaoId),
        new Date(String(contratoData.dataAssinatura)),
        new Date(String(contratoData.dataVencimento)),
        contratoData.clausulas as string[],
        Number(contratoData.valorMensal),
        Boolean(contratoData.renovacaoAutomatica),
      );
      const organizacao = new Organizacao(
        String(item.id),
        String(item.razaoSocial),
        String(item.cnpj),
        String(item.inscricaoEstadual),
        String(item.enderecoCompleto),
        String(item.telefone),
        String(item.email),
        new Date(String(item.dataCadastro)),
        Boolean(item.ativo),
        contrato,
      );
      organizacoes.set(organizacao.id, organizacao);
    }

    for (const item of equipData?.equipamentos ?? []) {
      const historicoData =
        (item.historicoMovimentacao as Array<Record<string, unknown>>) ?? [];
      const historico = historicoData.map(
        (mov) =>
          new Movimentacao(
            String(mov.id),
            String(mov.equipamentoId),
            new Date(String(mov.dataHora)),
            String(mov.origem),
            String(mov.destino),
            String(mov.responsavel),
            String(mov.observacao),
          ),
      );
      const equipamento = new Equipamento(
        String(item.id),
        String(item.codigoBarrasInterno),
        Number(item.tipo),
        String(item.marca),
        String(item.modelo),
        Number(item.anoFabricacao),
        Number(item.estadoFisico),
        Number(item.pesoQuilogramas),
        String(item.loteId),
        Number(item.posicaoNoLote),
        Number(item.statusRastreamento),
        historico,
      );
      equipamentos.set(equipamento.id, equipamento);
    }

    for (const item of loteData?.lotes ?? []) {
      const ids = (item.equipamentoIds as string[]) ?? [];
      const lote = new Lote(
        String(item.id),
        new Date(String(item.dataEntrada)),
        String(item.organizacaoId),
        String(item.notaFiscal),
        String(item.transportadora),
        ids
          .map((id) => equipamentos.get(id))
          .filter((equipamento): equipamento is Equipamento =>
            Boolean(equipamento),
          ),
        Number(item.statusProcessamento),
        String(item.observacoes),
      );
      lotes.set(lote.id, lote);
    }
    const configuracao = new ServicoConfiguracao();
    configuracao.carregar(configuracaoData);
    return { organizacoes, lotes, equipamentos, configuracao: {
      aliquotaImposto: configuracao.aliquotaImposto,
      coeficienteDepreciacao: configuracao.coeficienteDepreciacao,
    } };
  }

  async salvar(
    dados: DadosDominioCLI,
    mestre: DadosMestre,
    credenciais: Map<string, Credencial>,
  ): Promise<void> {
    const salvarArquivo = async <T>(arquivo: string, valor: T): Promise<void> =>
      new RepositorioArquivo<T>(
        resolve(this.diretorioDados, arquivo),
        this.criptografia,
      ).salvar(valor);
    await Promise.all([
      salvarArquivo("organizacoes.enc", {
        organizacoes: [...dados.organizacoes.values()],
      }),
      salvarArquivo("equipamentos.enc", {
        equipamentos: [...dados.equipamentos.values()],
      }),
      salvarArquivo("lotes.enc", {
        lotes: [...dados.lotes.values()].map((lote) => ({
          id: lote.id,
          dataEntrada: lote.dataEntrada,
          organizacaoId: lote.organizacaoId,
          notaFiscal: lote.notaFiscal,
          transportadora: lote.transportadora,
          equipamentoIds: lote.equipamentos.map(
            (equipamento) => equipamento.id,
          ),
          statusProcessamento: lote.statusProcessamento,
          observacoes: lote.observacoes,
        })),
      }),
      salvarArquivo("configuracao.enc", dados.configuracao),
    ]);
    const dadosCredenciais = [...credenciais.values()].map((credencial) => ({
      usuario: credencial.usuario,
      hashSenha: credencial.hashSenha,
      salt: credencial.salt,
      ultimoAcesso: credencial.ultimoAcesso.toISOString(),
      papel: credencial.papel,
    }));
    await salvarArquivo("credenciais.enc", { credenciais: dadosCredenciais });
    await mkdir(this.diretorioDados, { recursive: true });
  }
}
