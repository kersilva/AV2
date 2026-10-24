import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derivar(senha: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, 64, (erro, chave) => erro ? reject(erro) : resolve(chave as Buffer));
  });
}

export async function criarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await derivar(senha, salt)).toString("hex");
  return "scrypt$" + salt + "$" + hash;
}

export async function verificarHashSenha(senha: string, armazenado: string): Promise<boolean> {
  const [algoritmo, salt, valor] = armazenado.split("$");
  if (algoritmo !== "scrypt" || !salt || !valor) return false;
  const esperado = Buffer.from(valor, "hex");
  const recebido = await derivar(senha, salt);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}
