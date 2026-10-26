import "dotenv/config";
import { PapelUsuario } from "../src/domain/enums/PapelUsuario.js";
import { EstadoFisico } from "../src/domain/enums/EstadoFisico.js";
import { StatusLote } from "../src/domain/enums/StatusLote.js";
import { StatusRastreamento } from "../src/domain/enums/StatusRastreamento.js";
import { TipoEquipamento } from "../src/domain/enums/TipoEquipamento.js";
import { ContratoService } from "../src/modules/contrato/ContratoService.js";
import { PrismaContratoRepository } from "../src/infrastructure/repositories/PrismaContratoRepository.js";
import type { NovaOrganizacao } from "../src/domain/repositories/OrganizacaoRepository.js";
import type { NovoEquipamento } from "../src/domain/entities/Equipamento.js";
import { prisma } from "../src/infrastructure/database.js";
import { PrismaJournalTransacaoRepository } from "../src/infrastructure/repositories/PrismaJournalTransacaoRepository.js";
import { PrismaUsuarioRepository } from "../src/infrastructure/repositories/PrismaUsuarioRepository.js";
import { PrismaOrganizacaoRepository } from "../src/infrastructure/repositories/PrismaOrganizacaoRepository.js";
import { PrismaLoteRepository } from "../src/infrastructure/repositories/PrismaLoteRepository.js";
import { PrismaEquipamentoRepository } from "../src/infrastructure/repositories/PrismaEquipamentoRepository.js";
import { PrismaConfiguracaoRepository } from "../src/infrastructure/repositories/PrismaConfiguracaoRepository.js";
import { PrismaJournalWriter } from "../src/infrastructure/journal/PrismaJournalWriter.js";
import { BcryptHash } from "../src/infrastructure/crypto/BcryptHash.js";
import { UsuarioService } from "../src/modules/usuario/UsuarioService.js";
import { OrganizacaoService } from "../src/modules/organizacao/OrganizacaoService.js";
import { LoteService } from "../src/modules/lote/LoteService.js";
import { EquipamentoService } from "../src/modules/equipamento/EquipamentoService.js";
import { ConfiguracaoService } from "../src/modules/configuracao/ConfiguracaoService.js";
import { StatusLote as PrismaStatusLote } from "../src/generated/prisma/enums.js";

type Ator = { id: string; usuario: string };
type DadosUsuarioSeed = {
  id: string;
  usuario: string;
  papel: PapelUsuario;
  senha: string;
};

const senhaSeed = process.env.SEED_PASSWORD ?? "GreencodeSeed#2026";
if (process.env.NODE_ENV === "production" && !process.env.SEED_PASSWORD) {
  throw new Error("Defina SEED_PASSWORD antes de executar o seed em produção.");
}

const journalRepository = new PrismaJournalTransacaoRepository();
const journalWriter = new PrismaJournalWriter(journalRepository);
const usuarioRepository = new PrismaUsuarioRepository();
const loteRepository = new PrismaLoteRepository();
const equipamentoRepository = new PrismaEquipamentoRepository();
const usuarioService = new UsuarioService(
  usuarioRepository,
  new BcryptHash(),
  journalWriter,
);
const organizacaoService = new OrganizacaoService(
  new PrismaOrganizacaoRepository(),
  journalWriter,
);
const loteService = new LoteService(loteRepository, journalWriter);
const equipamentoService = new EquipamentoService(
  equipamentoRepository,
  journalWriter,
);
const contratoService = new ContratoService(new PrismaContratoRepository(), journalWriter);
const configuracaoService = new ConfiguracaoService(
  new PrismaConfiguracaoRepository(),
  journalWriter,
);

async function garantirUsuario(dados: DadosUsuarioSeed, ator?: Ator) {
  let usuario = await usuarioRepository.buscarPorId(dados.id);

  if (!usuario) {
    const usuarioComMesmoNome = await usuarioRepository.buscarPorUsuario(
      dados.usuario,
    );
    if (usuarioComMesmoNome) {
      throw new Error(
        `O usuário ${dados.usuario} já existe com outro identificador.`,
      );
    }

    await usuarioService.cadastrar(
      dados,
      ator ?? {
        id: dados.id,
        usuario: dados.usuario,
      },
    );
    usuario = await usuarioRepository.buscarPorId(dados.id);
    if (!usuario) {
      throw new Error(`O usuário seed ${dados.usuario} não foi persistido.`);
    }
  }

  const responsavel = ator ?? { id: usuario.id, usuario: usuario.usuario };
  if (usuario.usuario !== dados.usuario) {
    throw new Error(`O identificador ${dados.id} já pertence a outro usuário.`);
  }

  if (usuario.papel !== dados.papel) {
    await usuarioService.alterarPapel(
      usuario.id,
      dados.papel,
      usuario.versao,
      responsavel,
    );
    usuario = await usuarioRepository.buscarPorId(usuario.id);
    if (!usuario) throw new Error(`O usuário ${dados.usuario} desapareceu.`);
  }

  if (!usuario.ativo) {
    await usuarioService.alterarAtivo(
      usuario.id,
      true,
      usuario.versao,
      responsavel,
    );
    usuario = await usuarioRepository.buscarPorId(usuario.id);
    if (!usuario) throw new Error(`O usuário ${dados.usuario} desapareceu.`);
  }

  return usuario;
}

