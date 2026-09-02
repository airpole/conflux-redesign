/**
 * song-select 목록 렌더 — 단일 출처 `scene/ui-design.md` §2.5, 데이터
 * 모델은 `core/core-song-select.ts`(M4-3·M4-4).
 *
 * **M4-4가 더한 것**: cursor 이동(방향키·`PageUp`/`PageDown`/`Home`/`End`,
 * 열 대응 규칙)·하이라이트, folder 아코디언(펼침/접힘, `Enter`·클릭으로
 * 토글), 검색(타이핑 즉시 시작, idle/typing/no-results 3상태), 정보 패널
 * (§2.5.4, cursor의 chart 기준, 기록 격자 judge 모드), preview 트리거
 * 콜백(실제 재생은 `game-song-preview.ts`), 기록 초기화 진입점(옵션,
 * `FEATURES.recordReset` 게이팅은 호출측 몫).
 *
 * **M4-7이 quick options 오버레이를 더했다**([[scene]] §5·§10, 로직은
 * `core-quick-options.ts`). `Space`로 열고 Esc/Space로 닫는다 — 열려 있는
 * 동안은 `onKeyDown`이 이 파일의 다른 어떤 처리로도 새지 않고 오버레이
 * 전용 핸들러(`onQuickOptionsKeyDown`)로만 간다(§10 "열림 중 scene 입력
 * 차단"). 5필드(scrollSpeed/gaugeMode/mirror/staticShape/autoplay)를
 * 위아래로 나열하고, ↑↓는 row 이동·←→는 한 칸 step·휠은 위/아래 한 칸씩
 * step·클릭/드래그는 그 값으로 즉시 점프·Enter는 지금 row의 draft를
 * 확정한다(전부 `core-quick-options.ts`가 이미 정한 순수 로직 — 이 파일은
 * DOM과 키/휠/클릭 이벤트만 그 함수들에 잇는다). row 하나가 확정될
 * 때마다 `handlers.onQuickOptionsChange(settings)`를 그 즉시 부른다
 * ([[settings]] D-2026-022 "즉시 영속 필드" — M4-6의 설정 화면과 같은
 * 즉시-커밋 패턴). autoplay/staticShape가 이 경로로 바뀌면 다음 gameplay
 * 진입(`app-main.ts`의 `readSettings`)이 그 값을 그대로 읽어 no-record
 * 게이트([[settings]] §4의 OR 4조건, `core-records.ts`의 `isNoRecord`)에
 * 자동으로 반영된다 — no-record 로직 자체는 M4-5가 이미 완성해 뒀고,
 * M4-7이 잇는 건 "이 값을 바꿀 수 있는 새 입구 하나"뿐이다.
 *
 * **M4.6이 배치·위젯·닫기 동작을 정식으로 확정했다**(`ui-design.md`
 * §2.5.8, D-2026-093 — M4-7의 placeholder를 대체, 아래 세 가지를
 * 뒤집거나 채운다). (1) scrollSpeed는 네이티브 `<input type=range>`
 * (`.slider-input`, settings §2.6.3과 같은 컴포넌트)로 바뀌어 클릭·드래그가
 * 실제로 그 위치의 값으로 점프한다 — 드래그 도중 매 `input` 이벤트마다
 * `quickOptionsPanel`을 통째로 다시 그리면 드래그 중인 `<input>` 자체가
 * 교체돼 포인터 캡처가 끊긴다, 그래서 같은 row에서의 드래그는 값 텍스트
 * 노드만 갱신하고(`renderScrollSpeedControl`) row가 바뀔 때만 전체
 * `renderQuickOptions()`를 다시 부른다. (2) gaugeMode는 segmented control
 * (`.segment-group`/`.segment-btn`, settings의 select 위젯과 동일)로
 * 바뀌어 각 모드가 독립 클릭 타겟이다. mirror/staticShape/autoplay는
 * 이미 M4-7의 toggle-switch 클릭 토글 그대로다(bool 필드는 원래도
 * "클릭 = 즉시 점프"를 만족했다). (3) **닫을 때(Esc/Space)의 동작이
 * 뒤집혔다** — M4-7은 미확정 draft를 버렸지만(D-2026-092), 이제는 지금
 * row의 draft를 Enter를 누른 것처럼 그 자리에서 확정한다
 * (`closeQuickOptionsOverlay`가 `commitQuickOptionsRow`를 그대로 재사용 —
 * 새 core 로직이 필요 없었다). row 이동(↑/↓)이 미확정 draft를 버리는
 * 규칙은 바뀌지 않았다 — "다른 필드로 옮긴다"와 "오버레이를 나간다"를
 * 서로 다른 액션으로 갈랐다.
 *
 * **folder 헤더는 row와 같은 메커니즘으로 상하 이동이 지나가는 정지점이다**
 * (§4 "아코디언이다 — 하나를 펼치면 다른 folder는 접힌다") — 새 인터랙션
 * 어휘를 만들지 않고 기존 `Enter`(다른 곳에서도 "확정/토글" 역할)와 기존
 * 클릭 입력(sort/group 칩의 클릭+휠 patterns)을 그대로 재사용한다. 커서가
 * 헤더에 있을 때 `Enter`를 누르거나 헤더를 클릭하면 그 folder를
 * 펼침/접힘 토글한다 — 펼치면 다른 folder는 자동으로 접힌다(아코디언,
 * 한 번에 하나만). 접힘 상태는 영속하지 않는다(§4) — scene 내부 상태일
 * 뿐 `viewState`에는 없다.
 *
 * **정렬·그룹 바는 여전히 표시만 한다** — [[song-select]] §14 잔여
 * "목록 옵션 overlay 진입 키"(M4-3 前 게이트)가 아직 안 닫혀 클릭해
 * overlay를 여는 인터랙션은 이번에도 없다. `PageUp`/`PageDown`의
 * "한 화면 단위"는 실제 화면에 몇 row가 보이는지에 달려 있는데(순수
 * 계산인 `core-song-select.ts`가 알 수 없는 렌더 시점 정보) 그 값을 재는
 * viewport 기반 페이지 크기 설계는 아직 없어 `PAGE_STOP_COUNT`(고정값,
 * 아래) 근사를 쓴다 — 실제 DOM 측정 기반 페이지 크기가 필요해지면 별도
 * 결정.
 *
 * **정보 패널에 BPM·곡 길이가 없다** — 같은 M4-3 前 게이트("정보 패널
 * BPM 표기 방식·곡 길이 표시")가 아직 안 닫혀 칸을 비워 뒀다.
 *
 * `Up`/`Down` 길게 누름의 가속 스크롤(§7)은 없다 — 가속 수치(초기 지연·
 * 반복 간격·가속 곡선)가 같은 M4-3 前 게이트에 걸려 있다(결정 필요 항목).
 */
