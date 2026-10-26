import { Contrato } from "@domain/entities/Contrato.js";
import type { SoftDeleteRepository } from "@domain/repositories/SoftDeleteRepository.js";

export interface ContratoRepository extends SoftDeleteRepository {
  buscarPorId(id: string): Promise<Contrato | null>;
  listar(): Promise<Contrato[]>;
  criar(contrato: Contrato): Promise<Contrato>;
  organizacaoAtiva(id: string): Promise<boolean>;
  organizacaoIdDoContrato(id: string): Promise<string | null>;
  existeAtivoParaOrganizacao(organizacaoId: string): Promise<boolean>;
  contar(): Promise<number>;
  atualizarVencimento(id: string, versao: number, novoVencimento: Date): Promise<boolean>;
}
