/**
 * song-credit 화면 — 단일 출처 `scene/scene.md` §6.
 *
 * "선택한 playable chart의 credit를 gameplay 직전에 5초 표시하고 자동
 * 진행한다. 입력·skip·back 없음." — 그래서 이 scene은 `mountTitleScene`
 * 등과 달리 keydown/click 리스너를 아예 붙이지 않는다. 연출은 fade-in →
 * 유지 → fade-out, 텍스트 3줄 동시 fade, 수치는 [[constants]] `CREDIT_*`
 * (fade-in 500 + hold 4000 + fade-out 500 = 5000ms, §6 "5초"와 일치).
 *
 * `scene-song-preview.ts`(M4-4)·`scene-loading.ts`와 같은 관례로 실제
 * `setTimeout`을 쓰고 테스트는 `vi.useFakeTimers()`로 검증한다. fade는
 * CSS `transition`(`.song-credit-scene` CSS, duration을 JS 상수와 맞춤)으로
 * 그리고, "언제 다음 단계로 넘어가는지"는 timer가 정한다 — jsdom에는
 * transitionend가 안 믿을 만해(레이아웃이 없어 트랜지션이 실제로 안
 * 걸릴 수 있다) 시각 전환에 이벤트를 걸지 않는다.
 *
 * 표시 필드는 §6 그대로 `Music by {musicBy}` / `Jacket by {jacketBy}` /
 * `Chart by {chartBy}` 세 줄뿐이다 — 저장값에는 "by"를 넣지 않는다(그
 * 접두어는 라벨이다).
 */
import './scene-song-credit.css';
import { CREDIT_FADE_IN_MS, CREDIT_FADE_OUT_MS, CREDIT_HOLD_MS } from '../core/core-constants.js';
import type { Chart } from '../core/core-chart.js';

export interface SongCreditSceneHandle {
  /** 이 chart의 credit을 표시하고 fade 시퀀스를 새로 시작한다 — `show()`
   *  전에 불러 둔다(첫 프레임부터 fade-in이 걸리게). */
  update(chart: Pick<Chart, 'metadata' | 'chartBy'>): void;
  show(): void;
  hide(): void;
}

export interface SongCreditHandlers {
  /** fade-out까지 끝난 뒤(총 5초) 정확히 한 번 불린다 — 호출측이
   *  `goScene('gameplay', 'replace')`로 잇는다(§6). */
  readonly onDone: () => void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function mountSongCreditScene(
  target: HTMLElement,
  handlers: SongCreditHandlers,
): SongCreditSceneHandle {
  const root = el('div', 'song-credit-scene');
  root.hidden = true;

  const text = el('div', 'song-credit-text');
  const musicLine = el('div', 'credit-line');
  const jacketLine = el('div', 'credit-line');
  const chartLine = el('div', 'credit-line');
  text.append(musicLine, jacketLine, chartLine);
  root.append(text);
  target.append(root);

  text.style.transitionDuration = `${CREDIT_FADE_IN_MS}ms`;

  let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
  let doneTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (fadeOutTimer !== null) {
      clearTimeout(fadeOutTimer);
      fadeOutTimer = null;
    }
    if (doneTimer !== null) {
      clearTimeout(doneTimer);
      doneTimer = null;
    }
  }

  return {
    update(chart): void {
      musicLine.textContent = `Music by ${chart.metadata.musicBy}`;
      jacketLine.textContent = `Jacket by ${chart.metadata.jacketBy}`;
      chartLine.textContent = `Chart by ${chart.chartBy}`;

      clearTimers();
      text.classList.remove('visible');
      // 강제 reflow — 방금 지운 'visible'을 브라우저가 반영하게 해, 곧바로
      // 다시 추가하는 'visible'의 transition이 이전 fade-out 상태에서
      // 이어지지 않고 0부터 다시 걸리게 한다.
      void text.offsetHeight;
      text.classList.add('visible'); // t=0 — CREDIT_FADE_IN_MS에 걸쳐 fade-in.
      fadeOutTimer = setTimeout(() => {
        text.classList.remove('visible'); // t=FADE_IN+HOLD — fade-out 시작.
      }, CREDIT_FADE_IN_MS + CREDIT_HOLD_MS);
      doneTimer = setTimeout(
        () => handlers.onDone(),
        CREDIT_FADE_IN_MS + CREDIT_HOLD_MS + CREDIT_FADE_OUT_MS,
      );
    },
    show(): void {
      root.hidden = false;
    },
    hide(): void {
      root.hidden = true;
      clearTimers();
    },
  };
}