async function garantirOrganizacao(ator: Ator) {
  const organizacaoRepository = new PrismaOrganizacaoRepository();
  const id = "seed-organizacao-principal";
  const existente = await organizacaoRepository.buscarPorId(id);
  if (existente) return existente;

  const estado = await organizacaoRepository.obterEstadoExclusao(id);
  if (estado) {
    if (estado.excluidoEm) await organizacaoService.reativar(id, estado.versao, ator);
    const reativada = await organizacaoRepository.buscarPorId(id);
    if (!reativada) throw new Error("A organização seed não pôde ser reativada.");
    return reativada;
  }

  const cnpj = "11222333000181";
  const cnpjExistente = await prisma.organizacao.findUnique({
    where: { cnpj },
  });
  if (cnpjExistente) {
    throw new Error(
      `O CNPJ de exemplo já pertence à organização ${cnpjExistente.id}.`,
    );
  }

  const dados: NovaOrganizacao = {
    id,
    razaoSocial: "Organização de Demonstração Greencode",
    cnpj,
    inscricaoEstadual: "ISENTO",
    enderecoCompleto: "Rua de Testes, 100 - Centro",
    telefone: "11999990000",
    email: "contato@greencode.example",
  };
  return organizacaoService.cadastrar(dados, ator);
}

async function garantirLote(
  id: string,
  statusDesejado: StatusLote,
  organizacaoId: string,
  ator: Ator,
) {
  let lote = await loteRepository.buscarPorId(id);
  if (!lote) {
    const estado = await loteRepository.obterEstadoExclusao(id);
    if (estado?.excluidoEm) {
      await loteService.reativar(id, estado.versao, ator);
      lote = await loteRepository.buscarPorId(id);
    }
  }
  if (!lote) {
    await loteService.criarLote(
      {
        id,
        dataEntrada: new Date(Date.now() - 24 * 60 * 60 * 1000),
        organizacaoId,
        notaFiscal: `SEED-${id}`,
        transportadora: "Transportadora de Demonstração",
        observacoes: "Registro de demonstração criado pelo seed.",
      },
      ator,
    );
    lote = await loteRepository.buscarPorId(id);
  }
  if (!lote) throw new Error(`O lote seed ${id} não foi persistido.`);

  const estados = Object.values(StatusLote);
  const indiceDesejado = estados.indexOf(statusDesejado);
  let indiceAtual = estados.indexOf(lote.statusProcessamento);
  if (indiceDesejado < 0 || indiceAtual < 0) {
    throw new Error(`Estado de lote inválido no seed: ${statusDesejado}.`);
  }

  if (indiceAtual > indiceDesejado) {
    const anterior = lote.statusProcessamento;
    const novoEstado =
      PrismaStatusLote[statusDesejado as keyof typeof PrismaStatusLote];
    await prisma.lote.update({
      where: { id },
      data: { statusProcessamento: novoEstado, versao: { increment: 1 } },
    });
    await journalWriter.registrar({
      operacao: "RESTAURAR_DADO_SEED",
      entidade: "Lote",
      usuarioId: ator.id,
      usuarioResponsavel: ator.usuario,
      dadosAntes: { id, statusProcessamento: anterior },
      dadosDepois: { id, statusProcessamento: statusDesejado },
    });
    lote = await loteRepository.buscarPorId(id);
    if (!lote) throw new Error(`O lote seed ${id} não foi encontrado.`);
    indiceAtual = estados.indexOf(lote.statusProcessamento);
  }

  while (indiceAtual < indiceDesejado) {
    await loteService.processarTriagem(id, lote.versao, ator);
    lote = await loteRepository.buscarPorId(id);
    if (!lote) throw new Error(`O lote seed ${id} não foi encontrado.`);
    indiceAtual = estados.indexOf(lote.statusProcessamento);
  }

  return lote;
}

