import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class CriptografiaArquivo {
  private static readonly algoritmo = "aes-256-gcm";

  constructor(private readonly chave: Buffer) {
    if (chave.length !== 32)
      throw new Error("A chave AES-256 deve ter 32 bytes.");
  }

  cifrar(dados: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      CriptografiaArquivo.algoritmo,
      this.chave,
      iv,
    );
    const cifrado = Buffer.concat([
      cipher.update(dados, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [iv, tag, cifrado]
      .map((parte) => parte.toString("base64"))
      .join(":");
  }

  decifrar(conteudo: string): string {
    const [ivTexto, tagTexto, dadosTexto] = conteudo.split(":");
    if (!ivTexto || !tagTexto || dadosTexto === undefined)
      throw new Error("Conteúdo cifrado inválido.");
    const decipher = createDecipheriv(
      CriptografiaArquivo.algoritmo,
      this.chave,
      Buffer.from(ivTexto, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagTexto, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dadosTexto, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
