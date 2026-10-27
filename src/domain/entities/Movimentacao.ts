import { ErroValidacao } from '@/shared/errors/DomainError.js';

export type MovimentacaoPersistida = {
  id: string;
  equipamentoId: string;
  dataHora: Date;
  origem: string;
  destino: string;
  responsavel: string;
  observacao: string | null;
  versao: number;
};
export type NovaMovimentacao = Omit<MovimentacaoPersistida, 'versao'>;

export class Movimentacao {
  private constructor(
    private readonly _id: string,
    private readonly _equipamentoId: string,
    private readonly _dataHora: Date,
    private readonly _origem: string,
    private readonly _destino: string,
    private readonly _responsavel: string,
    private readonly _observacao: string | null,
    private readonly _versao: number
  ) {}

  static criar(dados: NovaMovimentacao): Movimentacao {
    if (
      !dados.id.trim() ||
      !dados.equipamentoId.trim() ||
      !dados.destino.trim() ||
      !dados.responsavel.trim()
    ) {
      throw new ErroValidacao(
        'Identificadores, destino e responsável são obrigatórios na movimentação.'
      );
    }
    if (Number.isNaN(dados.dataHora.getTime()))
      throw new ErroValidacao('A data da movimentação é inválida.');
    if (dados.origem.trim() && dados.origem.trim() === dados.destino.trim())
      throw new ErroValidacao('A origem e o destino da movimentação devem ser diferentes.');
    return new Movimentacao(
      dados.id,
      dados.equipamentoId,
      dados.dataHora,
      dados.origem.trim(),
      dados.destino.trim(),
      dados.responsavel.trim(),
      dados.observacao ?? null,
      1
    );
  }

  static reconstituir(dados: MovimentacaoPersistida): Movimentacao {
    return new Movimentacao(
      dados.id,
      dados.equipamentoId,
      dados.dataHora,
      dados.origem,
      dados.destino,
      dados.responsavel,
      dados.observacao,
      dados.versao
    );
  }

  get id(): string {
    return this._id;
  }
  get equipamentoId(): string {
    return this._equipamentoId;
  }
  get dataHora(): Date {
    return this._dataHora;
  }
  get origem(): string {
    return this._origem;
  }
  get destino(): string {
    return this._destino;
  }
  get responsavel(): string {
    return this._responsavel;
  }
  get observacao(): string | null {
    return this._observacao;
  }
  get versao(): number {
    return this._versao;
  }

  toPrisma(): MovimentacaoPersistida {
    return {
      id: this._id,
      equipamentoId: this._equipamentoId,
      dataHora: this._dataHora,
      origem: this._origem,
      destino: this._destino,
      responsavel: this._responsavel,
      observacao: this._observacao,
      versao: this._versao,
    };
  }
}
