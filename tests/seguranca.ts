import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { Credencial } from "../dist/domain/entities/Credencial.js";
import { Sessao } from "../dist/domain/entities/Sessao.js";
import { PapelUsuario } from "../dist/domain/enums/PapelUsuario.js";
import { ServicoAutenticacao } from "../dist/services/ServicoAutenticacao.js";

const saltAntigo = "salt-legado";
const hashAntigo = scryptSync("SenhaAntiga123", saltAntigo, 64).toString("hex");
const credencialLegada = new Credencial("legado", hashAntigo, saltAntigo, new Date(), PapelUsuario.ADMINISTRADOR);
assert.equal(credencialLegada.verificarSenha("SenhaErrada"), false);
assert.equal(credencialLegada.verificarSenha("SenhaAntiga123"), true);
assert.match(credencialLegada.hashSenha, /^[a-f0-9]{64}$/);
assert.equal(credencialLegada.verificarSenha("SenhaAntiga123"), true);

const autenticacao = new ServicoAutenticacao();
const credencialNova = autenticacao.criarCredencial("novo", "SenhaNova123", PapelUsuario.AUDITOR);
assert.match(credencialNova.hashSenha, /^[a-f0-9]{64}$/);
assert.equal(autenticacao.autenticar("novo", "SenhaErrada"), false);
assert.equal(autenticacao.autenticar("novo", "SenhaNova123"), true);
const sessao = autenticacao.obterSessao("novo");
assert.ok(sessao);
assert.ok(sessao.expiracao.getTime() > Date.now() + 29 * 60 * 1000);
assert.ok(sessao.expiracao.getTime() <= Date.now() + 30 * 60 * 1000 + 1000);

const expirada = new Sessao("token", "novo", PapelUsuario.AUDITOR, new Date(Date.now() - 3600000), new Date(Date.now() - 1));
assert.equal(expirada.isValida(), false);
assert.equal(autenticacao.renovarSessaoPorAtividade("ausente"), false);
console.log("Hash SHA-256, migração e expiração de sessão verificados.");
