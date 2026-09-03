// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountEditorSaveModal } from './scene-editor-save.js';

describe('mountEditorSaveModal (M5-8, editor-editing.md §7)', () => {
  let target: HTMLDivElement;

  afterEach(() => {
    target.remove();
  });

  function setup() {
    target = document.createElement('div');
    document.body.append(target);
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const handle = mountEditorSaveModal(target, { onConfirm, onCancel });
    return { handle, onConfirm, onCancel };
  }

  it('mount 시점에는 숨겨져 있다', () => {
    setup();
    expect((target.querySelector('.editor-save-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('open()이 제안된 version과 파일명을 채운다', () => {
    const { handle } = setup();
    handle.open({ proposedVersion: 4, isFirstSave: false }, 'Song_Artist_Trace_v4.json');

    expect((target.querySelector('.editor-save-overlay') as HTMLElement).hidden).toBe(false);
    expect((target.querySelector('.editor-save-version') as HTMLInputElement).value).toBe('4');
    expect(target.querySelector('.editor-save-filename')?.textContent).toBe(
      'Song_Artist_Trace_v4.json',
    );
  });

  it('Save 클릭이 입력한 version 숫자로 onConfirm을 부른다', () => {
    const { handle, onConfirm } = setup();
    handle.open({ proposedVersion: 4, isFirstSave: false }, 'x_v4.json');
    const input = target.querySelector('.editor-save-version') as HTMLInputElement;
    input.value = '7';
    (target.querySelectorAll('.editor-save-btn')[0] as HTMLButtonElement).click();
    expect(onConfirm).toHaveBeenCalledWith(7);
  });

  it('Cancel 클릭이 onCancel을 부른다', () => {
    const { handle, onCancel } = setup();
    handle.open({ proposedVersion: 4, isFirstSave: false }, 'x_v4.json');
    (target.querySelectorAll('.editor-save-btn')[1] as HTMLButtonElement).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('showError()는 닫지 않고 인라인 에러만 보여준다', () => {
    const { handle } = setup();
    handle.open({ proposedVersion: 4, isFirstSave: false }, 'x_v4.json');
    handle.showError('버전이 유효하지 않다');
    const overlay = target.querySelector('.editor-save-overlay') as HTMLElement;
    const error = target.querySelector('.editor-save-error') as HTMLElement;
    expect(overlay.hidden).toBe(false);
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('버전이 유효하지 않다');
  });

  it('close()는 폼을 숨긴다', () => {
    const { handle } = setup();
    handle.open({ proposedVersion: 4, isFirstSave: false }, 'x_v4.json');
    handle.close();
    expect((target.querySelector('.editor-save-overlay') as HTMLElement).hidden).toBe(true);
  });
});
