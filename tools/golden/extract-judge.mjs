// judge 골든 — 후보 선택(normal vs wide), 판정창 경계, lane 매칭, mirror.
import { prepare, load, loadChart, emit } from './harness.mjs';
import { fixtures } from './fixtures.mjs';

await prepare();
const { PS } = await load('play-state.js');
const t = await load('timing.js');
const j = await load('play-judgment.js');

/** getPlayJudgment는 사전 상태가 초기화돼 있어야 한다 (발견 5). */
function resetPlayState({ lineMap = null } = {}) {
  PS.playHitMap = new Map();
  PS.playMissSet = new Set();
  PS.playHoldState = {};
  PS.lineMap = lineMap;
}

const MIRROR = { 1: 4, 2: 3, 3: 2, 4: 1 };
const cases = [];

for (const [name, fx] of Object.entries(fixtures)) {
  for (const mirror of [false, true]) {
    await loadChart(fx);
    for (const key of [1, 2, 3, 4, 5, 6]) {
      // 각 노트 시각 기준 오프셋 — 판정창 안팎 경계를 훑는다
      for (const note of fx.notes) {
        const at = t.t2ms(note.startTick);
        for (const off of [-200, -81, -80, -40, 0, 40, 80, 81, 200]) {
          resetPlayState({ lineMap: mirror ? MIRROR : null });
          const r = j.getPlayJudgment(key, at + off);
          cases.push({
            fixture: name, mirror, key, targetTick: note.startTick, offsetMs: off,
            // noteChannel·noteIsWide는 반드시 남긴다. 같은 tick에 wide와 normal이
            // 공존할 때 이 둘이 없으면 "어느 쪽을 골랐는가"가 표에서 사라진다 —
            // 그게 D-2026-024가 [번복]한 후보 순서 규칙의 검증 지점이다.
            expected: r === null ? null : {
              noteStartTick: r.note.startTick,
              noteChannel: r.note.channel,
              noteIsWide: !!r.note.isWide,
              diff: r.diff,
            },
          });
        }
      }
    }
  }
}

await emit('judge', {
  tolerance: { integer: 'exact', real: 1e-9 },
  fieldNames: 'original (conflux-editor) — startTick/isWide/channel',
  note2: 'mirror는 PS.lineMap으로 주입한다. 재설계 명칭 매핑은 테스트 쪽에서.',
  note3: '표가 커서 들여쓰기 없이 쓴다 — 손으로 읽는 파일이 아니라 재생성 대상이다.',
  cases,
}, { compact: true });
