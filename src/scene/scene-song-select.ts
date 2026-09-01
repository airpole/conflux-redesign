/**
 * song-select 목록 렌더 — 단일 출처 `scene/ui-design.md` §2.5, 데이터
 * 모델은 `core/core-song-select.ts`(M4-3·M4-4).
 *
 * **M4-4가 더한 것**: cursor 이동(방향키, 열 대응 규칙)·하이라이트,
 * 검색(타이핑 즉시 시작, idle/typing/no-results 3상태), 정보 패널
 * (§2.5.4, cursor의 chart 기준), preview 트리거 콜백(실제 재생은
 * `game-song-preview.ts`), 기록 초기화 진입점(옵션, `FEATURES.recordReset`
 * 게이팅은 호출측 몫).
 *
 * **정렬·그룹 바는 여전히 표시만 한다** — [[song-select]] §14 잔여
 * "목록 옵션 overlay 진입 키"(M4-3 前 게이트)가 아직 안 닫혀 클릭해
 * overlay를 여는 인터랙션은 이번에도 없다.
 *
 * **정보 패널에 BPM·곡 길이가 없다** — "정보 패널 BPM 표기 방식·곡 길이
 * 표시"도 같은 M4-3 前 게이트 항목인데, M4-3 때는 정보 패널 자체가
 * 없어(커서가 없어서) 이 게이트가 M4-3을 막지 않는다고 판단했다. M4-4는
 * 커서가 생겨 정보 패널이 실제로 들어오므로 이 게이트가 이제 진짜로
 * 막는다 — BPM·길이 칸은 비워 두고, 값이 정해지면 채운다. 나머지(jacket·
 * title/artist·2×2 기록 격자)는 이 게이트와 무관해 그대로 채웠다.
 *
 * **아코디언(folder 접힘/펼침)은 없다** — [[song-select]] §4가 요구하는
 * 진입 시 전부 접힘·최근 선택 folder만 펼침은 별도 인터랙션 설계가
 * 필요해 결정 필요 항목으로 미룬다(M4-3부터의 임시 상태 유지 — 모든
 * folder가 항상 펼쳐진 채로 렌더된다). `core-song-select.ts`의 cursor
 * 함수들은 그 전제(항상 펼침) 위에서만 좌표가 유효하다.
 *
 * PageUp/PageDown·Home/End·가속 스크롤(길게 누름)은 없다 — 가속 수치가
 * 같은 M4-3 前 게이트에 걸려 있고, 나머지 둘은 Exit 기준에 명시되지
 * 않아 이번 범위에서 뺐다(결정 필요 항목).
 */
import './scene-song-select.css';
import {
  cursorTarget,
  filterByCategory,
  filterBySearch,
  groupRows,
  locateCursor,
  moveCursorHorizontal,
  moveCursorVertical,
  sortRows,
  ALL_CATEGORY,
  type CursorPosition,
  type CursorTarget,
  type Folder,
  type GroupByAxis,
  type SongRow,
  type SongSelectViewState,
} from '../core/core-song-select.js';
import { translate } from '../core/core-i18n.js';

export type { SongSelectViewState };

export interface SongSelectSceneHandle {
  /** 전체 row 목록과 표시 axis를 다시 받아 목록을 재구성한다. 커서는
   *  `view.lastSelected`를 시작점으로 두되, 이후 내부적으로 관리한다
   *  (재호출로 덮어쓰지 않는다 — 그러면 axis만 바꿨는데 커서가 리셋된다). */
  update(rows: readonly SongRow[], view: SongSelectViewState): void;
  show(): void;
  hide(): void;
}

export interface SongSelectHandlers {
  readonly onCategoryChange: (category: string) => void;
  readonly onBack: () => void;
  /** 커서가 새 chart로 옮겨질 때마다(뒤로가기 등 포함) 불린다 —
   *  `lastSelected` 영속과 preview 트리거를 호출측이 여기서 잇는다. */
  readonly onCursorChange: (target: CursorTarget | null) => void;
  /** Enter — 선택 확정. `song-credit`이 아직 없어(M4-5) 호출측이 무엇을
   *  할지 정한다(현재는 콘솔 로그만). */
  readonly onSelect: (target: CursorTarget) => void;
  /** 우하단 기록 칸 클릭 — percent ↔ judge 토글. */
  readonly onRecordCellModeChange: (mode: 'percent' | 'judge') => void;
  /** `FEATURES.recordReset`이 켜졌을 때만 넘겨준다 — 없으면 버튼 자체를
   *  안 그린다(§13 "FEATURES.recordReset에서만 노출"). */
  readonly onResetRecord?: (target: CursorTarget) => void;
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

  root.append(topBar, listOptionsBar, body);
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
  let searchQuery = '';
  let flatRows: readonly SongRow[] = [];
  let slotElements: (HTMLElement | null)[][] = [];

