import type { ConfiguracaoRepository } from '@domain/repositories/ConfiguracaoRepository.js';
import type { ContratoRepository } from '@domain/repositories/ContratoRepository.js';
import type { EquipamentoRepository } from '@domain/repositories/EquipamentoRepository.js';
import type { LoteRepository } from '@domain/repositories/LoteRepository.js';
import type { OrganizacaoRepository } from '@domain/repositories/OrganizacaoRepository.js';
import type { UsuarioRepository } from '@domain/repositories/UsuarioRepository.js';
import type { JournalWriter } from '@domain/services/JournalWriter.js';

export type RecursosTransacao = {
  organizacoes: OrganizacaoRepository;
  contratos: ContratoRepository;
  lotes: LoteRepository;
  equipamentos: EquipamentoRepository;
  usuarios: UsuarioRepository;
  configuracao: ConfiguracaoRepository;
  journal: JournalWriter;
};

export interface UnitOfWork {
  executar<T>(operacao: (recursos: RecursosTransacao) => Promise<T>): Promise<T>;
}
