import type {
  FiltroJournalTransacao,
  ResultadoJournalTransacao,
} from "@domain/repositories/JournalTransacaoRepository.js";

export interface JournalReader {
  listar(filtro: FiltroJournalTransacao): Promise<ResultadoJournalTransacao>;
}
