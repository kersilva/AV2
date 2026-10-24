import { randomUUID } from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import { JournalTransacao } from "../domain/entities/JournalTransacao.js";
import { JournalRepository } from "../repositories/JournalRepository.js";

export type NovaTransacaoJournal = {
  id?: string;
  timestamp?: Date;
  operacao: string;
  entidade: string;
  dadosAntes?: Prisma.InputJsonValue;
  dadosDepois?: Prisma.InputJsonValue;
  usuarioId?: string;
  usuarioResponsavel: string;
};

export class JournalService {
  constructor(private readonly repository = new JournalRepository()) {}

  async registrar(dados: NovaTransacaoJournal) {
    const id = dados.id ?? randomUUID();
    const timestamp = dados.timestamp ?? new Date();

    new JournalTransacao(
      id,
      timestamp,
      dados.operacao,
      dados.entidade,
      dados.dadosAntes,
      dados.dadosDepois,
      dados.usuarioResponsavel,
    ).registrar();

    return this.repository.registrar({
      id,
      timestamp,
      operacao: dados.operacao,
      entidade: dados.entidade,
      usuarioResponsavel: dados.usuarioResponsavel,
      ...(dados.dadosAntes !== undefined ? { dadosAntes: dados.dadosAntes } : {}),
      ...(dados.dadosDepois !== undefined ? { dadosDepois: dados.dadosDepois } : {}),
      ...(dados.usuarioId !== undefined ? { usuarioId: dados.usuarioId } : {}),
    });
  }

  listar() {
    return this.repository.listar();
  }
}
