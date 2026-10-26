import { Equipamento } from "@domain/entities/Equipamento.js";
import { Movimentacao } from "@domain/entities/Movimentacao.js";
import type { SoftDeleteRepository } from "@domain/repositories/SoftDeleteRepository.js";

export interface EquipamentoRepository extends SoftDeleteRepository {
  buscarPorId(id: string): Promise<Equipamento | null>;
  buscarPorIdIncluindoExcluido(id: string): Promise<Equipamento | null>;
  listar(): Promise<Equipamento[]>;
  criar(equipamento: Equipamento): Promise<Equipamento>;
  salvar(equipamento: Equipamento, versao: number): Promise<Equipamento | null>;
  criarMovimentacao(movimentacao: Movimentacao): Promise<Movimentacao>;
  loteAtivo(id: string): Promise<boolean>;
  contar(): Promise<number>;
  listarMovimentacoes(equipamentoId: string): Promise<Movimentacao[]>;
}
