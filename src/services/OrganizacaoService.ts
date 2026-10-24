import type { Prisma } from "../generated/prisma/client.js";
import { ValidadorCNPJ } from "../domain/validators/ValidadorCNPJ.js";
import { OrganizacaoRepository } from "../repositories/OrganizacaoRepository.js";

export type NovaOrganizacao = Pick<
  Prisma.OrganizacaoCreateInput,
  | "id"
  | "razaoSocial"
  | "cnpj"
  | "inscricaoEstadual"
  | "enderecoCompleto"
  | "telefone"
  | "email"
>;

export class ErroValidacao extends Error {}

export class OrganizacaoService {
  constructor(
    private readonly repository = new OrganizacaoRepository(),
    private readonly validadorCNPJ = new ValidadorCNPJ(),
  ) {}

  async cadastrar(dados: NovaOrganizacao) {
    if (!this.validadorCNPJ.validar(dados.cnpj)) {
      throw new ErroValidacao(this.validadorCNPJ.obterMensagemErro());
    }

    return this.repository.criar(dados);
  }

  listar() {
    return this.repository.listar();
  }
}
