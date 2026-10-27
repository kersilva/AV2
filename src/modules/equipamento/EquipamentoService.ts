import { randomUUID } from 'node:crypto';
import { EstadoFisico } from '@domain/enums/EstadoFisico.js';
import { StatusRastreamento } from '@domain/enums/StatusRastreamento.js';
import { Equipamento } from '@domain/entities/Equipamento.js';
import type { NovoEquipamento } from '@domain/entities/Equipamento.js';
import type { EquipamentoRepository } from '@domain/repositories/EquipamentoRepository.js';
import type { UnitOfWork } from '@domain/services/UnitOfWork.js';
import { ErroConflito, ErroNaoEncontrado } from '@/shared/errors/DomainError.js';
import { ErroRegraNegocio } from '@/shared/errors/DomainError.js';
import type { EstadoExclusao } from '@domain/repositories/SoftDeleteRepository.js';
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
    private readonly unitOfWork: UnitOfWork
  ) {}
  async cadastrar(
    dados: NovoEquipamento,
    ator: { id: string; usuario: string }
  ): Promise<EquipamentoView> {
    const novo = Equipamento.criar(dados);
    return this.unitOfWork.executar(async ({ equipamentos, journal }) => {
      if (!(await equipamentos.loteAtivo(dados.loteId)))
        throw new ErroNaoEncontrado('Lote ativo não encontrado.');
      const criado = await equipamentos.criar(novo);
      const dto = this.dto(criado);
      await journal.registrar({
        operacao: 'CRIAR',
        entidade: 'Equipamento',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosDepois: dto,
      });
      return dto;
    });
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
    ator: { id: string; usuario: string }
  ): Promise<EquipamentoView> {
    return this.unitOfWork.executar(async ({ equipamentos, journal }) => {
      const equipamento = await equipamentos.buscarPorId(id);
      if (!equipamento) throw new ErroNaoEncontrado('Equipamento não encontrado.');
      if (equipamento.versao !== versao)
        throw new ErroConflito('Conflito de versão do equipamento.');
      const antes = this.dto(equipamento);
      equipamento.atualizarEstadoFisico(estado, justificativa);
      const salvo = await equipamentos.salvar(equipamento, versao);
      if (!salvo) throw new ErroConflito('Conflito de versão do equipamento.');
      const depois = this.dto(salvo);
      await journal.registrar({
        operacao: 'ALTERAR_ESTADO_FISICO',
        entidade: 'Equipamento',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: antes,
        dadosDepois: depois,
      });
      return depois;
    });
  }
  async atualizarStatus(
    id: string,
    status: StatusRastreamento,
    justificativa: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<EquipamentoView> {
    return this.unitOfWork.executar(async ({ equipamentos, journal }) => {
      const equipamento = await equipamentos.buscarPorId(id);
      if (!equipamento) throw new ErroNaoEncontrado('Equipamento não encontrado.');
      if (equipamento.versao !== versao)
        throw new ErroConflito('Conflito de versão do equipamento.');
      const antes = this.dto(equipamento);
      equipamento.atualizarStatus(status, justificativa);
      const salvo = await equipamentos.salvar(equipamento, versao);
      if (!salvo) throw new ErroConflito('Conflito de versão do equipamento.');
      const depois = this.dto(salvo);
      await journal.registrar({
        operacao: 'ALTERAR_STATUS',
        entidade: 'Equipamento',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: antes,
        dadosDepois: depois,
      });
      return depois;
    });
  }
  async excluir(
    id: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<ExclusaoView> {
    return this.unitOfWork.executar(async ({ equipamentos, journal }) => {
      const estado = await this.obterEstado(id, versao, equipamentos);
      if (estado.excluidoEm) return estado;
      const excluidoEm = new Date();
      if (!(await equipamentos.excluir(id, versao, excluidoEm)))
        throw new ErroConflito('Conflito de versão do equipamento.');
      const resultado = { id, excluidoEm, versao: versao + 1 };
      await journal.registrar({
        operacao: 'EXCLUIR_LOGICAMENTE',
        entidade: 'Equipamento',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: estado,
        dadosDepois: resultado,
      });
      return resultado;
    });
  }
  async reativar(
    id: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<ExclusaoView> {
    return this.unitOfWork.executar(async ({ equipamentos, journal }) => {
      const estado = await this.obterEstado(id, versao, equipamentos);
      if (!estado.excluidoEm) return estado;
      const excluido = await equipamentos.buscarPorIdIncluindoExcluido(id);
      if (!excluido) throw new ErroNaoEncontrado('Equipamento não encontrado.');
      if (!(await equipamentos.loteAtivo(excluido.loteId)))
        throw new ErroRegraNegocio('Reative o lote antes de reativar o equipamento.');
      if (!(await equipamentos.reativar(id, versao)))
        throw new ErroConflito('Conflito de versão do equipamento.');
      const resultado = { id, excluidoEm: null, versao: versao + 1 };
      await journal.registrar({
        operacao: 'REATIVAR',
        entidade: 'Equipamento',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: estado,
        dadosDepois: resultado,
      });
      return resultado;
    });
  }
  private async obterEstado(
    id: string,
    versao: number,
    repository: EquipamentoRepository = this.repository
  ): Promise<EstadoExclusao> {
    const estado = await repository.obterEstadoExclusao(id);
    if (!estado) throw new ErroNaoEncontrado('Equipamento não encontrado.');
    if (estado.versao !== versao) throw new ErroConflito('Conflito de versão do equipamento.');
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
    ator: { id: string; usuario: string }
  ) {
    return this.unitOfWork.executar(async ({ equipamentos, journal }) => {
      const equipamento = await equipamentos.buscarPorId(id);
      if (!equipamento) throw new ErroNaoEncontrado('Equipamento não encontrado.');

      const movimentacao = equipamento.registrarMovimentacao({
        id: randomUUID(),
        destino: dados.destino,
        responsavel: ator.usuario,
        ...(dados.observacao ? { observacao: dados.observacao } : {}),
      });

      const salva = await equipamentos.criarMovimentacao(movimentacao);
      const dto = {
        id: salva.id,
        equipamentoId: salva.equipamentoId,
        dataHora: salva.dataHora,
        origem: salva.origem,
        destino: salva.destino,
        responsavel: salva.responsavel,
        observacao: salva.observacao,
      };

      await journal.registrar({
        operacao: 'REGISTRAR_MOVIMENTACAO',
        entidade: 'Equipamento',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosDepois: dto,
      });

      return dto;
    });
  }

  private async buscar(id: string): Promise<Equipamento> {
    const item = await this.repository.buscarPorId(id);
    if (!item) throw new ErroNaoEncontrado('Equipamento não encontrado.');
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
}
