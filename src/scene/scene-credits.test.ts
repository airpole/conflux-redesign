// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountCreditsScene } from './scene-credits.js';
import type { CreditsRoleNames } from '../game/game-credits.js';

const EMPTY: CreditsRoleNames = { music: [], chart: [], jacket: [] };

describe('scene-credits', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup() {
    const target = document.createElement('div');
    document.body.append(target);
    const onBack = vi.fn();
    const handle = mountCreditsScene(target, onBack);
    return { target, handle, onBack };
  }

  it('Project Staff는 항상 뜬다(스캔 대상이 아니다)', () => {
    const { target } = setup();
    const headers = Array.from(target.querySelectorAll('.section-header')).map(
      (el) => el.textContent,
    );
    expect(headers).toEqual(['Project Staff']);
  });

  it('update()가 없으면 Music/Chart/Jacket 섹션은 숨겨진다(빈 목록)', () => {
    const { target, handle } = setup();
    handle.update(EMPTY);
    const sections = target.querySelectorAll('.credits-section');
    // Project Staff(항상 보임) 1개 + 숨겨진 3개(Music/Chart/Jacket).
    expect(sections).toHaveLength(4);
    const hiddenCount = Array.from(sections).filter((s) => (s as HTMLElement).hidden).length;
    expect(hiddenCount).toBe(3);
  });

  it('update()가 library 스캔 결과로 Music/Chart/Jacket을 채운다', () => {
    const { target, handle } = setup();
    handle.update({ music: ['Alice'], chart: ['Alice', 'Bob'], jacket: ['Carol'] });

    const headers = Array.from(target.querySelectorAll('.section-header')).map(
      (el) => el.textContent,
    );
    expect(headers).toEqual(['Project Staff', 'Music', 'Chart', 'Jacket']);

    // 겸직(Alice가 Music·Chart 양쪽)은 각 섹션에 각각 나타난다(§2.8.1).
    const names = Array.from(target.querySelectorAll('.credit-row .name')).map(
      (el) => el.textContent,
    );
    expect(names.filter((n) => n === 'Alice')).toHaveLength(2);
    expect(names).toContain('Bob');
    expect(names).toContain('Carol');
  });

  it('재호출 시 이전 목록을 지우고 다시 그린다', () => {
    const { target, handle } = setup();
    handle.update({ music: ['Alice'], chart: [], jacket: [] });
    handle.update({ music: ['Bob'], chart: [], jacket: [] });

    const musicRows = Array.from(target.querySelectorAll('.credits-section')).find(
      (s) => s.querySelector('.section-header')?.textContent === 'Music',
    );
    const names = Array.from(musicRows!.querySelectorAll('.credit-row .name')).map(
      (el) => el.textContent,
    );
    expect(names).toEqual(['Bob']);
  });

  it('Backspace/Escape가 onBack을 부른다', () => {
    const { handle, onBack } = setup();
    handle.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hide() 이후에는 Backspace가 반응하지 않는다', () => {
    const { handle, onBack } = setup();
    handle.show();
    handle.hide();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).not.toHaveBeenCalled();
  });
});
