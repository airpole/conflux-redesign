/**
 * mode-select 화면 — 단일 출처 `scene/ui-design.md` §2.9, 행동 규칙은
 * `scene/scene.md` §4.
 *
 * `editor` 항목은 `FEATURES.editor`가 꺼지면 목록에서 완전히 빠지고
 * 나머지가 reflow한다(§2.9.2) — 이 모듈은 그 gate 값을 인자로 받을 뿐
 * `FEATURES`를 직접 import하지 않는다(scene은 app을 모른다,
 * `architecture.md` §1).
 *
 * `song-select`/`editor start`/`settings-play` scene은 아직 없다
 * (M4-3·M4-5·M4-6 범위). `play`/`editor`/`settings` 항목은 화면에
 * 표시되고 선택은 되지만 그 selection이 실제로 무엇을 하는지는 이
 * 모듈이 정하지 않는다 — `onSelect` 콜백에 그대로 넘길 뿐이며, 호출측
 * (`app-main.ts`)이 아직 존재하지 않는 목적지를 어떻게 다룰지 정한다.
 */
import './scene-mode-select.css';

export type ModeSelectId = 'play' | 'editor' | 'settings' | 'credits';

interface ModeItem {
  readonly id: ModeSelectId;
  readonly label: string;
}

const ALL_ITEMS: readonly ModeItem[] = [
  { id: 'play', label: 'Play' },
  { id: 'editor', label: 'Editor' },
  { id: 'settings', label: 'Settings' },
  { id: 'credits', label: 'Credits' },
];

export interface ModeSelectHandlers {
  readonly onSelect: (id: ModeSelectId) => void;
  readonly onBack: () => void;
}

export interface ModeSelectSceneHandle {
  show(): void;
  hide(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function mountModeSelectScene(
  target: HTMLElement,
  editorEnabled: boolean,
  handlers: ModeSelectHandlers,
): ModeSelectSceneHandle {
  const items = ALL_ITEMS.filter((item) => item.id !== 'editor' || editorEnabled);

  const root = el('div', 'mode-select-scene');
  root.hidden = true;

  const list = el('div', 'mode-list');
  const buttons: HTMLButtonElement[] = items.map((item) => {
    const button = el('button', 'mode-item');
    button.type = 'button';
    button.textContent = item.label;
    button.tabIndex = -1; // §2.5.7 구현 조건과 같은 원칙 — 방향키가 1급, 포커스된 버튼이 Enter를 가로채지 않게.
    button.addEventListener('click', () => handlers.onSelect(item.id));
    list.append(button);
    return button;
  });
  root.append(list);
  target.append(root);

  let cursor = 0;

  function render(): void {
    buttons.forEach((button, index) => button.classList.toggle('active', index === cursor));
  }
  render();

  function onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
        cursor = (cursor - 1 + items.length) % items.length;
        render();
        break;
      case 'ArrowDown':
        cursor = (cursor + 1) % items.length;
        render();
        break;
      case 'Enter': {
        const selected = items[cursor];
        if (selected !== undefined) handlers.onSelect(selected.id);
        break;
      }
      case 'Escape':
      case 'Backspace':
        handlers.onBack();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return {
    show(): void {
      root.hidden = false;
      cursor = 0;
      render();
      document.addEventListener('keydown', onKeyDown);
    },
    hide(): void {
      root.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
