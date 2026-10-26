import { ErroConflito, ErroNaoEncontrado, ErroRegraNegocio } from "@/shared/errors/DomainError.js";
import { Lote } from "@domain/entities/Lote.js";
import type { NovoLote } from "@domain/entities/Lote.js";
import type { LoteRepository } from "@domain/repositories/LoteRepository.js";
import type { EstadoExclusao } from "@domain/repositories/SoftDeleteRepository.js";
import type { JournalWriter } from "@domain/services/JournalWriter.js";

export type LoteView = { id:string; dataEntrada:Date; organizacaoId:string; notaFiscal:string; transportadora:string; statusProcessamento:string; observacoes:string|null; versao:number; _count:{equipamentos:number}; equipamentos?:unknown[] };
export type ExclusaoView = { id:string; excluidoEm:Date|null; versao:number };
export type { NovoLote };

export class LoteService {
  constructor(private readonly repository:LoteRepository, private readonly journalWriter:JournalWriter) {}

  async criarLote(dados:NovoLote, ator:{id:string;usuario:string}):Promise<LoteView> {
    if (!await this.repository.organizacaoAtiva(dados.organizacaoId)) throw new ErroNaoEncontrado("Organização ativa não encontrada.");
    const salvo=await this.repository.criar(Lote.criar(dados));
    const dto=this.dto(salvo,true);
    await this.registrarNoJournal("CRIAR",ator,null,dto);
    return dto;
  }

  async listar():Promise<LoteView[]> { return (await this.repository.listar()).map(l=>this.dto(l,false)); }

  async buscar(id:string):Promise<LoteView> {
    const lote=await this.repository.buscarPorId(id);
    if(!lote)throw new ErroNaoEncontrado("Lote não encontrado.");
    return this.dto(lote,true);
  }

  async processarTriagem(id:string,versao:number,ator:{id:string;usuario:string}):Promise<LoteView> {
    const lote=await this.repository.buscarPorId(id);
    if(!lote)throw new ErroNaoEncontrado("Lote não encontrado.");
    const antes=this.dto(lote,true); lote.processarTriagem();
    const salvo=await this.repository.salvar(lote,versao);
    if(!salvo)throw new ErroConflito("Conflito de versão do lote.");
    const depois=this.dto(salvo,true);
    await this.registrarNoJournal("PROCESSAR_TRIAGEM",ator,antes,depois);
    return depois;
  }

  async excluir(id:string,versao:number,ator:{id:string;usuario:string}):Promise<ExclusaoView> {
    const estado=await this.obterEstado(id,versao);
    if(estado.excluidoEm)return estado;
    if(await this.repository.possuiEquipamentosAtivos(id))throw new ErroRegraNegocio("Não é possível excluir um lote com equipamentos ativos.");
    const excluidoEm=new Date();
    if(!await this.repository.excluir(id,versao,excluidoEm))throw new ErroConflito("Conflito de versão do lote.");
    const resultado={id,excluidoEm,versao:versao+1};
    await this.registrarNoJournal("EXCLUIR_LOGICAMENTE",ator,estado,resultado);
    return resultado;
  }

  async reativar(id:string,versao:number,ator:{id:string;usuario:string}):Promise<ExclusaoView> {
    const estado=await this.obterEstado(id,versao);
    if(!estado.excluidoEm)return estado;
    const organizacaoId = await this.repository.organizacaoIdDoLote(id);
    if (!organizacaoId) throw new ErroNaoEncontrado("Lote não encontrado.");
    if (!await this.repository.organizacaoAtiva(organizacaoId)) {
      throw new ErroRegraNegocio("Reative a organização do lote antes de reativar o lote.");
    }
    if(!await this.repository.reativar(id,versao))throw new ErroConflito("Conflito de versão do lote.");
    const resultado={id,excluidoEm:null,versao:versao+1};
    await this.registrarNoJournal("REATIVAR",ator,estado,resultado);
    return resultado;
  }

  private async obterEstado(id:string,versao:number):Promise<EstadoExclusao> {
    const estado=await this.repository.obterEstadoExclusao(id);
    if(!estado)throw new ErroNaoEncontrado("Lote não encontrado.");
    if(estado.versao!==versao)throw new ErroConflito("Conflito de versão do lote.");
    return estado;
  }

  private dto(l:Lote,incluir:boolean):LoteView {
    return {id:l.id,dataEntrada:l.dataEntrada,organizacaoId:l.organizacaoId,notaFiscal:l.notaFiscal,transportadora:l.transportadora,statusProcessamento:l.statusProcessamento,observacoes:l.observacoes,versao:l.versao,_count:{equipamentos:l.equipamentos.length},...(incluir?{equipamentos:l.equipamentos.map(e=>({id:e.id,codigoBarrasInterno:e.codigoBarrasInterno,tipo:e.tipo,marca:e.marca,modelo:e.modelo,anoFabricacao:e.anoFabricacao,estadoFisico:e.estadoFisico,pesoQuilogramas:e.pesoQuilogramas,loteId:e.loteId,posicaoNoLote:e.posicaoNoLote,statusRastreamento:e.statusRastreamento,versao:e.versao}))}:{})};
  }

  private registrarNoJournal(operacao:string,ator:{id:string;usuario:string},dadosAntes:unknown,dadosDepois:unknown) {
    return this.journalWriter.registrar({operacao,entidade:"Lote",usuarioId:ator.id,usuarioResponsavel:ator.usuario,...(dadosAntes!==null?{dadosAntes}:{}),dadosDepois});
  }
}
