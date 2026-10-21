import { EstadoFisico } from "../enums/EstadoFisico.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";
import { TipoEquipamento } from "../enums/TipoEquipamento.js";
import { Movimentacao } from "./Movimentacao.js";

export class Equipamento {
  private _estadoFisico: EstadoFisico;
  private _posicaoNoLote: number;
  private readonly _historicoMovimentacao: Movimentacao[];

  constructor(
    private readonly _id: string,
    private readonly _codigoBarrasInterno: string,
    private readonly _tipo: TipoEquipamento,
    private readonly _marca: string,
    private readonly _modelo: string,
    private readonly _anoFabricacao: number,
    estadoFisico: EstadoFisico,
    private readonly _pesoQuilogramas: number,
    private readonly _loteId: string,
    posicaoNoLote: number,
    private _statusRastreamento: StatusRastreamento,
    historicoMovimentacao: Movimentacao[] = [],
  ) {
    this._estadoFisico = estadoFisico;
    this._posicaoNoLote = posicaoNoLote;
    this._historicoMovimentacao = [...historicoMovimentacao];
  }

  get id(): string {
    return this._id;
  }
  get codigoBarrasInterno(): string {
    return this._codigoBarrasInterno;
  }
  get tipo(): TipoEquipamento {
    return this._tipo;
  }
  get marca(): string {
    return this._marca;
  }
  get modelo(): string {
    return this._modelo;
  }
  get anoFabricacao(): number {
    return this._anoFabricacao;
  }
  get estadoFisico(): EstadoFisico {
    return this._estadoFisico;
  }
  set estadoFisico(novoEstado: EstadoFisico) {
    this._estadoFisico = novoEstado;
  }
  get pesoQuilogramas(): number {
    return this._pesoQuilogramas;
  }
  get loteId(): string {
    return this._loteId;
  }
  get posicaoNoLote(): number {
    return this._posicaoNoLote;
  }
  set posicaoNoLote(posicao: number) {
    this._posicaoNoLote = posicao;
  }
  get statusRastreamento(): StatusRastreamento {
    return this._statusRastreamento;
  }
  get historicoMovimentacao(): Movimentacao[] {
    return [...this._historicoMovimentacao];
  }

  toJSON(): object {
    return {
      id: this.id,
      codigoBarrasInterno: this.codigoBarrasInterno,
      tipo: this.tipo,
      marca: this.marca,
      modelo: this.modelo,
      anoFabricacao: this.anoFabricacao,
      estadoFisico: this.estadoFisico,
      pesoQuilogramas: this.pesoQuilogramas,
      loteId: this.loteId,
      posicaoNoLote: this.posicaoNoLote,
      statusRastreamento: this.statusRastreamento,
      historicoMovimentacao: this.historicoMovimentacao,
    };
  }

  atualizarStatus(novoStatus: StatusRastreamento, justificativa: string): void {
    const triagemConcluida =
      this._statusRastreamento === StatusRastreamento.AGUARDANDO_DESMONTE ||
      this._statusRastreamento === StatusRastreamento.EM_DESMONTE ||
      this._statusRastreamento === StatusRastreamento.PECAS_REAPROVEITADAS ||
      this._statusRastreamento === StatusRastreamento.MATERIAL_RECICLAVEL ||
      this._statusRastreamento === StatusRastreamento.DESCARTE_SEGURO ||
      this._statusRastreamento === StatusRastreamento.BAIXA_DEFINITIVA;
    if (novoStatus === StatusRastreamento.EM_DESMONTE && !triagemConcluida) {
      throw new Error(
        "O equipamento precisa concluir a triagem antes do desmonte.",
      );
    }
    if (!justificativa.trim())
      throw new Error("Informe a justificativa da mudança de status.");
    this._statusRastreamento = novoStatus;
  }

  registrarMovimentacao(destino: string, responsavel: string): void {
    this._historicoMovimentacao.push(
      new Movimentacao(
        `${this._id}-${Date.now()}`,
        this._id,
        new Date(),
        "",
        destino,
        responsavel,
        "",
      ),
    );
  }

  calcularDepreciacao(): number {
    const idade = Math.max(0, new Date().getFullYear() - this._anoFabricacao);
    return Math.min(1, Math.max(0, 0.2 * idade));
  }
}