import './scene-song-select.css';
import {
  buildCursorStops,
  cursorTarget,
  filterByCategory,
  filterBySearch,
  folderIndexOf,
  groupRows,
  locateCursor,
  moveCursorByPage,
  moveCursorEnd,
  moveCursorHome,
  moveCursorHorizontal,
  moveCursorVertical,
  sortRows,
  ALL_CATEGORY,
  type CursorPosition,
  type CursorStop,
  type CursorTarget,
  type Folder,
  type GroupByAxis,
  type SongRow,
  type SongSelectViewState,
} from '../core/core-song-select.js';
import {
  applyQuickOptions,
  confirmQuickOption,
  jumpQuickOption,
  moveQuickOptionsRow,
  openQuickOptions,
  stepQuickOption,
  QUICK_OPTION_FIELDS,
  type QuickOptionField,
  type QuickOptionsState,
} from '../core/core-quick-options.js';
import { GAUGE_MODES, type GaugeMode } from '../core/core-gauge.js';
import { SCROLL_SPEED_MAX, SCROLL_SPEED_MIN, SCROLL_SPEED_STEP } from '../core/core-constants.js';
import { DEFAULT_SETTINGS, type Settings } from '../core/core-settings.js';
import { translate } from '../core/core-i18n.js';

export type { SongSelectViewState };

/** `PageUp`/`PageDown` 한 번에 넘어가는 정지점 수 — 실제 viewport 측정이
 *  없어 고정값 근사(파일 머리말 참조). */
const PAGE_STOP_COUNT = 5;

export interface SongSelectSceneHandle {
  /** 전체 row 목록과 표시 axis를 다시 받아 목록을 재구성한다. 커서는
   *  `view.lastSelected`를 시작점으로 두되, 이후 내부적으로 관리한다
   *  (재호출로 덮어쓰지 않는다 — 그러면 axis만 바꿨는데 커서가 리셋된다).
   *  `settings`는 quick options 오버레이가 여는 순간 스냅샷의 출처다 —
   *  매 `onEnter`마다 최신값으로 다시 넘겨받는다(M4-7). */
  update(rows: readonly SongRow[], view: SongSelectViewState, settings: Settings): void;
  show(): void;
  hide(): void;
}

