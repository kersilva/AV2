export type Configuracao = {
  aliquotaImposto: number;
  coeficienteDepreciacao: number;
  versao: number;
};
export type DadosConfiguracao = {
  aliquotaImposto: number;
  coeficienteDepreciacao: number;
};
export interface ConfiguracaoRepository {
  buscarPorId(id: number): Promise<Configuracao | null>;
  criar(dados: DadosConfiguracao): Promise<Configuracao>;
  atualizar(id: number, versao: number, dados: DadosConfiguracao): Promise<Configuracao | null>;
  contar(): Promise<number>;
}
