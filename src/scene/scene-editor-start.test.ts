// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountEditorStartScene, type EditorStartHandlers } from './scene-editor-start.js';

function mount(handlers: Partial<EditorStartHandlers> = {}): {
  target: HTMLElement;
  handle: ReturnType<typeof mountEditorStartScene>;
  onNewChart: ReturnType<typeof vi.fn>;
  onOpenJson: ReturnType<typeof vi.fn>;
  onContinueEditing: ReturnType<typeof vi.fn>;
  onBack: ReturnType<typeof vi.fn>;
} {
  const target = document.createElement('div');
  document.body.append(target);
  const onNewChart = vi.fn();
  const onOpenJson = vi.fn();
  const onContinueEditing = vi.fn();
  const onBack = vi.fn();
  const handle = mountEditorStartScene(target, {
    onNewChart,
    onOpenJson,
    onContinueEditing,
    onBack,
    onPackageCfx: vi.fn(),
    onImportCfx: vi.fn(),
    ...handlers,
  });
  return { target, handle, onNewChart, onOpenJson, onContinueEditing, onBack };
}

describe('scene-editor-start', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('mount 직후엔 숨겨져 있다', () => {
    const { target } = mount();
    const scene = target.querySelector('.editor-start-scene') as HTMLElement;
    expect(scene.hidden).toBe(true);
  });

  it('show()로 드러나고 hide()로 다시 숨는다', () => {
    const { target, handle } = mount();
    handle.show();
    expect((target.querySelector('.editor-start-scene') as HTMLElement).hidden).toBe(false);
    handle.hide();
    expect((target.querySelector('.editor-start-scene') as HTMLElement).hidden).toBe(true);
  });

  it('songId를 입력하고 New Chart를 누르면 그 songId로 onNewChart를 부른다', () => {
    const { target, onNewChart } = mount();
    const input = target.querySelector('.songid-input') as HTMLInputElement;
    input.value = 'song-x';
    const btn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'New Chart',
    ) as HTMLButtonElement;
    btn.click();
    expect(onNewChart).toHaveBeenCalledWith('song-x');
  });

  it('songId가 비어 있으면 New Chart를 눌러도 아무 일도 없다', () => {
    const { target, onNewChart } = mount();
    const btn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'New Chart',
    ) as HTMLButtonElement;
    btn.click();
    expect(onNewChart).not.toHaveBeenCalled();
  });

  it('Open Chart JSON 클릭이 onOpenJson을 부른다', () => {
    const { target, onOpenJson } = mount();
    const btn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'Open Chart JSON',
    ) as HTMLButtonElement;
    btn.click();
    expect(onOpenJson).toHaveBeenCalled();
  });

  it('Open .cfx 버튼은 disabled다(결정 필요 항목)', () => {
    const { target } = mount();
    const btn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'Open .cfx',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('Package .cfx 클릭이 onPackageCfx를 부른다(M5-8)', () => {
    const onPackageCfx = vi.fn();
    const { target } = mount({ onPackageCfx });
    const btn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'Package .cfx',
    ) as HTMLButtonElement;
    btn.click();
    expect(onPackageCfx).toHaveBeenCalledTimes(1);
  });

  it('Import .cfx 클릭이 onImportCfx를 부른다(M5-8)', () => {
    const onImportCfx = vi.fn();
    const { target } = mount({ onImportCfx });
    const btn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'Import .cfx',
    ) as HTMLButtonElement;
    btn.click();
    expect(onImportCfx).toHaveBeenCalledTimes(1);
  });

  it('update()로 hasRecoverableWorkspace가 true면 Continue Editing이 보인다', () => {
    const { target, handle } = mount();
    const continueBtn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'Continue Editing',
    ) as HTMLButtonElement;
    handle.update({ hasRecoverableWorkspace: false, error: null });
    expect(continueBtn.hidden).toBe(true);
    handle.update({ hasRecoverableWorkspace: true, error: null });
    expect(continueBtn.hidden).toBe(false);
  });

  it('Continue Editing 클릭이 onContinueEditing을 부른다', () => {
    const { target, handle, onContinueEditing } = mount();
    handle.update({ hasRecoverableWorkspace: true, error: null });
    const continueBtn = [...target.querySelectorAll('.editor-start-btn')].find(
      (b) => b.textContent === 'Continue Editing',
    ) as HTMLButtonElement;
    continueBtn.click();
    expect(onContinueEditing).toHaveBeenCalled();
  });

  it('update()로 에러 메시지를 보여준다', () => {
    const { target, handle } = mount();
    handle.update({ hasRecoverableWorkspace: false, error: 'JSON을 파싱할 수 없다.' });
    const errorEl = target.querySelector('.editor-start-error') as HTMLElement;
    expect(errorEl.textContent).toBe('JSON을 파싱할 수 없다.');
    expect(errorEl.hidden).toBe(false);
  });

  it('Backspace/Escape가 onBack을 부른다(입력창에 포커스가 없을 때)', () => {
    const { handle, onBack } = mount();
    handle.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('songId 입력창에 포커스가 있으면 Backspace가 onBack을 부르지 않는다', () => {
    const { target, handle, onBack } = mount();
    handle.show();
    const input = target.querySelector('.songid-input') as HTMLInputElement;
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).not.toHaveBeenCalled();
  });

  it('hide() 이후에는 Backspace가 반응하지 않는다', () => {
    const { handle, onBack } = mount();
    handle.show();
    handle.hide();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(onBack).not.toHaveBeenCalled();
  });
});
