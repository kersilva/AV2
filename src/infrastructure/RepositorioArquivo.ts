import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { CriptografiaArquivo } from "./CriptografiaArquivo.js";

export class RepositorioArquivo<T> {
  constructor(
    private readonly caminho: string,
    private readonly criptografia: CriptografiaArquivo,
  ) {}

  async salvar(dados: T): Promise<void> {
    await mkdir(dirname(this.caminho), { recursive: true });
    const temporario = `${this.caminho}.tmp`;
    const conteudo = this.criptografia.cifrar(JSON.stringify(dados));
    try {
      await writeFile(temporario, conteudo, { encoding: "utf8", flag: "w" });
      await rename(temporario, this.caminho);
    } catch (erro) {
      await rm(temporario, { force: true });
      throw erro;
    }
  }

  async carregar(): Promise<T | null> {
    let conteudo: string;
    try {
      conteudo = await readFile(this.caminho, "utf8");
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw erro;
    }
    return JSON.parse(this.criptografia.decifrar(conteudo)) as T;
  }
}
