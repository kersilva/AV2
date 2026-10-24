import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { EstadoFisico, StatusRastreamento } from "../generated/prisma/enums.js";
import { ServicoEquipamento, type NovoEquipamento } from "../services/EquipamentoService.js";

export async function EquipamentoController(
  app: FastifyInstance,
  ler: preHandlerHookHandler,
  escrever: preHandlerHookHandler,
  service = new ServicoEquipamento(),
) {
  app.get("/equipamentos", { preHandler: ler }, async (_req, res) => res.send(await service.listar()));
  app.get<{ Params: { id: string } }>("/equipamentos/:id", { preHandler: ler },
    async (req, res) => res.send(await service.rastrearEquipamento(req.params.id)));

  app.post<{ Body: NovoEquipamento }>("/equipamentos", { preHandler: escrever },
    async (req, res) => res.code(201).send(await service.cadastrar(req.body)));

  app.patch<{ Params: { id: string }; Body: { estadoFisico: EstadoFisico; justificativa: string; versao: number } }>(
    "/equipamentos/:id/estado", { preHandler: escrever },
    async (req, res) => res.send(await service.atualizarEstadoFisico(
      req.params.id, req.body.estadoFisico, req.body.justificativa, req.body.versao,
    )),
  );

  app.patch<{ Params: { id: string }; Body: { statusRastreamento: StatusRastreamento; justificativa: string; versao: number } }>(
    "/equipamentos/:id/status", { preHandler: escrever },
    async (req, res) => res.send(await service.atualizarStatus(
      req.params.id, req.body.statusRastreamento, req.body.justificativa, req.body.versao,
    )),
  );
}