async function garantirEquipamento(
  tipo: TipoEquipamento,
  estadoFisico: EstadoFisico,
  statusRastreamento: StatusRastreamento,
  loteId: string,
  posicaoNoLote: number,
  ator: Ator,
) {
  const id = `seed-equipamento-${tipo.toLowerCase()}`;
  const dados: NovoEquipamento = {
    id,
    codigoBarrasInterno: `SEED-${tipo}`,
    tipo,
    marca: "Greencode",
    modelo: `Modelo ${tipo}`,
    anoFabricacao: 2018 + (posicaoNoLote % 7),
    estadoFisico: EstadoFisico.NOVO,
    pesoQuilogramas: 3 + posicaoNoLote / 10,
    loteId,
    posicaoNoLote,
  };

  let equipamento = await prisma.equipamento.findUnique({ where: { id } });
  if (equipamento?.excluidoEm) {
    await equipamentoService.reativar(id, equipamento.versao, ator);
    equipamento = await prisma.equipamento.findUnique({ where: { id } });
  }
  if (!equipamento) {
    const codigoExistente = await prisma.equipamento.findUnique({
      where: { codigoBarrasInterno: dados.codigoBarrasInterno },
    });
    if (codigoExistente) {
      throw new Error(
        `O código ${dados.codigoBarrasInterno} já pertence ao equipamento ${codigoExistente.id}.`,
      );
    }
    await equipamentoService.cadastrar(dados, ator);
    equipamento = await prisma.equipamento.findUnique({ where: { id } });
  }
  if (!equipamento) {
    throw new Error(`O equipamento seed ${id} não foi persistido.`);
  }
  if (equipamento.tipo !== tipo || equipamento.loteId !== loteId) {
    throw new Error(`O equipamento seed ${id} tem dados incompatíveis.`);
  }

  let estado = await equipamentoService.rastrearEquipamento(id);
  if (estado.estadoFisico !== estadoFisico) {
    estado = await equipamentoService.atualizarEstadoFisico(
      id,
      estadoFisico,
      "Seed de demonstração: ajuste para cobrir os estados físicos.",
      estado.versao,
      ator,
    );
  }

  const sequenciaStatus: StatusRastreamento[] = [
    StatusRastreamento.AGUARDANDO_TRIAGEM,
    StatusRastreamento.EM_TRIAGEM,
    StatusRastreamento.AGUARDANDO_DESMONTE,
    StatusRastreamento.EM_DESMONTE,
    StatusRastreamento.PECAS_REAPROVEITADAS,
    StatusRastreamento.MATERIAL_RECICLAVEL,
    StatusRastreamento.DESCARTE_SEGURO,
    StatusRastreamento.BAIXA_DEFINITIVA,
  ];
  const indiceDesejado = sequenciaStatus.indexOf(statusRastreamento);
  if (indiceDesejado < 0) {
    throw new Error(`Estado de rastreamento inválido: ${statusRastreamento}.`);
  }

  estado = await equipamentoService.rastrearEquipamento(id);
  if (estado.statusRastreamento !== sequenciaStatus[0]) {
    estado = await equipamentoService.atualizarStatus(
      id,
      sequenciaStatus[0]!,
      "Seed de demonstração: reinício do fluxo de estados.",
      estado.versao,
      ator,
    );
  }
  for (let indice = 1; indice <= indiceDesejado; indice += 1) {
    const proximo = sequenciaStatus[indice]!;
    if (estado.statusRastreamento !== proximo) {
      estado = await equipamentoService.atualizarStatus(
        id,
        proximo,
        "Seed de demonstração: avanço válido no fluxo de rastreamento.",
        estado.versao,
        ator,
      );
    }
  }

  return equipamentoService.rastrearEquipamento(id);
}

async function garantirMovimentacoes(
  equipamentos: { id: string }[],
  ator: Ator,
) {
  for (const [indice, equipamento] of equipamentos.entries()) {
    const destino = `Seed: Área de demonstração ${indice + 1}`;
    const existente = await prisma.movimentacao.findFirst({
      where: { equipamentoId: equipamento.id, destino },
    });
    if (existente) continue;

    await equipamentoService.registrarMovimentacao(
      equipamento.id,
      {
        destino,
        observacao: "Movimentação de exemplo criada pelo seed.",
      },
      ator,
    );
  }
}

