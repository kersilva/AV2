import type { FastifyInstance } from "fastify";
import { PapelUsuario } from "@domain/enums/PapelUsuario.js";
import { AutenticacaoController } from "@autenticacao/AutenticacaoController.js";
import { AutenticacaoService } from "@autenticacao/AutenticacaoService.js";
import { ConfiguracaoController } from "@configuracao/ConfiguracaoController.js";
import { ContratoController } from "@contrato/ContratoController.js";
import { ContratoService } from "@contrato/ContratoService.js";
import { PrismaContratoRepository } from "@infra/repositories/PrismaContratoRepository.js";
import { ConfiguracaoService } from "@configuracao/ConfiguracaoService.js";
import { EquipamentoController } from "@equipamento/EquipamentoController.js";
import { EquipamentoService } from "@equipamento/EquipamentoService.js";
import { JournalController } from "@journal/JournalController.js";
import { PrismaJournalReader } from "@infra/journal/JournalReader.js";
import { JournalService } from "@journal/JournalService.js";
import { PrismaJournalWriter } from "@infra/journal/PrismaJournalWriter.js";
import { LoteController } from "@lote/LoteController.js";
import { LoteService } from "@lote/LoteService.js";
import { OrganizacaoController } from "@organizacao/OrganizacaoController.js";
import { OrganizacaoService } from "@organizacao/OrganizacaoService.js";
import { RelatorioController } from "@relatorio/RelatorioController.js";
import { RelatorioService } from "@relatorio/RelatorioService.js";
import { UsuarioController } from "@usuario/UsuarioController.js";
import { UsuarioService } from "@usuario/UsuarioService.js";
import { PrismaConfiguracaoRepository } from "@infra/repositories/PrismaConfiguracaoRepository.js";
import { PrismaEquipamentoRepository } from "@infra/repositories/PrismaEquipamentoRepository.js";
import { PrismaJournalTransacaoRepository } from "@infra/repositories/PrismaJournalTransacaoRepository.js";
import { PrismaLoteRepository } from "@infra/repositories/PrismaLoteRepository.js";
import { PrismaOrganizacaoRepository } from "@infra/repositories/PrismaOrganizacaoRepository.js";
import { PrismaUsuarioRepository } from "@infra/repositories/PrismaUsuarioRepository.js";
import { RelatorioQueryService } from "@infra/queries/RelatorioQueryService.js";
import { BcryptHash } from "@infra/crypto/BcryptHash.js";
import { AutorizacaoService } from "@autenticacao/AutorizacaoService.js";
import { criarGuardAutorizacao } from "@infra/fastify/AutorizacaoPreHandler.js";

export async function compositionRoot(app: FastifyInstance): Promise<void> {
  const journalRepository = new PrismaJournalTransacaoRepository();
  const journalWriter = new PrismaJournalWriter(journalRepository);
  const journalReader = new PrismaJournalReader(journalRepository);
  const journal = new JournalService(journalReader);
  const usuarioRepository = new PrismaUsuarioRepository();
  const hash = new BcryptHash();
  const autorizacao = new AutorizacaoService(usuarioRepository);
  const exigirPapeis = criarGuardAutorizacao(autorizacao);
  const autenticacao = new AutenticacaoService(usuarioRepository, hash, journalWriter);
  const configuracao = new ConfiguracaoService(new PrismaConfiguracaoRepository(), journalWriter);
  const contrato = new ContratoService(new PrismaContratoRepository(), journalWriter);
  const equipamento = new EquipamentoService(new PrismaEquipamentoRepository(), journalWriter);
  const lote = new LoteService(new PrismaLoteRepository(), journalWriter);
  const organizacao = new OrganizacaoService(new PrismaOrganizacaoRepository(), journalWriter);
  const relatorio = new RelatorioService(new RelatorioQueryService());
  const usuario = new UsuarioService(usuarioRepository, hash, journalWriter);
  const admin = exigirPapeis(PapelUsuario.ADMINISTRADOR);
  const cadastro = exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO);
  const leituraCadastro = exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.AUDITOR);
  const almoxarifado = exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO);
  const journalAccess = exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR);
  const relatorioAccess = exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR);

  await AutenticacaoController(app, autenticacao);
  await OrganizacaoController(app, exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO, PapelUsuario.AUDITOR), cadastro, organizacao);
  await ConfiguracaoController(app, admin, configuracao);
  await ContratoController(app, leituraCadastro, cadastro, contrato);
  await UsuarioController(app, admin, usuario);
  await LoteController(app, exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR), almoxarifado, lote);
  await EquipamentoController(app, exigirPapeis(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR), almoxarifado, equipamento);
  await JournalController(app, journalAccess, journal);
  await RelatorioController(app, relatorioAccess, relatorio);
}








