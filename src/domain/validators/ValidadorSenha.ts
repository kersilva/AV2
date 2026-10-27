import { Validador } from './Validador.js';

export class ValidadorSenha extends Validador {
  override obterMensagemErro(): string {
    return 'A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes em UTF-8.';
  }

  validar(valor: unknown): boolean {
    if (typeof valor !== 'string') return false;

    const quantidadeCaracteres = Array.from(valor).length;
    const quantidadeBytes = new TextEncoder().encode(valor).length;

    return quantidadeCaracteres >= 8 && quantidadeBytes <= 72;
  }
}