async function garantirContrato(organizacaoId: string, ator: Ator) {
  const contratoExistente = await prisma.contrato.findUnique({ where: { organizacaoId } });
  if (contratoExistente) {
    if (contratoExistente.excluidoEm) {
      await contratoService.reativar(contratoExistente.id, contratoExistente.versao, ator);
    }
    return;
  }

  await contratoService.cadastrar({
    id: "seed-contrato-principal",
    organizacaoId,
    dataAssinatura: new Date("2025-01-01T00:00:00.000Z"),
    dataVencimento: new Date("2030-01-01T00:00:00.000Z"),
    clausulas: [
      "Contrato de demonstração para testes locais.",
      "O equipamento permanece vinculado à organização responsável.",
    ],
    valorMensal: 1250,
    renovacaoAutomatica: true,
  }, ator);
}

async function garantirConfiguracao(ator: Ator) {
  const desejada = { aliquotaImposto: 0.075, coeficienteDepreciacao: 0.2 };
  const atual = await configuracaoService.obter();
  if (
    atual.aliquotaImposto === desejada.aliquotaImposto &&
    atual.coeficienteDepreciacao === desejada.coeficienteDepreciacao
  ) {
    return;
  }
  await configuracaoService.atualizar(
    { ...desejada, versao: atual.versao },
    ator,
  );
}

async function verificarCoberturaDosEnums() {
  const usuarios = await prisma.usuario.findMany({ select: { papel: true } });
  const lotes = await prisma.lote.findMany({
    select: { statusProcessamento: true },
  });
  const equipamentos = await prisma.equipamento.findMany({
    select: { tipo: true, estadoFisico: true, statusRastreamento: true },
  });

  conferirValores(
    "PapelUsuario",
    Object.values(PapelUsuario),
    usuarios.map((item) => String(item.papel) as PapelUsuario),
  );

  conferirValores(
    "StatusLote",
    Object.values(StatusLote),
    lotes.map(
      (item) => String(item.statusProcessamento) as StatusLote,
    ),
  );

  conferirValores(
    "TipoEquipamento",
    Object.values(TipoEquipamento),
    equipamentos.map((item) => String(item.tipo) as TipoEquipamento),
  );

  conferirValores(
    "EstadoFisico",
    Object.values(EstadoFisico),
    equipamentos.map(
      (item) => String(item.estadoFisico) as EstadoFisico,
    ),
  );

  conferirValores(
    "StatusRastreamento",
    Object.values(StatusRastreamento),
    equipamentos.map((item) => String(item.statusRastreamento) as StatusRastreamento),
  );
}

function conferirValores<T extends string>(
  nome: string,
  esperados: readonly T[],
  encontrados: readonly T[],
): void {
  const faltantes = esperados.filter((valor) => !encontrados.includes(valor));
  if (faltantes.length > 0) {
    throw new Error(`O seed não cobriu ${nome}: ${faltantes.join(", ")}.`);
  }
}

async function main() {
  const usuariosSeed: DadosUsuarioSeed[] = Object.values(PapelUsuario).map(
    (papel) => ({
      id: `seed-usuario-${papel.toLowerCase()}`,
      usuario: `seed.${papel.toLowerCase()}`,
      papel,
      senha: senhaSeed,
    }),
  );
  const administrador = await garantirUsuario(usuariosSeed[0]!);
  const ator: Ator = {
    id: administrador.id,
    usuario: administrador.usuario,
  };

  for (const dados of usuariosSeed.slice(1)) {
    await garantirUsuario(dados, ator);
  }

  const organizacao = await garantirOrganizacao(ator);
  await garantirConfiguracao(ator);
  await garantirContrato(organizacao.id, ator);

  const lotesPorEstado = new Map<StatusLote, string>();
  for (const status of Object.values(StatusLote)) {
    const lote = await garantirLote(
      `seed-lote-${status.toLowerCase()}`,
      status,
      organizacao.id,
      ator,
    );
    lotesPorEstado.set(status, lote.id);
  }
  const loteEquipamentos = lotesPorEstado.get(StatusLote.RECEBIDO)!;

  const tipos = Object.values(TipoEquipamento);
  const estados = Object.values(EstadoFisico);
  const status = Object.values(StatusRastreamento);
  const equipamentos = [];
  for (let indice = 0; indice < tipos.length; indice += 1) {
    equipamentos.push(
      await garantirEquipamento(
        tipos[indice]!,
        estados[indice % estados.length]!,
        status[indice]!,
        loteEquipamentos,
        indice + 1,
        ator,
      ),
    );
  }
  await garantirMovimentacoes(equipamentos, ator);
  await verificarCoberturaDosEnums();

  console.info("Seed concluído. Os dados de demonstração estão disponíveis.");
  if (!process.env.SEED_PASSWORD) {
    console.info("Senha padrão das contas seed: GreencodeSeed#2026");
  }
}

try {
  await main();
} catch (erro) {
  console.error("Falha ao executar o seed:", erro);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
