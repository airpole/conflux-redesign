/**
 * editor의 notes/shapes/meta/test 형제 scene 4개 — 단일 출처
 * `editor/editor-graph.md` §1·§2.
 *
 * **하나의 DOM host, 네 개의 scene id.** `mountSettingsScene()`(M4-6)과
 * 똑같은 패턴이다 — 네 category가 nav 바를 공유하므로 처음 mount되는
 * scene에서만 실제로 `mountEditorWorkspaceScene`을 호출하고 나머지는
 * `show(category)`만 부른다. `editorState`(scroll/zoom·selection)가
 * notes·shapes 사이에 공유된다는 §2 요구도 이 구조라 자연스럽다 — 네
 * category가 이미 같은 host 안에 산다.
 *
 * **Tab 순환은 settings와 다르다** — §1 "Tab 순환: notes → shapes → test →
 * notes"는 meta를 뺀 3개만 돈다("meta는 click 진입"). settings의 4개
 * 대칭 순환(M4-6)과 의도적으로 다른 스펙이다 — 이 파일이 새로 정한 게
 * 아니라 editor-graph.md가 이미 그렇게 정해 뒀다.
 *
 * **M5-1은 껍데기만 만들었다** — 각 category의 실제 내용은 그때 전부
 * 없었다. **M5-3이 notes에 실제 내용(`scene-editor-notes.ts`)을 처음
 * 붙였다** — `EditorCategoryController` delegation이 그 자리다: category가
 * `notes`면 `handlers.mountNotes(container, chart)`가 돌려주는 controller를
 * 붙여 두고, 이 파일의 `onKeyDown`이 **그 controller에게 먼저** 키를
 * 넘긴다(consumed 반환 시 여기서 더 처리하지 않는다) — notes 탭 자체
 * 단축키(Q/W/E/R/D/Delete/Ctrl+C/V/F, `Esc` 취소 계단)가 `Tab`/전역
 * `Escape`(뒤로가기)보다 먼저 자기 것부터 챙길 수 있게 하는 자리다.
 * meta/test는 여전히 껍데기다 — M5-5~M5-6.
 *
 * **M5-4가 shapes에 같은 자리를 붙였다** — `handlers.mountShapes(container,
 * chart, view)`. `view`(`EditorViewState`, `scene-editor-view.ts`)는 이
 * 파일이 **한 번만 만들어** notes·shapes 양쪽에 같은 참조로 넘긴다 —
 * `editor-graph.md` §2 "scroll/zoom: notes·shapes 공유"를 그 참조 공유로
 * 만족한다(탭을 넘나들며 `renderBody()`가 body를 통째로 다시 만들어도
 * zoom·scroll 위치는 이 객체 안에 남아 있다).
 */
import './scene-editor-workspace.css';
import type { Chart } from '../core/core-chart.js';
import { createEditorViewState, type EditorViewState } from './scene-editor-view.js';

export const EDITOR_CATEGORIES = ['notes', 'shapes', 'meta', 'test'] as const;
export type EditorCategory = (typeof EDITOR_CATEGORIES)[number];

/** Tab/Shift+Tab이 순환하는 부분집합 — meta 제외(§1). */
const TAB_CYCLE: readonly EditorCategory[] = ['notes', 'shapes', 'test'];

/** category 하나가 자기 body의 키 입력을 직접 다룰 때 구현한다(M5-3). */
export interface EditorCategoryController {
  /** true를 돌려주면 이 keydown을 이미 처리했다는 뜻 — workspace 자신의
   *  Tab/Backspace/Escape 처리로 넘어가지 않는다. */
  onKeyDown(event: KeyboardEvent): boolean;
  /** chart가 바뀔 때마다(command dispatch 등) 불린다 — DOM을 통째로 다시
   *  만들지 않고 이 controller가 스스로 다시 그린다. `mountNotes()`가 처음
   *  받은 chart와 별개로, 매 편집마다 최신값을 여기로 받는다. */
  update(chart: Chart): void;
  /** category를 벗어나거나 host가 사라질 때 정리(리스너 해제 등). */
  destroy(): void;
}

