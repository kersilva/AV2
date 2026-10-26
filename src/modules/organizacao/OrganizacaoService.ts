import type {
  OrganizacaoRepository,
  NovaOrganizacao,
  OrganizacaoRegistro,
} from "@domain/repositories/OrganizacaoRepository.js";
import { ValidadorCNPJ } from "@domain/validators/ValidadorCNPJ.js";
import type { JournalWriter } from "@domain/services/JournalWriter.js";
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroRegraNegocio,
  ErroValidacao,
} from "@/shared/errors/DomainError.js";

const ROTULOS: Record<Exclude<keyof NovaOrganizacao, "id">, string> = {
  razaoSocial: "A razão social",
  cnpj: "O CNPJ",
  inscricaoEstadual: "A inscrição estadual",
  enderecoCompleto: "O endereço",
  telefone: "O telefone",
  email: "O e-mail",
};

export type ExclusaoView = {
  id: string;
  excluidoEm: Date | null;
  versao: number;
};

export class OrganizacaoService {
  constructor(
    private readonly repository: OrganizacaoRepository,
    private readonly journalWriter: JournalWriter,
    private readonly validadorCNPJ = new ValidadorCNPJ(),
  ) {}

  async atualizar(
    id: string,
    versao: number,
    dados: Partial<Omit<NovaOrganizacao, "id">>,
    ator: { id: string; usuario: string },
  ): Promise<OrganizacaoRegistro> {
    const atual = await this.buscar(id);
    if (atual.versao !== versao)
      throw new ErroConflito("Conflito de versão da organização.");

    const alteracoes: Partial<Omit<NovaOrganizacao, "id">> = {};
    for (const campo of Object.keys(ROTULOS) as (keyof typeof ROTULOS)[]) {
      const valor = dados[campo];
      if (valor === undefined) continue;
      const limpo = valor.trim();
      if (!limpo) throw new ErroValidacao(`${ROTULOS[campo]} é obrigatório.`);
      alteracoes[campo] = limpo;
    }

    if (Object.keys(alteracoes).length === 0)
      throw new ErroValidacao("Informe ao menos um campo para atualizar.");

    if (
      alteracoes.cnpj !== undefined &&
      !this.validadorCNPJ.validar(alteracoes.cnpj)
    )
      throw new ErroValidacao(this.validadorCNPJ.obterMensagemErro());

    if (!(await this.repository.atualizar(id, versao, alteracoes)))
      throw new ErroConflito(
        "A organização foi alterada. Consulte a versão atual e tente novamente.",
      );

    const resultado = await this.rastrearOrganizacao(id);
    await this.registrarJournal("ATUALIZAR", ator, atual, resultado);
    return resultado;
  }

  async cadastrar(
    dados: NovaOrganizacao,
    ator: { id: string; usuario: string },
  ): Promise<OrganizacaoRegistro> {
    const campos: [keyof NovaOrganizacao, string][] = [
      ["id", "O identificador"],
      ["razaoSocial", "A razão social"],
      ["cnpj", "O CNPJ"],
      ["inscricaoEstadual", "A inscrição estadual"],
      ["enderecoCompleto", "O endereço"],
      ["telefone", "O telefone"],
      ["email", "O e-mail"],
    ];
    for (const [campo, nome] of campos) {
      if (!dados[campo].trim())
        throw new ErroValidacao(`${nome} é obrigatório.`);
    }
    if (!this.validadorCNPJ.validar(dados.cnpj)) {
      throw new ErroValidacao(this.validadorCNPJ.obterMensagemErro());
    }
    const normalizados = Object.fromEntries(
      campos.map(([campo]) => [campo, dados[campo].trim()]),
    ) as NovaOrganizacao;
    const criada = await this.repository.criar(normalizados);
    await this.registrarJournal("CRIAR", ator, null, criada);
    return criada;
  }

  listar(): Promise<OrganizacaoRegistro[]> {
    return this.repository.listar();
  }

  async rastrearOrganizacao(id: string): Promise<OrganizacaoRegistro> {
    return this.buscar(id);
  }

  private async buscar(id: string): Promise<OrganizacaoRegistro> {
    const organizacao = await this.repository.buscarPorId(id);
    if (!organizacao)
      throw new ErroNaoEncontrado("Organização não encontrada.");
    return organizacao;
  }

  async excluir(
    id: string,
    versao: number,
    ator: { id: string; usuario: string },
  ): Promise<ExclusaoView> {
    const estado = await this.obterEstado(id, versao);
    if (estado.excluidoEm) return estado;
    if (await this.repository.temVinculosAtivos(id)) {
      throw new ErroRegraNegocio(
        "Não é possível excluir a organização enquanto ela tiver contratos ou lotes ativos.",
      );
    }
    const excluidoEm = new Date();
    if (!(await this.repository.excluir(id, versao, excluidoEm))) {
      throw new ErroConflito(
        "A organização foi alterada. Consulte a versão atual e tente novamente.",
      );
    }
    const resultado = { id, excluidoEm, versao: versao + 1 };
    await this.registrarJournal("EXCLUIR_LOGICAMENTE", ator, estado, resultado);
    return resultado;
  }

  async reativar(
    id: string,
    versao: number,
    ator: { id: string; usuario: string },
  ): Promise<ExclusaoView> {
    const estado = await this.obterEstado(id, versao);
    if (!estado.excluidoEm) return estado;
    if (!(await this.repository.reativar(id, versao))) {
      throw new ErroConflito(
        "A organização foi alterada. Consulte a versão atual e tente novamente.",
      );
    }
    const resultado = { id, excluidoEm: null, versao: versao + 1 };
    await this.registrarJournal("REATIVAR", ator, estado, resultado);
    return resultado;
  }

  private async obterEstado(id: string, versao: number): Promise<ExclusaoView> {
    const estado = await this.repository.obterEstadoExclusao(id);
    if (!estado) throw new ErroNaoEncontrado("Organização não encontrada.");
    if (estado.versao !== versao)
      throw new ErroConflito("Conflito de versão da organização.");
    return estado;
  }

  private registrarJournal(
    operacao: string,
    ator: { id: string; usuario: string },
    dadosAntes: unknown,
    dadosDepois: unknown,
  ) {
    return this.journalWriter.registrar({
      operacao,
      entidade: "Organizacao",
      usuarioId: ator.id,
      usuarioResponsavel: ator.usuario,
      ...(dadosAntes === null ? {} : { dadosAntes }),
      dadosDepois,
    });
  }
}
