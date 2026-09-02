// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../core/core-settings.js';
import {
  mountSettingsScene,
  type SettingsHandlers,
  type SettingsSceneHandle,
} from './scene-settings.js';

function mount(handlers: Partial<SettingsHandlers> = {}): {
  root: HTMLElement;
  handle: SettingsSceneHandle;
  onChange: ReturnType<typeof vi.fn>;
  onCategoryChange: ReturnType<typeof vi.fn>;
  onBack: ReturnType<typeof vi.fn>;
} {
  const root = document.createElement('div');
  document.body.append(root);
  const onChange = vi.fn();
  const onCategoryChange = vi.fn();
  const onBack = vi.fn();
  const handle = mountSettingsScene(root, {
    onChange,
    onCategoryChange,
    onBack,
    ...handlers,
  });
  return { root, handle, onChange, onCategoryChange, onBack };
}

function dispatchKey(key: string, opts: KeyboardEventInit = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...opts }));
}

describe('mountSettingsScene — mount/show/hide', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('mount 직후엔 숨겨져 있고 show()로 드러난다', () => {
    const { root, handle } = mount();
    const scene = root.querySelector('.settings-scene') as HTMLElement;
    expect(scene.hidden).toBe(true);
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    expect(scene.hidden).toBe(false);
    expect(scene.querySelector('.settings-nav-pill.active')?.textContent).toBe('PLAY');
  });

  it('hide()는 다시 숨긴다', () => {
    const { root, handle } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    handle.hide();
    const scene = root.querySelector('.settings-scene') as HTMLElement;
    expect(scene.hidden).toBe(true);
  });
});

describe('nav pill 클릭', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('클릭한 category로 onCategoryChange를 부른다', () => {
    const { root, handle, onCategoryChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    const pills = root.querySelectorAll('.settings-nav-pill');
    const soundPill = [...pills].find((p) => p.textContent === 'SOUND')!;
    (soundPill as HTMLElement).click();
    expect(onCategoryChange).toHaveBeenCalledWith('sound');
  });
});

describe('Tab/Shift+Tab 순환', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('Tab은 다음 category로, wraparound도 순환한다', () => {
    const { handle, onCategoryChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('option');
    dispatchKey('Tab');
    expect(onCategoryChange).toHaveBeenCalledWith('play');
  });

  it('Shift+Tab은 역방향이다', () => {
    const { handle, onCategoryChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    dispatchKey('Tab', { shiftKey: true });
    expect(onCategoryChange).toHaveBeenCalledWith('option');
  });
});

describe('필드 위젯 커밋', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('toggle 클릭은 값을 반전해 commit한다', () => {
    const { root, handle, onChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('option');
    const mirrorRow = [...root.querySelectorAll('.field-row')].find(
      (r) => r.querySelector('.field-label')?.textContent === 'Mirror',
    )!;
    const btn = mirrorRow.querySelector('.toggle-switch') as HTMLButtonElement;
    btn.click();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mirror: !DEFAULT_SETTINGS.mirror }),
    );
  });

  it('slider input 이벤트는 commit한다', () => {
    const { root, handle, onChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('sound');
    const input = root.querySelector('.slider-input') as HTMLInputElement;
    input.value = '0.5';
    input.dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ volMaster: 0.5 }));
  });

  it('select 세그먼트 클릭은 commit한다', () => {
    const { root, handle, onChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('visual');
    const group = root.querySelector('.segment-group')!;
    const notActive = [...group.querySelectorAll('.segment-btn')].find(
      (b) => !b.classList.contains('active'),
    ) as HTMLButtonElement;
    notActive.click();
    expect(onChange).toHaveBeenCalled();
  });

  it('number field change는 유효하면 commit, 무효면 되돌린다', () => {
    const { root, handle, onChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('visual');
    const input = [...root.querySelectorAll('.number-input')].find(
      (i) => (i as HTMLInputElement).value === String(DEFAULT_SETTINGS.noteThickness),
    ) as HTMLInputElement;

    input.value = '0';
    input.dispatchEvent(new Event('change'));
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe(String(DEFAULT_SETTINGS.noteThickness));

    input.value = '10';
    input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ noteThickness: 10 }));
  });
});

describe('key-rebind capture', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('클릭 → keydown으로 즉시 commit한다', () => {
    const { root, handle, onChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    const btn = root.querySelector('.key-rebind-btn') as HTMLButtonElement;
    btn.click();
    dispatchKey('z', { code: 'KeyZ' });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        keyBindings: expect.objectContaining({ key1: 'KeyZ' }),
      }),
    );
  });

  it('Esc는 캡처를 취소하고 원래 값을 유지한다', () => {
    const { root, handle, onChange } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    const btn = root.querySelector('.key-rebind-btn') as HTMLButtonElement;
    btn.click();
    dispatchKey('Escape');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('충돌하는 key는 commit을 거부하고 conflict 상태를 보여준다', () => {
    const settings: Settings = DEFAULT_SETTINGS;
    const { root, handle, onChange } = mount();
    handle.update(settings);
    handle.show('play');
    const btns = root.querySelectorAll('.key-rebind-btn');
    const key1Btn = btns[0] as HTMLButtonElement;
    key1Btn.click();
    // key2에 이미 쓰이는 코드로 충돌을 만든다.
    dispatchKey('x', { code: settings.keyBindings.key2 });
    expect(onChange).not.toHaveBeenCalled();
    const updatedBtn = root.querySelectorAll('.key-rebind-btn')[0] as HTMLButtonElement;
    expect(updatedBtn.classList.contains('conflict')).toBe(true);
  });
});

describe('Backspace/Esc → onBack', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('캡처 중이 아니면 Backspace가 onBack을 부른다', () => {
    const { handle, onBack } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    dispatchKey('Backspace');
    expect(onBack).toHaveBeenCalled();
  });

  it('캡처 중이 아니면 Escape가 onBack을 부른다', () => {
    const { handle, onBack } = mount();
    handle.update(DEFAULT_SETTINGS);
    handle.show('play');
    dispatchKey('Escape');
    expect(onBack).toHaveBeenCalled();
  });
});
