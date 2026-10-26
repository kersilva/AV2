import type { FiltroJournalTransacao } from "@domain/repositories/JournalTransacaoRepository.js";
import type { JournalReader } from "@domain/services/JournalReader.js";
import type { JournalTransacaoRecord } from "@domain/repositories/JournalTransacaoRepository.js";
import { ErroValidacao } from "@/shared/errors/DomainError.js";

export type ListarJournalInput = {
  pagina?: number;
  porPagina?: number;
  operacao?: string;
  entidade?: string;
  usuarioId?: string;
  inicio?: Date;
  fim?: Date;
};

export type PaginaJournal = {
  itens: JournalTransacaoRecord[];
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
};

export class JournalService {
  constructor(private readonly reader: JournalReader) {}

  async listar(entrada: ListarJournalInput = {}): Promise<PaginaJournal> {
    const pagina = entrada.pagina ?? 1;
    const porPagina = entrada.porPagina ?? 50;

    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new ErroValidacao("A página deve ser um número inteiro positivo.");
    }
    if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 100) {
      throw new ErroValidacao("A quantidade deve ser entre 1 e 100 registros.");
    }
    if (
      (entrada.inicio && Number.isNaN(entrada.inicio.getTime())) ||
      (entrada.fim && Number.isNaN(entrada.fim.getTime()))
    ) {
      throw new ErroValidacao("O período do journal contém uma data inválida.");
    }
    if (entrada.inicio && entrada.fim && entrada.inicio > entrada.fim) {
      throw new ErroValidacao(
        "A data inicial não pode ser posterior à data final.",
      );
    }

    const filtro: FiltroJournalTransacao = {
      pagina,
      porPagina,
      ...(entrada.operacao ? { operacao: entrada.operacao } : {}),
      ...(entrada.entidade ? { entidade: entrada.entidade } : {}),
      ...(entrada.usuarioId ? { usuarioId: entrada.usuarioId } : {}),
      ...(entrada.inicio ? { inicio: entrada.inicio } : {}),
      ...(entrada.fim ? { fim: entrada.fim } : {}),
    };
    const resultado = await this.reader.listar(filtro);

    return {
      ...resultado,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(resultado.total / porPagina),
    };
  }
}
