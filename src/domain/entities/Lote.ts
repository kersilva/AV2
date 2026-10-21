import { StatusLote } from "../enums/StatusLote.js";
import { Equipamento } from "./Equipamento.js";

export class Lote {
  private readonly _equipamentos: Equipamento[];
  private _statusProcessamento: StatusLote;

  constructor(
    private readonly _id: string,
    private readonly _dataEntrada: Date,
    private readonly _organizacaoId: string,
    private readonly _notaFiscal: string,
    private readonly _transportadora: string,
    equipamentos: Equipamento[] = [],
    statusProcessamento: StatusLote = StatusLote.RECEBIDO,
    private readonly _observacoes = "",
  ) {
    this._equipamentos = [...equipamentos];
    this._statusProcessamento = statusProcessamento;
  }

  get id(): string {
    return this._id;
  }
  get dataEntrada(): Date {
    return this._dataEntrada;
  }
  get organizacaoId(): string {
    return this._organizacaoId;
  }
  get notaFiscal(): string {
    return this._notaFiscal;
  }
  get transportadora(): string {
    return this._transportadora;
  }
  get equipamentos(): Equipamento[] {
    return [...this._equipamentos];
  }
  get statusProcessamento(): StatusLote {
    return this._statusProcessamento;
  }
  set statusProcessamento(status: StatusLote) {
    this._statusProcessamento = status;
  }
  get observacoes(): string {
    return this._observacoes;
  }

  toJSON(): object {
    return {
      id: this.id,
      dataEntrada: this.dataEntrada,
      organizacaoId: this.organizacaoId,
      notaFiscal: this.notaFiscal,
      transportadora: this.transportadora,
      equipamentos: this.equipamentos,
      statusProcessamento: this.statusProcessamento,
      observacoes: this.observacoes,
    };
  }

  adicionarEquipamento(equipamento: Equipamento): void {
    if (equipamento.loteId !== this._id)
      throw new Error("O equipamento referencia outro lote.");
    if (this._equipamentos.some((item) => item.id === equipamento.id))
      throw new Error("O equipamento já foi adicionado ao lote.");
    equipamento.posicaoNoLote = this._equipamentos.length + 1;
    this._equipamentos.push(equipamento);
  }

  removerEquipamento(equipamentoId: string): boolean {
    const index = this._equipamentos.findIndex(
      (item) => item.id === equipamentoId,
    );
    if (index < 0) return false;
    this._equipamentos.splice(index, 1);
    this._equipamentos.forEach((item, pos) => {
      item.posicaoNoLote = pos + 1;
    });
    return true;
  }

  calcularPesoTotal(): number {
    return this._equipamentos.reduce(
      (total, item) => total + item.pesoQuilogramas,
      0,
    );
  }

  gerarRelatorioTriagem(): string {
    const porStatus = this._equipamentos.reduce<Record<string, number>>(
      (contagem, item) => {
        const chave = String(item.statusRastreamento);
        contagem[chave] = (contagem[chave] ?? 0) + 1;
        return contagem;
      },
      {},
    );
    return JSON.stringify(
      { loteId: this._id, total: this._equipamentos.length, porStatus },
      null,
      2,
    );
  }
}
