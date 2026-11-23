// EMBERFALL DUEL — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from beside this file into the output directory
// and writes /output/dossier.json with the vendored make.fun library, so the
// judge reads the game exactly as it ships. Outside the grader, the output
// directory comes from MAKEFUN_OUTPUT_DIR:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game must ship: refuse a silent empty hand-in rather than write one.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — nothing to hand in');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`EMBERFALL DUEL handed in to ${out}`);
