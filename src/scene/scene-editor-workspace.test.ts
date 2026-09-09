// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import {
  mountEditorWorkspaceScene,
  type EditorWorkspaceHandlers,
} from './scene-editor-workspace.js';

function mount(handlers: Partial<EditorWorkspaceHandlers> = {}): {
  target: HTMLElement;
  handle: ReturnType<typeof mountEditorWorkspaceScene>;
  onCategoryChange: ReturnType<typeof vi.fn>;
  onBack: ReturnType<typeof vi.fn>;
} {
  const target = document.createElement('div');
  document.body.append(target);
  const onCategoryChange = vi.fn();
  const onBack = vi.fn();
  const handle = mountEditorWorkspaceScene(target, {
    onCategoryChange,
    onBack,
    ...handlers,
  });
  return { target, handle, onCategoryChange, onBack };
}

describe('scene-editor-workspace', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('show(category)로 그 category가 active로 뜬다', () => {
    const { target, handle } = mount();
    handle.update(makeChart());
    handle.show('shapes');
    const pills = target.querySelectorAll('.editor-nav-pill');
    expect([...pills].map((p) => p.textContent)).toEqual(['NOTES', 'SHAPES', 'META', 'TEST']);
    const active = target.querySelector('.editor-nav-pill.active');
    expect(active?.textContent).toBe('SHAPES');
  });

  it('update()가 chart identity를 표시한다', () => {
    const { target, handle } = mount();
    handle.update(makeChart({ songId: 'song-x', chartId: 2, difficulty: 'Drift' }));
    handle.show('notes');
    expect(target.querySelector('.editor-chart-identity')?.textContent).toBe(
      'song-x · chart 2 · Drift',
    );
  });

  it('nav pill 클릭이 onCategoryChange를 부른다', () => {
    const { target, handle, onCategoryChange } = mount();
    handle.update(makeChart());
    handle.show('notes');
    const metaPill = [...target.querySelectorAll('.editor-nav-pill')].find(
      (p) => p.textContent === 'META',
    ) as HTMLElement;
    metaPill.click();
    expect(onCategoryChange).toHaveBeenCalledWith('meta');
  });

  it('Tab이 notes→shapes→test→notes로 순환한다(meta 제외)', () => {
    const { handle, onCategoryChange } = mount();
    handle.update(makeChart());
    handle.show('notes');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(onCategoryChange).toHaveBeenLastCalledWith('shapes');

    onCategoryChange.mockClear();
    handle.show('shapes');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(onCategoryChange).toHaveBeenLastCalledWith('test');

    onCategoryChange.mockClear();
    handle.show('test');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(onCategoryChange).toHaveBeenLastCalledWith('notes');
  });

  it('Shift+Tab은 역방향이다', () => {
    const { handle, onCategoryChange } = mount();
    handle.update(makeChart());
    handle.show('notes');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(onCategoryChange).toHaveBeenLastCalledWith('test');
  });

  it('meta에 있을 때 Tab은 순환의 첫 자리(notes)로 들어간다', () => {
    const { handle, onCategoryChange } = mount();
    handle.update(makeChart());
    handle.show('meta');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(onCategoryChange).toHaveBeenLastCalledWith('notes');
  });

  it('Backspace/Escape가 onBack을 부른다', () => {
    const { handle, onBack } = mount();
    handle.update(makeChart());
    handle.show('notes');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('hide() 이후에는 Backspace가 반응하지 않는다', () => {
    const { handle, onBack } = mount();
    handle.update(makeChart());
    handle.show('notes');
    handle.hide();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).not.toHaveBeenCalled();
  });

  // F15 — text input(meta 폼 필드, 저장 모달의 version 입력 등)에 focus가
  // 있으면 Backspace/Tab을 category 전환·editor 이탈로 가로채지 않는다.
  it('text input에 focus가 있으면 Backspace/Tab이 onBack·onCategoryChange를 부르지 않는다', () => {
    const { target, handle, onBack, onCategoryChange } = mount();
    handle.update(makeChart());
    handle.show('meta'); // meta 탭 폼 필드를 흉내내는 input을 이 안에 둔다.
    const input = document.createElement('input');
    target.querySelector('.editor-body')?.append(input);
    input.focus();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(onBack).not.toHaveBeenCalled();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(onCategoryChange).not.toHaveBeenCalled();
  });

  it('text input에 focus가 있을 때 Escape는 onBack 대신 focus를 해제한다', () => {
    const { target, handle, onBack } = mount();
    handle.update(makeChart());
    handle.show('meta');
    const input = document.createElement('input');
    target.querySelector('.editor-body')?.append(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onBack).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(input);
  });

  it('저장 모달의 version input(외부 DOM)에 focus가 있어도 Backspace가 onBack을 부르지 않는다', () => {
    // 저장 모달은 workspace body 밖(root 직속)에 별도로 mount된다 —
    // containment가 아니라 target 자체의 tag로 판정해야 한다.
    const { target, handle, onBack } = mount();
    handle.update(makeChart());
    handle.show('notes');
    const versionInput = document.createElement('input');
    target.parentElement?.append(versionInput); // workspace body 밖.
    versionInput.focus();

    versionInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(onBack).not.toHaveBeenCalled();
    versionInput.remove();
  });
});
