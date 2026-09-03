/**
 * notes·shapes 공유 scroll/zoom 상태 — `editor-graph.md` §2 "scroll/zoom:
 * notes·shapes 공유"의 구현.
 *
 * M5-3(`scene-editor-notes.ts`)는 이 상태를 자기 클로저 안에 로컬로 뒀다 —
 * 그때는 shapes가 아직 없어 공유할 대상이 없었다. M5-4에서 shapes 씬을
 * 실제로 만들면서 그 요구가 실현 가능해졌다 — `scene-editor-workspace.ts`가
 * `EditorViewState` 객체 하나를 만들어 notes·shapes 양쪽 mount 함수에
 * **같은 참조**로 넘긴다. 두 씬 다 이 객체의 필드를 직접 읽고 쓰므로, 탭을
 * 넘나들어도(`renderBody()`가 body를 통째로 다시 만들어도) zoom·scroll
 * 위치가 유지된다.
 *
 * `viewMs` 파생값 자체(D-2026-098: `viewMs = 960000/(edZm×bpm)`, 120bpm
 * 기준)는 여기로 옮기지 않았다 — 이미 `scene-editor-notes.ts`가 유도해 둔
 * 것을 상수만 재사용한다.
 */

/** `viewMs` 기본값 — D-2026-098(edZm=1, 120bpm 기준 환산). */
export const VIEW_MS_DEFAULT = 8000;
/** `viewMs` 최소값(최대 확대) — D-2026-098(edZm=8 환산). */
export const VIEW_MS_MIN = 1000;
/** `viewMs` 최대값(최대 축소) — D-2026-098(edZm=0.25 환산). */
export const VIEW_MS_MAX = 32000;
/** Z/X 줌 step 비율 — 원본 `edZm` step ×1.35 그대로(D-2026-098, reciprocal이라 방향만 반전). */
export const VIEW_MS_ZOOM_STEP = 1.35;

/** notes·shapes가 공유하는 scroll/zoom 상태. 두 씬이 같은 인스턴스를 받는다. */
export interface EditorViewState {
  viewMs: number;
  scrollMs: number;
}

export function createEditorViewState(): EditorViewState {
  return { viewMs: VIEW_MS_DEFAULT, scrollMs: 0 };
}

/** Z(축소)/X(확대) 공통 로직 — 두 씬의 `onKeyDown`이 그대로 호출한다. */
export function zoomOut(view: EditorViewState): void {
  view.viewMs = Math.min(VIEW_MS_MAX, view.viewMs * VIEW_MS_ZOOM_STEP);
}

export function zoomIn(view: EditorViewState): void {
  view.viewMs = Math.max(VIEW_MS_MIN, view.viewMs / VIEW_MS_ZOOM_STEP);
}
