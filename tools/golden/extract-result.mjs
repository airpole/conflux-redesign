// result 골든 — 원본 `gauge.js computeResult`의 state·score·accuracy·rank.
//
// GA-6(state 산출)·GA-7(score·accuracy·rank 산출)은 셋 다 `[보존]`이면서도
// 골든이 닿지 않았다 — `extract-gauge.mjs`가 `gaugeOnJudgment`와 `evaluateEnd`만
// 뽑았기 때문에 "원본과 같다"는 주장 자체를 확인하는 것이 스펙 테스트뿐이었다.
// 이 추출기가 그 자리를 관측 아래로 내린다(D-2026-044).
//
// **게이지 궤적과 축을 곱하지 않는다.** 결과 산출이 보는 것은 판정의 *순서*가
// 아니라 `PS.playHitMap`/`playMissSet`의 *집계*다. 같은 축에 얹으려면 판정 열을
// 노트에 배정하는 규칙을 추출기가 새로 지어야 하는데, 그 규칙은 원본에 없는
// 것이라 관측에 창작이 섞인다.
import { prepare, load, emit } from './harness.mjs';

await prepare();
const { PS } = await load('play-state.js');
const { D } = await load('state.js');
const g = await load('gauge.js');

/** chip `chips`장 + LN `lns`장. 단위 총수 = chips + lns * 2. */
function makeNotes(chips, lns) {
  const notes = [];
  for (let i = 0; i < chips; i += 1) {
    notes.push({ startTick: i * 480, duration: 0, channel: (i % 4) + 1, isWide: false });
  }
  for (let i = 0; i < lns; i += 1) {
    notes.push({ startTick: (chips + i) * 480, duration: 480, channel: (i % 4) + 1, isWide: false });
  }
  return notes;
}

/**
 * 집계를 원본 상태로 되돌려 놓는다.
 *
 * `computeResult`는 `playHitMap`을 재순회해 센다. head 판정은 chip에 먼저 채우고
 * LN은 tail을 가진 것부터 쓴다 — 어느 노트에 붙느냐는 결과에 영향이 없고
 * (집계만 본다), 단위 수만 맞으면 된다.
 */
function synthesize({ chips, lns, heads, tails, headMissChips, headMissLns }) {
  D.notes = makeNotes(chips, lns);
  g.resetGauge();
  PS.playHitMap = new Map();
  PS.playMissSet = new Set();
  PS.playMaxCombo = 0;
  PS.fastCount = 0;
  PS.slowCount = 0;

  const chipNotes = D.notes.filter((n) => n.duration === 0);
  const lnNotes = D.notes.filter((n) => n.duration > 0);
  const tailTotal = (tails.ok ?? 0) + (tails.fail ?? 0);

  let li = 0;
  let ci = 0;
  // tail이 필요한 만큼 LN을 먼저 hitMap에 올린다 — tail은 head가 잡힌 LN에만 붙는다.
  const order = [...lnNotes.slice(0, tailTotal), ...chipNotes, ...lnNotes.slice(tailTotal)];
  let oi = 0;
  for (const [kind, count] of Object.entries(heads)) {
    for (let k = 0; k < count; k += 1) {
      const note = order[oi];
      oi += 1;
      if (!note) throw new Error('head 판정 수가 노트 수를 넘는다');
      PS.playHitMap.set(note, {
        headType: kind,
        isLN: note.duration > 0,
        tailDone: false,
        tailFailed: false,
      });
    }
  }

  let ok = tails.ok ?? 0;
  let fail = tails.fail ?? 0;
  for (const rec of PS.playHitMap.values()) {
    if (!rec.isLN) continue;
    if (ok > 0) { rec.tailDone = true; rec.tailFailed = false; ok -= 1; }
    else if (fail > 0) { rec.tailDone = true; rec.tailFailed = true; fail -= 1; }
  }
  if (ok > 0 || fail > 0) throw new Error('tail 수가 hitMap의 LN 수를 넘는다');

  // 미스는 hitMap에 없는 노트에서 고른다.
  const unhit = D.notes.filter((n) => !PS.playHitMap.has(n));
  ci = 0; li = 0;
  for (const n of unhit) {
    if (n.duration === 0 && ci < headMissChips) { PS.playMissSet.add(n); ci += 1; }
    else if (n.duration > 0 && li < headMissLns) { PS.playMissSet.add(n); li += 1; }
  }
  if (ci < headMissChips || li < headMissLns) throw new Error('미스로 돌릴 노트가 모자란다');
}

