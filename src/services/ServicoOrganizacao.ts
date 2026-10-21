import { Organizacao } from "../domain/entities/Organizacao.js";
import { ValidadorCNPJ } from "../domain/validators/ValidadorCNPJ.js";

export class ServicoOrganizacao {
  private readonly organizacoes = new Map<string, Organizacao>();
  private readonly validadorCNPJ = new ValidadorCNPJ();

  cadastrarOrganizacao(dados: Organizacao): Organizacao {
    if (this.organizacoes.has(dados.id))
      throw new Error("Identificador de organização já cadastrado.");
    if (!this.validadorCNPJ.validar(dados.cnpj))
      throw new Error(this.validadorCNPJ.obterMensagemErro());
    if (
      [...this.organizacoes.values()].some(
        (item) =>
          item.cnpj.replace(/\D/g, "") === dados.cnpj.replace(/\D/g, ""),
      )
    ) {
      throw new Error("Já existe uma organização cadastrada com esse CNPJ.");
    }
    this.organizacoes.set(dados.id, dados);
    return dados;
  }

  buscarOrganizacao(id: string): Organizacao | undefined {
    return this.organizacoes.get(id);
  }
  listarOrganizacoesAtivas(): Organizacao[] {
    return [...this.organizacoes.values()].filter((item) => item.ativo);
  }
  renovarContrato(organizacaoId: string, novoVencimento: Date): void {
    const organizacao = this.organizacoes.get(organizacaoId);
    if (!organizacao) throw new Error("Organização não encontrada.");
    organizacao.contratoVigente.renovar(novoVencimento);
  }
}
