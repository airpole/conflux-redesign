// 합성 chart 세트 — 경계 조건을 각각 조준한 작은 chart들.
// 필드명은 원본 conflux-editor의 것을 그대로 쓴다 (startTick / isWide / channel).
// TPB = 1920.

const T = 1920;

export const fixtures = {
  // 단일 BPM·4/4 — 기준선
  plain: {
    tempo: [{ tick: 0, bpm: 120 }],
    timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: 0,     duration: 0, channel: 1, isWide: false },
      { startTick: T,     duration: 0, channel: 2, isWide: false },
      { startTick: T * 2, duration: 0, channel: 3, isWide: false },
      { startTick: T * 3, duration: 0, channel: 4, isWide: false },
    ],
  },

  // 다중 BPM — 변속 경계 직전/직후/정확히 위
  multiBpm: {
    tempo: [
      { tick: 0,     bpm: 120 },
      { tick: T * 4, bpm: 180 },
      { tick: T * 8, bpm: 60  },
    ],
    timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: T * 4 - 1, duration: 0, channel: 1, isWide: false },
      { startTick: T * 4,     duration: 0, channel: 2, isWide: false },
      { startTick: T * 4 + 1, duration: 0, channel: 3, isWide: false },
      { startTick: T * 8,     duration: 0, channel: 4, isWide: false },
    ],
  },

  // 다중 박자 — 마디 길이가 바뀌는 지점
  multiTimeSig: {
    tempo: [{ tick: 0, bpm: 120 }],
    timeSignatures: [
      { tick: 0,     numerator: 4, denominator: 4 },
      { tick: T * 4, numerator: 3, denominator: 4 },
      { tick: T * 7, numerator: 7, denominator: 8 },
    ],
    notes: [
      { startTick: 0,     duration: 0, channel: 1, isWide: false },
      { startTick: T * 4, duration: 0, channel: 2, isWide: false },
      { startTick: T * 7, duration: 0, channel: 3, isWide: false },
    ],
  },

  // 음수 tick — lead-in 구간, tick 0 이전
  negativeTick: {
    tempo: [{ tick: 0, bpm: 120 }],
    timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: -T,     duration: 0, channel: 1, isWide: false },
      { startTick: -1,     duration: 0, channel: 2, isWide: false },
      { startTick: 0,      duration: 0, channel: 3, isWide: false },
    ],
  },

  // Hold 중첩 — 같은 lane 연속, 다른 lane 겹침, wide와 normal 동시
  holdOverlap: {
    tempo: [{ tick: 0, bpm: 120 }],
    timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: 0,         duration: T,     channel: 2, isWide: false },
      { startTick: T / 2,     duration: T,     channel: 3, isWide: false },
      { startTick: T,         duration: T / 2, channel: 2, isWide: false },
      { startTick: T,         duration: T,     channel: 1, isWide: true  },
      { startTick: T,         duration: 0,     channel: 4, isWide: false },
    ],
  },

  // 6키 포화 — 한 tick에 모든 lane
  sixKeySaturation: {
    tempo: [{ tick: 0, bpm: 120 }],
    timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
    notes: [
      { startTick: T, duration: 0, channel: 1, isWide: false },
      { startTick: T, duration: 0, channel: 2, isWide: false },
      { startTick: T, duration: 0, channel: 3, isWide: false },
      { startTick: T, duration: 0, channel: 4, isWide: false },
      { startTick: T, duration: 0, channel: 2, isWide: false },
      { startTick: T, duration: 0, channel: 3, isWide: false },
    ],
  },
};

// 겹침 검출 — 활성구간 경계, 2겹 세부 분류, 3겹 이상, global 6키.
// notes 배열 순서 = 배치 순서이므로 순서 자체가 입력의 일부다 (merged/hidden 짝).
const n = (ch, startTick, duration = 0, isWide = false) =>
  ({ startTick, duration, channel: ch, isWide });

export const overlapFixtures = {
  // ── 활성구간 경계 — Hold가 끝나는 tick은 이미 활성이 아니다
  touchTapAtHoldEnd:  { notes: [n(2, 0, T), n(2, T)] },
  touchTapInsideHold: { notes: [n(2, 0, T), n(2, T - 1)] },
  touchHoldAfterHold: { notes: [n(2, 0, T), n(2, T, T)] },
  touchTapAtHoldHead: { notes: [n(2, 0, T), n(2, 0)] },

  // ── 2겹 세부 분류
  sameRangePair:  { notes: [n(2, 0), n(2, 0)] },
  sameRangeHolds: { notes: [n(3, 0, T), n(3, 0, T)] },
  partialHolds:   { notes: [n(2, 0, T), n(2, T / 2, T)] },
  tapOverHold:    { notes: [n(3, 0, T), n(3, T / 2)] },

  // 한 노트가 서로 다른 두 쌍에 낀다 — 먼저 만난 쌍의 표시가 남는가
  chainOfPairs: { notes: [n(2, 0, T), n(2, T / 2, T), n(2, T + T / 4, T)] },

  // ── 3겹 이상 (재설계는 conflict, 원본은 못 잡는다)
  tripleStaircase: { notes: [n(2, 0, T), n(2, T / 4, T), n(2, T / 2, T)] },
  quadSameTick:    { notes: [n(3, 0), n(3, 0), n(3, 0), n(3, 0)] },

  // ── 1키 lane과 Wide — 2겹이 곧 conflict
  singleKeyLane:  { notes: [n(1, 0), n(1, 0)] },
  singleKeyHold:  { notes: [n(4, 0, T), n(4, T / 2)] },
  wideOnWide:     { notes: [n(1, 0, 0, true), n(1, 0, 0, true)] },
  widePlusLane:   { notes: [n(1, 0, 0, true), n(1, 0)] },

  // ── global 6키 — 로컬은 전부 통과하는 7-입력 (1+2+2+1+1)
  sevenInput: {
    notes: [
      n(1, 0), n(2, 0), n(2, 0), n(3, 0), n(3, 0), n(4, 0), n(1, 0, 0, true),
    ],
  },
  // 총 6이라 통과해야 하는 대조군
  sixInput: {
    notes: [n(1, 0), n(2, 0), n(2, 0), n(3, 0), n(3, 0), n(4, 0)],
  },
  // Hold가 지속되는 동안 다른 lane head가 들어와 총수요가 7이 되는 자리
  heldThenHeads: {
    notes: [
      n(2, 0, T), n(2, 0, T), n(3, 0, T), n(3, 0, T),
      n(1, T / 2), n(4, T / 2), n(1, T / 2, 0, true),
    ],
  },
};

// shape / lane 체인 — easing 3종과 anchor
export const shapeFixtures = {
  chain: {
    shapeEvents: [
      { startTick: 0,     duration: T,     easing: 'Linear', blue: [10, 20, 30, 40], red: [50, 60, 70, 80] },
      { startTick: T * 2, duration: T * 2, easing: 'InOut',  blue: [40, 30, 20, 10], red: [80, 70, 60, 50] },
      { startTick: T * 5, duration: 0,     easing: 'Linear', blue: [0, 0, 0, 0],     red: [64, 64, 64, 64] },
    ],
    lineEvents: [
      { startTick: 0,     duration: 0, lines: [25, 25, 25, 25] },
      { startTick: T * 3, duration: T, lines: [10, 20, 30, 40] },
    ],
  },
};

export const TPB = T;
