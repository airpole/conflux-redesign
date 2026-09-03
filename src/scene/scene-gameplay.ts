/**
 * gameplay 화면 — canvas·오디오·입력·pause overlay를 묶어 `game-session.ts`를
 * 실제로 돌리는 host. 단일 출처는 `scene/scene.md` §9(전이 규칙)·§10
 * (pause overlay 계약)·`render/theme.md`(HUD 전체, M4.5-1로 확정).
 *
 * **M4.5-1(D-2026-090)이 HUD를 완성했다** — jacket 배경·key 빔·마디선/
 * step 선·sudden 커버·text event·카운터/퍼센트·곡정보 띠·canvas pause
 * 아이콘(클릭하면 pause)까지 `render/theme.md`가 실측해 둔 자리대로
 * 그린다. pause 아이콘 클릭은 canvas `click` 리스너 하나로 hit-test하며,
 * `attachPauseKeys`(키보드)와는 완전히 별개 경로다 — 둘 다 그냥
 * `session.pause()`를 부를 뿐이라(멱등) 우선순위 충돌이 없다. pause
 * overlay(Resume/Retry/Exit 메뉴)의 DOM 색은 `ui-design.md`/
 * `scene-result.css`의 기존 토큰을 그대로 쓴다(`scene-gameplay.css`).
 *
 * **CTX는 이 파일이 소유한다**(`architecture.md` §3 "game 호스트: CTX가
 * 자기 객체를 소유. song-select가 contentEndMs·플레이 옵션을 채워
 * 만든다") — `start()`가 매번 새 `CTX`를 만들어 `createGameSession`에
 * 넘긴다.
 *
 * **hitVol/음악 볼륨 조합식은 결정 필요 항목이다** — `_meta/settings.md`
 * §2가 스스로 "volEffect가 정확히 무엇의 볼륨인지 정의된 적 없다...
 * 실제 오디오 배선은 아직 없다"고 명시해 뒀다. 여기서는
 * `hitVol = volMaster × volEffect`, 음악 volume = `volMaster × volMusic`로
 * 가장 단순한 곱을 택했다 — 3계통 분리의 정확한 결합 방식이 정해지면
 * 재검토.
 *
 * **입력**: `env-input.bindKeyInput`이 요구하는 `KeyboardHost`의 DOM 구현이
 * 이 파일에 처음 등장한다(M2는 host 없이 로직만, M4-5가 최초 결선). lane
 * 키만 `preventDefault()`한다 — Esc/Backspace는 `game-pause-keys.ts`가
 * 별도로 duplicate 없이 처리한다(물리 키가 겹치지 않는 한 두 리스너가
 * 부딪히지 않는다, `attachPauseKeys`/`attachAutoPause` 참조).
 *
 * **pause overlay**는 `scene.md` §10 "gameplay-owned interactive DOM
 * overlay" 그대로 이 scene이 소유한다 — Resume/Retry/Exit 세 버튼뿐인
 * 최소 구현(§9 "Resume/Retry/Exit"). Resume은 `session.resume()`만 부르면
 * 엔진이 `RESUME_LEAD_MS` 카운트다운을 스스로 처리하므로(`game-engine.ts`)
 * 이 파일은 카운트다운 자체를 그리지 않는다 — 카운트다운 중에도 화면은
 * pause 시점 그대로 얼어 있다(엔진 계약, "정지 카운트다운").
 *
 * **M5-6(D-2026-104)이 mid-start를 재사용한다** — `GameplayStartInput`에
 * `startChartMs`/`leadInMs`/`editorOrigin`을 더해 `createGameSession`으로
 * 그대로 흘려보낸다(D-2026-103). editor test scene의 Enter가 이 값들을
 * 채워 push로 이 scene에 들어온다 — song-credit→gameplay의 기존 replace
 * 진입과는 별도 경로(`app-main.ts`의 `enterGameplayFromEditorTest` 참조).
 * editor-origin 종료 후 result를 건너뛰고 편집 화면으로 돌아가는 분기는 이
 * 파일이 아니라 `app-main.ts`의 `onGameplayFinished`가 판단한다 — 이 파일은
 * `onFinished(result)`만 그대로 알린다.
 *
 * **scene 스택 관리**: gameplay→result는 `goScene('result', 'replace')`를
 * 쓰기로 했다(호출측 `app-main.ts`) — `song-credit → gameplay`의 replace
 * 관례를 그대로 이어, Retry를 반복해도 스택이 계속 자라지 않게 한다.
 * §6이 명시한 건 song-credit→gameplay뿐이라 gameplay→result 쪽은 이
 * 세션이 내린 결정이다(결정 필요 항목으로 보고 — 스펙이 명시적으로
 * 정하지 않았다).
 */
