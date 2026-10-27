import type {
  FiltroJournalTransacao,
  JournalTransacaoRepository,
  ResultadoJournalTransacao,
} from '@domain/repositories/JournalTransacaoRepository.js';
import type { JournalReader as JournalReaderContract } from '@domain/services/JournalReader.js';

export class PrismaJournalReader implements JournalReaderContract {
  constructor(private readonly repository: JournalTransacaoRepository) {}

  listar(filtro: FiltroJournalTransacao): Promise<ResultadoJournalTransacao> {
    return this.repository.listar(filtro);
  }
}
