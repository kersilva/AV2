import type { NovaJournalTransacao } from "@domain/repositories/JournalTransacaoRepository.js";

export interface JournalWriter {
  registrar(dados: NovaJournalTransacao): Promise<void>;
}