import { LANE_KEY_IDS, laneOf } from '../core/core-settings.js';
import type { Settings } from '../core/core-settings.js';
import type { Chart } from '../core/core-chart.js';
import { buildFieldGeometry } from '../core/core-shape.js';
import { buildTimeline, msToTick, songEndOf } from '../core/core-timing.js';
import { deriveAccuracy } from '../core/core-records.js';
import { createHitBuffer, type AudioEnv } from '../env/env-audio.js';
import { bindKeyInput, type KeyboardHost, type RawKeyboardEvent } from '../env/env-input.js';
import { resizeCanvas, watchResize } from '../env/env-canvas.js';
import { startFrameLoop } from '../env/env-time.js';
import { createGameSession, type GameSession, type ResultData } from '../game/game-session.js';
import { attachAutoPause } from '../game/game-visibility.js';
import { attachPauseKeys } from '../game/game-pause-keys.js';
import type { CTX } from '../game/game-ctx.js';
import { computePlayfieldRect, judgeLineY } from '../render/render-layout.js';
import {
  computeActiveTextEvents,
  computeHitEffectVisual,
  drawCombo,
  drawCounterPercent,
  drawFastSlow,
  drawGaugeBar,
  drawHitEffect,
  drawJudgmentText,
  drawKeyBeams,
  drawMeasureLines,
  drawPauseIcon,
  drawPlayfield,
  drawSongInfoStrip,
  drawSuddenCover,
  drawTextEvent,
  pauseIconHitTest,
  type DrawContext,
  type JacketInput,
} from '../render/render-playfield.js';
import './scene-gameplay.css';

