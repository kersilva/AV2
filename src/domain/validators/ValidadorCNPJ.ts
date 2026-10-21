import { Validador } from "./Validador.js";

export class ValidadorCNPJ extends Validador {
  override obterMensagemErro(): string {
    return "CNPJ inválido: confira os 14 dígitos e os dígitos verificadores.";
  }

  validar(cnpj: string): boolean {
    if (typeof cnpj !== "string") return false;
    const valor = cnpj.replace(/\D/g, "");
    if (valor.length !== 14 || /^([0-9])\1{13}$/.test(valor)) return false;

    const calcularDigito = (base: string, pesos: number[]): number => {
      const soma = [...base].reduce((total, digito, indice) => {
        return total + Number(digito) * pesos[indice]!;
      }, 0);
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };

    const primeiro = calcularDigito(
      valor.slice(0, 12),
      [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    const segundo = calcularDigito(
      valor.slice(0, 12) + primeiro,
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    return valor.endsWith(`${primeiro}${segundo}`);
  }
}
