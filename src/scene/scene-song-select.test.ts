// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountSongSelectScene } from './scene-song-select.js';
import type { SongRow, SongSelectViewState } from '../core/core-song-select.js';

function row(
  songId: string,
  title: string,
  category: string,
  slots: SongRow['slots'] = [
    { chartId: 1, difficulty: 'Trace', level: 5, state: 'FC', score: 900000, rank: 'A' },
    null,
    null,
    null,
    null,
  ],
): SongRow {
  return {
    songId,
    title,
    musicBy: 'Composer',
    category,
    slots,
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const defaultView: SongSelectViewState = {
  category: 'All',
  groupBy: 'none',
  sortKey: 'default',
  sortDir: 'asc',
  recordCellMode: 'percent',
  lastSelected: null,
};

describe('scene-song-select', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup() {
    const target = document.createElement('div');
    document.body.append(target);
    const onCategoryChange = vi.fn();
    const onBack = vi.fn();
    const onCursorChange = vi.fn();
    const onSelect = vi.fn();
    const onRecordCellModeChange = vi.fn();
    const onResetRecord = vi.fn();
    const handle = mountSongSelectScene(target, {
      onCategoryChange,
      onBack,
      onCursorChange,
      onSelect,
      onRecordCellModeChange,
      onResetRecord,
    });
    return {
      target,
      handle,
      onCategoryChange,
      onBack,
      onCursorChange,
      onSelect,
      onRecordCellModeChange,
      onResetRecord,
    };
  }

  it('row가 title/artist/slot으로 뜬다', () => {
    const { target, handle } = setup();
    handle.update([row('a', 'Song A', '')], defaultView);
    expect(target.querySelector('.row-title')?.textContent).toBe('Song A');
    expect(target.querySelector('.row-artist')?.textContent).toBe('Composer');
    const slots = target.querySelectorAll('.slot');
    expect(slots).toHaveLength(5);
    expect(slots[0]?.textContent).toBe('5');
    expect(slots[0]?.classList.contains('tier-Trace')).toBe(true);
    expect(slots[1]?.classList.contains('empty')).toBe(true);
  });

  it('groupBy가 none이 아니면 folder 헤더에 count+진척이 뜬다', () => {
    const { target, handle } = setup();
    handle.update([row('a', 'Apple', ''), row('b', 'Banana', '')], {
      ...defaultView,
      groupBy: 'title',
    });
    const headers = target.querySelectorAll('.folder-header');
    expect(headers).toHaveLength(2); // 'A'와 'B' 두 folder
    expect(headers[0]?.querySelector('.folder-progress')?.textContent).toBe('1/1 CLEAR');
  });

  it('groupBy가 none이면 folder 헤더가 없다', () => {
    const { target, handle } = setup();
    handle.update([row('a', 'Apple', '')], defaultView);
    expect(target.querySelectorAll('.folder-header')).toHaveLength(0);
  });

  it('category 탭을 클릭하면 onCategoryChange가 불린다', () => {
    const { target, handle, onCategoryChange } = setup();
    handle.update([row('a', 'Apple', 'Original')], defaultView);
    const pills = target.querySelectorAll('.tab-pill');
    expect(Array.from(pills).map((p) => p.textContent)).toEqual(['All', 'Original']);
    (pills[1] as HTMLElement).click();
    expect(onCategoryChange).toHaveBeenCalledWith('Original');
  });

  it('세 축을 바꾸면 목록이 재구성된다', () => {
    const { target, handle } = setup();
    const rows = [row('a', 'Zeta', ''), row('b', 'Alpha', '')];
    handle.update(rows, { ...defaultView, sortKey: 'title', sortDir: 'asc' });
    let titles = Array.from(target.querySelectorAll('.row-title')).map((el) => el.textContent);
    expect(titles).toEqual(['Alpha', 'Zeta']);

    handle.update(rows, { ...defaultView, sortKey: 'title', sortDir: 'desc' });
    titles = Array.from(target.querySelectorAll('.row-title')).map((el) => el.textContent);
    expect(titles).toEqual(['Zeta', 'Alpha']);
  });

  it('sort/group 칩이 현재 axis 값을 정적으로 보여준다', () => {
    const { target, handle } = setup();
    handle.update([], { ...defaultView, groupBy: 'updated', sortKey: 'level' });
    const chips = target.querySelectorAll('.chip');
    expect(chips[0]?.textContent).toBe('Sort · level');
    expect(chips[1]?.textContent).toBe('Group · Updated');
  });

  it('show() 상태에서 검색 중이 아닐 때 Backspace/Escape가 onBack을 부른다', () => {
    const { handle, onBack } = setup();
    handle.update([row('a', 'A', '')], defaultView);
    handle.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('hide() 이후에는 Backspace가 반응하지 않는다', () => {
    const { handle, onBack } = setup();
    handle.show();
    handle.hide();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).not.toHaveBeenCalled();
  });

  it('첫 update에서 lastSelected로 커서를 초기화하고 onCursorChange를 부른다', () => {
    const rows = [row('a', 'A', ''), row('b', 'B', '')];
    const { handle, onCursorChange } = setup();
    handle.update(rows, { ...defaultView, lastSelected: { songId: 'b', chartId: 1 } });
    expect(onCursorChange).toHaveBeenCalledWith({ songId: 'b', chartId: 1 });
  });

  it('ArrowRight/Left로 같은 row 안에서 슬롯을 옮긴다', () => {
    const multiSlotRow = row('a', 'A', '', [
      { chartId: 1, difficulty: 'Trace', level: 1, state: 'N', score: null, rank: null },
      null,
      { chartId: 3, difficulty: 'Surge', level: 3, state: 'N', score: null, rank: null },
      null,
      null,
    ]);
    const { target, handle, onCursorChange } = setup();
    handle.update([multiSlotRow], defaultView);
    handle.show();
    onCursorChange.mockClear();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(onCursorChange).toHaveBeenCalledWith({ songId: 'a', chartId: 3 });
    const slots = target.querySelectorAll('.slot');
    expect(slots[2]?.classList.contains('cursor')).toBe(true);
  });

  it('ArrowDown이 열 대응 규칙으로 이웃 row로 옮긴다', () => {
    const rowA = row('a', 'A', '', [
      { chartId: 1, difficulty: 'Trace', level: 1, state: 'N', score: null, rank: null },
      null,
      null,
      null,
      null,
    ]);
    const rowB = row('b', 'B', '', [
      null,
      { chartId: 2, difficulty: 'Drift', level: 2, state: 'N', score: null, rank: null },
      null,
      null,
      null,
    ]);
    const { handle, onCursorChange } = setup();
    handle.update([rowA, rowB], defaultView);
    handle.show();
    onCursorChange.mockClear();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    // rowA col0에 있었는데 rowB col0은 비어 있음 → 더 높은 열(col1)로.
    expect(onCursorChange).toHaveBeenCalledWith({ songId: 'b', chartId: 2 });
  });

  it('Enter가 onSelect를 부른다', () => {
    const { handle, onSelect } = setup();
    handle.update([row('a', 'A', '')], defaultView);
    handle.show();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onSelect).toHaveBeenCalledWith({ songId: 'a', chartId: 1 });
  });

  it('문자 키를 누르면 검색이 시작되고 idle 힌트가 검색어로 바뀐다', () => {
    const { target, handle } = setup();
    handle.update([row('a', 'Foo', '')], defaultView);
    handle.show();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));

    expect(target.querySelector('.search-text')?.textContent).toBe('fo · 1');
  });

  it('매치가 없으면 no-results 상태와 빈 안내 문구를 보여준다', () => {
    const { target, handle } = setup();
    handle.update([row('a', 'Foo', '')], defaultView);
    handle.show();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));

    expect(target.querySelector('.search-box')?.classList.contains('no-results')).toBe(true);
    expect(target.querySelector('.search-empty')).not.toBeNull();
    expect(target.querySelectorAll('.song-row')).toHaveLength(0);
  });

  it('검색 중에는 folder 헤더 없이 평평한 목록으로 보여준다', () => {
    const { target, handle } = setup();
    handle.update([row('a', 'Apple', ''), row('b', 'Banana', '')], {
      ...defaultView,
      groupBy: 'title',
    });
    handle.show();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

    expect(target.querySelectorAll('.folder-header')).toHaveLength(0);
  });

  it('Escape가 검색 중이면 onBack 대신 검색어를 지운다', () => {
    const { target, handle, onBack } = setup();
    handle.update([row('a', 'Foo', '')], defaultView);
    handle.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onBack).not.toHaveBeenCalled();
    expect(target.querySelector('.search-text')?.textContent).toBe('Type to search');
  });

  it('커서가 있는 chart의 정보 패널이 뜬다(jacket·title·기록 격자)', () => {
    const { target, handle } = setup();
    handle.update([row('a', 'A', '')], defaultView);
    expect(target.querySelector('.info-title')?.textContent).toBe('A');
    expect(target.querySelectorAll('.record-cell')).toHaveLength(4);
  });

  it('기록 없는 slot에서는 정보 패널이 안 뜬다(row가 아예 없으면)', () => {
    const { target, handle } = setup();
    handle.update([], defaultView);
    expect(target.querySelector('.info-title')).toBeNull();
  });

  it('기록 칸 클릭이 onRecordCellModeChange를 부른다', () => {
    const { target, handle, onRecordCellModeChange } = setup();
    handle.update([row('a', 'A', '')], defaultView);
    (target.querySelector('.record-cell-toggle') as HTMLElement).click();
    expect(onRecordCellModeChange).toHaveBeenCalledWith('judge');
  });

  it('기록 있는 chart에 Reset Record 버튼이 뜨고 클릭하면 onResetRecord를 부른다', () => {
    const { target, handle, onResetRecord } = setup();
    handle.update([row('a', 'A', '')], defaultView);
    const button = target.querySelector('.reset-record-btn') as HTMLElement | null;
    expect(button).not.toBeNull();
    button!.click();
    expect(onResetRecord).toHaveBeenCalledWith({ songId: 'a', chartId: 1 });
  });

  it('기록 없는 chart에는 Reset Record 버튼이 없다', () => {
    const noRecordRow = row('a', 'A', '', [
      { chartId: 1, difficulty: 'Trace', level: 1, state: 'N', score: null, rank: null },
      null,
      null,
      null,
      null,
    ]);
    const { target, handle } = setup();
    handle.update([noRecordRow], defaultView);
    expect(target.querySelector('.reset-record-btn')).toBeNull();
  });
});
