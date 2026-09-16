// Erzeugt die PNG-Icons (Home-Bildschirm, Manifest) aus public/icon.svg.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../public/', import.meta.url));
const svg = await readFile(dir + 'icon.svg');
// iOS rundet selbst ab — Touch-Icon und maskierbares Icon daher ohne eigene Rundung.
const square = Buffer.from(svg.toString().replace('rx="112"', 'rx="0"'));
for (const [file, size, src] of [
  ['apple-touch-icon.png', 180, square],
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, square],
]) {
  await sharp(src).resize(size, size).png().toFile(dir + file);
  console.log('ok', file);
}
