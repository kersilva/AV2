import { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";
import type { PeriodoRelatorio } from "@relatorio/RelatorioTypes.js";
import type { RelatorioQueryService } from "@infra/queries/RelatorioQueryService.js";
import { ErroValidacao } from "@/shared/errors/DomainError.js";
export type { PeriodoRelatorio } from "@relatorio/RelatorioTypes.js";
export class RelatorioService {
  constructor(private readonly queries: RelatorioQueryService) {}
  async gerarRelatorioPorOrganizacao(organizacaoId:string,periodo:PeriodoRelatorio={}) {
    this.validarPeriodo(periodo); const lotes=await this.queries.lotesDaOrganizacao(organizacaoId,periodo);
    return { organizacaoId,periodo,totalLotes:lotes.length,totalEquipamentos:lotes.reduce((total,lote)=>total+lote._count.equipamentos,0),lotes };
  }
  async gerarRelatorioPorStatus(status:StatusRastreamento) { const equipamentos=await this.queries.equipamentosPorStatus(status);return { status,total:equipamentos.length,equipamentos }; }
  async gerarRelatorioFinanceiro(periodo:PeriodoRelatorio={}) {
    this.validarPeriodo(periodo); const contratos=await this.queries.contratosNoPeriodo(periodo);
    return { periodo,quantidadeContratos:contratos.length,valorMensalTotal:contratos.reduce((total,contrato)=>total+contrato.valorMensal,0),contratos };
  }
  private validarPeriodo(periodo:PeriodoRelatorio):void {
    if(periodo.inicio&&Number.isNaN(periodo.inicio.getTime())||periodo.fim&&Number.isNaN(periodo.fim.getTime()))throw new ErroValidacao("O período do relatório contém uma data inválida.");
    if(periodo.inicio&&periodo.fim&&periodo.inicio>periodo.fim)throw new ErroValidacao("A data inicial não pode ser posterior à data final.");
  }
}
