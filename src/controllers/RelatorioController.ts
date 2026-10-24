import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { StatusRastreamento } from "../generated/prisma/enums.js";
import { ServicoRelatorio } from "../services/RelatorioService.js";

type Periodo = { inicio?: string; fim?: string };
function converter(q: Periodo) {
  return {
    ...(q.inicio ? { inicio: new Date(q.inicio) } : {}),
    ...(q.fim ? { fim: new Date(q.fim) } : {}),
  };
}

export async function RelatorioController(
  app: FastifyInstance, exigirAuditoria: preHandlerHookHandler,
  service = new ServicoRelatorio(),
) {
  app.get<{ Params: { organizacaoId: string }; Querystring: Periodo }>(
    "/relatorios/organizacoes/:organizacaoId", { preHandler: exigirAuditoria },
    async (req, res) => res.send(await service.gerarRelatorioPorOrganizacao(req.params.organizacaoId, converter(req.query))),
  );
  app.get<{ Params: { status: StatusRastreamento } }>(
    "/relatorios/status/:status", { preHandler: exigirAuditoria },
    async (req, res) => res.send(await service.gerarRelatorioPorStatus(req.params.status)),
  );
  app.get<{ Querystring: Periodo }>("/relatorios/financeiro", { preHandler: exigirAuditoria },
    async (req, res) => res.send(await service.gerarRelatorioFinanceiro(converter(req.query))),
  );
}
