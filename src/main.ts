import "dotenv/config";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";

import { AutenticacaoController } from "@autenticacao/AutenticacaoController.js";
import { ConfiguracaoController } from "@configuracao/ConfiguracaoController.js";
import { EquipamentoController } from "@equipamento/EquipamentoController.js";
import { JournalController } from "@journal/JournalController.js";
import { LoteController } from "@lote/LoteController.js";
import { OrganizacaoController } from "@organizacao/OrganizacaoController.js";
import { RelatorioController } from "@relatorio/RelatorioController.js";
import { UsuarioController } from "@usuario/UsuarioController.js";
import { exigirPapeis } from "@infra/autorizacao.js";

import { prisma } from "@infra/database.js";

const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error("Defina JWT_SECRET com pelo menos 32 caracteres no .env.");
}

const app = Fastify({ logger: true });
await app.register(fastifyJwt, { secret });

const admin = exigirPapeis("ADMINISTRADOR");
const cadastro = exigirPapeis("ADMINISTRADOR", "OPERADOR_CADASTRO");
const almoxarifado = exigirPapeis("ADMINISTRADOR", "GESTOR_ALMOXARIFADO");
const auditoria = exigirPapeis("ADMINISTRADOR", "AUDITOR");

await AutenticacaoController(app);
await OrganizacaoController(
  app,
  exigirPapeis("ADMINISTRADOR", "OPERADOR_CADASTRO", "AUDITOR"),
  cadastro,
);
await ConfiguracaoController(app, admin);
await UsuarioController(app, admin);
await LoteController(app, exigirPapeis("ADMINISTRADOR", "GESTOR_ALMOXARIFADO", "AUDITOR"), almoxarifado);
await EquipamentoController(app, exigirPapeis("ADMINISTRADOR", "GESTOR_ALMOXARIFADO", "AUDITOR"), almoxarifado);
await JournalController(app, auditoria);
await RelatorioController(app, auditoria);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
};
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

