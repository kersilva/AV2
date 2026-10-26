import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { StatusRastreamento } from "@domain/enums/StatusRastreamento.js";
import type { PeriodoRelatorio } from "@relatorio/RelatorioTypes.js";
import type { RelatorioService } from "@relatorio/RelatorioService.js";
type PeriodoQuery = { inicio?: string; fim?: string };
function converter(q:PeriodoQuery):PeriodoRelatorio {
  const inicio=q.inicio?new Date(`${q.inicio}T00:00:00.000Z`):undefined;
  const fim=q.fim?new Date(`${q.fim}T23:59:59.999Z`):undefined;
  return { ...(inicio?{inicio}:{}), ...(fim?{fim}:{}) };
}
const schemaPeriodo={type:"object",additionalProperties:false,properties:{inicio:{type:"string",format:"date"},fim:{type:"string",format:"date"}}} as const;
export async function RelatorioController(app:FastifyInstance,exigirAcessoRelatorio:preHandlerHookHandler,service:RelatorioService){
 app.get<{Params:{organizacaoId:string};Querystring:PeriodoQuery}>("/relatorios/organizacoes/:organizacaoId",{preHandler:exigirAcessoRelatorio,schema:{querystring:schemaPeriodo}},async(req,res)=>res.send(await service.gerarRelatorioPorOrganizacao(req.params.organizacaoId,converter(req.query))));
 app.get<{Params:{status:StatusRastreamento}}>("/relatorios/status/:status",{preHandler:exigirAcessoRelatorio},async(req,res)=>res.send(await service.gerarRelatorioPorStatus(req.params.status)));
 app.get<{Querystring:PeriodoQuery}>("/relatorios/financeiro",{preHandler:exigirAcessoRelatorio,schema:{querystring:schemaPeriodo}},async(req,res)=>res.send(await service.gerarRelatorioFinanceiro(converter(req.query))));
}


