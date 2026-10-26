import {
  ErroRegraNegocio,
  ErroValidacao,
} from "@/shared/errors/DomainError.js";

export type ContratoPersistido = {
  id: string;
  organizacaoId: string;
  dataAssinatura: Date;
  dataVencimento: Date;
  clausulas: string[];
  valorMensal: number;
  renovacaoAutomatica: boolean;
  versao: number;
  excluidoEm: Date | null;
};
export type NovoContrato = Omit<ContratoPersistido, "versao" | "excluidoEm">;

export class Contrato {
  private constructor(
    private readonly _id: string,
    private readonly _organizacaoId: string,
    private readonly _dataAssinatura: Date,
    private _dataVencimento: Date,
    private readonly _clausulas: string[],
    private readonly _valorMensal: number,
    private readonly _renovacaoAutomatica: boolean,
    private _versao: number,
    private _excluidoEm: Date | null,
  ) {}

  static criar(dados: NovoContrato): Contrato {
    if (!dados.id.trim() || !dados.organizacaoId.trim())
      throw new ErroValidacao("Identificadores do contrato são obrigatórios.");
    if (
      Number.isNaN(dados.dataAssinatura.getTime()) ||
      Number.isNaN(dados.dataVencimento.getTime())
    )
      throw new ErroValidacao("As datas do contrato são inválidas.");
    if (dados.dataVencimento < dados.dataAssinatura)
      throw new ErroRegraNegocio(
        "O vencimento não pode ser anterior à assinatura.",
      );
    if (!Number.isFinite(dados.valorMensal) || dados.valorMensal <= 0)
      throw new ErroValidacao("O valor mensal deve ser positivo.");
    if (dados.clausulas.some((clausula) => !clausula.trim()))
      throw new ErroValidacao(
        "As cláusulas do contrato não podem estar vazias.",
      );
    return new Contrato(
      dados.id,
      dados.organizacaoId,
      dados.dataAssinatura,
      dados.dataVencimento,
      [...dados.clausulas],
      dados.valorMensal,
      dados.renovacaoAutomatica,
      1,
      null,
    );
  }

  static reconstituir(dados: ContratoPersistido): Contrato {
    return new Contrato(
      dados.id,
      dados.organizacaoId,
      dados.dataAssinatura,
      dados.dataVencimento,
      [...dados.clausulas],
      dados.valorMensal,
      dados.renovacaoAutomatica,
      dados.versao,
      dados.excluidoEm,
    );
  }

  get id(): string {
    return this._id;
  }
  get organizacaoId(): string {
    return this._organizacaoId;
  }
  get dataAssinatura(): Date {
    return this._dataAssinatura;
  }
  get dataVencimento(): Date {
    return this._dataVencimento;
  }
  get clausulas(): string[] {
    return [...this._clausulas];
  }
  get valorMensal(): number {
    return this._valorMensal;
  }
  get renovacaoAutomatica(): boolean {
    return this._renovacaoAutomatica;
  }
  get versao(): number {
    return this._versao;
  }
  get excluidoEm(): Date | null {
    return this._excluidoEm;
  }

  estaVigente(): boolean {
    const agora = new Date();
    return this._dataAssinatura <= agora && this._dataVencimento >= agora;
  }

  renovar(novoVencimento: Date): void {
    if (this._excluidoEm)
      throw new ErroRegraNegocio("Contrato excluído não pode ser renovado.");
    if (Number.isNaN(novoVencimento.getTime()))
      throw new ErroValidacao("A nova data de vencimento é inválida.");
    if (novoVencimento <= this._dataVencimento)
      throw new ErroRegraNegocio(
        "O novo vencimento deve ser posterior ao vencimento atual.",
      );
    this._dataVencimento = novoVencimento;
  }

  toPrisma(): ContratoPersistido {
    return {
      id: this._id,
      organizacaoId: this._organizacaoId,
      dataAssinatura: this._dataAssinatura,
      dataVencimento: this._dataVencimento,
      clausulas: [...this._clausulas],
      valorMensal: this._valorMensal,
      renovacaoAutomatica: this._renovacaoAutomatica,
      versao: this._versao,
      excluidoEm: this._excluidoEm,
    };
  }
}
