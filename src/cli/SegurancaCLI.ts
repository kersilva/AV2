import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Credencial } from "../domain/entities/Credencial.js";
import { PapelUsuario } from "../domain/enums/PapelUsuario.js";
import { CriptografiaArquivo } from "../infrastructure/CriptografiaArquivo.js";
import { ServicoAutenticacao } from "../services/ServicoAutenticacao.js";
import { RepositorioArquivo } from "../infrastructure/RepositorioArquivo.js";

export interface DadosMestre {
  chave: string;
  administradorInicial?: string;
  credenciais?: Array<{
    usuario: string;
    hashSenha: string;
    salt: string;
    ultimoAcesso: string;
    papel: PapelUsuario;
  }>;
}

export interface EstadoSeguranca {
  mestre: DadosMestre;
  criptografia: CriptografiaArquivo;
  credenciais: Map<string, Credencial>;
  autenticacao: ServicoAutenticacao;
}

export class SegurancaCLI {
  constructor(
    private readonly diretorioDados: string,
    private readonly perguntarObrigatorio: (texto: string) => Promise<string>,
    private readonly lerSenha: (texto: string) => Promise<string>,
  ) {}

  async inicializar(): Promise<EstadoSeguranca> {
    const caminhoMestre = resolve(this.diretorioDados, "mestre.json");
    let mestre: DadosMestre | null = null;
    try {
      mestre = JSON.parse(await readFile(caminhoMestre, "utf8")) as DadosMestre;
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
    }

    if (!mestre) {
      console.log("Provisionamento inicial do Greencode");
      const usuario = await this.perguntarObrigatorio(
        "Usuário do administrador: ",
      );
      const senha = await this.lerSenha(
        "Senha do administrador (mínimo 8 caracteres): ",
      );
      if (senha.length < 8)
        throw new Error("A senha precisa ter no mínimo 8 caracteres.");
      const salt = randomBytes(16).toString("hex");
      mestre = {
        chave: randomBytes(32).toString("base64"),
        administradorInicial: usuario,
        credenciais: [
          {
            usuario,
            hashSenha: createHash("sha256").update(salt).update(senha).digest("hex"),
            salt,
            ultimoAcesso: new Date().toISOString(),
            papel: PapelUsuario.ADMINISTRADOR,
          },
        ],
      };
    }

    const chave = Buffer.from(mestre.chave, "base64");
    if (chave.length !== 32) throw new Error("Chave mestre inválida.");
    const criptografia = new CriptografiaArquivo(chave);
    const arquivoCredenciais = resolve(this.diretorioDados, "credenciais.enc");
    const armazenadas = await new RepositorioArquivo<{ credenciais: DadosMestre["credenciais"] }>(arquivoCredenciais, criptografia).carregar();
    const dadosCredenciais = armazenadas?.credenciais ?? mestre.credenciais ?? [];
    const credenciais = new Map<string, Credencial>();
    const autenticacao = new ServicoAutenticacao();
    for (const dado of dadosCredenciais) {
      if (!dado) continue;
      const credencial = new Credencial(
        dado.usuario,
        dado.hashSenha,
        dado.salt,
        new Date(dado.ultimoAcesso),
        dado.papel,
      );
      credenciais.set(dado.usuario, credencial);
      autenticacao.cadastrar(credencial);
    }
    await mkdir(this.diretorioDados, { recursive: true });
    if (!armazenadas) {
      await new RepositorioArquivo(arquivoCredenciais, criptografia).salvar({ credenciais: dadosCredenciais });
    }
    delete mestre.credenciais;
    const administradorInicial = mestre.administradorInicial ?? dadosCredenciais[0]?.usuario;
    if (administradorInicial) mestre.administradorInicial = administradorInicial;
    const caminhoTemporario = `${caminhoMestre}.tmp`;
    await writeFile(caminhoTemporario, JSON.stringify(mestre, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(caminhoTemporario, caminhoMestre);
    return {
      mestre,
      criptografia,
      credenciais,
      autenticacao,
    };
  }
}
