import type { SoftDeleteRepository } from "@domain/repositories/SoftDeleteRepository.js";

export type OrganizacaoRegistro = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  enderecoCompleto: string;
  telefone: string;
  email: string;
  dataCadastro: Date;
  excluidoEm: Date | null;
  versao: number;
};

export type NovaOrganizacao = Pick<
  OrganizacaoRegistro,
  | "id"
  | "razaoSocial"
  | "cnpj"
  | "inscricaoEstadual"
  | "enderecoCompleto"
  | "telefone"
  | "email"
>;

export interface OrganizacaoRepository extends SoftDeleteRepository {
  buscarPorId(id: string): Promise<OrganizacaoRegistro | null>;
  listar(): Promise<OrganizacaoRegistro[]>;
  criar(dados: NovaOrganizacao): Promise<OrganizacaoRegistro>;
  atualizar(
    id: string,
    versao: number,
    dados: Partial<NovaOrganizacao>,
  ): Promise<OrganizacaoRegistro | null>;
  temVinculosAtivos(id: string): Promise<boolean>;
  contar(): Promise<number>;
}
