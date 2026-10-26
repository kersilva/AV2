import type { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";
export type PeriodoRelatorio={inicio?:Date;fim?:Date};
export type LoteRelatorio={id:string;organizacaoId:string;dataEntrada:Date;_count:{equipamentos:number}};
export type ContratoRelatorio={id:string;organizacaoId:string;valorMensal:number};
export type EquipamentoRelatorio={id:string;codigoBarrasInterno:string;loteId:string};
