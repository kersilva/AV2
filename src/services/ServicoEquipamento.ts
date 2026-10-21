import { Equipamento } from "../domain/entities/Equipamento.js";
import { EstadoFisico } from "../domain/enums/EstadoFisico.js";

export class ServicoEquipamento {
  private readonly equipamentos = new Map<string, Equipamento>();

  cadastrar(equipamento: Equipamento): void {
    if (
      [...this.equipamentos.values()].some(
        (item) => item.codigoBarrasInterno === equipamento.codigoBarrasInterno,
      )
    ) {
      throw new Error("Código de barras interno já está em uso.");
    }
    this.equipamentos.set(equipamento.id, equipamento);
  }

  rastrearEquipamento(id: string): Equipamento {
    const equipamento = this.equipamentos.get(id);
    if (!equipamento) throw new Error("Equipamento não encontrado.");
    return equipamento;
  }

  atualizarEstadoFisico(
    id: string,
    novoEstado: EstadoFisico,
    justificativa: string,
  ): void {
    const equipamento = this.rastrearEquipamento(id);
    if (novoEstado >= equipamento.estadoFisico + 2 && !justificativa.trim()) {
      throw new Error(
        "É obrigatória uma justificativa para uma queda de duas categorias no estado físico.",
      );
    }
    equipamento.estadoFisico = novoEstado;
  }

  gerarCodigoBarras(tipo: number, sequencia: number): string {
    return `${String(tipo).padStart(2, "0")}-${String(sequencia).padStart(8, "0")}`;
  }
}
