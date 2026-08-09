/**
 * 튜닝 수치 단일 출처의 구현.
 *
 * 정의는 `core/constants.md`다. 여기는 그 값을 코드로 옮긴 것이며, 값이 맞는지는
 * `core-constants.test.ts`가 골든 표(`tests/golden/constants.json`)와 대조해 지킨다 —
 * 이 값들이 timing·judge·gauge 골든을 만든 입력이므로, 틀리면 그 표들이 통째로
 * 무의미해진다.
 *
 * 표인 것만 객체로 두고 나머지는 개별 `export const`다. 스펙 문서의 절 구조와
 * 1:1로 읽힌다.
 */

// ── 1. 시간축 ────────────────────────────────────────────────

/** tick per beat. → `core/timing.md` */
export const TICKS_PER_BEAT = 1920;

/**
 * 선택 가능한 분음표 분모. 값 `V`는 온음표의 분모이므로 **클수록 촘촘하다**
 * (한 칸 = `7680/V` tick). → `core/timing.md` §6
 *
 * 원본 `GDIVS`의 상단을 `96·128·192·256`으로 늘렸다 `[수정]` (설계 대장 TM-8).
 * 넷 다 `7680/V`가 정수로 떨어져(80·60·40·30) 반올림 오차가 생기지 않는다.
 */
export const GRID_DIVISORS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256] as const;

/**
 * 분박 격자 기본값 `[수정]` (원본 `ES.nGD = 2`). 8분음표 격자다 —
 * 원본의 1/2 격자는 실사용에서 거의 항상 바꾸게 되고, 표기 해상도가
 * 이 값을 타므로(`core/timing.md` §5) 지나치게 성기면 마디 표기가 뭉갠다.
 */
export const GRID_DIVISOR_DEFAULT = 8;

/** 곡 시작 전 카운트다운. */
export const LEAD_IN_MS = 3000;

/** pause Resume 카운트다운. 되감기는 없다. → `scene.md` §9 */
export const RESUME_LEAD_MS = 3000;

// ── 2. 판정창 (ms, |diff| 기준) → `core/judge.md` §2 ─────────

export const JUDGE_SYNC_MS = 25;
export const JUDGE_PERFECT_MS = 50;
export const JUDGE_GOOD_MS = 100;
/** wide 노트는 SYNC만, ±100. */
export const JUDGE_WIDE_SYNC_MS = 100;

/** hold tail release grace. GOOD 창과 별개의 단일 값이다. → `core/judge.md` §7 */
export const HOLD_RELEASE_GRACE_MS = 50;

// ── 3. 게이지 → `core/gauge.md` ──────────────────────────────

export const GAUGE_MAX = 100;
export const GAUGE_START = { normal: 0, hard: 100 } as const;
export const NORMAL_CLEAR_PCT = 75;
/** all-SYNC 잠재 회복(%). 100 상한이라 초과분은 폐기된다. */
export const GAUGE_NORMAL_TOTAL_GAIN = 150;

/**
 * 판정별 게이지 증감.
 *
 * `normal`의 양수만 `×a` 스케일이고 음수는 절대값이다. `hard`는 전부 절대값이다.
 * 판정은 4종 단일 축 — hold tail도 게이지 델타까지 통합됐다(구 `TAIL_OK`/`TAIL_MISS`
 * 특례 폐기, `constants.md` §2 `[수정]`).
 */
export const GAUGE_DELTA = {
  normal: { SYNC: 1.0, PERFECT: 1.0, GOOD: 0.5, MISS: -2.0 },
  hard: { SYNC: 0.15, PERFECT: 0.15, GOOD: 0, MISS: -5.0 },
} as const;

// ── 4. rank → `core/constants.md` §3 ─────────────────────────

/** 높음 → 낮음. 처음 도달한 임계가 rank다. */
export const RANK_TABLE = [
  ['U', 1000000],
  ['S+', 995000],
  ['S', 985000],
  ['A+', 970000],
  ['A', 950000],
  ['B', 900000],
  ['C', 800000],
  ['D', 700000],
  ['E', 500000],
  ['F', 0],
] as const satisfies readonly (readonly [string, number])[];

// ── 5. 스크롤 속도 범위 ──────────────────────────────────────

/** 판정선까지 한 화면이 담는 시간. `visMs = SCROLL_VIEW_MS / scrollSpeed`. */
export const SCROLL_VIEW_MS = 2000;

export const SCROLL_SPEED_MIN = 1.0;
export const SCROLL_SPEED_MAX = 10.0;
export const SCROLL_SPEED_STEP = 0.1;

// ── 6. 연출 시간 ─────────────────────────────────────────────

/** song-credit scene 총 5000ms. → `scene.md` §6 */
export const CREDIT_FADE_IN_MS = 500;
export const CREDIT_HOLD_MS = 4000;
export const CREDIT_FADE_OUT_MS = 500;

/** textEvent 등장·퇴장 fade에 같은 값을 쓴다. */
export const TEXT_FADE_MS = 300;

// ── 7. song-select → `scene/song-select.md` ──────────────────

export const SLOTS_PER_ROW = 5;
export const PREVIEW_DELAY_MS = 400;
export const PREVIEW_LOOP_MS = 15000;
export const PREVIEW_FADE_OUT_MS = 5000;

// ── 8. 로딩 표시 ─────────────────────────────────────────────

export const LOADING_INDICATOR_DELAY_MS = 300;

// ── 9. 곡 종료 → `core/timing.md` §9 ─────────────────────────

export const SONG_END_TAIL_MS = 3000;

// ── 10. lane 구조 → `core/data-model.md` §5.1 ────────────────

/** 물리 키 총수. global conflict 검사의 상한이다. */
export const TOTAL_KEYS = 6;

/** 키를 두 개 받는 lane. 로컬 동시 활성 capacity가 2다. */
export const OVERLAP_LANES = [2, 3] as const;

/** lane별 동시 입력 capacity. */
export const LANE_CAPACITY = { 1: 1, 2: 2, 3: 2, 4: 1 } as const;
