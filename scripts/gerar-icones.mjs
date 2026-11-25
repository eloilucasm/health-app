// Gera os PNG do app a partir de public/icons/icone-app.svg.
// Rode depois de trocar o logo: node scripts/gerar-icones.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/icons/icone-app.svg");

// Cantos arredondados só nos ícones "any". "maskable" e apple-icon vão inteiros:
// o sistema do celular recorta o formato.
const arredondado = (n) =>
  Buffer.from(`<svg width="${n}" height="${n}"><rect width="${n}" height="${n}" rx="${n * 0.22}"/></svg>`);

const arquivos = [
  ["public/icons/icon-192.png", 192, true],
  ["public/icons/icon-512.png", 512, true],
  ["public/icons/maskable-512.png", 512, false],
  ["src/app/apple-icon.png", 180, false],
  ["src/app/icon.png", 64, true],
];

for (const [destino, n, cantos] of arquivos) {
  let imagem = sharp(svg, { density: 300 }).resize(n, n);
  if (destino.includes("maskable")) {
    // Margem extra: o recorte circular do Android não pode encostar no desenho.
    const margem = Math.round(n * 0.05);
    imagem = sharp(svg, { density: 300 })
      .resize(n - 2 * margem, n - 2 * margem)
      .extend({ top: margem, bottom: margem, left: margem, right: margem, background: "#b8465c" });
  }
  if (cantos) imagem.composite([{ input: arredondado(n), blend: "dest-in" }]);
  await imagem.png().toFile(destino);
}
