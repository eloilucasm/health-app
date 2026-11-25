// Gera os ícones do app instalável (public/icons). Rode: node scripts/gerar-icones.mjs
import sharp from "sharp";

const svg = (raio) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${raio}" fill="#b8465c"/>
  <rect x="136" y="170" width="240" height="190" rx="36" fill="none" stroke="#fff" stroke-width="28"/>
  <path d="M200 170v-14a26 26 0 0 1 26-26h60a26 26 0 0 1 26 26v14" fill="none" stroke="#fff" stroke-width="28"/>
  <path d="M256 220v90M211 265h90" stroke="#fff" stroke-width="28" stroke-linecap="round"/>
</svg>`;

// "maskable" e apple-icon sem cantos arredondados: o sistema recorta o formato.
const arquivos = [
  ["public/icons/icon-192.png", 192, 112],
  ["public/icons/icon-512.png", 512, 112],
  ["public/icons/maskable-512.png", 512, 0],
  ["src/app/apple-icon.png", 180, 0],
  ["src/app/icon.png", 64, 112],
];

for (const [destino, tamanho, raio] of arquivos) {
  await sharp(Buffer.from(svg(raio))).resize(tamanho, tamanho).png().toFile(destino);
}
