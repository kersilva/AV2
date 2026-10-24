import type { EstadoFisico, StatusRastreamento, TipoEquipamento } from "@/generated/prisma/enums.js";
import type { Prisma } from "@/generated/prisma/client.js";
import { EquipamentoRepository } from "@equipamento/EquipamentoRepository.js";

export type NovoEquipamento = {
  id: string; codigoBarrasInterno: string; tipo: TipoEquipamento; marca: string;
  modelo: string; anoFabricacao: number; estadoFisico: EstadoFisico;
  pesoQuilogramas: number; loteId: string; posicaoNoLote: number;
  statusRastreamento: StatusRastreamento;
};

const ORDEM_ESTADO: EstadoFisico[] = [
  "NOVO", "BOM_ESTADO", "USADO_LEVE", "USADO_MODERADO",
  "DANIFICADO_LEVE", "DANIFICADO_GRAVE", "INSERVIVEL",
];

export class ServicoEquipamento {
  constructor(private readonly repository = new EquipamentoRepository()) {}

  cadastrar(dados: NovoEquipamento) {
    if (!dados.codigoBarrasInterno.trim() || dados.pesoQuilogramas <= 0) {
      throw new Error("Código de barras é obrigatório e o peso deve ser positivo.");
    }
    return this.repository.criar(dados as Prisma.EquipamentoUncheckedCreateInput);
  }

  listar() {
    return this.repository.listar();
  }

  async rastrearEquipamento(id: string) {
    const equipamento = await this.repository.buscar(id);
    if (!equipamento) throw new Error("Equipamento não encontrado.");
    return equipamento;
  }

  async atualizarEstadoFisico(
    id: string, novoEstado: EstadoFisico, justificativa: string, versao: number,
  ) {
    const atual = await this.rastrearEquipamento(id);
    const anterior = ORDEM_ESTADO.indexOf(atual.estadoFisico);
    const novo = ORDEM_ESTADO.indexOf(novoEstado);
    if (novo < 0) throw new Error("Estado físico inválido.");
    if (novo >= anterior + 2 && !justificativa.trim()) {
      throw new Error("É obrigatória justificativa para queda de duas categorias no estado físico.");
    }
    return this.repository.atualizar(id, versao, { estadoFisico: novoEstado });
  }

  async atualizarStatus(
    id: string, novoStatus: StatusRastreamento, justificativa: string, versao: number,
  ) {
    const atual = await this.rastrearEquipamento(id);
    if (!justificativa.trim()) throw new Error("Informe a justificativa da mudança de status.");
    if (novoStatus === "AGUARDANDO_DESMONTE" && atual.statusRastreamento !== "EM_TRIAGEM") {
      throw new Error("O equipamento só pode aguardar desmonte após a triagem.");
    }
    if (novoStatus === "EM_DESMONTE" && atual.statusRastreamento !== "AGUARDANDO_DESMONTE") {
      throw new Error("O desmonte só pode começar a partir de AGUARDANDO_DESMONTE.");
    }
    return this.repository.atualizar(id, versao, { statusRastreamento: novoStatus });
  }

  gerarCodigoBarras(tipo: number, sequencia: number) {
    if (!Number.isInteger(sequencia) || sequencia < 0) throw new Error("Sequência inválida.");
    return String(tipo).padStart(2, "0") + "-" + String(sequencia).padStart(8, "0");
  }
}
