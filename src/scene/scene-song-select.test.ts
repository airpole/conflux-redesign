// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountSongSelectScene, type SongSelectViewState } from './scene-song-select.js';
import type { SongRow } from '../core/core-song-select.js';

function row(songId: string, title: string, category: string): SongRow {
  return {
    songId,
    title,
    musicBy: 'Composer',
    category,
    slots: [
      { chartId: 1, difficulty: 'Trace', level: 5, state: 'FC', score: 900000, rank: 'A' },
      null,
      null,
      null,
      null,
    ],
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const defaultView: SongSelectViewState = {
  category: 'All',
  groupBy: 'none',
  sortKey: 'default',
  sortDir: 'asc',
};

describe('scene-song-select', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup() {
    const target = document.createElement('div');
    document.body.append(target);
    const onCategoryChange = vi.fn();
    const handle = mountSongSelectScene(target, { onCategoryChange });
    return { target, handle, onCategoryChange };
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
    handle.update([], { category: 'All', groupBy: 'updated', sortKey: 'level', sortDir: 'asc' });
    const chips = target.querySelectorAll('.chip');
    expect(chips[0]?.textContent).toBe('Sort · level');
    expect(chips[1]?.textContent).toBe('Group · Updated');
  });
});
