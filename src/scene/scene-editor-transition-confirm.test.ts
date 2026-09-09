// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTransitionConfirmModal } from './scene-editor-transition-confirm.js';

describe('mountTransitionConfirmModal (W08, persistence.md §5)', () => {
  let target: HTMLDivElement;

  afterEach(() => {
    target.remove();
  });

  function setup() {
    target = document.createElement('div');
    document.body.append(target);
    const onChoice = vi.fn();
    const handle = mountTransitionConfirmModal(target, { onChoice });
    return { handle, onChoice };
  }

  it('mount 시점에는 숨겨져 있다', () => {
    setup();
    expect((target.querySelector('.editor-transition-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('open()이 창을 보여준다', () => {
    const { handle } = setup();
    handle.open();
    expect((target.querySelector('.editor-transition-overlay') as HTMLElement).hidden).toBe(false);
  });

  it('Save New Version 클릭이 onChoice(saveNewVersion)을 부르고 창을 닫는다', () => {
    const { handle, onChoice } = setup();
    handle.open();
    const buttons = target.querySelectorAll('.editor-transition-btn');
    (buttons[0] as HTMLButtonElement).click();
    expect(onChoice).toHaveBeenCalledWith('saveNewVersion');
    expect((target.querySelector('.editor-transition-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('Discard Changes 클릭이 onChoice(discardChanges)를 부른다', () => {
    const { handle, onChoice } = setup();
    handle.open();
    const buttons = target.querySelectorAll('.editor-transition-btn');
    (buttons[1] as HTMLButtonElement).click();
    expect(onChoice).toHaveBeenCalledWith('discardChanges');
  });

  it('Cancel 클릭이 onChoice(cancel)을 부른다', () => {
    const { handle, onChoice } = setup();
    handle.open();
    const buttons = target.querySelectorAll('.editor-transition-btn');
    (buttons[2] as HTMLButtonElement).click();
    expect(onChoice).toHaveBeenCalledWith('cancel');
  });

  it('close()는 창을 숨긴다', () => {
    const { handle } = setup();
    handle.open();
    handle.close();
    expect((target.querySelector('.editor-transition-overlay') as HTMLElement).hidden).toBe(true);
  });

  it('창이 닫힌 뒤 같은 버튼을 다시 클릭해도 onChoice가 중복 호출되지 않는다', () => {
    const { handle, onChoice } = setup();
    handle.open();
    const saveBtn = target.querySelectorAll('.editor-transition-btn')[0] as HTMLButtonElement;
    saveBtn.click();
    expect(onChoice).toHaveBeenCalledTimes(1);
    saveBtn.click(); // 창이 이미 hidden — 두 번째 클릭은 무시돼야 한다.
    expect(onChoice).toHaveBeenCalledTimes(1);
  });
});
