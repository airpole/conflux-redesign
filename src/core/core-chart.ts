/**
 * chart 타입 — 영속되는 최상위 문서.
 *
 * 정의의 단일 출처는 `core/data-model.md`다. 여기는 그 구조의 타입 표현이다.
 *
 * **canonical 저장 단위는 chart 하나다.** song은 별도 저장 객체가 아니라 같은
 * `songId`를 가진 chart들의 파생 그룹이며, core는 그 그룹을 모른다 — core 함수는
 * 활성 chart 하나를 인자로 받고, 계산에 필요한 모든 것이 그 안에 있다.
 * (설계 대장 DM-1·DM-2)
 */

/** 현재 스키마 판. 다른 값이 든 파일은 거부한다 → `core-validate.ts` */
export const SCHEMA_VERSION = 1;

/** `1~4`. 노트가 사는 곳. (구 channel) */
export type Lane = 1 | 2 | 3 | 4;

/** `chartId 0`은 init(editor 전용), `1~5`가 고정 슬롯이다. */
export const DIFFICULTIES = ['init', 'Trace', 'Drift', 'Surge', 'Flux', 'Phase'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** `duration 0`이면 anchor, `>0`이면 보간. `null`은 anchor 이벤트다. */
export const EASINGS = ['Linear', 'In-Sine', 'Out-Sine'] as const;
export type Easing = (typeof EASINGS)[number] | null;

export const TEXT_POSITIONS = [
  'left',
  'middle',
  'right',
  'lane1',
  'lane2',
  'lane3',
  'lane4',
] as const;
export type TextPosition = (typeof TEXT_POSITIONS)[number];

export interface Tempo {
  readonly startTick: number;
  readonly bpm: number;
}

export interface TimeSignature {
  readonly startTick: number;
  readonly numerator: number;
  readonly denominator: number;
}

/** 4종 = `isWide` × `duration`. 영속 note ID는 없다. */
export interface Note {
  readonly startTick: number;
  /** `0`이면 tap, `>0`이면 hold. */
  readonly duration: number;
  readonly lane: Lane;
  /** true면 아무 키로나, false면 자기 lane 키로만. */
  readonly isWide: boolean;
}

export interface ShapeEvent {
  readonly startTick: number;
  readonly duration: number;
  /** Blue/Red 체인 식별자. 방향이 아니며 교차 가능. */
  readonly isBlue: boolean;
  /** 외부단위 -8~+8, 0.25 스텝. */
  readonly targetPos: number;
  readonly easing: Easing;
}

export interface LaneEvent {
  readonly startTick: number;
  readonly duration: number;
  readonly lineNum: 1 | 2 | 3;
  /**
   * 상대 실수 **전체**. 그 tick의 왼쪽 경계=0, 오른쪽 경계=1이지만
   * 저장 데이터는 그 범위에 구속되지 않는다 — 역전·초과를 허용하고
   * 구속은 gameplay 투영이 맡는다. (설계 대장 DM-4)
   */
  readonly targetPos: number;
  readonly easing: Easing;
}

export interface TextEvent {
  readonly startTick: number;
  readonly duration: number;
  /** 개행 허용. */
  readonly content: string;
  readonly position: TextPosition;
}

/** chart가 표시할 값. `Music by` 같은 라벨은 표시 레이어가 붙인다. */
export interface ChartMetadata {
  readonly title: string;
  readonly musicBy: string;
  readonly jacketBy: string;
  /** 오디오 싱크 보정 ms. 양수 = 음악 당김. */
  readonly offset: number;
  /** 자유 문자열. 빈 값은 song-select에서 `Uncategorized`로 모인다. */
  readonly category: string;
  /** song-select preview 시작 지점 ms. */
  readonly previewStartMs: number;
}

export interface Chart {
  readonly schemaVersion: number;
  readonly songId: string;
  readonly chartId: number;

  readonly metadata: ChartMetadata;
  readonly tempos: readonly Tempo[];
  readonly timeSignatures: readonly TimeSignature[];
  /** 경로가 아닌 **파일명만**. */
  readonly musicFile: string | null;
  readonly jacketFile: string | null;

  readonly difficulty: Difficulty;
  readonly subtitle: string;
  readonly level: number;
  readonly chartBy: string;
  readonly version: number;
  /** ISO 8601 UTC 문자열. 사전순 비교가 곧 시간순이다. */
  readonly updatedAt: string;

  /** 배열 순서 = 배치 순서. 직렬화에서도 보존한다. */
  readonly notes: readonly Note[];
  readonly shapeEvents: readonly ShapeEvent[];
  readonly laneEvents: readonly LaneEvent[];
  readonly textEvents: readonly TextEvent[];
}
