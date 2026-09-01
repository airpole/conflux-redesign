// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountModeSelectScene } from './scene-mode-select.js';

describe('scene-mode-select', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup(editorEnabled: boolean) {
    const target = document.createElement('div');
    document.body.append(target);
    const onSelect = vi.fn();
    const onBack = vi.fn();
    const handle = mountModeSelectScene(target, editorEnabled, { onSelect, onBack });
    return { target, handle, onSelect, onBack };
  }

  it('editorEnabled=true면 4항목 전부 뜬다', () => {
    const { target } = setup(true);
    const items = target.querySelectorAll('.mode-item');
    expect(Array.from(items).map((el) => el.textContent)).toEqual([
      'Play',
      'Editor',
      'Settings',
      'Credits',
    ]);
  });

  it('editorEnabled=false면 Editor가 빠지고 reflow된다(빈 칸 없음)', () => {
    const { target } = setup(false);
    const items = target.querySelectorAll('.mode-item');
    expect(Array.from(items).map((el) => el.textContent)).toEqual(['Play', 'Settings', 'Credits']);
  });

  it('클릭하면 해당 항목 id로 onSelect가 불린다', () => {
    const { target, onSelect } = setup(true);
    const buttons = target.querySelectorAll('.mode-item');
    (buttons[2] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith('settings');
  });

  it('show() 후 ArrowDown+Enter로 커서 이동·선택이 된다', () => {
    const { handle, onSelect } = setup(true);
    handle.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onSelect).toHaveBeenCalledWith('editor');
  });

  it('Backspace/Escape가 onBack을 부른다', () => {
    const { handle, onBack } = setup(true);
    handle.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('hide() 이후에는 키 입력이 반응하지 않는다', () => {
    const { handle, onSelect } = setup(true);
    handle.show();
    handle.hide();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
