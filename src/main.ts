import { AplicacaoCLI } from "./cli/AplicacaoCLI.js";

const aplicacao = new AplicacaoCLI();
await aplicacao.iniciar().catch((erro: unknown) => {
  console.error(
    `[FATAL] ${erro instanceof Error ? erro.message : String(erro)}`,
  );
  process.exitCode = 1;
});
