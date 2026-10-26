export type JournalTransacaoRecord = {
  id: string;
  timestamp: Date;
  operacao: string;
  entidade: string;
  dadosAntes: unknown | null;
  dadosDepois: unknown | null;
  usuarioId: string | null;
  usuarioResponsavel: string;
};
export type NovaJournalTransacao = Omit<JournalTransacaoRecord, "id" | "timestamp" | "dadosAntes" | "dadosDepois" | "usuarioId"> & {
  id?: string;
  timestamp?: Date;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  usuarioId?: string;
};
export type FiltroJournalTransacao = {
  pagina: number;
  porPagina: number;
  operacao?: string;
  entidade?: string;
  usuarioId?: string;
  inicio?: Date;
  fim?: Date;
};
export type ResultadoJournalTransacao = { itens: JournalTransacaoRecord[]; total: number };
export interface JournalTransacaoRepository {
  criar(dados: JournalTransacaoRecord): Promise<JournalTransacaoRecord>;
  listar(filtro: FiltroJournalTransacao): Promise<ResultadoJournalTransacao>;
}
