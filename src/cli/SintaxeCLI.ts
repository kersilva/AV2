import { PapelUsuario } from "../domain/enums/PapelUsuario.js";

interface DefinicaoComando {
  sintaxe: string;
  papeis: PapelUsuario[];
}

const DEFINICOES_COMANDOS: DefinicaoComando[] = [
  { sintaxe: "ajuda", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR] },
  { sintaxe: "sair", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR] },
  { sintaxe: "secreto", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR] },
  { sintaxe: "organizacao cadastrar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO] },
  { sintaxe: "organizacao listar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.AUDITOR] },
  { sintaxe: "journal listar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR] },
  { sintaxe: "config mostrar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR] },
  { sintaxe: "config definir", papeis: [PapelUsuario.ADMINISTRADOR] },
  { sintaxe: "lote criar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO] },
  { sintaxe: "lote processar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO] },
  { sintaxe: "equipamento cadastrar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO] },
  { sintaxe: "equipamento rastrear", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR] },
  { sintaxe: "equipamento depreciacao", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR] },
  { sintaxe: "equipamento atualizar-status", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO] },
  { sintaxe: "equipamento atualizar-estado", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO] },
  { sintaxe: "equipamento movimentar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO] },
  { sintaxe: "relatorio gerar", papeis: [PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR] },
  { sintaxe: "usuario cadastrar", papeis: [PapelUsuario.ADMINISTRADOR] },
];

export function comandosVisiveis(papel: PapelUsuario): string[] {
  return DEFINICOES_COMANDOS.filter((comando) => comando.papeis.includes(papel))
    .map((comando) => comando.sintaxe);
}

export function completarComando(
  linha: string,
  papel?: PapelUsuario,
): [string[], string] {
  const palavras = linha.trimStart().split(/\s+/);
  const prefixo = palavras.at(-1) ?? "";
  const inicio = linha.slice(0, linha.length - prefixo.length);
  const comandos = papel === undefined ? [] : comandosVisiveis(papel);
  const sugestoes = comandos.filter((comando) =>
    comando.startsWith(linha.trimStart()),
  );
  if (sugestoes.length) return [sugestoes, linha.trimStart()];
  const opcoes = [
    "--id",
    "--org",
    "--nf",
    "--transp",
    "--data",
    "--razao-social",
    "--cnpj",
    "--ie",
    "--endereco",
    "--telefone",
    "--email",
    "--valor",
    "--vencimento",
    "--tipo",
    "--marca",
    "--modelo",
    "--ano",
    "--estado",
    "--peso",
    "--papel",
    "--usuario",
    "--senha",
    "--status",
    "--inicio",
    "--fim",
    "--lote",
    "--justificativa",
    "--destino",
    "--responsavel",
    "--observacao",
    "--aliquota-imposto",
    "--coeficiente-depreciacao",
    "--valor-aquisicao",
  ];
  if (prefixo.startsWith("-"))
    return [opcoes.filter((opcao) => opcao.startsWith(prefixo)), inicio];
  return [[], linha];
}

export function analisarComando(linha: string): {
  nome: string;
  posicional: string[];
  opcoes: Map<string, string>;
} {
  const tokens =
    linha
      .match(/(?:[^\s"]+|"[^"\\]*(?:\\.[^"\\]*)*")+/g)
      ?.map((token) => token.replace(/^"|"$/g, "")) ?? [];
  const posicional: string[] = [];
  const opcoes = new Map<string, string>();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.startsWith("--")) {
      const [chave, inline] = token.slice(2).split("=", 2);
      const valor = inline ?? tokens[++i];
      if (!valor || valor.startsWith("--"))
        throw new Error(`Informe um valor para --${chave}.`);
      opcoes.set(chave!, valor);
    } else posicional.push(token);
  }
  return {
    nome: posicional.slice(0, 2).join(" ").toLowerCase(),
    posicional: posicional.slice(2),
    opcoes,
  };
}

export function valorEnum<T extends Record<string, string | number>>(
  enumeracao: T,
  texto: string,
): number {
  const entrada = Object.entries(enumeracao).find(
    ([chave]) => chave.toLowerCase() === texto.toLowerCase(),
  );
  if (!entrada)
    throw new Error(
      `Opção inválida: ${texto}. Valores: ${Object.keys(enumeracao)
        .filter((chave) => Number.isNaN(Number(chave)))
        .join(", ")}`,
    );
  return Number(entrada[1]);
}