export interface GameplayJacket {
  readonly image: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export interface GameplayStartInput {
  readonly chart: Chart;
  readonly musicBuffer: AudioBuffer | null;
  readonly settings: Settings;
  /** `null`이면 배경 없이 진행(`chart.jacketFile`이 없거나 decode 실패). */
  readonly jacket: GameplayJacket | null;
  /** mid-start(M5-6, D-2026-103) — editor test scene의 Enter 진입은 0이
   *  아닌 위치에서 연다. 기본 0(기존 song-select 경로와 동일). */
  readonly startChartMs?: number;
  /** 기본 `LEAD_IN_MS`(3초) — editor test의 Enter→gameplay는 이 기본값을
   *  그대로 쓴다(`editor-graph.md` §5 "3초 lead-in"). */
  readonly leadInMs?: number;
  /** editor test scene에서 시작한 판이면 `true` — no-record 4조건 중
   *  하나([[settings]] §2)이자 종료 후 편집 화면으로 복귀하는 신호
   *  (`scene.md` §9)다. 기본 `false`. */
  readonly editorOrigin?: boolean;
}

export interface GameplayHandlers {
  /** 곡이 끝났거나(자연 종료·force-end) 판이 확정됐을 때 정확히 한 번. */
  readonly onFinished: (result: ResultData) => void;
  /** pause overlay의 Exit — `scene.md` §9 "Exit: song-select". */
  readonly onExit: () => void;
}

export interface GameplaySceneHandle {
  /** 새 chart로 판을 (다시) 시작한다 — Retry도 이 함수를 다시 부르는
   *  것으로 표현된다(host가 마지막 input을 들고 있다가 다시 넘긴다). */
  start(input: GameplayStartInput): void;
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

function domKeyboardHost(): KeyboardHost {
  return {
    now: () => performance.now(),
    onKeyDown(listener) {
      const h = (e: KeyboardEvent): void => listener(e as unknown as RawKeyboardEvent);
      document.addEventListener('keydown', h);
      return () => document.removeEventListener('keydown', h);
    },
    onKeyUp(listener) {
      const h = (e: KeyboardEvent): void => listener(e as unknown as RawKeyboardEvent);
      document.addEventListener('keyup', h);
      return () => document.removeEventListener('keyup', h);
    },
    onFocusLost(listener) {
      window.addEventListener('blur', listener);
      return () => window.removeEventListener('blur', listener);
    },
    onVisibilityHidden(listener) {
      const h = (): void => {
        if (document.hidden) listener();
      };
      document.addEventListener('visibilitychange', h);
      return () => document.removeEventListener('visibilitychange', h);
    },
  };
}

/**
 * `audio`는 호출측이 주입한다(`game-song-preview.ts`와 같은 DI 관례) —
 * `AudioContext`가 없는 환경(테스트의 jsdom)에서도 fake `AudioEnv`로 이
 * 함수를 통째로 검증할 수 있게 하려는 것과, `app-main.ts`가 이미
 * preview용으로 들고 있는 같은 `AudioEnv`(같은 `AudioContext`)를 재사용해
 * gameplay 음악과 히트음이 같은 context를 쓰게 하려는 것 둘 다다.
 */
export function mountGameplayScene(
  target: HTMLElement,
  audio: AudioEnv,
  handlers: GameplayHandlers,
): GameplaySceneHandle {
  const root = el('div', 'gameplay-scene');
  root.hidden = true;

  const canvas = el('canvas', 'gameplay-canvas');
  root.append(canvas);

  const pauseOverlay = el('div', 'pause-overlay');
  pauseOverlay.hidden = true;
  const resumeBtn = el('button', 'pause-btn');
  resumeBtn.type = 'button';
  resumeBtn.textContent = 'Resume';
  const retryBtn = el('button', 'pause-btn');
  retryBtn.type = 'button';
  retryBtn.textContent = 'Retry';
  const exitBtn = el('button', 'pause-btn');
  exitBtn.type = 'button';
  exitBtn.textContent = 'Exit';
  pauseOverlay.append(resumeBtn, retryBtn, exitBtn);
  root.append(pauseOverlay);

  target.append(root);

  const canvas2d = canvas.getContext('2d') as unknown as DrawContext | null;

  // canvas pause 아이콘 클릭(M4.5-1) — `attachPauseKeys`(키보드)와 별개
  // 경로다. 둘 다 `session.pause()`(멱등)만 부르므로 부딪히지 않는다.
  canvas.addEventListener('click', (event) => {
    if (session === null) return;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (canvasRect.width || 1);
    const scaleY = canvas.height / (canvasRect.height || 1);
    const x = (event.clientX - canvasRect.left) * scaleX;
    const y = (event.clientY - canvasRect.top) * scaleY;
    const rect = computePlayfieldRect(canvas.width, canvas.height);
    if (pauseIconHitTest(rect, x, y)) session.pause();
  });

  let session: GameSession | null = null;
  let stopFrameLoop: (() => void) | null = null;
  let stopResize: (() => void) | null = null;
  let stopKeyInput: (() => void) | null = null;
  let stopAutoPause: (() => void) | null = null;
  let stopPauseKeys: (() => void) | null = null;
  let lastInput: GameplayStartInput | null = null;
  let resultReported = false;
  let hitSoundBuffer: AudioBuffer | null = null;

  function teardownSession(): void {
    stopFrameLoop?.();
    stopFrameLoop = null;
    stopResize?.();
    stopResize = null;
    stopKeyInput?.();
    stopKeyInput = null;
    stopAutoPause?.();
    stopAutoPause = null;
    stopPauseKeys?.();
    stopPauseKeys = null;
    audio.stop();
    session = null;
  }

  function draw(nowMs: number): void {
    if (session === null || lastInput === null) return;
    // pause overlay 표시는 canvas 2D context 유무나 실제 레이아웃 크기와
    // 무관하다 — 캔버스를 못 그려도(테스트 환경의 jsdom처럼 2d context가
    // 없어도) pause 상태 자체는 그대로 보여야 한다.
    pauseOverlay.hidden = !session.engine.paused;
    if (canvas2d === null) return;
    const rect = computePlayfieldRect(canvas.width, canvas.height);
    if (rect.gw < 1 || rect.gh < 1) return;
    const jY = judgeLineY(rect, lastInput.settings.judgeLinePos);
    const timeline = buildTimeline(lastInput.chart);
    const geometry = buildFieldGeometry(lastInput.chart);
    const curMs = session.ctx.sharedMs;

    const jacket: JacketInput | null =
      lastInput.jacket === null
        ? null
        : {
            image: lastInput.jacket.image,
            width: lastInput.jacket.width,
            height: lastInput.jacket.height,
            brightnessPct: lastInput.settings.jacketBrightness,
          };

    // layer 0(캔버스/플레이필드 바닥)·1(jacket)·2(shape 경계)·5(notes)·
    // 7(idle 판정선) — `drawPlayfield` 내부가 이 순서를 지킨다.
    drawPlayfield(
      canvas2d,
      canvas.width,
      canvas.height,
      rect,
      jY,
      geometry,
      timeline,
      lastInput.chart.notes,
      curMs,
      lastInput.settings.scrollSpeed,
      lastInput.settings.mirror,
      lastInput.settings.noteThickness,
      jacket,
    );

    // layer 3 — key 빔(눌린 lane). keysHeld는 물리 key(key1~6)라 lane(1~4)로
    // 접어야 한다(같은 lane을 여러 키가 눌러도 빔은 하나).
    const heldLanes = new Set([...session.judgeState.keysHeld].map(laneOf));
    drawKeyBeams(
      canvas2d,
      rect,
      jY,
      geometry,
      timeline,
      curMs,
      lastInput.settings.mirror,
      heldLanes,
    );

    // layer 4 — 마디선·step 선.
    drawMeasureLines(
      canvas2d,
      rect,
      jY,
      geometry,
      timeline,
      curMs,
      lastInput.settings.scrollSpeed,
      lastInput.settings.mirror,
    );

    // layer 6 — sudden 커버(notes 뒤·판정선 앞, `theme.md` §2).
    drawSuddenCover(canvas2d, rect, jY, lastInput.settings.sudden);

    // layer 7 — 라이브 게이지(=판정선).
    drawGaugeBar(
      canvas2d,
      rect,
      jY,
      session.gaugeState.tier === 'hard'
        ? session.gaugeState.gauge.hardPct
        : session.gaugeState.gauge.normalPct,
      session.gaugeState.tier === 'hard' ? 'hard' : 'normal',
    );

    // layer 8 — hit effect.
    if (lastInput.settings.hitEffect) {
      for (const effect of session.display.hitEffects) {
        const visual = computeHitEffectVisual(
          effect,
          geometry,
          rect,
          lastInput.settings.mirror,
          nowMs,
        );
        if (visual !== null) drawHitEffect(canvas2d, jY, visual);
      }
    }

    // layer 9 — text event(lane 변형은 "판정선 위" 배치라 현재 tick의
    // lane 기하를 쓴다, `theme.md` §3).
    const activeTextEvents = computeActiveTextEvents(lastInput.chart.textEvents, timeline, curMs);
    const currentTick = msToTick(timeline, curMs);
    for (const active of activeTextEvents) {
      drawTextEvent(canvas2d, rect, jY, geometry, currentTick, lastInput.settings.mirror, active);
    }

    // layer 10 — HUD(콤보·판정 텍스트·카운터/퍼센트·F/S·곡정보 띠·pause 아이콘).
    if (lastInput.settings.showCombo) drawCombo(canvas2d, rect, jY, session.judgeState.combo);
    if (lastInput.settings.showJudgment && session.display.lastJudgment !== null) {
      drawJudgmentText(canvas2d, rect, jY, session.display.lastJudgment, nowMs);
    }
    drawCounterPercent(
      canvas2d,
      rect,
      jY,
      session.gaugeState.counts,
      deriveAccuracy(session.gaugeState.counts, session.context.notes.totalUnits),
    );
    if (lastInput.settings.showFastSlow && session.display.fastSlow !== null) {
      drawFastSlow(canvas2d, rect, jY, session.display.fastSlow, nowMs);
    }
    drawSongInfoStrip(
      canvas2d,
      rect,
      jY,
      lastInput.chart.metadata.title,
      lastInput.chart.metadata.musicBy,
    );
    drawPauseIcon(canvas2d, rect);
  }

  function startInternal(input: GameplayStartInput): void {
    teardownSession();
    lastInput = input;
    resultReported = false;

    const timeline = buildTimeline(input.chart);
    const musicDurationMs = input.musicBuffer !== null ? input.musicBuffer.duration * 1000 : null;
    const songEnd = songEndOf(timeline, input.chart, musicDurationMs);

    const ctx: CTX = {
      sharedMs: 0,
      contentEndMs: songEnd.contentEndMs,
      hitVol: input.settings.volMaster * input.settings.volEffect,
      pvSpd: input.settings.scrollSpeed,
      nThk: input.settings.noteThickness,
      redrawIdle(): void {
        draw(performance.now());
      },
    };

    const audioCtx = audio.getContext();
    if (hitSoundBuffer === null) hitSoundBuffer = createHitBuffer(audioCtx);

    const startNowMs = performance.now();
    session = createGameSession({
      ctx,
      chart: input.chart,
      timeline,
      keyBindings: input.settings.keyBindings,
      mirror: input.settings.mirror,
      visualOffset: input.settings.visualOffset,
      autoplay: input.settings.autoplay,
      gaugeMode: input.settings.gaugeMode,
      startNowMs,
      playbackRate: 1,
      hitSound: { ctx: audioCtx, buffer: hitSoundBuffer },
      ...(input.startChartMs !== undefined ? { startChartMs: input.startChartMs } : {}),
      ...(input.leadInMs !== undefined ? { leadInMs: input.leadInMs } : {}),
      engineHooks: {
        onAudioStart(fromMs): void {
          audio.stop();
          if (input.musicBuffer !== null) {
            audio.setVolume(input.settings.volMaster * input.settings.volMusic);
            audio.play(input.musicBuffer, fromMs);
          }
        },
        onSongEnd(): void {
          audio.stop();
        },
      },
    });

    const currentSession = session;

    stopAutoPause = attachAutoPause(currentSession, input.settings.pauseOnBlur);
    stopPauseKeys = attachPauseKeys(currentSession);

    const laneCodes = new Set(LANE_KEY_IDS.map((id) => input.settings.keyBindings[id]));
    stopKeyInput = bindKeyInput(
      domKeyboardHost(),
      {
        onKeyDown: currentSession.input.onKeyDown,
        onKeyUp: currentSession.input.onKeyUp,
        onFocusLost(): void {
          // blur에서 실제로 pause를 거는 쪽은 `attachAutoPause`(위,
          // `Settings.pauseOnBlur` 게이팅, D-2026-089)다 — 여기(env-input의
          // `onFocusLost`)는 그것과 다른 관심사인 stuck-key 복구
          // 자리다(원본 `keyboard.js`의 blur 핸들러가 눌린 채로 남은
          // 채널을 순회해 복구하던 것, `env-input.ts` 헤더 참조 — game
          // 상태를 아는 정책이라 env가 아니라 여기 몫이다). 그 복구
          // 로직 자체는 아직 없다 — pauseOnBlur가 켜져 있으면(기본값)
          // blur 즉시 pause돼 입력이 멎으므로 stuck key가 실제로
          // 문제되는 경우가 줄었지만, pauseOnBlur를 끈 상태에서는 여전히
          // 유효한 결정 필요 항목으로 남는다.
        },
        onVisibilityHidden(): void {
          currentSession.pause();
        },
      },
      (code) => laneCodes.has(code),
    );

    resumeBtn.onclick = () => currentSession.resume(performance.now());
    retryBtn.onclick = () => {
      if (lastInput !== null) startInternal(lastInput);
    };
    exitBtn.onclick = () => {
      teardownSession();
      handlers.onExit();
    };

    function resizeNow(): void {
      const dpr = window.devicePixelRatio || 1;
      resizeCanvas(canvas, root.clientWidth, root.clientHeight, dpr);
    }
    resizeNow();
    stopResize = watchResize(window, resizeNow);

    stopFrameLoop = startFrameLoop(window, input.settings.frameCap, (nowMs) => {
      const activeSession = session;
      if (activeSession === null) return;
      if (!resultReported) {
        activeSession.advance(nowMs);
        const result = activeSession.result;
        if (result !== null) {
          resultReported = true;
          audio.stop();
          handlers.onFinished(result); // 재진입 위험 — onFinished가 동기적으로
          // hide()를 불러 teardownSession()이 session/stopFrameLoop 등을 이미
          // 비웠을 수 있다(app-main이 곧바로 goScene(replace)하는 경우). 그
          // 뒤로는 바깥 `session`이 아니라 이 지역 `activeSession`만 쓴다 —
          // 재진입 이후에도 이번 프레임 그리기는 안전하게 끝낸다.
          return;
        }
      }
      draw(nowMs);
    });
  }

  return {
    start: startInternal,
    show(): void {
      root.hidden = false;
    },
    hide(): void {
      root.hidden = true;
      teardownSession();
    },
  };
}
