import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { JournalTransacao } from "../dist/domain/entities/JournalTransacao.js";
import { CriptografiaArquivo } from "../dist/infrastructure/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../dist/infrastructure/RepositorioArquivo.js";
import { ServicoJournal } from "../dist/services/ServicoJournal.js";
const diretorio = await mkdtemp(resolve(tmpdir(), "greencode-journal-falhas-"));
const cifra = new CriptografiaArquivo(randomBytes(32));
const repo = new RepositorioArquivo(resolve(diretorio, "journal.enc"), cifra);
const journal = new ServicoJournal(diretorio, cifra);
try {
    const antiga = new JournalTransacao("old", new Date(Date.now() - 181 * 86400000), "CRIAR", "Teste", null, {}, "qa");
    await repo.salvar([antiga]);
    await journal.inicializar();
    assert.deepEqual(await journal.listar(), [], "transações além da retenção devem ser removidas");
    const grande = new JournalTransacao("large", new Date(), "CRIAR", "Teste", null, { payload: "x".repeat(11 * 1024 * 1024) }, "qa");
    await journal.registrar(grande);
    const nomes = await readdir(diretorio);
    assert.ok(nomes.some((nome) => /^journal-.+\.enc$/.test(nome)), "journal acima de 10 MiB deve ser rotacionado");
    assert.ok((await journal.listar()).some((transacao) => transacao.id === "large"));
    await writeFile(resolve(diretorio, "journal.enc"), "conteudo corrompido", "utf8");
    await assert.rejects(() => journal.listar(), (erro) => erro instanceof Error, "conteúdo journal adulterado deve falhar na autenticação AES-GCM");
    console.log("Cenários de retenção, rotação e corrupção do journal concluídos.");
}
finally {
    await rm(diretorio, { recursive: true, force: true });
}
//# sourceMappingURL=falhas-journal.js.map