export interface EditorWorkspaceHandlers {
  readonly onCategoryChange: (category: EditorCategory) => void;
  /** Backspace/Esc — dirty 여부에 따라 세션 전환 확인을 거쳐 mode-select로
   *  나간다(호출측이 `edit-session-transition.ts`로 잇는다). */
  readonly onBack: () => void;
  /** notes body를 채운다(M5-3) — 지금 chart를 받아 `EditorCategoryController`
   *  를 돌려준다. 없으면(아직 이 handler를 안 넘긴 호출측) notes도 다른
   *  category처럼 placeholder로 남는다. */
  readonly mountNotes?: (
    container: HTMLElement,
    chart: Chart,
    view: EditorViewState,
  ) => EditorCategoryController;
  /** shapes body를 채운다(M5-4) — notes와 같은 계약, `view`는 notes와
   *  공유하는 같은 참조를 받는다. */
  readonly mountShapes?: (
    container: HTMLElement,
    chart: Chart,
    view: EditorViewState,
  ) => EditorCategoryController;
}

export interface EditorWorkspaceSceneHandle {
  update(chart: Chart): void;
  show(category: EditorCategory): void;
  hide(): void;
}

const CATEGORY_LABEL: Record<EditorCategory, string> = {
  notes: 'NOTES',
  shapes: 'SHAPES',
  meta: 'META',
  test: 'TEST',
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function mountEditorWorkspaceScene(
  target: HTMLElement,
  handlers: EditorWorkspaceHandlers,
): EditorWorkspaceSceneHandle {
  const root = el('div', 'editor-workspace-scene');
  root.hidden = true;

  const nav = el('div', 'editor-nav');
  const identity = el('div', 'editor-chart-identity');
  const body = el('div', 'editor-body');
  root.append(nav, identity, body);
  target.append(root);

  let chart: Chart | null = null;
  let category: EditorCategory = 'notes';
  let activeController: EditorCategoryController | null = null;
  const view = createEditorViewState();

  function renderNav(): void {
    nav.replaceChildren();
    for (const cat of EDITOR_CATEGORIES) {
      const pill = el('button', 'editor-nav-pill');
      pill.type = 'button';
      pill.textContent = CATEGORY_LABEL[cat];
      pill.classList.toggle('active', cat === category);
      pill.addEventListener('click', () => handlers.onCategoryChange(cat));
      nav.append(pill);
    }
  }

  function renderIdentity(): void {
    identity.textContent =
      chart === null ? '' : `${chart.songId} · chart ${chart.chartId} · ${chart.difficulty}`;
  }

  function renderBody(): void {
    activeController?.destroy();
    activeController = null;
    body.replaceChildren();

    if (category === 'notes' && handlers.mountNotes !== undefined && chart !== null) {
      activeController = handlers.mountNotes(body, chart, view);
      return;
    }
    if (category === 'shapes' && handlers.mountShapes !== undefined && chart !== null) {
      activeController = handlers.mountShapes(body, chart, view);
      return;
    }

    const placeholder = el('div', 'editor-body-placeholder');
    placeholder.textContent = `${CATEGORY_LABEL[category]} — 편집 UI는 이후 milestone 범위(M5-5~M5-6)`;
    body.append(placeholder);
  }

  function nextCategory(direction: 1 | -1): EditorCategory {
    const i = TAB_CYCLE.indexOf(category as (typeof TAB_CYCLE)[number]);
    // meta에 있을 때 Tab을 누르면 순환의 첫 자리(notes)로 들어간다 — meta는
    // 순환 밖이라 "지금 자리에서 다음"이라는 개념이 없다.
    if (i === -1) return TAB_CYCLE[0]!;
    const next = (i + direction + TAB_CYCLE.length) % TAB_CYCLE.length;
    return TAB_CYCLE[next]!;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (activeController?.onKeyDown(event) === true) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      handlers.onCategoryChange(nextCategory(event.shiftKey ? -1 : 1));
      return;
    }
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      handlers.onBack();
    }
  }

  return {
    update(next: Chart): void {
      chart = next;
      // chart만 바뀐 것(예: command dispatch)은 body를 통째로 다시 만들지
      // 않는다 — notes controller의 내부 상태(선택 툴·pending 배치 등)가
      // 매 편집마다 초기화되면 안 되므로, nav/identity만 다시 그리고
      // controller에는 가벼운 update()만 알린다.
      renderNav();
      renderIdentity();
      activeController?.update(next);
    },
    show(nextCategory: EditorCategory): void {
      category = nextCategory;
      root.hidden = false;
      renderNav();
      renderIdentity();
      renderBody();
      document.addEventListener('keydown', onKeyDown);
    },
    hide(): void {
      root.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
