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
import { translate } from '../core/core-i18n.js';

export type { SongSelectViewState };

/** `PageUp`/`PageDown` 한 번에 넘어가는 정지점 수 — 실제 viewport 측정이
 *  없어 고정값 근사(파일 머리말 참조). */
const PAGE_STOP_COUNT = 5;

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
