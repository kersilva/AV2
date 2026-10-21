export interface Autenticavel {
  autenticar(usuario: string, senha: string): boolean | Promise<boolean>;
  renovarToken(): string | Promise<string>;
}