export interface SongSelectHandlers {
  readonly onCategoryChange: (category: string) => void;
  readonly onBack: () => void;
  /** 커서가 새 chart로 옮겨질 때마다(뒤로가기 등 포함) 불린다 — 커서가
   *  folder 헤더에 있는 동안은 `null`이다. `lastSelected` 영속과 preview
   *  트리거를 호출측이 여기서 잇는다. */
  readonly onCursorChange: (target: CursorTarget | null) => void;
  /** Enter — 선택 확정. `song-credit`이 아직 없어(M4-5) 호출측이 무엇을
   *  할지 정한다(현재는 콘솔 로그만). 커서가 folder 헤더에 있을 때는
   *  선택이 아니라 그 folder를 펼침/접힘 토글하므로 불리지 않는다. */
  readonly onSelect: (target: CursorTarget) => void;
  /** 우하단 기록 칸 클릭 — percent ↔ judge 토글. */
  readonly onRecordCellModeChange: (mode: 'percent' | 'judge') => void;
  /** `FEATURES.recordReset`이 켜졌을 때만 넘겨준다 — 없으면 버튼 자체를
   *  안 그린다(§13 "FEATURES.recordReset에서만 노출"). */
  readonly onResetRecord?: (target: CursorTarget) => void;
  /** quick options 오버레이에서 필드 하나가 확정될 때마다(Enter) 그 즉시
   *  불린다 — [[settings]] D-2026-022 "즉시 영속 필드"를 따라 `writeSettings`
   *  로 잇는 건 호출측 몫이다(M4-6의 `SettingsHandlers.onChange`와 같은
   *  패턴). */
  readonly onQuickOptionsChange: (settings: Settings) => void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

const AXIS_LABELS: Record<GroupByAxis, string> = {
  none: 'None',
  updated: 'Updated',
  title: 'Title',
};

const TYPEABLE_KEY = /^[\p{L}\p{N}]$/u;

const JUDGE_ORDER = ['SYNC', 'PERFECT', 'GOOD', 'MISS'] as const;

export function mountSongSelectScene(
  target: HTMLElement,
  handlers: SongSelectHandlers,
): SongSelectSceneHandle {
  const root = el('div', 'song-select-scene');
  root.hidden = true;

  const tabBar = el('div', 'tab-bar');
  const searchBox = el('div', 'search-box');
  const topBar = el('div', 'top-bar');
  topBar.append(tabBar, searchBox);

  const listOptionsBar = el('div', 'list-options-bar');
  const sortChip = el('div', 'chip');
  const groupChip = el('div', 'chip');
  listOptionsBar.append(sortChip, groupChip);

  const body = el('div', 'song-select-body');
  const infoPanel = el('div', 'info-panel');
  const listCol = el('div', 'list-col');
  body.append(infoPanel, listCol);

  const quickOptionsOverlay = el('div', 'quick-options-overlay');
  quickOptionsOverlay.hidden = true;
  const quickOptionsPanel = el('div', 'quick-options-panel');
  quickOptionsOverlay.append(quickOptionsPanel);

  root.append(topBar, listOptionsBar, body, quickOptionsOverlay);
  target.append(root);

  // ── 내부 상태 ──────────────────────────────────────────────────────
  let allRows: readonly SongRow[] = [];
  let view: SongSelectViewState = {
    category: ALL_CATEGORY,
    groupBy: 'none',
    sortKey: 'default',
    sortDir: 'asc',
    recordCellMode: 'percent',
    lastSelected: null,
  };
  let cursorTargetState: CursorTarget | null = null;
  // render()가 onCursorChange를 부를지 판단하는 기준 — cursorTargetState는
  // render() 전에 이미 desired 값으로 앞서 대입돼 있어(lastSelected 시드,
  // moveTo() 등) render() 안에서 그 값과 비교하면 항상 자기 자신과 같아져
  // 절대 안 바뀐 걸로 나온다. 그래서 "마지막으로 onCursorChange에 실제로
  // 넘긴 값"을 따로 들고 그것과 비교한다.
  let lastEmittedTarget: CursorTarget | null = null;
  // 아코디언(§4) — 한 번에 folder 하나만 펼친다. 진입 시 1회만
  // lastSelected가 속한 folder(없으면 첫 folder)로 초기화하고, 이후로는
  // 오직 토글(Enter·클릭)로만 바뀐다 — axis가 재계산돼도 덮어쓰지 않는다.
  let expandedFolderIndex: number | null = null;
  let expandedInitialized = false;
  // 커서가 지금 folder 헤더 위에 있으면 그 folder 인덱스, row 위에 있으면
  // `null`. cursorTargetState와 별도로 들고 있어야 하는 이유: 헤더에는
  // chart 정체성이 없어(§4) cursorTargetState만으로는 "헤더에 있음"을
  // 표현할 수 없고, 헤더를 지나 다시 row로 돌아올 때 원래 chart 기억을
  // 잃지 않아야 하기 때문이다(§7 "직전 열을 기억"과 같은 이유로 위치
  // 자체는 유지한 채 focus 종류만 구분한다).
  let headerFocusFolderIndex: number | null = null;
  let searchQuery = '';
  let currentStops: readonly CursorStop[] = [];

  // ── quick options overlay(M4-7, `scene.md` §5·§10) ───────────────────
  // `settings`는 host(`app-main.ts`)가 매 `update()`마다 최신값을 넘긴다 —
  // `update()`가 `show()`보다 먼저 불려야 한다는 계약은 다른 scene들과
  // 같다(자리표시자는 그 계약이 지켜지는 한 실제로 쓰이지 않는다).
  let currentSettings: Settings = DEFAULT_SETTINGS;
  let quickOptionsState: QuickOptionsState | null = null;

  function isFolderExpanded(hasHeaders: boolean, folderIndex: number): boolean {
    return !hasHeaders || folderIndex === expandedFolderIndex;
  }

  function render(): void {
    const byCategory = filterByCategory(allRows, view.category);
    const searching = searchQuery !== '';
    const searched = searching ? filterBySearch(byCategory, searchQuery) : byCategory;
    const sorted = sortRows(searched, view.sortKey, view.sortDir);
    // 검색 중에는 folder를 무시하고 평평한 목록으로(§6).
    const hasHeaders = !searching && view.groupBy !== 'none';
    const folders = groupRows(sorted, searching ? 'none' : view.groupBy);

    if (!expandedInitialized && hasHeaders) {
      expandedInitialized = true;
      const seeded = folderIndexOf(folders, cursorTargetState);
      expandedFolderIndex = seeded !== null ? seeded : folders.length > 0 ? 0 : null;
    }

    currentStops = buildCursorStops(folders, hasHeaders, expandedFolderIndex);

    let cursorPos: CursorPosition | null;
    if (headerFocusFolderIndex !== null && hasHeaders) {
      const headerIdx = currentStops.findIndex(
        (s) => s.kind === 'header' && s.folderIndex === headerFocusFolderIndex,
      );
      if (headerIdx !== -1) {
        cursorPos = { stopIndex: headerIdx, slotIndex: 0 };
      } else {
        headerFocusFolderIndex = null;
        cursorPos = locateCursor(currentStops, cursorTargetState);
      }
    } else {
      headerFocusFolderIndex = null;
      cursorPos = locateCursor(currentStops, cursorTargetState);
    }

    const newTarget = cursorPos !== null ? cursorTarget(currentStops, cursorPos) : null;
    const targetChanged =
      newTarget?.songId !== lastEmittedTarget?.songId ||
      newTarget?.chartId !== lastEmittedTarget?.chartId;
    if (newTarget !== null) cursorTargetState = newTarget;

    renderTabs();
    renderSearch(searching, searched.length);
    sortChip.textContent = `Sort · ${view.sortKey}`;
    groupChip.textContent = `Group · ${AXIS_LABELS[view.groupBy]}`;

    listCol.replaceChildren();
    if (searching && searched.length === 0) {
      const empty = el('div', 'search-empty');
      empty.textContent = translate('songSelect.search.noResults', 'en').text;
      listCol.append(empty);
    } else {
      folders.forEach((folder, folderIndex) => {
        listCol.append(renderFolder(folder, folderIndex, hasHeaders));
      });
    }

    applyCursorHighlight(cursorPos);
    renderInfoPanel(cursorPos);

    if (targetChanged) {
      lastEmittedTarget = newTarget;
      handlers.onCursorChange(newTarget);
    }
  }

  // ── quick options overlay ─────────────────────────────────────────

  const QUICK_OPTION_LABEL: Record<QuickOptionField, string> = {
    scrollSpeed: 'Scroll Speed',
    gaugeMode: 'Gauge',
    mirror: 'Mirror',
    staticShape: 'Static Shape',
    autoplay: 'Autoplay',
  };

  function openQuickOptionsOverlay(): void {
    quickOptionsState = openQuickOptions(currentSettings);
    quickOptionsOverlay.hidden = false;
    renderQuickOptions();
  }

  /** Esc/Space로 닫을 때 — 지금 row의 draft를 Enter를 누른 것처럼 그
   *  자리에서 확정한다(`ui-design.md` §2.5.8, D-2026-093이 M4-7의
   *  discard-on-close(D-2026-092)를 뒤집은 것). row 이동(↑/↓) 시 미확정
   *  draft를 버리는 규칙은 그대로다 — "옮긴다"와 "나간다"는 다른 액션. */
  function closeQuickOptionsOverlay(): void {
    if (quickOptionsState !== null) commitQuickOptionsRow(quickOptionsState);
    quickOptionsState = null;
    quickOptionsOverlay.hidden = true;
  }

  function commitQuickOptionsRow(state: QuickOptionsState): void {
    const confirmed = confirmQuickOption(state);
    quickOptionsState = confirmed;
    if (confirmed.committed !== state.committed) {
      currentSettings = applyQuickOptions(currentSettings, confirmed);
      handlers.onQuickOptionsChange(currentSettings);
    }
  }

  function moveQuickOptionsRowTo(state: QuickOptionsState, targetIndex: number): QuickOptionsState {
    let next = state;
    while (next.rowIndex < targetIndex) next = moveQuickOptionsRow(next, 'down');
    while (next.rowIndex > targetIndex) next = moveQuickOptionsRow(next, 'up');
    return next;
  }

  /** 클릭/드래그로 그 필드를 골라 즉시 그 값으로 점프한다 — row가 다른
   *  곳에 있었으면 그리로 옮긴 뒤 커밋 전 draft로 반영한다(§5 "마우스
   *  클릭(그 값으로 즉시 점프)"). */
  function jumpAndFocus(
    index: number,
    value: QuickOptionsState['draft'],
  ): { changed: QuickOptionsState; rowChanged: boolean } {
    const before = quickOptionsState!;
    const rowChanged = before.rowIndex !== index;
    const changed = jumpQuickOption(moveQuickOptionsRowTo(before, index), value);
    quickOptionsState = changed;
    return { changed, rowChanged };
  }

  function renderScrollSpeedControl(index: number, value: number): HTMLElement {
    const control = el('div', 'quick-options-control');
    const input = el('input', 'slider-input');
    input.type = 'range';
    input.min = String(SCROLL_SPEED_MIN);
    input.max = String(SCROLL_SPEED_MAX);
    input.step = String(SCROLL_SPEED_STEP);
    input.value = String(value);
    const valueEl = el('span', 'quick-options-value');
    valueEl.textContent = value.toFixed(1);
    input.addEventListener('input', () => {
      if (quickOptionsState === null) return;
      const next = Number(input.value);
      const { rowChanged } = jumpAndFocus(index, next);
      if (rowChanged) {
        renderQuickOptions();
      } else {
        // 드래그 도중 전체를 다시 그리면 이 <input> 자체가 교체돼 포인터
        // 캡처가 끊긴다(파일 헤더 참조) — 같은 row라면 값 텍스트만 갱신.
        valueEl.textContent = next.toFixed(1);
      }
    });
    control.append(input, valueEl);
    return control;
  }

  function renderGaugeModeControl(index: number, value: GaugeMode): HTMLElement {
    const control = el('div', 'quick-options-control');
    const group = el('div', 'segment-group');
    for (const mode of GAUGE_MODES) {
      const btn = el('button', `segment-btn${mode === value ? ' active' : ''}`);
      btn.type = 'button';
      btn.textContent = mode.toUpperCase();
      btn.addEventListener('click', () => {
        if (quickOptionsState === null) return;
        jumpAndFocus(index, mode);
        renderQuickOptions();
      });
      group.append(btn);
    }
    control.append(group);
    return control;
  }

  function renderToggleControl(index: number, value: boolean): HTMLElement {
    const control = el('div', 'quick-options-control');
    const btn = el('button', `toggle-switch${value ? ' on' : ''}`);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(value));
    btn.addEventListener('click', () => {
      if (quickOptionsState === null) return;
      jumpAndFocus(index, !value);
      renderQuickOptions();
    });
    control.append(btn);
    return control;
  }

