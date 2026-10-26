export interface GeradorHash {
  gerar(senha: string): Promise<string>;
  verificar(senha: string, hash: string): Promise<boolean>;
  precisaMigrar(hash: string): boolean;
}
