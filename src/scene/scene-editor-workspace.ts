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
 * **이 라운드(M5-1)는 껍데기만 만든다** — 각 category의 실제 내용(노트
 * 배치 캔버스 M5-3, shape/lane 툴바 M5-4, metadata 필드 M5-5, test
 * 재생·quick options M5-6)은 아직 없다. `update(chart)`가 chart identity
 * (songId/chartId/difficulty)만 상단에 표시해 "세션이 chart 하나를
 * 소유한다"는 M5-1 Exit 기준을 눈으로 확인할 수 있게 했을 뿐, 편집
 * 인터랙션은 이 파일에 없다.
 */
import './scene-editor-workspace.css';
import type { Chart } from '../core/core-chart.js';

export const EDITOR_CATEGORIES = ['notes', 'shapes', 'meta', 'test'] as const;
export type EditorCategory = (typeof EDITOR_CATEGORIES)[number];

/** Tab/Shift+Tab이 순환하는 부분집합 — meta 제외(§1). */
const TAB_CYCLE: readonly EditorCategory[] = ['notes', 'shapes', 'test'];

export interface EditorWorkspaceHandlers {
  readonly onCategoryChange: (category: EditorCategory) => void;
  /** Backspace/Esc — dirty 여부에 따라 세션 전환 확인을 거쳐 mode-select로
   *  나간다(호출측이 `edit-session-transition.ts`로 잇는다). */
  readonly onBack: () => void;
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
    body.replaceChildren();
    const placeholder = el('div', 'editor-body-placeholder');
    placeholder.textContent = `${CATEGORY_LABEL[category]} — 편집 UI는 이후 milestone 범위(M5-3~M5-6)`;
    body.append(placeholder);
  }

  function render(): void {
    renderNav();
    renderIdentity();
    renderBody();
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
      render();
    },
    show(nextCategory: EditorCategory): void {
      category = nextCategory;
      root.hidden = false;
      render();
      document.addEventListener('keydown', onKeyDown);
    },
    hide(): void {
      root.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