  function render(): void {
    const byCategory = filterByCategory(allRows, view.category);
    const searching = searchQuery !== '';
    const searched = searching ? filterBySearch(byCategory, searchQuery) : byCategory;
    const sorted = sortRows(searched, view.sortKey, view.sortDir);
    // 검색 중에는 folder를 무시하고 평평한 목록으로(§6).
    const folders = groupRows(sorted, searching ? 'none' : view.groupBy);
    flatRows = folders.flatMap((f) => f.rows);

    const cursorPos = locateCursor(flatRows, cursorTargetState);
    const newTarget = cursorPos !== null ? cursorTarget(flatRows, cursorPos) : null;
    const targetChanged =
      newTarget?.songId !== lastEmittedTarget?.songId ||
      newTarget?.chartId !== lastEmittedTarget?.chartId;
    cursorTargetState = newTarget;

    renderTabs();
    renderSearch(searching, searched.length);
    sortChip.textContent = `Sort · ${view.sortKey}`;
    groupChip.textContent = `Group · ${AXIS_LABELS[view.groupBy]}`;

    listCol.replaceChildren();
    slotElements = [];
    if (searching && searched.length === 0) {
      const empty = el('div', 'search-empty');
      empty.textContent = translate('songSelect.search.noResults', 'en').text;
      listCol.append(empty);
    } else {
      let flatIndex = 0;
      for (const folder of folders) {
        const folderStart = flatIndex;
        const folderEl = renderFolder(folder, !searching && view.groupBy !== 'none');
        listCol.append(folderEl);
        flatIndex = folderStart + folder.rows.length;
      }
    }

    applyCursorHighlight(cursorPos);
    renderInfoPanel(cursorPos);

    if (targetChanged) {
      lastEmittedTarget = cursorTargetState;
      handlers.onCursorChange(cursorTargetState);
    }
  }

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

  function renderFolder(folder: Folder, showHeader: boolean): HTMLElement {
    const folderEl = el('div', 'folder');
    if (showHeader) {
      const header = el('div', 'folder-header');
      const label = el('span', 'folder-label');
      label.textContent = folder.label;
      const progress = el('span', 'folder-progress');
      progress.textContent = `${folder.clearedCount}/${folder.totalCount} CLEAR`;
      header.append(label, progress);
      folderEl.append(header);
    }
    for (const row of folder.rows) {
      const { rowEl, slots } = renderRow(row);
      folderEl.append(rowEl);
      slotElements.push(slots);
    }
    return folderEl;
  }

  function renderRow(row: SongRow): { rowEl: HTMLElement; slots: (HTMLElement | null)[] } {
    const rowEl = el('div', 'song-row');
    const jacket = el('div', 'jacket-thumb');
    const info = el('div', 'row-info');
    const titleEl = el('span', 'row-title');
    titleEl.textContent = row.title;
    const artistEl = el('span', 'row-artist');
    artistEl.textContent = row.musicBy;
    info.append(titleEl, artistEl);

    const slotsWrap = el('div', 'row-slots');
    const slotEls: (HTMLElement | null)[] = [];
    row.slots.forEach((slot, index) => {
      const slotEl = el('div', 'slot');
      if (slot === null) {
        slotEl.classList.add('empty');
        slotEl.textContent = '-';
        slotEls.push(null);
      } else {
        slotEl.classList.add(`tier-${slot.difficulty}`);
        slotEl.textContent = String(slot.level);
        const bar = el('div', `state-bar state-${slot.state}`);
        slotEl.append(bar);
        slotEl.addEventListener('click', () => {
          cursorTargetState = { songId: row.songId, chartId: slot.chartId };
          render();
        });
        slotEls.push(slotEl);
      }
      slotsWrap.append(slotEl);
      void index;
    });

    rowEl.append(jacket, info, slotsWrap);
    return { rowEl, slots: slotEls };
  }

  function applyCursorHighlight(pos: CursorPosition | null): void {
    slotElements.forEach((slots, rowIndex) => {
      const rowEl = listCol.querySelectorAll('.song-row')[rowIndex] as HTMLElement | undefined;
      const isActiveRow = pos !== null && pos.rowIndex === rowIndex;
      rowEl?.classList.toggle('active', isActiveRow);
      slots.forEach((slotEl, slotIndex) => {
        slotEl?.classList.toggle(
          'cursor',
          isActiveRow && pos !== null && pos.slotIndex === slotIndex,
        );
      });
    });
  }

  function renderInfoPanel(pos: CursorPosition | null): void {
    infoPanel.replaceChildren();
    if (pos === null) return; // §9 "커서가 어느 slot에도 없으면 패널을 표시하지 않는다"

    const row = flatRows[pos.rowIndex];
    const slot = row?.slots[pos.slotIndex];
    if (row === undefined || slot === undefined || slot === null) return;

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
    bottomRightCell.textContent =
      view.recordCellMode === 'percent'
        ? slot.score !== null
          ? `${((slot.score / 1_000_000) * 100).toFixed(2)}%`
          : '—'
        : '—'; // judge(4값 breakdown)는 SlotView에 판정 카운트가 없어 아직 못 채운다 — 결정 필요 항목.
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
    const target = cursorTarget(flatRows, next);
    if (target === null) return;
    cursorTargetState = target;
    render();
  }

  function onKeyDown(event: KeyboardEvent): void {
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

    const pos = locateCursor(flatRows, cursorTargetState);
    if (pos !== null) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          moveTo(moveCursorHorizontal(flatRows, pos, -1));
          return;
        case 'ArrowRight':
          event.preventDefault();
          moveTo(moveCursorHorizontal(flatRows, pos, 1));
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveTo(moveCursorVertical(flatRows, pos, -1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          moveTo(moveCursorVertical(flatRows, pos, 1));
          return;
        case 'Enter':
          event.preventDefault();
          if (cursorTargetState !== null) handlers.onSelect(cursorTargetState);
          return;
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
    update(rows: readonly SongRow[], nextView: SongSelectViewState): void {
      allRows = rows;
      view = nextView;
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
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
