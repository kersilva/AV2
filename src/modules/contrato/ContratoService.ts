import { Contrato } from '@domain/entities/Contrato.js';
import type { NovoContrato } from '@domain/entities/Contrato.js';
import type { ContratoRepository } from '@domain/repositories/ContratoRepository.js';
import type { EstadoExclusao } from '@domain/repositories/SoftDeleteRepository.js';
import type { UnitOfWork } from '@domain/services/UnitOfWork.js';
import { ErroConflito, ErroNaoEncontrado, ErroRegraNegocio } from '@/shared/errors/DomainError.js';

export type ContratoView = {
  id: string;
  organizacaoId: string;
  dataAssinatura: Date;
  dataVencimento: Date;
  clausulas: string[];
  valorMensal: number;
  renovacaoAutomatica: boolean;
  versao: number;
  excluidoEm: Date | null;
};
export type ExclusaoView = {
  id: string;
  excluidoEm: Date | null;
  versao: number;
};

export class ContratoService {
  constructor(
    private readonly repository: ContratoRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async cadastrar(
    dados: NovoContrato,
    ator: { id: string; usuario: string }
  ): Promise<ContratoView> {
    const novo = Contrato.criar(dados);
    return this.unitOfWork.executar(async ({ contratos, journal }) => {
      if (!(await contratos.organizacaoAtiva(dados.organizacaoId)))
        throw new ErroNaoEncontrado('Organização ativa não encontrada.');
      if (await contratos.existeAtivoParaOrganizacao(dados.organizacaoId))
        throw new ErroConflito(
          'A organização já possui um contrato ativo. Consulte o contrato existente ou exclua-o antes de cadastrar outro.'
        );
      const contrato = await contratos.criar(novo);
      const resultado = this.dto(contrato);
      await journal.registrar({
        operacao: 'CRIAR',
        entidade: 'Contrato',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosDepois: resultado,
      });
      return resultado;
    });
  }

  async listar(): Promise<ContratoView[]> {
    return (await this.repository.listar()).map((item) => this.dto(item));
  }

  async buscar(id: string): Promise<ContratoView> {
    const contrato = await this.repository.buscarPorId(id);
    if (!contrato) throw new ErroNaoEncontrado('Contrato não encontrado.');
    return this.dto(contrato);
  }

  async excluir(
    id: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<ExclusaoView> {
    return this.unitOfWork.executar(async ({ contratos, journal }) => {
      const estado = await this.obterEstado(id, versao, contratos);
      if (estado.excluidoEm) return estado;
      const excluidoEm = new Date();
      if (!(await contratos.excluir(id, versao, excluidoEm)))
        throw new ErroConflito('Conflito de versão do contrato.');
      const resultado = { id, excluidoEm, versao: versao + 1 };
      await journal.registrar({
        operacao: 'EXCLUIR_LOGICAMENTE',
        entidade: 'Contrato',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: estado,
        dadosDepois: resultado,
      });
      return resultado;
    });
  }

  async renovar(
    id: string,
    versao: number,
    novoVencimento: Date,
    ator: { id: string; usuario: string }
  ): Promise<ContratoView> {
    return this.unitOfWork.executar(async ({ contratos, journal }) => {
      const contrato = await contratos.buscarPorId(id);
      if (!contrato) throw new ErroNaoEncontrado('Contrato não encontrado.');
      if (contrato.versao !== versao) throw new ErroConflito('Conflito de versão do contrato.');

      const antes = this.dto(contrato);
      contrato.renovar(novoVencimento);

      if (!(await contratos.atualizarVencimento(id, versao, contrato.dataVencimento)))
        throw new ErroConflito('Conflito de versão do contrato.');

      const atualizado = await contratos.buscarPorId(id);
      if (!atualizado) throw new ErroNaoEncontrado('Contrato não encontrado.');
      const depois = this.dto(atualizado);
      await journal.registrar({
        operacao: 'RENOVAR',
        entidade: 'Contrato',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: antes,
        dadosDepois: depois,
      });
      return depois;
    });
  }

  async reativar(
    id: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<ExclusaoView> {
    return this.unitOfWork.executar(async ({ contratos, journal }) => {
      const estado = await this.obterEstado(id, versao, contratos);
      if (!estado.excluidoEm) return estado;
      const organizacaoId = await contratos.organizacaoIdDoContrato(id);
      if (!organizacaoId) throw new ErroNaoEncontrado('Contrato não encontrado.');

      if (!(await contratos.organizacaoAtiva(organizacaoId)))
        throw new ErroRegraNegocio('Reative a organização antes de reativar o contrato.');
      if (await contratos.existeAtivoParaOrganizacao(organizacaoId))
        throw new ErroConflito(
          'A organização já possui outro contrato ativo. Exclua-o antes de reativar este.'
        );
      if (!(await contratos.reativar(id, versao)))
        throw new ErroConflito('Conflito de versão do contrato.');
      const resultado = { id, excluidoEm: null, versao: versao + 1 };
      await journal.registrar({
        operacao: 'REATIVAR',
        entidade: 'Contrato',
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
    repository: ContratoRepository = this.repository
  ): Promise<EstadoExclusao> {
    const estado = await repository.obterEstadoExclusao(id);
    if (!estado) throw new ErroNaoEncontrado('Contrato não encontrado.');
    if (estado.versao !== versao) throw new ErroConflito('Conflito de versão do contrato.');
    return estado;
  }

  private dto(item: Contrato): ContratoView {
    return {
      id: item.id,
      organizacaoId: item.organizacaoId,
      dataAssinatura: item.dataAssinatura,
      dataVencimento: item.dataVencimento,
      clausulas: item.clausulas,
      valorMensal: item.valorMensal,
      renovacaoAutomatica: item.renovacaoAutomatica,
      versao: item.versao,
      excluidoEm: item.excluidoEm,
    };
  }
}
