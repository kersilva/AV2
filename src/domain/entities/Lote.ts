import { StatusLote } from '@domain/enums/StatusLote.js';
import { ErroRegraNegocio, ErroValidacao } from '@/shared/errors/DomainError.js';
import { Equipamento } from './Equipamento.js';

export type LotePersistido = {
  id: string;
  dataEntrada: Date;
  organizacaoId: string;
  notaFiscal: string;
  transportadora: string;
  statusProcessamento: StatusLote;
  observacoes: string | null;
  versao: number;
};
export type NovoLote = Omit<LotePersistido, 'versao' | 'statusProcessamento'> & {
  statusProcessamento?: StatusLote;
  observacoes?: string | null;
};

const PROXIMO: Partial<Record<StatusLote, StatusLote>> = {
  [StatusLote.RECEBIDO]: StatusLote.EM_TRIAGEM,
  [StatusLote.EM_TRIAGEM]: StatusLote.TRIAGEM_CONCLUIDA,
  [StatusLote.TRIAGEM_CONCLUIDA]: StatusLote.ENCAMINHADO,
  [StatusLote.ENCAMINHADO]: StatusLote.FINALIZADO,
};

export class Lote {
  private constructor(
    private readonly _id: string,
    private readonly _dataEntrada: Date,
    private readonly _organizacaoId: string,
    private readonly _notaFiscal: string,
    private readonly _transportadora: string,
    private readonly _equipamentos: Equipamento[],
    private _statusProcessamento: StatusLote,
    private readonly _observacoes: string | null,
    private _versao: number
  ) {}

  static criar(dados: NovoLote): Lote {
    if (
      !dados.id.trim() ||
      !dados.organizacaoId.trim() ||
      !dados.notaFiscal.trim() ||
      !dados.transportadora.trim()
    ) {
      throw new ErroValidacao('Nota fiscal, transportadora e identificadores são obrigatórios.');
    }
    if (Number.isNaN(dados.dataEntrada.getTime()))
      throw new ErroValidacao('Data de entrada inválida.');
    return new Lote(
      dados.id,
      dados.dataEntrada,
      dados.organizacaoId,
      dados.notaFiscal.trim(),
      dados.transportadora.trim(),
      [],
      dados.statusProcessamento ?? StatusLote.RECEBIDO,
      dados.observacoes ?? null,
      1
    );
  }

  static reconstituir(dados: LotePersistido, equipamentos: Equipamento[] = []): Lote {
    return new Lote(
      dados.id,
      dados.dataEntrada,
      dados.organizacaoId,
      dados.notaFiscal,
      dados.transportadora,
      [...equipamentos],
      dados.statusProcessamento,
      dados.observacoes,
      dados.versao
    );
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
  get observacoes(): string | null {
    return this._observacoes;
  }
  get versao(): number {
    return this._versao;
  }

  adicionarEquipamento(equipamento: Equipamento): void {
    if (equipamento.loteId !== this._id)
      throw new ErroRegraNegocio('O equipamento referencia outro lote.');
    if (this._equipamentos.some((item) => item.id === equipamento.id))
      throw new ErroRegraNegocio('O equipamento já foi adicionado ao lote.');
    this._equipamentos.push(equipamento);
  }

  removerEquipamento(equipamentoId: string): boolean {
    const index = this._equipamentos.findIndex((item) => item.id === equipamentoId);
    if (index < 0) return false;
    this._equipamentos.splice(index, 1);
    return true;
  }

  processarTriagem(): void {
    const proximo = PROXIMO[this._statusProcessamento];
    if (!proximo) throw new ErroRegraNegocio('O lote já está no estado final.');
    this._statusProcessamento = proximo;
  }

  calcularPesoTotal(): number {
    return this._equipamentos.reduce((total, item) => total + item.pesoQuilogramas, 0);
  }

  toPrisma(): LotePersistido {
    return {
      id: this._id,
      dataEntrada: this._dataEntrada,
      organizacaoId: this._organizacaoId,
      notaFiscal: this._notaFiscal,
      transportadora: this._transportadora,
      statusProcessamento: this._statusProcessamento,
      observacoes: this._observacoes,
      versao: this._versao,
    };
  }
}