  function renderQuickOptions(): void {
    if (quickOptionsState === null) return;
    const state = quickOptionsState;
    quickOptionsPanel.replaceChildren();
    const title = el('div', 'quick-options-title');
    title.textContent = 'Quick Options';
    quickOptionsPanel.append(title);

    QUICK_OPTION_FIELDS.forEach((field, index) => {
      const row = el('div', `quick-options-row${index === state.rowIndex ? ' active' : ''}`);
      const label = el('span', 'quick-options-label');
      label.textContent = QUICK_OPTION_LABEL[field];
      row.append(label);
      const shown = index === state.rowIndex ? state.draft : state.committed[field];

      if (field === 'scrollSpeed') {
        row.append(renderScrollSpeedControl(index, shown as number));
      } else if (field === 'gaugeMode') {
        row.append(renderGaugeModeControl(index, shown as GaugeMode));
      } else {
        row.append(renderToggleControl(index, shown as boolean));
      }
      quickOptionsPanel.append(row);
    });

    const hint = el('div', 'quick-options-hint');
    hint.textContent = 'Click/Drag Set · ↑↓ Row · ←→ Adjust · Enter/Esc/Space Confirm';
    quickOptionsPanel.append(hint);
  }

  function onQuickOptionsKeyDown(event: KeyboardEvent): void {
    if (quickOptionsState === null) return;
    switch (event.key) {
      case 'Escape':
      case ' ':
        event.preventDefault();
        closeQuickOptionsOverlay();
        return;
      case 'ArrowUp':
        event.preventDefault();
        quickOptionsState = moveQuickOptionsRow(quickOptionsState, 'up');
        renderQuickOptions();
        return;
      case 'ArrowDown':
        event.preventDefault();
        quickOptionsState = moveQuickOptionsRow(quickOptionsState, 'down');
        renderQuickOptions();
        return;
      case 'ArrowLeft':
        event.preventDefault();
        quickOptionsState = stepQuickOption(quickOptionsState, 'left');
        renderQuickOptions();
        return;
      case 'ArrowRight':
        event.preventDefault();
        quickOptionsState = stepQuickOption(quickOptionsState, 'right');
        renderQuickOptions();
        return;
      case 'Enter':
        event.preventDefault();
        commitQuickOptionsRow(quickOptionsState);
        renderQuickOptions();
        return;
    }
  }

