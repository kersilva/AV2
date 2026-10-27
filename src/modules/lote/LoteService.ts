import { ErroConflito, ErroNaoEncontrado, ErroRegraNegocio } from '@/shared/errors/DomainError.js';
import { Lote } from '@domain/entities/Lote.js';
import type { NovoLote } from '@domain/entities/Lote.js';
import type { LoteRepository } from '@domain/repositories/LoteRepository.js';
import type { EstadoExclusao } from '@domain/repositories/SoftDeleteRepository.js';
import type { UnitOfWork } from '@domain/services/UnitOfWork.js';

export type LoteView = {
  id: string;
  dataEntrada: Date;
  organizacaoId: string;
  notaFiscal: string;
  transportadora: string;
  statusProcessamento: string;
  observacoes: string | null;
  versao: number;
  _count: { equipamentos: number };
  equipamentos?: unknown[];
};
export type ExclusaoView = { id: string; excluidoEm: Date | null; versao: number };
export type { NovoLote };

export class LoteService {
  constructor(
    private readonly repository: LoteRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async criarLote(dados: NovoLote, ator: { id: string; usuario: string }): Promise<LoteView> {
    const novo = Lote.criar(dados);
    return this.unitOfWork.executar(async ({ lotes, journal }) => {
      if (!(await lotes.organizacaoAtiva(dados.organizacaoId)))
        throw new ErroNaoEncontrado('Organização ativa não encontrada.');
      const salvo = await lotes.criar(novo);
      const dto = this.dto(salvo, true);
      await journal.registrar({
        operacao: 'CRIAR',
        entidade: 'Lote',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosDepois: dto,
      });
      return dto;
    });
  }

  async listar(): Promise<LoteView[]> {
    return (await this.repository.listar()).map((l) => this.dto(l, false));
  }

  async buscar(id: string): Promise<LoteView> {
    const lote = await this.repository.buscarPorId(id);
    if (!lote) throw new ErroNaoEncontrado('Lote não encontrado.');
    return this.dto(lote, true);
  }

  async processarTriagem(
    id: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<LoteView> {
    return this.unitOfWork.executar(async ({ lotes, journal }) => {
      const lote = await lotes.buscarPorId(id);
      if (!lote) throw new ErroNaoEncontrado('Lote não encontrado.');
      if (lote.versao !== versao) throw new ErroConflito('Conflito de versão do lote.');
      const antes = this.dto(lote, true);
      lote.processarTriagem();
      const salvo = await lotes.salvar(lote, versao);
      if (!salvo) throw new ErroConflito('Conflito de versão do lote.');
      const depois = this.dto(salvo, true);
      await journal.registrar({
        operacao: 'PROCESSAR_TRIAGEM',
        entidade: 'Lote',
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
    return this.unitOfWork.executar(async ({ lotes, journal }) => {
      const estado = await this.obterEstado(id, versao, lotes);
      if (estado.excluidoEm) return estado;
      if (await lotes.possuiEquipamentosAtivos(id))
        throw new ErroRegraNegocio('Não é possível excluir um lote com equipamentos ativos.');
      const excluidoEm = new Date();
      if (!(await lotes.excluir(id, versao, excluidoEm)))
        throw new ErroConflito('Conflito de versão do lote.');
      const resultado = { id, excluidoEm, versao: versao + 1 };
      await journal.registrar({
        operacao: 'EXCLUIR_LOGICAMENTE',
        entidade: 'Lote',
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
    return this.unitOfWork.executar(async ({ lotes, journal }) => {
      const estado = await this.obterEstado(id, versao, lotes);
      if (!estado.excluidoEm) return estado;
      const organizacaoId = await lotes.organizacaoIdDoLote(id);
      if (!organizacaoId) throw new ErroNaoEncontrado('Lote não encontrado.');
      if (!(await lotes.organizacaoAtiva(organizacaoId))) {
        throw new ErroRegraNegocio('Reative a organização do lote antes de reativar o lote.');
      }
      if (!(await lotes.reativar(id, versao)))
        throw new ErroConflito('Conflito de versão do lote.');
      const resultado = { id, excluidoEm: null, versao: versao + 1 };
      await journal.registrar({
        operacao: 'REATIVAR',
        entidade: 'Lote',
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
    repository: LoteRepository = this.repository
  ): Promise<EstadoExclusao> {
    const estado = await repository.obterEstadoExclusao(id);
    if (!estado) throw new ErroNaoEncontrado('Lote não encontrado.');
    if (estado.versao !== versao) throw new ErroConflito('Conflito de versão do lote.');
    return estado;
  }

  private dto(l: Lote, incluir: boolean): LoteView {
    return {
      id: l.id,
      dataEntrada: l.dataEntrada,
      organizacaoId: l.organizacaoId,
      notaFiscal: l.notaFiscal,
      transportadora: l.transportadora,
      statusProcessamento: l.statusProcessamento,
      observacoes: l.observacoes,
      versao: l.versao,
      _count: { equipamentos: l.equipamentos.length },
      ...(incluir
        ? {
            equipamentos: l.equipamentos.map((e) => ({
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
            })),
          }
        : {}),
    };
  }
}
