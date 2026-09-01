// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountTitleScene } from './scene-title.js';

describe('scene-title', () => {
  let target: HTMLElement;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function setup() {
    target = document.createElement('div');
    document.body.append(target);
    const onStart = vi.fn();
    const handle = mountTitleScene(target, onStart);
    return { handle, onStart };
  }

  it('mount 시점에는 숨김 상태다', () => {
    setup();
    const root = target.querySelector('.title-scene') as HTMLElement;
    expect(root.hidden).toBe(true);
  });

  it('show()가 화면을 보이게 하고 hide()가 다시 숨긴다', () => {
    const { handle } = setup();
    handle.show();
    const root = target.querySelector('.title-scene') as HTMLElement;
    expect(root.hidden).toBe(false);
    handle.hide();
    expect(root.hidden).toBe(true);
  });

  it('show() 상태에서 키 입력이 onStart를 부른다', () => {
    const { handle, onStart } = setup();
    handle.show();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('hide() 이후에는 키 입력이 onStart를 부르지 않는다', () => {
    const { handle, onStart } = setup();
    handle.show();
    handle.hide();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onStart).not.toHaveBeenCalled();
  });

  it('클릭도 onStart를 부른다', () => {
    const { handle, onStart } = setup();
    handle.show();
    const root = target.querySelector('.title-scene') as HTMLElement;
    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('wordmark·tagline·hint 텍스트가 확정 문구 그대로다', () => {
    setup();
    expect(target.querySelector('.wordmark')?.textContent).toBe('Conflux');
    expect(target.querySelector('.tagline')?.textContent).toBe('Two movements to One.');
    expect(target.querySelector('.hint')?.textContent).toBe('Press anywhere to start');
  });
});