  function onQuickOptionsWheel(event: WheelEvent): void {
    if (quickOptionsState === null) return;
    event.preventDefault();
    quickOptionsState = stepQuickOption(
      quickOptionsState,
      event.deltaY < 0 ? 'scrollUp' : 'scrollDown',
    );
    renderQuickOptions();
  }

  quickOptionsOverlay.addEventListener('wheel', onQuickOptionsWheel, { passive: false });

  function renderTabs(): void {
    tabBar.replaceChildren();
    const tabs = [ALL_CATEGORY, ...new Set(allRows.map((r) => r.category).filter((c) => c !== ''))];
    if (allRows.some((r) => r.category === '')) tabs.push('Uncategorized');
    for (const tab of tabs) {
      const pill = el('button', 'tab-pill');
      pill.type = 'button';
      pill.textContent = tab;
      pill.classList.toggle('active', tab === view.category);
      pill.addEventListener('click', () => handlers.onCategoryChange(tab));
      tabBar.append(pill);
    }
  }

  function renderSearch(searching: boolean, matchCount: number): void {
    searchBox.replaceChildren();
    const icon = el('span', 'search-icon');
    icon.textContent = '⌕';
    const text = el('span', 'search-text');
    if (!searching) {
      text.textContent = 'Type to search';
    } else {
      text.textContent = `${searchQuery} · ${matchCount}`;
    }
    searchBox.append(icon, text);
    searchBox.classList.toggle('active', searching && matchCount > 0);
    searchBox.classList.toggle('no-results', searching && matchCount === 0);
  }

