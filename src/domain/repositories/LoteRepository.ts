import { Lote } from '@domain/entities/Lote.js';
import type { SoftDeleteRepository } from '@domain/repositories/SoftDeleteRepository.js';

export interface LoteRepository extends SoftDeleteRepository {
  buscarPorId(id: string): Promise<Lote | null>;
  listar(): Promise<Lote[]>;
  criar(lote: Lote): Promise<Lote>;
  salvar(lote: Lote, versao: number): Promise<Lote | null>;
  organizacaoAtiva(id: string): Promise<boolean>;
  organizacaoIdDoLote(id: string): Promise<string | null>;
  possuiEquipamentosAtivos(id: string): Promise<boolean>;
  contar(): Promise<number>;
}
