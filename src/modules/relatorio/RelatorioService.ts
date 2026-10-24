import type { StatusRastreamento } from "@/generated/prisma/enums.js";
import { RelatorioRepository } from "@relatorio/RelatorioRepository.js";

export type PeriodoRelatorio = { inicio?: Date; fim?: Date };

export class ServicoRelatorio {
  constructor(private readonly repository = new RelatorioRepository()) {}

  async gerarRelatorioPorOrganizacao(organizacaoId: string, periodo: PeriodoRelatorio = {}) {
    this.validar(periodo);
    const lotes = await this.repository.lotesDaOrganizacao(organizacaoId, periodo.inicio, periodo.fim);
    return {
      organizacaoId, periodo, totalLotes: lotes.length,
      totalEquipamentos: lotes.reduce((soma, lote) => soma + lote._count.equipamentos, 0),
      lotes,
    };
  }

  async gerarRelatorioPorStatus(status: StatusRastreamento) {
    const equipamentos = await this.repository.equipamentosPorStatus(status);
    return { status, total: equipamentos.length, equipamentos };
  }

  async gerarRelatorioFinanceiro(periodo: PeriodoRelatorio = {}) {
    this.validar(periodo);
    const contratos = await this.repository.contratosNoPeriodo(periodo.inicio, periodo.fim);
    return {
      periodo, quantidadeContratos: contratos.length,
      valorMensalTotal: contratos.reduce((soma, item) => soma + Number(item.valorMensal), 0),
      contratos,
    };
  }

  private validar(periodo: PeriodoRelatorio) {
    if (periodo.inicio && Number.isNaN(periodo.inicio.getTime())) throw new Error("Data inicial inválida.");
    if (periodo.fim && Number.isNaN(periodo.fim.getTime())) throw new Error("Data final inválida.");
    if (periodo.inicio && periodo.fim && periodo.inicio > periodo.fim) throw new Error("Data inicial posterior à final.");
  }
}