  function renderFolder(folder: Folder, folderIndex: number, hasHeaders: boolean): HTMLElement {
    const folderEl = el('div', 'folder');
    const expanded = isFolderExpanded(hasHeaders, folderIndex);
    if (hasHeaders) {
      const header = el('div', 'folder-header');
      header.classList.toggle('expanded', expanded);
      const label = el('span', 'folder-label');
      label.textContent = folder.label;
      const progress = el('span', 'folder-progress');
      progress.textContent = `${folder.clearedCount}/${folder.totalCount} CLEAR`;
      header.append(label, progress);
      header.addEventListener('click', () => toggleFolder(folderIndex));
      folderEl.append(header);
    }
    if (expanded) {
      for (const row of folder.rows) {
        folderEl.append(renderRow(row));
      }
    }
    return folderEl;
  }

  function renderRow(row: SongRow): HTMLElement {
    const rowEl = el('div', 'song-row');
    const jacket = el('div', 'jacket-thumb');
    const info = el('div', 'row-info');
    const titleEl = el('span', 'row-title');
    titleEl.textContent = row.title;
    const artistEl = el('span', 'row-artist');
    artistEl.textContent = row.musicBy;
    info.append(titleEl, artistEl);

    const slotsWrap = el('div', 'row-slots');
    row.slots.forEach((slot) => {
      const slotEl = el('div', 'slot');
      if (slot === null) {
        slotEl.classList.add('empty');
        slotEl.textContent = '-';
      } else {
        slotEl.classList.add(`tier-${slot.difficulty}`);
        slotEl.textContent = String(slot.level);
        const bar = el('div', `state-bar state-${slot.state}`);
        slotEl.append(bar);
        slotEl.addEventListener('click', () => {
          headerFocusFolderIndex = null;
          cursorTargetState = { songId: row.songId, chartId: slot.chartId };
          render();
        });
      }
      slotsWrap.append(slotEl);
    });

    rowEl.append(jacket, info, slotsWrap);
    return rowEl;
  }

