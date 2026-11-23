// Inicia o Vitest com a letra do drive em maiúscula (Windows).
// Motivo: quando o terminal abre em "c:\..." (minúsculo), o Vitest 5 carrega dois
// caminhos diferentes para o mesmo módulo e falha com "failed to find the runner".
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const fixDrive = (p) => p.replace(/^[a-z]:/, (d) => d.toUpperCase());

const root = fixDrive(resolve(import.meta.dirname, ".."));
process.chdir(root);

await import(pathToFileURL(resolve(root, "node_modules/vitest/vitest.mjs")).href);
