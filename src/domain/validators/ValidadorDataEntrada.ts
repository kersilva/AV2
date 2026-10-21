import { Validador } from "./Validador.js";

export class ValidadorDataEntrada extends Validador {
  override obterMensagemErro(): string {
    return "A data de entrada deve estar entre hoje e os últimos 90 dias.";
  }

  validar(valor: unknown): boolean {
    if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) return false;
    const agora = new Date();
    const limite = new Date(agora);
    limite.setDate(limite.getDate() - 90);
    return valor <= agora && valor >= limite;
  }
}
