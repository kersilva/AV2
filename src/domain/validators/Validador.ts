export abstract class Validador {
  abstract validar(valor: any): boolean;

  obterMensagemErro(): string {
    return "Valor inválido.";
  }
}
