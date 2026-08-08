// constants 골든 — 원본 `constants.js`·`settings.js`의 튜닝 수치와 기본값.
//
// 다른 표와 성격이 다르다. 함수를 돌려 얻은 결과가 아니라 **선언된 값 자체**다.
// 그래도 골든으로 두는 이유: 이 값들이 timing·judge·gauge 표를 만든 입력이므로,
// 값이 어긋나면 그 표들이 통째로 무의미해진다. 손으로 옮겨 적으면 그 순간이
// 오염 지점이 되므로 여기서도 재생성 가능하게 뽑는다.
//
// 재설계 명칭으로의 매핑은 테스트가 갖는다(`src/core/core-constants.test.ts`).
import { prepare, load, emit } from './harness.mjs';

await prepare();
const C = await load('constants.js');
const S = await load('settings.js');

/** 뽑을 이름 목록. 원본 명칭 그대로 쓴다. */
const FROM_CONSTANTS = [
  // 시간축
  'TPB',
  'GDIVS',
  'LEAD_IN_MS',
  'PLAY_RESUME_LEAD_MS',
  // 판정창
  'JUDGE_SYNC',
  'JUDGE_PERFECT',
  'JUDGE_GOOD',
  'JUDGE_WIDE_SYNC',
  'LN_RELEASE_GRACE_MS',
  // 게이지
  'GAUGE_START',
  'NORMAL_CLEAR_PCT',
  'GAUGE_NORMAL_TOTAL_GAIN',
  'GAUGE_DELTA',
  'LOCK_TIERS',
  // rank
  'RANK_TABLE',
  // 입력
  'DEFAULT_KEYS',
  'KEY2LINE',
  'OVERLAP_CHANNELS',
  'DEFAULT_ACTION_KEYS',
  // 스크롤
  'SPEED_MIN',
  'SPEED_MAX',
  'SPEED_STEP',
];

const cases = [];

for (const name of FROM_CONSTANTS) {
  if (!(name in C)) throw new Error(`원본 constants.js에 없는 이름: ${name}`);
  cases.push({ name, module: 'constants.js', expected: C[name] });
}

if (!('DEFAULT_SETTINGS' in S)) {
  throw new Error('원본 settings.js에 DEFAULT_SETTINGS가 없다');
}
cases.push({ name: 'DEFAULT_SETTINGS', module: 'settings.js', expected: S.DEFAULT_SETTINGS });

await emit('constants', {
  tolerance: { integer: 'exact', real: 1e-9 },
  fieldNames:
    'original (conflux-editor) — hiSpeed/bgBrightness/gauge/DEFAULT_KEYS, ' +
    '재설계는 scrollSpeed/jacketBrightness/gaugeMode/DEFAULT_LANE_KEYS',
  cases,
});
