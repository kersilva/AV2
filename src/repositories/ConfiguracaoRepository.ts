import { prisma } from "../infrastructure/database.js";

export class ConfiguracaoRepository {
  obter() {
    return prisma.configuracaoSistema.findUnique({ where: { id: 1 } });
  }

  async salvar(dados: { aliquotaImposto: number; coeficienteDepreciacao: number; versao?: number }) {
    const atual = await this.obter();
    if (!atual) {
      return prisma.configuracaoSistema.create({
        data: { id: 1, aliquotaImposto: dados.aliquotaImposto, coeficienteDepreciacao: dados.coeficienteDepreciacao },
      });
    }

    const resultado = await prisma.configuracaoSistema.updateMany({
      where: { id: 1, versao: dados.versao ?? -1 },
      data: {
        aliquotaImposto: dados.aliquotaImposto,
        coeficienteDepreciacao: dados.coeficienteDepreciacao,
        versao: { increment: 1 },
      },
    });
    if (resultado.count === 0) throw new Error("Conflito de versão da configuração.");
    return this.obter();
  }
}

