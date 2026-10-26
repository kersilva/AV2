import { Contrato } from "@domain/entities/Contrato.js";
import type { NovoContrato } from "@domain/entities/Contrato.js";
import type { ContratoRepository } from "@domain/repositories/ContratoRepository.js";
import type { EstadoExclusao } from "@domain/repositories/SoftDeleteRepository.js";
import type { JournalWriter } from "@domain/services/JournalWriter.js";
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroRegraNegocio,
} from "@/shared/errors/DomainError.js";

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
    private readonly journalWriter: JournalWriter,
  ) {}

  async cadastrar(
    dados: NovoContrato,
    ator: { id: string; usuario: string },
  ): Promise<ContratoView> {
    if (!(await this.repository.organizacaoAtiva(dados.organizacaoId)))
      throw new ErroNaoEncontrado("Organização ativa não encontrada.");
    if (await this.repository.existeAtivoParaOrganizacao(dados.organizacaoId))
      throw new ErroConflito(
        "A organização já possui um contrato ativo. Consulte o contrato existente ou exclua-o antes de cadastrar outro.",
      );
    const contrato = await this.repository.criar(Contrato.criar(dados));
    const resultado = this.dto(contrato);
    await this.registrarJournal("CRIAR", ator, null, resultado);
    return resultado;
  }

  async listar(): Promise<ContratoView[]> {
    return (await this.repository.listar()).map((item) => this.dto(item));
  }

  async buscar(id: string): Promise<ContratoView> {
    const contrato = await this.repository.buscarPorId(id);
    if (!contrato) throw new ErroNaoEncontrado("Contrato não encontrado.");
    return this.dto(contrato);
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
      throw new ErroConflito("Conflito de versão do contrato.");
    const resultado = { id, excluidoEm, versao: versao + 1 };
    await this.registrarJournal("EXCLUIR_LOGICAMENTE", ator, estado, resultado);
    return resultado;
  }

  async renovar(
    id: string,
    versao: number,
    novoVencimento: Date,
    ator: { id: string; usuario: string },
  ): Promise<ContratoView> {
    const contrato = await this.repository.buscarPorId(id);
    if (!contrato) throw new ErroNaoEncontrado("Contrato não encontrado.");
    if (contrato.versao !== versao)
      throw new ErroConflito("Conflito de versão do contrato.");

    const antes = this.dto(contrato);
    contrato.renovar(novoVencimento);

    if (
      !(await this.repository.atualizarVencimento(
        id,
        versao,
        contrato.dataVencimento,
      ))
    )
      throw new ErroConflito("Conflito de versão do contrato.");

    const depois = await this.buscar(id);
    await this.registrarJournal("RENOVAR", ator, antes, depois);
    return depois;
  }

  async reativar(
    id: string,
    versao: number,
    ator: { id: string; usuario: string },
  ): Promise<ExclusaoView> {
    const estado = await this.obterEstado(id, versao);
    if (!estado.excluidoEm) return estado;
    const organizacaoId = await this.repository.organizacaoIdDoContrato(id);
    if (!organizacaoId) throw new ErroNaoEncontrado("Contrato não encontrado.");

    if (!(await this.repository.organizacaoAtiva(organizacaoId)))
      throw new ErroRegraNegocio(
        "Reative a organização antes de reativar o contrato.",
      );
    if (await this.repository.existeAtivoParaOrganizacao(organizacaoId))
      throw new ErroConflito(
        "A organização já possui outro contrato ativo. Exclua-o antes de reativar este.",
      );
    if (!(await this.repository.reativar(id, versao)))
      throw new ErroConflito("Conflito de versão do contrato.");
    const resultado = { id, excluidoEm: null, versao: versao + 1 };
    await this.registrarJournal("REATIVAR", ator, estado, resultado);
    return resultado;
  }

  private async obterEstado(
    id: string,
    versao: number,
  ): Promise<EstadoExclusao> {
    const estado = await this.repository.obterEstadoExclusao(id);
    if (!estado) throw new ErroNaoEncontrado("Contrato não encontrado.");
    if (estado.versao !== versao)
      throw new ErroConflito("Conflito de versão do contrato.");
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

  private registrarJournal(
    operacao: string,
    ator: { id: string; usuario: string },
    dadosAntes: unknown,
    dadosDepois: unknown,
  ) {
    return this.journalWriter.registrar({
      operacao,
      entidade: "Contrato",
      usuarioId: ator.id,
      usuarioResponsavel: ator.usuario,
      ...(dadosAntes === null ? {} : { dadosAntes }),
      dadosDepois,
    });
  }
}
