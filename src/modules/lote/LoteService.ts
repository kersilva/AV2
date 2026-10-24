import type { StatusLote } from "@/generated/prisma/enums.js";
import { ValidadorDataEntrada } from "@domain/validators/ValidadorDataEntrada.js";
import { LoteRepository } from "@lote/LoteRepository.js";

export type NovoLote = {
  id: string; dataEntrada: Date; organizacaoId: string; notaFiscal: string;
  transportadora: string; statusProcessamento: StatusLote; observacoes?: string;
};
const PROXIMO: Partial<Record<StatusLote, StatusLote>> = {
  RECEBIDO: "EM_TRIAGEM",
  EM_TRIAGEM: "TRIAGEM_CONCLUIDA",
  TRIAGEM_CONCLUIDA: "ENCAMINHADO",
  ENCAMINHADO: "FINALIZADO",
};

export class ServicoLote {
  constructor(
    private readonly repository = new LoteRepository(),
    private readonly validadorData = new ValidadorDataEntrada(),
  ) {}

  criarLote(dados: NovoLote) {
    if (!this.validadorData.validar(dados.dataEntrada)) {
      throw new Error(this.validadorData.obterMensagemErro());
    }
    if (!dados.notaFiscal.trim() || !dados.transportadora.trim()) {
      throw new Error("Nota fiscal e transportadora são obrigatórias.");
    }
    return this.repository.criar(dados);
  }

  listar() {
    return this.repository.listar();
  }

  async buscar(id: string) {
    const lote = await this.repository.buscar(id);
    if (!lote) throw new Error("Lote não encontrado.");
    return lote;
  }

  async processarTriagem(id: string, versao: number) {
    const lote = await this.buscar(id);
    const proximo = PROXIMO[lote.statusProcessamento];
    if (!proximo) throw new Error("O lote já está no estado final.");
    return this.repository.atualizarStatus(id, versao, proximo);
  }
}
