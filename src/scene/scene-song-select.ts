/**
 * song-select 목록 렌더 — 단일 출처 `scene/ui-design.md` §2.5, 데이터
 * 모델은 `core/core-song-select.ts`(M4-3).
 *
 * **M4-3 범위**: row+slot 렌더, category 탭(클릭으로 전환), groupBy
 * folder 헤더(count+진척), sortKey/sortDir 표시. 이 셋을 바꾸면 목록이
 * 재구성된다 — M4-3 Exit 기준 그대로.
 *
 * **이 파일에 없는 것** (전부 커서가 있어야 의미가 생기는 M4-4 범위):
 * cursor 이동·하이라이트, 검색, preview 재생, 정보 패널(§2.5.4 — "커서가
 * 놓인 slot의 chart를 기준으로 한다"), 하단 키 힌트 바(검색·quick
 * options 등 아직 없는 인터랙션을 가리키는 문구라 함께 미룬다).
 *
 * **정렬·그룹 바는 표시만 한다** — 클릭해 overlay를 여는 인터랙션은
 * [[song-select]] §14 잔여 "목록 옵션 overlay 진입 키"(M4-3 前 게이트,
 * 아직 안 닫힘)가 막고 있다. 지금은 현재 axis 값을 정적 텍스트로만
 * 보여준다.
 *
 * 데이터 로딩(library → row[])은 이 파일 밖이다 — `SongRow[]`를 인자로
 * 받는다. 실제 배선은 `game-song-select.ts`(D-2026-085로 신설된 `format`
 * 층을 통해 `edit`↔`game` 분리 문제를 해소한 뒤)와 `app-main.ts`가 맡는다.
 *
 * Backspace/Esc → mode-select(`ui-design.md` §4 키 바인딩 표, D-2026-052의
 * 통일 Back 키와 같은 패턴)만 받는다 — 다른 키(방향키·Enter·검색 등)는
 * 커서가 있어야 의미가 생겨 여기 없다.
 */
import './scene-song-select.css';
import {
  filterByCategory,
  groupRows,
  sortRows,
  ALL_CATEGORY,
  type Folder,
  type GroupByAxis,
  type SongRow,
  type SortDir,
  type SortKey,
} from '../core/core-song-select.js';

export interface SongSelectViewState {
  readonly category: string;
  readonly groupBy: GroupByAxis;
  readonly sortKey: SortKey;
  readonly sortDir: SortDir;
}

export interface SongSelectSceneHandle {
  /** 전체 row 목록과 표시 axis를 다시 받아 목록을 재구성한다 — 세 축
   *  중 어느 게 바뀌었는지는 호출측이 몰라도 된다(항상 전체 재계산,
   *  M4-3 규모에서 메모이즈는 과설계). */
  update(rows: readonly SongRow[], view: SongSelectViewState): void;
  show(): void;
  hide(): void;
}

export interface SongSelectHandlers {
  readonly onCategoryChange: (category: string) => void;
  readonly onBack: () => void;
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

export function mountSongSelectScene(
  target: HTMLElement,
  handlers: SongSelectHandlers,
): SongSelectSceneHandle {
  const root = el('div', 'song-select-scene');
  root.hidden = true;

  const tabBar = el('div', 'tab-bar');
  const listOptionsBar = el('div', 'list-options-bar');
  const sortChip = el('div', 'chip');
  const groupChip = el('div', 'chip');
  listOptionsBar.append(sortChip, groupChip);

  const body = el('div', 'song-select-body');
  const listCol = el('div', 'list-col');
  body.append(listCol);

  root.append(tabBar, listOptionsBar, body);
  target.append(root);

  function renderTabs(rows: readonly SongRow[], activeCategory: string): void {
    tabBar.replaceChildren();
    const tabs = [ALL_CATEGORY, ...new Set(rows.map((r) => r.category).filter((c) => c !== ''))];
    if (rows.some((r) => r.category === '')) tabs.push('Uncategorized');
    for (const tab of tabs) {
      const pill = el('button', 'tab-pill');
      pill.type = 'button';
      pill.textContent = tab;
      pill.classList.toggle('active', tab === activeCategory);
      pill.addEventListener('click', () => handlers.onCategoryChange(tab));
      tabBar.append(pill);
    }
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
      folderEl.append(renderRow(row));
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

    const slots = el('div', 'row-slots');
    for (const slot of row.slots) {
      const slotEl = el('div', 'slot');
      if (slot === null) {
        slotEl.classList.add('empty');
        slotEl.textContent = '-';
      } else {
        slotEl.classList.add(`tier-${slot.difficulty}`);
        slotEl.textContent = String(slot.level);
        const bar = el('div', `state-bar state-${slot.state}`);
        slotEl.append(bar);
      }
      slots.append(slotEl);
    }

    rowEl.append(jacket, info, slots);
    return rowEl;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      handlers.onBack();
    }
  }

  return {
    update(rows: readonly SongRow[], view: SongSelectViewState): void {
      renderTabs(rows, view.category);

      sortChip.textContent = `Sort · ${view.sortKey}`;
      groupChip.textContent = `Group · ${AXIS_LABELS[view.groupBy]}`;

      const filtered = filterByCategory(rows, view.category);
      const sorted = sortRows(filtered, view.sortKey, view.sortDir);
      const folders = groupRows(sorted, view.groupBy);

      listCol.replaceChildren();
      for (const folder of folders) {
        listCol.append(renderFolder(folder, view.groupBy !== 'none'));
      }
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
