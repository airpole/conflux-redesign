// 원본 conflux-editor 모듈을 Node에서 돌리기 위한 공통 하네스.
//
// 원본 위치는 CONFLUX_EDITOR_DIR 환경변수로 지정한다 (기본: ../conflux-editor).
// `audio.js`만 stubs/audio.js로 대체한다 — 원본은 editor-state.js를 거쳐
// WebAudio로 번지는데, 판정 결과는 소리에 의존하지 않는다.

import { mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.CONFLUX_EDITOR_DIR
  ?? path.resolve(here, '../../../conflux-editor');
const WORK = path.resolve(here, '.work');

// 원본에서 가져오는 모듈. 이 목록 밖은 건드리지 않는다.
const MODULES = [
  'constants.js', 'state.js', 'cache.js', 'timing.js',
  'shape.js', 'play-state.js', 'gauge.js', 'play-judgment.js',
  'settings.js',
];

/** 원본 모듈을 작업 디렉터리로 복사하고 audio.js를 스텁으로 채운다. */
export async function prepare() {
  if (!existsSync(SRC)) {
    throw new Error(
      `원본 레포를 찾을 수 없다: ${SRC}\n` +
      `CONFLUX_EDITOR_DIR 환경변수로 conflux-editor 체크아웃 위치를 지정한다.`
    );
  }
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });
  for (const m of MODULES) {
    const from = path.join(SRC, m);
    if (!existsSync(from)) throw new Error(`원본에 없는 모듈: ${m}`);
    await cp(from, path.join(WORK, m));
  }
  await cp(path.join(here, 'stubs/audio.js'), path.join(WORK, 'audio.js'));
  return WORK;
}

/** 작업 디렉터리의 모듈을 import 한다. */
export async function load(name) {
  return import(path.join(WORK, name));
}

/** 원본 소스의 신원. 기대값이 어느 판에서 나왔는지 남긴다. */
export async function sourceFingerprint() {
  const { createHash } = await import('node:crypto');
  const out = {};
  for (const m of MODULES) {
    const buf = await readFile(path.join(WORK, m));
    out[m] = createHash('sha256').update(buf).digest('hex').slice(0, 12);
  }
  return out;
}

/**
 * 골든 표를 파일로 쓴다.
 *
 * E4: 표가 비었거나 값이 전부 null이면 실패로 종료한다. 필드명이 어긋나면
 * 원본 함수는 예외 대신 null/undefined를 조용히 돌려주므로, 그 상태가
 * 표에 그대로 굳는 것을 여기서 막는다.
 */
export async function emit(name, payload, { compact = false } = {}) {
  const rows = payload.cases;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`[${name}] 표가 비었다 — 입력 세트나 필드명을 확인한다.`);
  }
  const allEmpty = rows.every(r =>
    r.expected === null || r.expected === undefined ||
    (typeof r.expected === 'object' && Object.values(r.expected).every(v => v === null || v === undefined))
  );
  if (allEmpty) {
    throw new Error(
      `[${name}] 기대값이 전부 비었다 — 원본 필드명(startTick·isWide·channel 등)이나 ` +
      `사전 상태 초기화를 확인한다. 조용한 빈 표는 커밋하지 않는다.`
    );
  }
  const outPath = path.resolve(here, '../../tests/golden', `${name}.json`);
  const doc = {
    source: 'conflux-editor',
    sourceFingerprint: await sourceFingerprint(),
    extractedBy: `tools/golden/extract-${name}.mjs`,
    note: '원본에서 뜬 관측 자료. 손으로 고치지 않고 재생성한다.',
    ...payload,
  };
  await writeFile(outPath, JSON.stringify(doc, null, compact ? 0 : 2) + '\n');
  console.log(`[${name}] ${rows.length}건 → tests/golden/${name}.json`);
}

/** fixture를 원본 전역 D에 적재한다. */
export async function loadChart(fixture) {
  const { D } = await load('state.js');
  const timing = await load('timing.js');
  D.tempo = structuredClone(fixture.tempo ?? [{ tick: 0, bpm: 120 }]);
  D.timeSignatures = structuredClone(fixture.timeSignatures ?? [{ tick: 0, numerator: 4, denominator: 4 }]);
  D.notes = structuredClone(fixture.notes ?? []);
  D.shapeEvents = structuredClone(fixture.shapeEvents ?? []);
  D.lineEvents = structuredClone(fixture.lineEvents ?? [{ startTick: 0, duration: 0, lines: [25, 25, 25, 25] }]);
  D.textEvents = structuredClone(fixture.textEvents ?? []);
  timing.compBPM();
  timing.invalidateTSCache();
  return D;
}
