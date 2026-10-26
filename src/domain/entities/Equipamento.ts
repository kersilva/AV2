import { EstadoFisico } from "@domain/enums/EstadoFisico.js";
import { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";
import { TipoEquipamento } from "@domain/enums/TipoEquipamento.js";
import {
  ErroRegraNegocio,
  ErroValidacao,
} from "@/shared/errors/DomainError.js";
import { Movimentacao, type MovimentacaoPersistida } from "./Movimentacao.js";

export type EquipamentoPersistido = {
  id: string;
  codigoBarrasInterno: string;
  tipo: TipoEquipamento;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  estadoFisico: EstadoFisico;
  pesoQuilogramas: number;
  loteId: string;
  posicaoNoLote: number;
  statusRastreamento: StatusRastreamento;
  versao: number;
};

export type NovoEquipamento = Omit<
  EquipamentoPersistido,
  "versao" | "statusRastreamento"
> & {
  statusRastreamento?: StatusRastreamento;
};

const ORDEM_ESTADO: EstadoFisico[] = [
  EstadoFisico.NOVO,
  EstadoFisico.BOM_ESTADO,
  EstadoFisico.USADO_LEVE,
  EstadoFisico.USADO_MODERADO,
  EstadoFisico.DANIFICADO_LEVE,
  EstadoFisico.DANIFICADO_GRAVE,
  EstadoFisico.INSERVIVEL,
];

export class Equipamento {
  private constructor(
    private readonly _id: string,
    private readonly _codigoBarrasInterno: string,
    private readonly _tipo: TipoEquipamento,
    private readonly _marca: string,
    private readonly _modelo: string,
    private readonly _anoFabricacao: number,
    private _estadoFisico: EstadoFisico,
    private readonly _pesoQuilogramas: number,
    private readonly _loteId: string,
    private _posicaoNoLote: number,
    private _statusRastreamento: StatusRastreamento,
    private readonly _historicoMovimentacao: Movimentacao[],
    private _versao: number,
  ) {}

  static criar(dados: NovoEquipamento): Equipamento {
    if (
      !dados.id.trim() ||
      !dados.codigoBarrasInterno.trim() ||
      !dados.marca.trim() ||
      !dados.modelo.trim()
    ) {
      throw new ErroValidacao("Preencha os dados obrigatórios do equipamento.");
    }
    if (!Number.isInteger(dados.anoFabricacao) || dados.anoFabricacao < 1900) {
      throw new ErroValidacao("O ano de fabricação do equipamento é inválido.");
    }
    if (!Number.isFinite(dados.pesoQuilogramas) || dados.pesoQuilogramas <= 0) {
      throw new ErroValidacao("O peso do equipamento deve ser positivo.");
    }
    if (!Number.isInteger(dados.posicaoNoLote) || dados.posicaoNoLote < 1) {
      throw new ErroValidacao(
        "A posição do equipamento no lote deve ser positiva.",
      );
    }
    return new Equipamento(
      dados.id,
      dados.codigoBarrasInterno,
      dados.tipo,
      dados.marca.trim(),
      dados.modelo.trim(),
      dados.anoFabricacao,
      dados.estadoFisico,
      dados.pesoQuilogramas,
      dados.loteId,
      dados.posicaoNoLote,
      dados.statusRastreamento ?? StatusRastreamento.AGUARDANDO_TRIAGEM,
      [],
      1,
    );
  }

  static reconstituir(
    dados: EquipamentoPersistido,
    historico: Movimentacao[] = [],
  ): Equipamento {
    return new Equipamento(
      dados.id,
      dados.codigoBarrasInterno,
      dados.tipo,
      dados.marca,
      dados.modelo,
      dados.anoFabricacao,
      dados.estadoFisico,
      dados.pesoQuilogramas,
      dados.loteId,
      dados.posicaoNoLote,
      dados.statusRastreamento,
      [...historico],
      dados.versao,
    );
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
  get pesoQuilogramas(): number {
    return this._pesoQuilogramas;
  }
  get loteId(): string {
    return this._loteId;
  }
  get posicaoNoLote(): number {
    return this._posicaoNoLote;
  }
  get statusRastreamento(): StatusRastreamento {
    return this._statusRastreamento;
  }
  get historicoMovimentacao(): Movimentacao[] {
    return [...this._historicoMovimentacao];
  }
  get versao(): number {
    return this._versao;
  }

  atualizarEstadoFisico(novoEstado: EstadoFisico, justificativa: string): void {
    const anterior = ORDEM_ESTADO.indexOf(this._estadoFisico);
    const novo = ORDEM_ESTADO.indexOf(novoEstado);
    if (novo < 0) throw new ErroValidacao("Estado físico inválido.");
    if (novo >= anterior + 2 && !justificativa.trim()) {
      throw new ErroRegraNegocio(
        "É obrigatória justificativa para queda de duas categorias no estado físico.",
      );
    }
    this._estadoFisico = novoEstado;
  }

  atualizarStatus(novoStatus: StatusRastreamento, justificativa: string): void {
    if (!justificativa.trim())
      throw new ErroValidacao("Informe a justificativa da mudança de status.");
    if (
      novoStatus === StatusRastreamento.AGUARDANDO_DESMONTE &&
      this._statusRastreamento !== StatusRastreamento.EM_TRIAGEM
    ) {
      throw new ErroRegraNegocio(
        "O equipamento só pode aguardar desmonte após a triagem.",
      );
    }
    if (
      novoStatus === StatusRastreamento.EM_DESMONTE &&
      this._statusRastreamento !== StatusRastreamento.AGUARDANDO_DESMONTE
    ) {
      throw new ErroRegraNegocio("O desmonte só pode começar após a triagem.");
    }
    this._statusRastreamento = novoStatus;
  }

  registrarMovimentacao(dados: {
    id: string;
    destino: string;
    responsavel: string;
    observacao?: string;
    dataHora?: Date;
  }): Movimentacao {
    const origem = this._historicoMovimentacao.at(-1)?.destino ?? "";
    const movimentacao = Movimentacao.criar({
      id: dados.id,
      equipamentoId: this._id,
      dataHora: dados.dataHora ?? new Date(),
      origem,
      destino: dados.destino,
      responsavel: dados.responsavel,
      observacao: dados.observacao ?? "",
    });
    this._historicoMovimentacao.push(movimentacao);
    return movimentacao;
  }

  calcularDepreciacao(coeficienteAnual = 0.2): number {
    const idade = Math.max(0, new Date().getFullYear() - this._anoFabricacao);
    return Math.min(1, Math.max(0, coeficienteAnual * idade));
  }

  toPrisma(): EquipamentoPersistido {
    return {
      id: this._id,
      codigoBarrasInterno: this._codigoBarrasInterno,
      tipo: this._tipo,
      marca: this._marca,
      modelo: this._modelo,
      anoFabricacao: this._anoFabricacao,
      estadoFisico: this._estadoFisico,
      pesoQuilogramas: this._pesoQuilogramas,
      loteId: this._loteId,
      posicaoNoLote: this._posicaoNoLote,
      statusRastreamento: this._statusRastreamento,
      versao: this._versao,
    };
  }
}
