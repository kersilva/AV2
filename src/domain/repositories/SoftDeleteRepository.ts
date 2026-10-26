export type EstadoExclusao = {
  id: string;
  excluidoEm: Date | null;
  versao: number;
};

export interface SoftDeleteRepository {
  obterEstadoExclusao(id: string): Promise<EstadoExclusao | null>;
  excluir(id: string, versao: number, data: Date): Promise<boolean>;
  reativar(id: string, versao: number): Promise<boolean>;
}
