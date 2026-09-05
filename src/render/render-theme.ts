/**
 * gameplay 화면의 표현 값. 단일 출처는 `render/theme.md` — 여기는 그 문서
 * §1·§3의 코드 표현이다. 값을 바꾸려면 먼저 theme.md를 고친다.
 *
 * M4.5-1(D-2026-090)이 sudden·key 빔·마디선/step 선·text event·카운터/
 * 퍼센트·곡정보 띠·jacket 배경·canvas pause 아이콘을 마저 채웠다 — theme.md가
 * 이미 원본에서 실측해 둔 자리들이라 새 디자인 결정이 아니라 뒤늦은 배선이다.
 */

export const CANVAS_BG = '#000';
export const PLAYFIELD_BG = '#050508';

/** jacket 배경(draw order layer 1) — `theme.md` §2. `jacketBrightness`
 *  (`Settings`, 0~100)로 어둡게 깐다 — 100이면 원본 그대로, 0이면
 *  안 보인다(순수 곱셈 dim, 별도 곡선 없음). */
export const JACKET_BG = {
  /** dimAlpha = jacketBrightness / 100 그대로 globalAlpha에 곱한다. */
  maxAlpha: 1,
} as const;

export const PLAYFIELD_ASPECT = 16 / 9;

export const NOTE_COLOR = {
  wideHead: '#4AE8FF',
  wideBody: '#008898',
  normalHead: '#ffffff',
  normalBody: '#8888a0',
} as const;

/** wide 노트 body의 반투명 변형(그리드가 비친다) — `render/theme.md` §1
 *  `WIDE_BODY_ALPHA`. gameplay는 아직 안 쓴다 — editor notes 캔버스가
 *  M5.5-1 첫 소비자다. */
export const WIDE_BODY_ALPHA = '#008898cc';

/** overlap(2키 lane 겹침) 색 — `render/theme.md` §1 `OVERLAP_COLOR`/
 *  `OVERLAP_BODY`. gameplay는 overlap을 그리지 않는다 — editor notes
 *  캔버스가 M5.5-1 첫 소비자다. */
export const OVERLAP_COLOR = {
  head: '#FFE14A',
  body: '#C89830',
} as const;

export const SHAPE_BOUNDARY = {
  color: '#ffffffc8',
  lineWidth: 3,
} as const;

export const LANE_DIVIDER = {
  color: '#ffffff22',
  lineWidth: 1.5,
} as const;

export const SHAPE_STEP_LINE = {
  color: '#7ad6ff66',
  lineWidth: 2,
} as const;

/** 게이지 값이 없는(=idle) 상태의 판정선 트랙. 라이브 채색은 `GAUGE_COLOR`. */
export const JUDGE_TRACK = {
  trackColor: 'rgba(255,255,255,0.10)',
  baselineColor: '#ffffff',
  thicknessPx: 6,
  glowThicknessPx: 12,
} as const;

/**
 * 게이지 바(=판정선) 채색 — `render/theme.md` §1 "gauge". `hard`는 항상 빨강
 * (반전 없음), `normal`은 `NORMAL_CLEAR_PCT`(75%, `core-constants`) 미만이면
 * 초록, 그 이상이면 하늘색으로 반전한다(clear-secured 신호).
 */
export const GAUGE_COLOR = {
  hard: '#ff4a5a',
  normalBelowClear: '#4aff8a',
  normalCleared: '#4ad6ff',
} as const;

/** 판정별 색 — `render/theme.md` §1 "판정 색(hit effect)". 판정 텍스트에도 쓴다. */
export const JUDGMENT_COLOR = {
  SYNC: '#ffffff',
  PERFECT: '#ffe44a',
  GOOD: '#4aff8a',
  MISS: '#ff4a6a',
} as const;

export const FAST_SLOW_COLOR = {
  FAST: '#ff5a6a',
  SLOW: '#5aa0ff',
} as const;

/** hit effect(물결 반원) — `render/theme.md` §3 "sudden · hit effect". */
export const HIT_EFFECT = {
  /** shape 폭과 무관한 고정 반지름 — shape가 collapse해도 안 사라진다. */
  radiusFactor: 0.045,
  wideRadiusMultiplier: 1.6,
  durationMs: 300,
} as const;