// 판정 조합 — 결과 산출이 갈리는 자리만 고른다.
//
// `incomplete`를 뺀 나머지는 **모든 단위가 판정된 판**이다: 노트마다 head 판정
// 아니면 미스가 붙고, head가 붙은 LN마다 tail이 하나 붙는다. 실제 판은 miss
// sweep이 끝을 쓸고 지나가므로 항상 이 상태로 끝난다.
const SHAPES = {
  // 전곡 SYNC (LN tail 포함) → AS
  allSync:      { chips: 12, lns: 6, heads: { SYNC: 18 },                      tails: { ok: 6 },          headMissChips: 0,  headMissLns: 0 },
  // PERFECT 섞임 → AP
  withPerfect:  { chips: 12, lns: 6, heads: { SYNC: 14, PERFECT: 4 },          tails: { ok: 6 },          headMissChips: 0,  headMissLns: 0 },
  // GOOD 섞임 → FC
  withGood:     { chips: 12, lns: 6, heads: { SYNC: 12, PERFECT: 3, GOOD: 3 }, tails: { ok: 6 },          headMissChips: 0,  headMissLns: 0 },
  // 미스 조금 — 게이지가 살아 클리어 → H / C
  fewMiss:      { chips: 12, lns: 6, heads: { SYNC: 15, GOOD: 1 },             tails: { ok: 6 },          headMissChips: 2,  headMissLns: 0 },
  // 미스 많음 — 미클리어 → 원본 `P` (재설계는 `F`로 흡수: GA-3)
  manyMiss:     { chips: 12, lns: 6, heads: { SYNC: 8, GOOD: 2 },              tails: { ok: 2 },          headMissChips: 4,  headMissLns: 4 },
  // LN 중간 이탈(midRelease)만으로 미스가 생기는 자리
  tailFail:     { chips: 12, lns: 6, heads: { SYNC: 18 },                      tails: { ok: 3, fail: 3 }, headMissChips: 0,  headMissLns: 0 },
  // Hold head 미스 — 원본은 duration>0을 2점으로 센다
  holdHeadMiss: { chips: 8,  lns: 6, heads: { SYNC: 12 },                      tails: { ok: 4 },          headMissChips: 0,  headMissLns: 2 },
  // 아무것도 치지 못한 판
  allMiss:      { chips: 12, lns: 6, heads: {},                                tails: {},                 headMissChips: 12, headMissLns: 6 },
  // 노트 0장 — 0 나눗셈 경계
  emptyChart:   { chips: 0,  lns: 0, heads: {},                                tails: {},                 headMissChips: 0,  headMissLns: 0 },
  // **끝까지 가지 않은 판.** 24단위 중 10단위만 판정됐고 미스는 0이다.
  // 원본 `computeState`는 미스·GOOD·PERFECT 개수만 보므로 이것을 `AS`로 낸다.
  incomplete:   { chips: 12, lns: 6, heads: { SYNC: 10 },                      tails: {},                 headMissChips: 0,  headMissLns: 0,
                  allowIncomplete: true },
};

/** 판정된 단위 수와 chart 단위 총수가 맞는지 본다. */
function judgedUnits(spec) {
  const heads = Object.values(spec.heads).reduce((s, n) => s + n, 0);
  const tails = (spec.tails.ok ?? 0) + (spec.tails.fail ?? 0);
  return heads + tails + spec.headMissChips + spec.headMissLns * 2;
}

for (const [name, spec] of Object.entries(SHAPES)) {
  const total = spec.chips + spec.lns * 2;
  const complete = judgedUnits(spec) === total;
  if (complete === !!spec.allowIncomplete) {
    throw new Error(`[result] ${name}: 단위 회계가 의도와 어긋난다 (${judgedUnits(spec)}/${total})`);
  }
}

const cases = [];
for (const gaugeType of ['normal', 'hard']) {
  for (const [shape, spec] of Object.entries(SHAPES)) {
    for (const forceEnded of [false, true]) {
      PS.gaugeType = gaugeType;
      PS.lockTarget = 'none';
      PS.lockMode = 'terminate';
      PS.playStartedFromBeginning = true;
      PS.playAutoplay = false;
      synthesize(spec);

      // `cleared`는 게이지 값이 정한다. 판정 열을 다시 돌리는 대신 집계에 맞는
      // 게이지를 직접 세워, 결과 산출만 홀로 재도록 한다.
      const missUnits = spec.headMissChips + spec.headMissLns * 2 + (spec.tails.fail ?? 0);
      const totalUnits = spec.chips + spec.lns * 2;
      PS.gaugeValue = totalUnits > 0
        ? Math.max(0, Math.min(100, Math.round((1 - missUnits / totalUnits) * 100)))
        : (gaugeType === 'hard' ? 100 : 0);

      const result = g.computeResult(forceEnded);
      cases.push({
        gaugeType, shape, forceEnded,
        gaugeValue: PS.gaugeValue,
        allowIncomplete: !!spec.allowIncomplete,
        expected: {
          state: result.state,
          score: result.score,
          accuracy: result.accuracy,
          rank: result.rank,
          counts: result.counts,
          cleared: result.cleared,
        },
      });
    }
  }
}

await emit('result', {
  tolerance: { integer: 'exact', real: 1e-9 },
  fieldNames: 'original (conflux-editor) — gaugeType/cleared, 재설계는 gaugeMode/tier',
  note2: 'computeResult를 직접 부른다. playHitMap/playMissSet은 집계만 맞춰 합성한다.',
  cases,
});
