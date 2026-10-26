import { randomUUID } from "node:crypto";
import type { JournalWriter } from "@domain/services/JournalWriter.js";
import type {
  JournalTransacaoRecord,
  JournalTransacaoRepository,
  NovaJournalTransacao,
} from "@domain/repositories/JournalTransacaoRepository.js";
import { ErroValidacao } from "@/shared/errors/DomainError.js";
export class PrismaJournalWriter implements JournalWriter {
  constructor(private readonly repository: JournalTransacaoRepository) {}
  async registrar(dados: NovaJournalTransacao): Promise<void> {
    if (
      !dados.operacao.trim() ||
      !dados.entidade.trim() ||
      !dados.usuarioResponsavel.trim()
    ) {
      throw new ErroValidacao(
        "A operação, entidade e usuário responsável são obrigatórios no journal.",
      );
    }
    const timestamp = dados.timestamp ?? new Date();
    if (Number.isNaN(timestamp.getTime()))
      throw new ErroValidacao("A data da transação do journal é inválida.");
    const registro: JournalTransacaoRecord = {
      id: dados.id ?? randomUUID(),
      timestamp,
      operacao: dados.operacao.trim(),
      entidade: dados.entidade.trim(),
      dadosAntes: dados.dadosAntes ?? null,
      dadosDepois: dados.dadosDepois ?? null,
      usuarioId: dados.usuarioId ?? null,
      usuarioResponsavel: dados.usuarioResponsavel.trim(),
    };
    await this.repository.criar(registro);
  }
}

