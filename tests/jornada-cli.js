import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporario = await mkdtemp(resolve(tmpdir(), "greencode-jornada-"));
const processo = spawn(process.execPath, [resolve(raiz, "dist", "main.js")], {
    cwd: temporario,
    stdio: ["pipe", "pipe", "pipe"],
});
let saida = "";
let cursorSaida = 0;
let promptPronto = false;
let promptAtual = "";
const processoFechado = new Promise((resolver) => processo.once("close", resolver));
processo.stdout.setEncoding("utf8").on("data", (trecho) => { saida += trecho; });
processo.stderr.setEncoding("utf8").on("data", (trecho) => { saida += trecho; });
async function aguardar(texto, inicio = 0, timeoutMs = 8000) {
    const prazo = Date.now() + timeoutMs;
    while (true) {
        const indice = saida.indexOf(texto, inicio);
        if (indice !== -1)
            return indice + texto.length;
        if (processo.exitCode !== null)
            throw new Error(`CLI encerrou antes de mostrar: ${texto}\n${saida}`);
        if (Date.now() > prazo)
            throw new Error(`Timeout esperando: ${texto}\n${saida}`);
        await new Promise((resolver) => setTimeout(resolver, 20));
    }
}
async function responder(pergunta, resposta) {
    if (promptAtual.includes(pergunta)) {
        promptAtual = "";
    }
    else {
        cursorSaida = await aguardar(pergunta, cursorSaida);
    }
    processo.stdin.write(`${resposta}\n`);
}
async function comando(linha, proximoPrompt = "greencode> ") {
    if (!promptPronto)
        cursorSaida = await aguardar("greencode> ", cursorSaida);
    promptPronto = false;
    processo.stdin.write(`${linha}\n`);
    cursorSaida = await aguardar(proximoPrompt, cursorSaida);
    promptPronto = proximoPrompt === "greencode> ";
    promptAtual = proximoPrompt;
}
try {
    await responder("Usuário do administrador:", "admin");
    await responder("Senha do administrador", "Admin123!");
    await responder("Usuário:", "admin");
    await responder("Senha:", "Admin123!");
    await comando("config definir --aliquota-imposto 0.15 --coeficiente-depreciacao 0.20");
    await comando('organizacao cadastrar INV001 "Invalida" 11.111.111/1111-11 "Rua X" --valor 10 --vencimento 2027-12-31');
    await comando('organizacao cadastrar ORG001 "Acme Reciclagem" 04.252.011/0001-10 "Rua Central" --valor 250 --vencimento 2027-12-31');
    await comando("usuario cadastrar --usuario auditor --senha Auditor123! --papel AUDITOR");
    await comando("lote criar --org ORG001 --nf NF-FUT --transp TransRapida --id LOTEFUT --data 2099-01-01");
    await comando("lote criar --org ORG001 --nf NF-123456 --transp TransRapida --id LOTE001");
    await comando("equipamento cadastrar --lote LOTE001 --id EQ001 --tipo COMPUTADOR_MESA --marca Green --modelo G1 --ano 2020 --estado BOM_ESTADO --peso 8");
    await comando("equipamento atualizar-status EQ001 --status EM_DESMONTE --justificativa tentativa-invalida");
    await comando("equipamento atualizar-estado EQ001 --estado DANIFICADO_LEVE");
    await comando("equipamento atualizar-status EQ001 --status EM_TRIAGEM --justificativa inicio-triagem");
    await comando("equipamento atualizar-status EQ001 --status AGUARDANDO_DESMONTE --justificativa triagem-concluida");
    await comando("equipamento atualizar-status EQ001 --status EM_DESMONTE --justificativa envio-desmonte");
    await comando("equipamento atualizar-estado EQ001 --estado DANIFICADO_LEVE --justificativa dano-identificado-na-triagem");
    await comando("equipamento depreciacao EQ001 --valor-aquisicao 1000");
    await comando("equipamento movimentar EQ001 --destino bancada-desmonte --responsavel operador");
    await comando("equipamento rastrear EQ001");
    await comando("sair", "Usuário:");
    await responder("Usuário:", "auditor");
    await responder("Senha:", "Auditor123!");
    await comando("config definir --aliquota-imposto 0.25");
    await comando("relatorio gerar --tipo organizacao --org ORG001 --inicio 2020-01-01 --fim 2030-01-01");
    await comando("relatorio gerar --tipo financeiro --inicio 2020-01-01 --fim 2030-01-01");
    await comando("journal listar");
    await comando("sair", "Usuário:");
    await responder("Usuário:", "sair");
    await new Promise((resolver, rejeitar) => {
        processo.once("exit", (codigo) => codigo === 0 ? resolver() : rejeitar(new Error(`CLI terminou com código ${codigo}\n${saida}`)));
    });
    assert.match(saida, /Código interno:/);
    assert.match(saida, /BAIXA_DEFINITIVA|EM_DESMONTE/);
    assert.match(saida, /Data\/Hora \| Operação \| Entidade \| Responsável/);
    assert.match(saida, /ATUALIZAR_STATUS/);
    assert.match(saida, /CNPJ inválido/);
    assert.match(saida, /A data de entrada deve estar entre hoje e os últimos 90 dias/);
    assert.match(saida, /precisa concluir a triagem antes do desmonte/);
    assert.match(saida, /justificativa para uma queda de duas categorias/);
    assert.match(saida, /Seu papel não permite executar esse comando/);
    for (const arquivo of ["organizacoes.enc", "lotes.enc", "equipamentos.enc", "credenciais.enc", "configuracao.enc", "journal.enc"]) {
        const conteudo = await readFile(resolve(temporario, "data", arquivo), "utf8");
        assert.ok(conteudo.length > 0, `${arquivo} deveria conter dados cifrados`);
    }
    console.log("Jornada CLI concluída com sucesso.");
}
finally {
    if (processo.exitCode === null && processo.signalCode === null)
        processo.kill();
    await processoFechado;
    await rm(temporario, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
}
//# sourceMappingURL=jornada-cli.js.map