/** HUD 텍스트(콤보·판정·FAST/SLOW) — `render/theme.md` §3 "HUD". */
export const HUD_TEXT = {
  comboSizeFactor: 0.06,
  judgmentSizeFactor: 0.021,
  fastSlowSizeFactor: 0.016,
  /** `comboY = jY - gh × (8/9 − comboOffsetFrac)`. */
  comboOffsetFrac: 0.22,
  /** 텍스트 줄 사이 여백 = `gw × gapFactor`. */
  gapFactor: 0.008,
  comboColor: '#ffffffdd',
  fastSlowFlashMs: 500,
  /** 판정 텍스트(SYNC/PERFECT/GOOD/MISS) 표시 지속시간(M4.5-1, D-2026-090) —
   *  `theme.md`에 원래 지속시간 값이 없어(그동안 다음 판정이 올 때까지
   *  안 지워지는 채로 구현돼 있었다) `fastSlowFlashMs`와 같은 값으로
   *  새로 골랐다 — 같은 HUD 텍스트 블록에서 바로 아래 줄에 붙는 형제
   *  요소라 다른 지속시간을 쓸 근거가 약하다. */
  judgmentFlashMs: 500,
} as const;

/** 카운터·퍼센트(judgment count·running accuracy) HUD 행 — `theme.md` §3
 *  "카운터"/"퍼센트"(M4.5-1). 판정 텍스트 바로 아래, FAST/SLOW 위에 둔다 —
 *  원본 주석("카운터·정확도 행이 아직 없어 판정 텍스트가 그 자리를 당겨
 *  쓴다")이 판정 텍스트가 원래 이 행의 자리를 임시로 빌려 쓰고 있었다는
 *  뜻이라, 판정 텍스트를 제자리로 옮기고 이 행을 그 사이에 끼워 넣는
 *  순서로 읽었다 — theme.md가 정확한 Y 앵커를 주지 않아 이 스택 순서
 *  자체는 이번 세션의 해석이다(결정 필요 항목으로 보고). */
export const HUD_COUNTER_PERCENT = {
  counterSizeFactor: 0.014,
  percentSizeFactor: 0.01625,
} as const;

/** 곡정보 띠(song info strip) — `theme.md` §3 "곡정보 띠"/"곡명"/"아티스트".
 *  판정선 바로 아래 밴드, 판정선을 따라 이동하되 내부 높이는 고정. */
export const SONG_INFO_STRIP = {
  /** 기본 밴드 높이 — `gh × 1/9`(구 `jYDefault`~캔버스 하단 간격과 같음). */
  bandHeightFrac: 1 / 9,
  /** 곡명 글자 크기 — `cell × 0.28`(`cell = gw/16`). */
  titleCellFactor: 0.28,
  /** 아티스트 글자 크기 — `titleSz × 0.8`. */
  artistOfTitleFactor: 0.8,
  titleColor: '#ffffffdd',
  artistColor: '#ffffff99',
} as const;

/** 캔버스 pause 아이콘(두 막대) — `theme.md` §3 "pause 버튼", 좌상단
 *  `cell` 내부. 클릭하면 pause를 연다(M4.5-1, D-2026-090) — 이전에는
 *  키보드(Escape/Backspace)만 있었다. */
export const PAUSE_ICON = {
  cellFactor: 1 / 16, // cell = gw × cellFactor
  barWFactor: 0.12, // barW = cell × barWFactor
  barHFactor: 0.45, // barH = cell × barHFactor
  color: '#ffffffdd',
} as const;

/** key 빔(눌린 lane 하이라이트, live 세션만) — `theme.md` §2 draw order
 *  layer 3, §3 "키 빔". */
export const KEY_BEAM = {
  /** beamTop = gy + gh × topFrac, jY까지 이어진다. */
  topFrac: 0.3,
  /** 헤드(판정선 바로 위 진한 부분) 높이 — px, jY 기준. */
  headHeightPx: 10,
  color: '#ffffff33',
  headColor: '#ffffff88',
} as const;

/** 마디선·step 선 — `theme.md` §2 draw order layer 4, §3. */
export const MEASURE_LINE = {
  color: '#ffffff22',
  lineWidth: 1.5,
} as const;

/** sudden 커버(상단 불투명 레인 커버) — `theme.md` §3 "sudden". */
export const SUDDEN_COVER = {
  /** 최대 90%(`settings.sudden` 범위, [[settings]])가 판정선까지 거리의
   *  95%를 넘지 않게 한다(`theme.md` "최대 95%"). */
  maxCoverFrac: 0.95,
  color: '#000000',
} as const;

/** text event(3분할 컬럼/lane) — `theme.md` §3 "text event", 색은 §1
 *  `TEXT_COLOR`. */
export const TEXT_EVENT = {
  color: '#4ae0ff',
  columnSizeFactor: 0.022,
  laneSizeFactor: 0.016,
  columnPaddingFactor: 0.02,
} as const;
