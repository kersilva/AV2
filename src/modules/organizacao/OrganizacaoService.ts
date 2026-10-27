import type {
  OrganizacaoRepository,
  NovaOrganizacao,
  OrganizacaoRegistro,
} from '@domain/repositories/OrganizacaoRepository.js';
import { ValidadorCNPJ } from '@domain/validators/ValidadorCNPJ.js';
import type { UnitOfWork } from '@domain/services/UnitOfWork.js';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroRegraNegocio,
  ErroValidacao,
} from '@/shared/errors/DomainError.js';

const ROTULOS: Record<Exclude<keyof NovaOrganizacao, 'id'>, string> = {
  razaoSocial: 'A razão social',
  cnpj: 'O CNPJ',
  inscricaoEstadual: 'A inscrição estadual',
  enderecoCompleto: 'O endereço',
  telefone: 'O telefone',
  email: 'O e-mail',
};

const somenteDigitos = (valor: string) => valor.replace(/\D/g, '');

export type ExclusaoView = {
  id: string;
  excluidoEm: Date | null;
  versao: number;
};

export class OrganizacaoService {
  constructor(
    private readonly repository: OrganizacaoRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly validadorCNPJ = new ValidadorCNPJ()
  ) {}

  async atualizar(
    id: string,
    versao: number,
    dados: Partial<Omit<NovaOrganizacao, 'id'>>,
    ator: { id: string; usuario: string }
  ): Promise<OrganizacaoRegistro> {
    const alteracoes: Partial<Omit<NovaOrganizacao, 'id'>> = {};
    for (const campo of Object.keys(ROTULOS) as (keyof typeof ROTULOS)[]) {
      const valor = dados[campo];
      if (valor === undefined) continue;
      const limpo = valor.trim();
      if (!limpo) throw new ErroValidacao(`${ROTULOS[campo]} é obrigatório.`);
      alteracoes[campo] = campo === 'cnpj' ? somenteDigitos(limpo) : limpo;
    }

    if (Object.keys(alteracoes).length === 0)
      throw new ErroValidacao('Informe ao menos um campo para atualizar.');

    if (alteracoes.cnpj !== undefined && !this.validadorCNPJ.validar(alteracoes.cnpj))
      throw new ErroValidacao(this.validadorCNPJ.obterMensagemErro());

    return this.unitOfWork.executar(async ({ organizacoes, journal }) => {
      const atual = await organizacoes.buscarPorId(id);
      if (!atual) throw new ErroNaoEncontrado('Organização não encontrada.');
      if (atual.versao !== versao) throw new ErroConflito('Conflito de versão da organização.');

      const atualizada = await organizacoes.atualizar(id, versao, alteracoes);
      if (!atualizada)
        throw new ErroConflito(
          'A organização foi alterada. Consulte a versão atual e tente novamente.'
        );

      await journal.registrar({
        operacao: 'ATUALIZAR',
        entidade: 'Organizacao',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: atual,
        dadosDepois: atualizada,
      });
      return atualizada;
    });
  }

  async cadastrar(
    dados: NovaOrganizacao,
    ator: { id: string; usuario: string }
  ): Promise<OrganizacaoRegistro> {
    const campos: [keyof NovaOrganizacao, string][] = [
      ['id', 'O identificador'],
      ['razaoSocial', 'A razão social'],
      ['cnpj', 'O CNPJ'],
      ['inscricaoEstadual', 'A inscrição estadual'],
      ['enderecoCompleto', 'O endereço'],
      ['telefone', 'O telefone'],
      ['email', 'O e-mail'],
    ];
    for (const [campo, nome] of campos) {
      if (!dados[campo].trim()) throw new ErroValidacao(`${nome} é obrigatório.`);
    }
    const normalizados = Object.fromEntries(
      campos.map(([campo]) => [campo, dados[campo].trim()])
    ) as NovaOrganizacao;
    normalizados.cnpj = somenteDigitos(normalizados.cnpj);

    if (!this.validadorCNPJ.validar(normalizados.cnpj)) {
      throw new ErroValidacao(this.validadorCNPJ.obterMensagemErro());
    }
    return this.unitOfWork.executar(async ({ organizacoes, journal }) => {
      const criada = await organizacoes.criar(normalizados);
      await journal.registrar({
        operacao: 'CRIAR',
        entidade: 'Organizacao',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosDepois: criada,
      });
      return criada;
    });
  }

  listar(): Promise<OrganizacaoRegistro[]> {
    return this.repository.listar();
  }

  async rastrearOrganizacao(id: string): Promise<OrganizacaoRegistro> {
    return this.buscar(id);
  }

  private async buscar(id: string): Promise<OrganizacaoRegistro> {
    const organizacao = await this.repository.buscarPorId(id);
    if (!organizacao) throw new ErroNaoEncontrado('Organização não encontrada.');
    return organizacao;
  }

  async excluir(
    id: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<ExclusaoView> {
    return this.unitOfWork.executar(async ({ organizacoes, journal }) => {
      const estado = await this.obterEstado(id, versao, organizacoes);
      if (estado.excluidoEm) return estado;
      if (await organizacoes.temVinculosAtivos(id))
        throw new ErroRegraNegocio(
          'Não é possível excluir a organização enquanto ela tiver contratos ou lotes ativos.'
        );
      const excluidoEm = new Date();
      if (!(await organizacoes.excluir(id, versao, excluidoEm)))
        throw new ErroConflito(
          'A organização foi alterada. Consulte a versão atual e tente novamente.'
        );
      const resultado = { id, excluidoEm, versao: versao + 1 };
      await journal.registrar({
        operacao: 'EXCLUIR_LOGICAMENTE',
        entidade: 'Organizacao',
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
    return this.unitOfWork.executar(async ({ organizacoes, journal }) => {
      const estado = await this.obterEstado(id, versao, organizacoes);
      if (!estado.excluidoEm) return estado;
      if (!(await organizacoes.reativar(id, versao)))
        throw new ErroConflito(
          'A organização foi alterada. Consulte a versão atual e tente novamente.'
        );
      const resultado = { id, excluidoEm: null, versao: versao + 1 };
      await journal.registrar({
        operacao: 'REATIVAR',
        entidade: 'Organizacao',
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
    repository: OrganizacaoRepository = this.repository
  ): Promise<ExclusaoView> {
    const estado = await repository.obterEstadoExclusao(id);
    if (!estado) throw new ErroNaoEncontrado('Organização não encontrada.');
    if (estado.versao !== versao) throw new ErroConflito('Conflito de versão da organização.');
    return estado;
  }
}
