import { randomUUID } from "node:crypto";
import { EstadoFisico } from "@domain/enums/EstadoFisico.js";
import { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";
import { Equipamento } from "@domain/entities/Equipamento.js";
import type { NovoEquipamento } from "@domain/entities/Equipamento.js";
import type { EquipamentoRepository } from "@domain/repositories/EquipamentoRepository.js";
import type { JournalWriter } from "@domain/services/JournalWriter.js";
import {
  ErroConflito,
  ErroNaoEncontrado,
} from "@/shared/errors/DomainError.js";
import { ErroRegraNegocio } from "@/shared/errors/DomainError.js";
import type { EstadoExclusao } from "@domain/repositories/SoftDeleteRepository.js";
export type { NovoEquipamento };
export type ExclusaoView = {
  id: string;
  excluidoEm: Date | null;
  versao: number;
};
export type EquipamentoView = {
  id: string;
  codigoBarrasInterno: string;
  tipo: string;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  estadoFisico: EstadoFisico;
  pesoQuilogramas: number;
  loteId: string;
  posicaoNoLote: number;
  statusRastreamento: StatusRastreamento;
  versao: number;
  historicoMovimentacao: unknown[];
};
export class EquipamentoService {
  constructor(
    private readonly repository: EquipamentoRepository,
    private readonly journalWriter: JournalWriter,
  ) {}
  async cadastrar(
    dados: NovoEquipamento,
    ator: { id: string; usuario: string },
  ): Promise<EquipamentoView> {
    if (!(await this.repository.loteAtivo(dados.loteId)))
      throw new ErroNaoEncontrado("Lote ativo não encontrado.");
    const criado = await this.repository.criar(Equipamento.criar(dados));
    const dto = this.dto(criado);
    await this.registrarNoJournal("CRIAR", ator, null, dto);
    return dto;
  }
  async listar(): Promise<EquipamentoView[]> {
    return (await this.repository.listar()).map((item) => this.dto(item));
  }
  async rastrearEquipamento(id: string): Promise<EquipamentoView> {
    return this.dto(await this.buscar(id));
  }
  async atualizarEstadoFisico(
    id: string,
    estado: EstadoFisico,
    justificativa: string,
    versao: number,
    ator: { id: string; usuario: string },
  ): Promise<EquipamentoView> {
    const equipamento = await this.buscar(id);
    const antes = this.dto(equipamento);
    equipamento.atualizarEstadoFisico(estado, justificativa);
    const salvo = await this.repository.salvar(equipamento, versao);
    if (!salvo) throw new ErroConflito("Conflito de versão do equipamento.");
    const depois = this.dto(salvo);
    await this.registrarNoJournal("ALTERAR_ESTADO_FISICO", ator, antes, depois);
    return depois;
  }
  async atualizarStatus(
    id: string,
    status: StatusRastreamento,
    justificativa: string,
    versao: number,
    ator: { id: string; usuario: string },
  ): Promise<EquipamentoView> {
    const equipamento = await this.buscar(id);
    const antes = this.dto(equipamento);
    equipamento.atualizarStatus(status, justificativa);
    const salvo = await this.repository.salvar(equipamento, versao);
    if (!salvo) throw new ErroConflito("Conflito de versão do equipamento.");
    const depois = this.dto(salvo);
    await this.registrarNoJournal("ALTERAR_STATUS", ator, antes, depois);
    return depois;
  }
  async excluir(
    id: string,
    versao: number,
    ator: { id: string; usuario: string },
  ): Promise<ExclusaoView> {
    const estado = await this.obterEstado(id, versao);
    if (estado.excluidoEm) return estado;
    const excluidoEm = new Date();
    if (!(await this.repository.excluir(id, versao, excluidoEm)))
      throw new ErroConflito("Conflito de versão do equipamento.");
    const resultado = { id, excluidoEm, versao: versao + 1 };
    await this.registrarNoJournal(
      "EXCLUIR_LOGICAMENTE",
      ator,
      estado,
      resultado,
    );
    return resultado;
  }
  async reativar(
    id: string,
    versao: number,
    ator: { id: string; usuario: string },
  ): Promise<ExclusaoView> {
    const estado = await this.obterEstado(id, versao);
    if (!estado.excluidoEm) return estado;
    if (!(await this.repository.loteAtivo(await this.buscarLoteId(id))))
      throw new ErroRegraNegocio(
        "Reative o lote antes de reativar o equipamento.",
      );
    if (!(await this.repository.reativar(id, versao)))
      throw new ErroConflito("Conflito de versão do equipamento.");
    const resultado = { id, excluidoEm: null, versao: versao + 1 };
    await this.registrarNoJournal("REATIVAR", ator, estado, resultado);
    return resultado;
  }
  private async buscarLoteId(id: string): Promise<string> {
    const row = await this.repository.buscarPorIdIncluindoExcluido(id);
    if (!row) throw new ErroNaoEncontrado("Equipamento não encontrado.");
    return row.loteId;
  }
  private async obterEstado(
    id: string,
    versao: number,
  ): Promise<EstadoExclusao> {
    const estado = await this.repository.obterEstadoExclusao(id);
    if (!estado) throw new ErroNaoEncontrado("Equipamento não encontrado.");
    if (estado.versao !== versao)
      throw new ErroConflito("Conflito de versão do equipamento.");
    return estado;
  }

  async listarMovimentacoes(id: string) {
    await this.buscar(id);
    const itens = await this.repository.listarMovimentacoes(id);
    return itens.map((m) => ({
      id: m.id,
      equipamentoId: m.equipamentoId,
      dataHora: m.dataHora,
      origem: m.origem,
      destino: m.destino,
      responsavel: m.responsavel,
      observacao: m.observacao,
    }));
  }

  async registrarMovimentacao(
    id: string,
    dados: { destino: string; observacao?: string },
    ator: { id: string; usuario: string },
  ) {
    const equipamento = await this.buscar(id);
    const movimentacao = equipamento.registrarMovimentacao({
      id: randomUUID(),
      destino: dados.destino,
      responsavel: ator.usuario,
      ...(dados.observacao ? { observacao: dados.observacao } : {}),
    });
    const salva = await this.repository.criarMovimentacao(movimentacao);
    const dto = {
      id: salva.id,
      equipamentoId: salva.equipamentoId,
      dataHora: salva.dataHora,
      origem: salva.origem,
      destino: salva.destino,
      responsavel: salva.responsavel,
      observacao: salva.observacao,
    };
    await this.registrarNoJournal("REGISTRAR_MOVIMENTACAO", ator, null, dto);
    return dto;
  }
  private async buscar(id: string): Promise<Equipamento> {
    const item = await this.repository.buscarPorId(id);
    if (!item) throw new ErroNaoEncontrado("Equipamento não encontrado.");
    return item;
  }
  private dto(e: Equipamento): EquipamentoView {
    return {
      id: e.id,
      codigoBarrasInterno: e.codigoBarrasInterno,
      tipo: e.tipo,
      marca: e.marca,
      modelo: e.modelo,
      anoFabricacao: e.anoFabricacao,
      estadoFisico: e.estadoFisico,
      pesoQuilogramas: e.pesoQuilogramas,
      loteId: e.loteId,
      posicaoNoLote: e.posicaoNoLote,
      statusRastreamento: e.statusRastreamento,
      versao: e.versao,
      historicoMovimentacao: e.historicoMovimentacao.map((m) => ({
        id: m.id,
        equipamentoId: m.equipamentoId,
        dataHora: m.dataHora,
        origem: m.origem,
        destino: m.destino,
        responsavel: m.responsavel,
        observacao: m.observacao,
      })),
    };
  }
  private registrarNoJournal(
    operacao: string,
    ator: { id: string; usuario: string },
    dadosAntes: unknown,
    dadosDepois: unknown,
  ) {
    return this.journalWriter.registrar({
      operacao,
      entidade: "Equipamento",
      usuarioId: ator.id,
      usuarioResponsavel: ator.usuario,
      ...(dadosAntes !== null ? { dadosAntes } : {}),
      dadosDepois,
    });
  }
}
