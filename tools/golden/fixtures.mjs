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

// shape 체인 — 원본 `shape.js`의 필드명(`isBlue`/`targetPos`)과 easing 이름
// (`Linear`/`In-Sine`/`Out-Sine`)을 그대로 쓴다.
//
// 이전 판은 이벤트에 `blue: [10,20,30,40]` 같은 배열을 넣고 easing에
// `In`/`Out`/`InOut`을 넘겼다. 원본에는 그런 필드도 그 easing 이름도 없어서,
// 두 체인이 통째로 "비었다"고 판정되고 easing은 전부 기본 가지(Linear)로
// 떨어졌다 — 58건 중 체인 보간을 대조하는 값이 0건이었다(D-2026-043).
//
// 위치는 원본 내부단위 0~64다. 재설계 외부단위와는 `내부 = (외부+8)×4`로 이어진다.
export const shapeFixtures = {
  // 두 체인 + easing 3종 + 즉시점프. 표본 tick이 보간 **도중**을 지난다.
  chain: {
    shapeEvents: [
      { startTick: 0,     duration: 0,     isBlue: true,  targetPos: 24, easing: null },
      { startTick: 0,     duration: 0,     isBlue: false, targetPos: 44, easing: null },
      { startTick: T,     duration: T,     isBlue: true,  targetPos: 8,  easing: 'Out-Sine' },
      { startTick: T * 3, duration: T,     isBlue: true,  targetPos: 40, easing: 'In-Sine' },
      { startTick: T,     duration: T * 2, isBlue: false, targetPos: 60, easing: 'Linear' },
      { startTick: T * 4, duration: 0,     isBlue: false, targetPos: 32, easing: 'Linear' },
    ],
  },

  // anchor가 없는 체인 — 기본 기하로 떨어진다 (원본 Blue 32 / Red 40).
  noAnchor: {
    shapeEvents: [
      { startTick: T, duration: T, isBlue: true, targetPos: 0, easing: 'Linear' },
    ],
  },

  // 체인 한가운데 anchor. 원본은 이것을 **무시한다** — 걸러내고 쳐다보지 않는다.
  midAnchor: {
    shapeEvents: [
      { startTick: 0,     duration: 0, isBlue: true, targetPos: 10, easing: null },
      { startTick: T,     duration: T, isBlue: true, targetPos: 50, easing: 'Linear' },
      { startTick: T * 3, duration: 0, isBlue: true, targetPos: 0,  easing: null },
      { startTick: T * 4, duration: T, isBlue: true, targetPos: 64, easing: 'Linear' },
    ],
  },

  // anchor가 둘. 원본은 tick이 이른 쪽이 아니라 **배열에 먼저 적힌** 쪽을 쓴다.
  anchorOrder: {
    shapeEvents: [
      { startTick: T * 8, duration: 0, isBlue: true, targetPos: 5,  easing: null },
      { startTick: 0,     duration: 0, isBlue: true, targetPos: 60, easing: null },
    ],
  },

  // 같은 tick에 즉시점프와 보간. 즉시점프가 먼저 서고 보간이 그 값에서 출발한다.
  sameTick: {
    shapeEvents: [
      { startTick: 0, duration: 0, isBlue: true, targetPos: 0,  easing: null },
      { startTick: T, duration: T, isBlue: true, targetPos: 64, easing: 'Linear' },
      { startTick: T, duration: 0, isBlue: true, targetPos: 32, easing: 'Linear' },
    ],
  },

  // 즉시점프가 잇달아 셋. 순회를 끊지 않고 차례로 다 걸린다.
  steps: {
    shapeEvents: [
      { startTick: 0,     duration: 0, isBlue: true, targetPos: 0,  easing: null },
      { startTick: T,     duration: 0, isBlue: true, targetPos: 20, easing: 'Linear' },
      { startTick: T * 2, duration: 0, isBlue: true, targetPos: 40, easing: 'Linear' },
      { startTick: T * 3, duration: 0, isBlue: true, targetPos: 60, easing: 'Linear' },
    ],
  },

  // 긴 보간 안에 짧은 보간이 들어앉는다. 진행 중인 것을 만나면 거기서 끝내므로
  // 안쪽 이벤트는 바깥이 끝난 뒤에야 값을 낸다.
  overlapping: {
    shapeEvents: [
      { startTick: 0,     duration: 0,     isBlue: true, targetPos: 0,  easing: null },
      { startTick: T,     duration: T * 4, isBlue: true, targetPos: 64, easing: 'Linear' },
      { startTick: T * 2, duration: T,     isBlue: true, targetPos: 32, easing: 'Linear' },
    ],
  },

  // Arc 입력 교번 — 직전 동색 보간의 easing이 다음 선택을 정한다.
  arc: {
    shapeEvents: [
      { startTick: 0,     duration: 0, isBlue: true, targetPos: 0,  easing: null },
      { startTick: T,     duration: T, isBlue: true, targetPos: 20, easing: 'Out-Sine' },
      { startTick: T * 3, duration: T, isBlue: true, targetPos: 40, easing: 'In-Sine' },
    ],
  },
};

export const TPB = T;
