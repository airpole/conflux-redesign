// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountCreditsScene } from './scene-credits.js';

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

  it('섹션 4개(Project Staff·Music·Chart·Jacket)가 순서대로 뜬다', () => {
    const { target } = setup();
    const headers = target.querySelectorAll('.section-header');
    expect(Array.from(headers).map((el) => el.textContent)).toEqual([
      'Project Staff',
      'Music',
      'Chart',
      'Jacket',
    ]);
  });

  it('겸직 placeholder가 Music·Chart 양쪽에 각각 나타난다(§2.8.1 규칙)', () => {
    const { target } = setup();
    const rows = Array.from(target.querySelectorAll('.credit-row .name')).map(
      (el) => el.textContent,
    );
    expect(rows.filter((name) => name === '[Placeholder A]')).toHaveLength(2);
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
