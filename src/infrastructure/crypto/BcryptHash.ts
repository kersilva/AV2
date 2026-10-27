import { createHash, scrypt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { GeradorHash } from '@domain/services/GeradorHash.js';
import { ErroValidacao } from '@/shared/errors/DomainError.js';

const ROUNDS_BCRYPT = 12;
const TAMANHO_HASH_SCRYPT = 64;
const PREFIXO_BCRYPT = /^\$2[ab]\$\d{2}\$/;

function derivarScrypt(senha: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, TAMANHO_HASH_SCRYPT, (erro, chave) => {
      if (erro) return reject(erro);
      resolve(chave as Buffer);
    });
  });
}

function comparar(esperado: Buffer, recebido: Buffer): boolean {
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

export class BcryptHash implements GeradorHash {
  async gerar(senha: string): Promise<string> {
    if (bcrypt.truncates(senha)) {
      throw new ErroValidacao('A senha não pode ultrapassar 72 bytes em UTF-8.');
    }
    return bcrypt.hash(senha, ROUNDS_BCRYPT);
  }

  async verificar(senha: string, hash: string): Promise<boolean> {
    if (PREFIXO_BCRYPT.test(hash)) {
      try {
        return await bcrypt.compare(senha, hash);
      } catch {
        return false;
      }
    }

    const [algoritmo, salt, valor] = hash.split('$');
    if (!salt || !valor) return false;

    if (algoritmo === 'scrypt') {
      const esperado = Buffer.from(valor, 'hex');
      return comparar(esperado, await derivarScrypt(senha, salt));
    }

    if (algoritmo === 'sha256') {
      const esperado = Buffer.from(valor, 'hex');
      const recebido = createHash('sha256').update(salt).update(senha).digest();
      return comparar(esperado, recebido);
    }

    return false;
  }

  precisaMigrar(hash: string): boolean {
    if (!PREFIXO_BCRYPT.test(hash)) return true;
    try {
      return bcrypt.getRounds(hash) < ROUNDS_BCRYPT;
    } catch {
      return true;
    }
  }
}