  function toggleFolder(folderIndex: number): void {
    expandedFolderIndex = expandedFolderIndex === folderIndex ? null : folderIndex;
    headerFocusFolderIndex = folderIndex;
    render();
  }

  function applyCursorHighlight(pos: CursorPosition | null): void {
    const headerEls = listCol.querySelectorAll('.folder-header');
    const rowEls = listCol.querySelectorAll('.song-row');
    let headerCursor = 0;
    let rowCursor = 0;
    currentStops.forEach((stop, stopIndex) => {
      const isActive = pos !== null && pos.stopIndex === stopIndex;
      if (stop.kind === 'header') {
        headerEls[headerCursor]?.classList.toggle('cursor', isActive);
        headerCursor += 1;
      } else {
        const rowEl = rowEls[rowCursor] as HTMLElement | undefined;
        rowEl?.classList.toggle('active', isActive);
        const slotEls = rowEl?.querySelectorAll('.slot');
        slotEls?.forEach((slotEl, slotIndex) => {
          slotEl.classList.toggle(
            'cursor',
            isActive && pos !== null && pos.slotIndex === slotIndex,
          );
        });
        rowCursor += 1;
      }
    });
  }

  function renderInfoPanel(pos: CursorPosition | null): void {
    infoPanel.replaceChildren();
    if (pos === null) return; // §9 "커서가 어느 slot에도 없으면 패널을 표시하지 않는다"

    const stop = currentStops[pos.stopIndex];
    if (stop === undefined || stop.kind === 'header') return; // 헤더에 커서가 있으면 chart가 없다.

    const row = stop.row;
    const slot = row.slots[pos.slotIndex];
    if (slot === undefined || slot === null) return;

    const jacket = el('div', 'info-jacket');
    const title = el('div', 'info-title');
    title.textContent = row.title;
    const artist = el('div', 'info-artist');
    artist.textContent = row.musicBy;
    // BPM·곡 길이: M4-3 前 게이트("정보 패널 BPM 표기 방식·곡 길이 표시")가
    // 아직 안 닫혀 표기 형식을 정할 수 없다 — 칸을 비워 둔다.

    const grid = el('div', 'record-grid');
    const rankCell = el('div', 'record-cell');
    rankCell.textContent = slot.rank ?? '—';
    const scoreCell = el('div', 'record-cell');
    scoreCell.textContent = slot.score !== null ? String(slot.score) : '—';
    const stateCell = el('div', 'record-cell');
    stateCell.textContent = slot.state;
    const bottomRightCell = el('div', 'record-cell record-cell-toggle');
    if (view.recordCellMode === 'percent') {
      bottomRightCell.textContent =
        slot.score !== null ? `${((slot.score / 1_000_000) * 100).toFixed(2)}%` : '—';
    } else if (slot.judgments !== null) {
      bottomRightCell.textContent = JUDGE_ORDER.map((j) => slot.judgments![j]).join(' / ');
    } else {
      bottomRightCell.textContent = '—';
    }
    bottomRightCell.addEventListener('click', () => {
      handlers.onRecordCellModeChange(view.recordCellMode === 'percent' ? 'judge' : 'percent');
    });
    grid.append(rankCell, scoreCell, stateCell, bottomRightCell);

    infoPanel.append(jacket, title, artist, grid);

    if (handlers.onResetRecord !== undefined && slot.score !== null) {
      const resetBtn = el('button', 'reset-record-btn');
      resetBtn.type = 'button';
      resetBtn.textContent = 'Reset Record';
      resetBtn.addEventListener('click', () => {
        if (cursorTargetState !== null) handlers.onResetRecord!(cursorTargetState);
      });
      infoPanel.append(resetBtn);
    }
  }

