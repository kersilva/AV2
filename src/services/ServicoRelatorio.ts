import { Lote } from "../domain/entities/Lote.js";
import { Organizacao } from "../domain/entities/Organizacao.js";

export class ServicoRelatorio {
  gerarRelatorioPorOrganizacao(
    organizacaoId: string,
    periodo: { inicio: Date; fim: Date },
    lotes: Lote[],
  ): string {
    const filtrados = this.noPeriodo(lotes, periodo).filter(
      (lote) => lote.organizacaoId === organizacaoId,
    );
    return JSON.stringify(
      {
        organizacaoId,
        periodo,
        lotes: filtrados.length,
        equipamentos: filtrados.reduce(
          (total, lote) => total + lote.equipamentos.length,
          0,
        ),
      },
      null,
      2,
    );
  }

  gerarRelatorioPorStatus(status: string, lotes: Lote[]): string {
    const equipamentos = lotes
      .flatMap((lote) => lote.equipamentos)
      .filter((item) => String(item.statusRastreamento) === status);
    return JSON.stringify(
      {
        status,
        total: equipamentos.length,
        equipamentos: equipamentos.map((item) => item.id),
      },
      null,
      2,
    );
  }

  gerarRelatorioFinanceiro(
    periodo: { inicio: Date; fim: Date },
    organizacoes: Organizacao[],
  ): string {
    const contratos = organizacoes
      .map((org) => org.contratoVigente)
      .filter(
        (contrato) =>
          contrato.dataAssinatura <= periodo.fim &&
          contrato.dataVencimento >= periodo.inicio,
      );
    return JSON.stringify(
      {
        periodo,
        valorMensalTotal: contratos.reduce(
          (total, contrato) => total + contrato.valorMensal,
          0,
        ),
      },
      null,
      2,
    );
  }

  private noPeriodo(
    lotes: Lote[],
    periodo: { inicio: Date; fim: Date },
  ): Lote[] {
    return lotes.filter(
      (lote) =>
        lote.dataEntrada >= periodo.inicio && lote.dataEntrada <= periodo.fim,
    );
  }
}
