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
 *
 * **`mountEditorScrollbar`(M5-6, D-2026-104)** — notes/shapes/test 셋 다 같은
 * `scrollMs`를 시각화·드래그-seek하는 새 UI 요소다. 원본에는 대응하는
 * 스크롤바가 없다(실측 확인, `scene-editor-view.css` 참조) — 이 파일이
 * scroll/zoom 상태를 이미 소유하고 있어 그 상태를 그리는 최소 위젯을 같은
 * 곳에 뒀다(새 계층을 만든 게 아니라 기존 상태 소유자에 자연스러운 확장).
 * 세로 트랙(우측 고정) — notes/shapes의 "시간은 위로 흐른다" 관례를 그대로
 * 따라 트랙 위쪽이 늦은 시각, 아래쪽이 이른 시각이다. `range`(min/maxMs)는
 * 호출측이 매 update마다 넘긴다 — notes/shapes는 `minTick()` 하한 +
 * `contentEndMs`([[timing]] §9, `songEndOf`) 기준 상한을 쓴다(D-2026-126)
 * — 원래 위·아래 한계가 없는 스크롤 모델이라 그 너머로 스크롤하면(편집
 * 중엔 chart 끝 너머로 note를 놓는 게 정상이다) 상한이 그만큼 계속
 * 자란다. test scene은 `Math.max(contentEndMs, 5000)`(D-2026-097/103)
 * 고정 상한을 쓴다 — notes/shapes와 달리 이미 있는 content 안에서만
 * 재생 시작점을 고르는 순수 탐색이라 그 너머로 자랄 이유가 없다.
 */
import './scene-editor-view.css';

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

/** 스크롤바가 그려질 시간 범위. `maxMs > minMs`를 호출측이 보장한다. */
export interface ScrollbarRange {
  readonly minMs: number;
  readonly maxMs: number;
}

export interface EditorScrollbar {
  /** 매 render() 프레임에서 부른다 — 트랙 안 thumb 위치/크기를 다시 잰다. */
  update(range: ScrollbarRange): void;
  destroy(): void;
}

/**
 * 세로 scrollbar(M5-6, D-2026-104) — `container`는 `position: relative`(또는
 * 이미 그런 조상)여야 트랙이 우측 고정으로 붙는다. 드래그·클릭 둘 다
 * 트랙 위 pointer y를 그 지점의 ms로 환산해 `view.scrollMs`를 그 시각이
 * 창(`viewMs`) 중앙에 오도록 세팅한다. `onSeek`은 값이 바뀔 때마다(드래그
 * 중 매 프레임 포함) 불린다 — 호출측이 다시 그려야 한다.
 */
export function mountEditorScrollbar(
  container: HTMLElement,
  view: EditorViewState,
  onSeek: () => void,
): EditorScrollbar {
  const track = document.createElement('div');
  track.className = 'editor-scrollbar-track';
  const thumb = document.createElement('div');
  thumb.className = 'editor-scrollbar-thumb';
  track.append(thumb);
  container.append(track);

  let range: ScrollbarRange = { minMs: 0, maxMs: 1 };
  let dragging = false;

  function msAtPointerY(clientY: number): number {
    const rect = track.getBoundingClientRect();
    const frac = rect.height <= 0 ? 0 : (clientY - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, frac));
    // 트랙 위쪽 = 늦은 시각(range.maxMs), 아래쪽 = 이른 시각(range.minMs) —
    // notes/shapes의 "시간은 위로 흐른다" 관례(scene-editor-notes.ts 헤더).
    return range.maxMs - clamped * (range.maxMs - range.minMs);
  }

  function seekTo(clientY: number): void {
    const targetMs = msAtPointerY(clientY);
    const span = range.maxMs - range.minMs;
    const maxScroll = Math.max(range.minMs, range.maxMs - view.viewMs);
    view.scrollMs = Math.max(
      range.minMs,
      Math.min(maxScroll, targetMs - view.viewMs / 2, range.minMs + span),
    );
    onSeek();
  }

  function onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    dragging = true;
    track.classList.add('dragging');
    // jsdom(테스트 환경)엔 없는 메서드라 존재할 때만 부른다 — 실제 브라우저
    // 에선 포인터가 트랙 밖으로 나가도 드래그가 이어지게 하는 표준 캡처다.
    track.setPointerCapture?.(event.pointerId);
    seekTo(event.clientY);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!dragging) return;
    seekTo(event.clientY);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    track.releasePointerCapture?.(event.pointerId);
  }

  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', onPointerUp);

  return {
    update(nextRange: ScrollbarRange): void {
      range = nextRange;
      const span = Math.max(1, range.maxMs - range.minMs);
      const heightFrac = Math.max(0.03, Math.min(1, view.viewMs / span));
      const topFrac = Math.max(
        0,
        Math.min(1 - heightFrac, 1 - (view.scrollMs + view.viewMs - range.minMs) / span),
      );
      thumb.style.top = `${(topFrac * 100).toFixed(3)}%`;
      thumb.style.height = `${(heightFrac * 100).toFixed(3)}%`;
    },
    destroy(): void {
      track.removeEventListener('pointerdown', onPointerDown);
      track.removeEventListener('pointermove', onPointerMove);
      track.removeEventListener('pointerup', onPointerUp);
      track.remove();
    },
  };
}