  function moveTo(next: CursorPosition): void {
    const stop = currentStops[next.stopIndex];
    if (stop === undefined) return;
    if (stop.kind === 'header') {
      headerFocusFolderIndex = stop.folderIndex;
    } else {
      headerFocusFolderIndex = null;
      const target = cursorTarget(currentStops, next);
      if (target !== null) cursorTargetState = target;
    }
    render();
  }

  function onKeyDown(event: KeyboardEvent): void {
    // quick options가 열려 있는 동안은 scene 입력이 전부 막힌다(§10 "열림
    // 중 scene 입력 차단") — 여기서 완전히 갈라 아래로 새지 않게 한다.
    if (quickOptionsState !== null) {
      onQuickOptionsKeyDown(event);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      openQuickOptionsOverlay();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (searchQuery !== '') {
        searchQuery = '';
        render();
      } else {
        handlers.onBack();
      }
      return;
    }
    if (event.key === 'Backspace') {
      if (searchQuery !== '') {
        event.preventDefault();
        searchQuery = searchQuery.slice(0, -1);
        render();
      } else {
        event.preventDefault();
        handlers.onBack();
      }
      return;
    }

    const currentPos =
      headerFocusFolderIndex !== null
        ? {
            stopIndex: currentStops.findIndex(
              (s) => s.kind === 'header' && s.folderIndex === headerFocusFolderIndex,
            ),
            slotIndex: 0,
          }
        : locateCursor(currentStops, cursorTargetState);

    if (currentPos !== null && currentPos.stopIndex !== -1) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          moveTo(moveCursorHorizontal(currentStops, currentPos, -1));
          return;
        case 'ArrowRight':
          event.preventDefault();
          moveTo(moveCursorHorizontal(currentStops, currentPos, 1));
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveTo(moveCursorVertical(currentStops, currentPos, -1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          moveTo(moveCursorVertical(currentStops, currentPos, 1));
          return;
        case 'PageUp':
          event.preventDefault();
          moveTo(moveCursorByPage(currentStops, currentPos, -1, PAGE_STOP_COUNT));
          return;
        case 'PageDown':
          event.preventDefault();
          moveTo(moveCursorByPage(currentStops, currentPos, 1, PAGE_STOP_COUNT));
          return;
        case 'Home':
          event.preventDefault();
          moveTo(moveCursorHome(currentStops));
          return;
        case 'End':
          event.preventDefault();
          moveTo(moveCursorEnd(currentStops));
          return;
        case 'Enter': {
          event.preventDefault();
          const stop = currentStops[currentPos.stopIndex];
          if (stop === undefined) return;
          if (stop.kind === 'header') {
            toggleFolder(stop.folderIndex);
          } else if (cursorTargetState !== null) {
            handlers.onSelect(cursorTargetState);
          }
          return;
        }
      }
    }

    // [[song-select]] §6: 목록에 포커스가 있는 상태에서 문자·숫자 키를
    // 누르면 검색이 시작된다.
    if (TYPEABLE_KEY.test(event.key)) {
      event.preventDefault();
      searchQuery += event.key;
      render();
    }
  }

  return {
    update(rows: readonly SongRow[], nextView: SongSelectViewState, settings: Settings): void {
      allRows = rows;
      view = nextView;
      currentSettings = settings;
      // lastSelected는 커서가 아직 한 번도 안 정해졌을 때만 시작점으로
      // 쓴다 — 이후로는 이 함수가 다시 불려도(axis 변경 등) 내부 커서를
      // 덮어쓰지 않는다(§8 "변경 전 커서의 chart를 그대로 유지").
      if (cursorTargetState === null) cursorTargetState = nextView.lastSelected;
      render();
    },
    show(): void {
      root.hidden = false;
      document.addEventListener('keydown', onKeyDown);
    },
    hide(): void {
      root.hidden = true;
      closeQuickOptionsOverlay();
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
