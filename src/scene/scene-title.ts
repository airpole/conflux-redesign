/**
 * title 화면 — 단일 출처 `scene/ui-design.md` §2.7, 입력 규칙은
 * `scene/scene.md` §3(D-2026-078, 키보드 아무 키 OR 클릭).
 *
 * wave field·bubble 배경 애니메이션과 힌트 텍스트 pulse는 여기 없다 —
 * `scene-result.ts`의 카운트업 연출과 같은 이유로 순수 시각 효과는
 * Deferred다(데이터·입력 계약이 이번 범위의 핵심). 정적 골격(wordmark·
 * tagline·힌트 텍스트)과 "아무 입력 → 콜백" 계약만 구현한다.
 *
 * scene-manager(M4-1)의 lazy-mount-once 모델과 맞물려, 입력 리스너는
 * `mount()` 시점이 아니라 `show()`/`hide()`에서 붙였다 뗀다 — title이
 * 화면에 없을 때(예: mode-select에 있을 때) 아무 키나 눌러도 title의
 * 콜백이 반응하면 안 된다.
 */
import './scene-title.css';

export interface TitleSceneHandle {
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

export function mountTitleScene(target: HTMLElement, onStart: () => void): TitleSceneHandle {
  const root = el('div', 'title-scene');
  root.hidden = true;

  const wordmark = el('div', 'wordmark');
  wordmark.textContent = 'Conflux';

  const tagline = el('div', 'tagline');
  tagline.textContent = 'Two movements to One.';

  const hint = el('div', 'hint');
  hint.textContent = 'Press anywhere to start';

  root.append(wordmark, tagline, hint);
  target.append(root);

  function onKeyDown(): void {
    onStart();
  }
  function onClick(): void {
    onStart();
  }

  return {
    show(): void {
      root.hidden = false;
      document.addEventListener('keydown', onKeyDown);
      root.addEventListener('click', onClick);
    },
    hide(): void {
      root.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('click', onClick);
    },
  };
}
