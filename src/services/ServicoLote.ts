import { Lote } from "../domain/entities/Lote.js";
import { StatusLote } from "../domain/enums/StatusLote.js";
import { ValidadorDataEntrada } from "../domain/validators/ValidadorDataEntrada.js";

export class ServicoLote {
  private readonly lotes = new Map<string, Lote>();
  private readonly validadorData = new ValidadorDataEntrada();

  criarLote(dados: Lote): Lote {
    if (this.lotes.has(dados.id))
      throw new Error("Identificador de lote já cadastrado.");
    if (!this.validadorData.validar(dados.dataEntrada)) {
      throw new Error(this.validadorData.obterMensagemErro());
    }
    this.lotes.set(dados.id, dados);
    return dados;
  }

  adicionarEquipamentoAoLote(
    loteId: string,
    equipamento: Parameters<Lote["adicionarEquipamento"]>[0],
  ): void {
    const lote = this.lotes.get(loteId);
    if (!lote) throw new Error("Lote não encontrado.");
    lote.adicionarEquipamento(equipamento);
  }

  processarTriagem(loteId: string): void {
    const lote = this.lotes.get(loteId);
    if (!lote) throw new Error("Lote não encontrado.");
    lote.statusProcessamento = Math.min(
      lote.statusProcessamento + 1,
      StatusLote.FINALIZADO,
    );
  }

  consultarLotePorPeriodo(dataInicio: Date, dataFim: Date): Lote[] {
    return [...this.lotes.values()].filter(
      (lote) => lote.dataEntrada >= dataInicio && lote.dataEntrada <= dataFim,
    );
  }
}
