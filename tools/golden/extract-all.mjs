// 골든 표 전체 재생성. 하나라도 실패하면 비정상 종료한다.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = [
  'extract-constants.mjs',
  'extract-timing.mjs',
  'extract-gauge.mjs',
  'extract-shape.mjs',
  'extract-judge.mjs',
];

let failed = 0;
for (const s of scripts) {
  const r = spawnSync(process.execPath, [path.join(here, s)], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`실패: ${s}`); failed++; }
}
process.exit(failed === 0 ? 0 : 1);
