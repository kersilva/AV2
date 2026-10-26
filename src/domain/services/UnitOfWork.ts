import type { EquipamentoRepository } from "@domain/repositories/EquipamentoRepository.js";
import type { JournalWriter } from "@domain/services/JournalWriter.js";

export type RecursosTransacao = {
  equipamentos: EquipamentoRepository;
  journal: JournalWriter;
};

export interface UnitOfWork {
  executar<T>(operacao: (recursos: RecursosTransacao) => Promise<T>): Promise<T>;
}
