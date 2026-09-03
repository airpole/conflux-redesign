/**
 * test 탭 — M5-6, 단일 출처 `editor/editor-graph.md` §5·`editor/
 * editor-editing.md`(idle/Space/Enter 키 표).
 *
 * **"현재 위치"는 `scrollMs`를 그대로 쓴다(D-2026-104)** — notes/shapes와
 * 공유하는 `EditorViewState.scrollMs`가 이미 "지금 타임라인 맨 아래에 보이는
 * 시각"이다(`scene-editor-notes.ts`의 "시간은 위로 흐른다" 관례). 별도
 * playhead 상태를 새로 만들지 않고 그 값을 재생 시작점으로 그대로 읽는다 —
 * notes/shapes 탭을 오가도 같은 참조라 자동으로 유지된다.
 *
 * **idle**: 16:9 canvas에 `scrollMs` 위치의 static preview(엔진을 안 돌리고
 * `drawPlayfield`만 그 ms로 한 번 그린다) + embedded quick options 패널
 * (`core-quick-options.ts`, song-select overlay와 같은 로직·다른 배치 —
 * scene.md §10 "song-select overlay / test embedded panel") + seek bar
 * (아래) + conflict 표시(`core-overlap.ts`, notes와 같은 계산).
 *
 * **Space(idle 전용) = 즉시 재생** — `createGameSession`에
 * `startChartMs: scrollMs, leadInMs: 0`을 넘긴다(D-2026-103 mid-start
 * 확장). lead-in이 없으니 crossing Hold를 미리 눌러 둘 수 없다는 것도 그대로
 * 따른다(§5). 세션 중에는 Space가 이 파일의 단축키가 아니라 key3 lane
 * 입력이다(`core-settings.ts`의 `DEFAULT_LANE_KEYS.key3.binding === 'Space'`)
 * — idle 전용 처리는 "세션이 없을 때만 Space를 가로챈다"로 자연히 표현된다.
 * 정지는 Esc만(`editor-editing.md` §5 표) — 세션을 버리고 idle로 돌아간다.
 *
 * **Enter = gameplay scene 진입(전체화면)** — 이 파일이 직접 만들지 않고
 * `api.onEnterGameplay(scrollMs)`로 host(`app-main.ts`)에 위임한다 — 전체화면
 * 전환·scene stack 관리는 이 파일의 권한 밖(scene-manager는 여기서 모른다).
 * host가 `leadInMs: LEAD_IN_MS`(3초)로 `scene-gameplay.ts`를 그대로 재사용해
 * 세션을 연다 — "같은 engine이 editor host에서 돈다"(M5-6 Exit 기준)를
 * 만족하는 지점이다.
 *
 * **editor-origin no-record**는 이 파일이 만들지 않는다 — 이 파일의 즉시
 * 재생 세션은 애초에 `game-records.ts`를 부르지 않고(결과 화면 자체가 없다,
 * 아래), Enter→gameplay 경로의 no-record는 host(`app-main.ts`)가
 * `NoRecordConditions.editorOrigin`/`midStart`를 채워 판별한다
 * ([[settings]] §2, 값 자체는 M3-7이 이미 정의해 뒀다).
 *
 * **Enter 충돌(결정 필요 항목)** — quick options row 확정(core-quick-
 * options.ts, embedded 패널)과 gameplay 진입(editor-editing.md §5) 둘 다
 * Enter다. 패널이 song-select overlay처럼 모달이 아니라 상시 embedded라
 * (scene.md §10) 포커스로 못 가른다 — "확정할 미확정 draft가 있을 때만
 * quick options가 Enter를 삼키고, 없으면 gameplay 진입으로 넘어간다"로
 * 절충했다. 이 파일이 임의로 내린 해석이라 별도 보고한다.
 *
 * **이번 라운드가 줄인 것(결정 필요 항목, Exit 기준 밖)**:
 * - 즉시 재생 중 HUD는 playfield·notes·판정선·key 빔·콤보·카운터/퍼센트만
 *   그린다 — jacket 배경·sudden cover·text event·hit effect·F/S 표시는
 *   `scene-gameplay.ts`가 이미 가진 것과 같은 그리기 함수를 재사용하면 되지만
 *   이번 라운드는 Exit 기준("같은 engine 재사용·즉시재생·no-record")에 직접
 *   필요한 최소만 그렸다.
 * - conflict 표시는 idle static preview에는 아직 안 그린다(§`editor-editing.md`
 *   "conflict 표시"는 있지만 이 파일에서 실제 계산·렌더를 아직 안 붙였다) —
 *   `core-overlap.ts`를 notes 탭에서 이미 보여주고 있어 완전히 새 기능은
 *   아니지만, test idle에 다시 그리는 배선은 남겨 뒀다.
 */
import { buildTimeline, songEndOf } from '../core/core-timing.js';
import { buildFieldGeometry } from '../core/core-shape.js';
import type { Chart } from '../core/core-chart.js';
import { LANE_KEY_IDS, laneOf } from '../core/core-settings.js';
import type { Settings } from '../core/core-settings.js';
import {
  applyQuickOptions,
  confirmQuickOption,
  jumpQuickOption,
  moveQuickOptionsRow,
  openQuickOptions,
  stepQuickOption,
  QUICK_OPTION_FIELDS,
  type QuickOptionField,
  type QuickOptionsState,
} from '../core/core-quick-options.js';
import { GAUGE_MODES, type GaugeMode } from '../core/core-gauge.js';
import { SCROLL_SPEED_MAX, SCROLL_SPEED_MIN, SCROLL_SPEED_STEP } from '../core/core-constants.js';
import { createHitBuffer, type AudioEnv } from '../env/env-audio.js';
import { bindKeyInput, type KeyboardHost, type RawKeyboardEvent } from '../env/env-input.js';
import { startFrameLoop } from '../env/env-time.js';
import { createGameSession, type GameSession } from '../game/game-session.js';
import type { CTX } from '../game/game-ctx.js';
import { computePlayfieldRect, judgeLineY } from '../render/render-layout.js';
import {
  drawCombo,
  drawCounterPercent,
  drawKeyBeams,
  drawPlayfield,
  type DrawContext,
} from '../render/render-playfield.js';
import { deriveAccuracy } from '../core/core-records.js';
import type { EditorCategoryController } from './scene-editor-workspace.js';
import {
  mountEditorScrollbar,
  type EditorScrollbar,
  type EditorViewState,
} from './scene-editor-view.js';
import './scene-editor-test.css';

/** seek 축(test scene) 최소 표시 길이 — D-2026-097 실측, 원본
 *  `load-chart.js` 25행 `Math.max(ES.audioMs || 0, getChartEndMs(), 5000)`.
 *  `songEndMs`([[timing]] §9)와는 다른 값이다. */
const SEEK_AXIS_MIN_MS = 5000;

export interface EditorTestSessionLike {
  readonly chart: Chart;
  readonly musicBlob: Blob | null;
}

export interface EditorTestApi {
  readonly session: EditorTestSessionLike;
  /** notes·shapes와 공유하는 scroll/zoom 상태 — `scrollMs`를 재생 시작점으로
   *  그대로 읽는다(D-2026-104, 파일 헤더 참조). */
  readonly view: EditorViewState;
  /** quick options 패널이 여는 순간 스냅샷 — host가 매 mount마다 최신값을
   *  넘긴다(song-select overlay와 같은 관례). */
  readonly settings: Settings;
  readonly audio: AudioEnv;
  /** quick options row 확정마다(Enter) — [[settings]] D-2026-022 "즉시 영속". */
  onQuickOptionsChange(settings: Settings): void;
  /** Enter — gameplay scene(전체화면, 3초 lead-in)으로 진입한다. host가
   *  scene-gameplay.ts를 mid-start로 연다. */
  onEnterGameplay(startChartMs: number): void;
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
    onFocusLost() {
      return () => {};
    },
    onVisibilityHidden() {
      return () => {};
    },
  };
}

const QUICK_OPTION_LABEL: Record<QuickOptionField, string> = {
  scrollSpeed: 'Scroll Speed',
  gaugeMode: 'Gauge',
  mirror: 'Mirror',
  staticShape: 'Static Shape',
  autoplay: 'Autoplay',
};

export function mountEditorTestBody(
  container: HTMLElement,
  initialChart: Chart,
  api: EditorTestApi,
): EditorCategoryController {
  const wrap = el('div', 'editor-test-body');
  const frameWrap = el('div', 'editor-test-frame-wrap');
  const canvas = el('canvas', 'editor-test-canvas');
  canvas.width = 960;
  canvas.height = 540;
  frameWrap.append(canvas);
  const quickOptionsPanel = el('div', 'editor-test-quick-options');
  wrap.append(frameWrap, quickOptionsPanel);
  container.append(wrap);
  const ctx2d = canvas.getContext('2d') as unknown as DrawContext | null;

  let chart = initialChart;
  let timeline = buildTimeline(chart);
  let currentSettings = api.settings;
  const view = api.view;

  const scrollbar: EditorScrollbar = mountEditorScrollbar(frameWrap, view, () => {
    view.scrollMs = Math.max(0, Math.min(seekTotalMs() - view.viewMs, view.scrollMs));
    renderIdle();
  });

  function seekTotalMs(): number {
    const songEnd = songEndOf(timeline, chart, null);
    return Math.max(songEnd.contentEndMs, SEEK_AXIS_MIN_MS);
  }

  // ── quick options — embedded 상시 패널(scene.md §10, song-select overlay와
  // 같은 core 로직·다른 배치: 여긴 열고 닫는 개념이 없다) ──────────────────
  let quickOptionsState: QuickOptionsState = openQuickOptions(currentSettings);

  function commitQuickOptionsRow(): void {
    quickOptionsState = confirmQuickOption(quickOptionsState);
  }

  function jumpAndFocus(index: number, value: QuickOptionsState['draft']): boolean {
    const before = quickOptionsState;
    const rowChanged = before.rowIndex !== index;
    let next = before;
    while (next.rowIndex < index) next = moveQuickOptionsRow(next, 'down');
    while (next.rowIndex > index) next = moveQuickOptionsRow(next, 'up');
    quickOptionsState = jumpQuickOption(next, value);
    return rowChanged;
  }

  function renderScrollSpeedControl(index: number, value: number): HTMLElement {
    const control = el('div', 'quick-options-control');
    const input = el('input', 'slider-input');
    input.type = 'range';
    input.min = String(SCROLL_SPEED_MIN);
    input.max = String(SCROLL_SPEED_MAX);
    input.step = String(SCROLL_SPEED_STEP);
    input.value = String(value);
    const valueEl = el('span', 'quick-options-value');
    valueEl.textContent = value.toFixed(1);
    input.addEventListener('input', () => {
      const next = Number(input.value);
      const rowChanged = jumpAndFocus(index, next);
      if (rowChanged) renderQuickOptions();
      else valueEl.textContent = next.toFixed(1);
    });
    control.append(input, valueEl);
    return control;
  }

  function renderGaugeModeControl(index: number, value: GaugeMode): HTMLElement {
    const control = el('div', 'quick-options-control');
    const group = el('div', 'segment-group');
    for (const mode of GAUGE_MODES) {
      const btn = el('button', `segment-btn${mode === value ? ' active' : ''}`);
      btn.type = 'button';
      btn.textContent = mode.toUpperCase();
      btn.addEventListener('click', () => {
        jumpAndFocus(index, mode);
        renderQuickOptions();
      });
      group.append(btn);
    }
    control.append(group);
    return control;
  }

  function renderToggleControl(index: number, value: boolean): HTMLElement {
    const control = el('div', 'quick-options-control');
    const btn = el('button', `toggle-switch${value ? ' on' : ''}`);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(value));
    btn.addEventListener('click', () => {
      jumpAndFocus(index, !value);
      renderQuickOptions();
    });
    control.append(btn);
    return control;
  }

  function renderQuickOptions(): void {
    quickOptionsPanel.replaceChildren();
    const title = el('div', 'quick-options-title');
    title.textContent = 'Quick Options';
    quickOptionsPanel.append(title);

    QUICK_OPTION_FIELDS.forEach((field, index) => {
      const row = el(
        'div',
        `quick-options-row${index === quickOptionsState.rowIndex ? ' active' : ''}`,
      );
      const label = el('span', 'quick-options-label');
      label.textContent = QUICK_OPTION_LABEL[field];
      row.append(label);
      const shown =
        index === quickOptionsState.rowIndex
          ? quickOptionsState.draft
          : quickOptionsState.committed[field];

      if (field === 'scrollSpeed') row.append(renderScrollSpeedControl(index, shown as number));
      else if (field === 'gaugeMode') row.append(renderGaugeModeControl(index, shown as GaugeMode));
      else row.append(renderToggleControl(index, shown as boolean));
      quickOptionsPanel.append(row);
    });

    const hint = el('div', 'quick-options-hint');
    hint.textContent = '↑↓ Row · ←→ Adjust · Enter Confirm';
    quickOptionsPanel.append(hint);
  }

  function onQuickOptionsKeyDown(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'ArrowUp':
        quickOptionsState = moveQuickOptionsRow(quickOptionsState, 'up');
        renderQuickOptions();
        return true;
      case 'ArrowDown':
        quickOptionsState = moveQuickOptionsRow(quickOptionsState, 'down');
        renderQuickOptions();
        return true;
      case 'ArrowLeft':
        quickOptionsState = stepQuickOption(quickOptionsState, 'left');
        renderQuickOptions();
        return true;
      case 'ArrowRight':
        quickOptionsState = stepQuickOption(quickOptionsState, 'right');
        renderQuickOptions();
        return true;
      case 'Enter': {
        // Enter는 두 자리에서 겹친다 — quick options row 확정(core-quick-
        // options.ts)과 gameplay 진입(editor-editing.md §5 키 표). 패널이
        // song-select처럼 모달 오버레이가 아니라 상시 embedded라(scene.md
        // §10) 포커스로 못 가른다 — "확정할 미확정 draft가 있을 때만 Enter를
        // 여기서 삼킨다"로 절충했다(결정 필요 항목으로 별도 보고). draft가
        // committed와 같으면(=조정한 게 없으면) false를 돌려줘 host의 Enter
        // (gameplay 진입)로 넘어간다.
        const field = QUICK_OPTION_FIELDS[quickOptionsState.rowIndex]!;
        if (quickOptionsState.draft === quickOptionsState.committed[field]) return false;
        commitQuickOptionsRow();
        currentSettings = applyQuickOptions(currentSettings, quickOptionsState);
        api.onQuickOptionsChange(currentSettings);
        renderQuickOptions();
        return true;
      }
      default:
        return false;
    }
  }

  // ── idle static preview ───────────────────────────────────────────
  function renderIdle(): void {
    scrollbar.update({ minMs: 0, maxMs: seekTotalMs() });
    if (ctx2d === null) return;
    const rect = computePlayfieldRect(canvas.width, canvas.height);
    if (rect.gw < 1 || rect.gh < 1) return;
    const jY = judgeLineY(rect, currentSettings.judgeLinePos);
    const geometry = buildFieldGeometry(chart);
    drawPlayfield(
      ctx2d,
      canvas.width,
      canvas.height,
      rect,
      jY,
      geometry,
      timeline,
      chart.notes,
      view.scrollMs,
      currentSettings.scrollSpeed,
      currentSettings.mirror,
      currentSettings.noteThickness,
      null,
    );
  }

  // ── 즉시 재생(Space, idle 전용, leadInMs=0) ──────────────────────────
  let session: GameSession | null = null;
  let stopFrameLoop: (() => void) | null = null;
  let stopKeyInput: (() => void) | null = null;
  let hitSoundBuffer: AudioBuffer | null = null;
  let cachedMusicBlob: Blob | null = null;
  let cachedMusicBuffer: AudioBuffer | null = null;
  let startToken = 0;

  function teardownSession(): void {
    stopFrameLoop?.();
    stopFrameLoop = null;
    stopKeyInput?.();
    stopKeyInput = null;
    api.audio.stop();
    session = null;
  }

  function drawSession(): void {
    if (session === null || ctx2d === null) return;
    const rect = computePlayfieldRect(canvas.width, canvas.height);
    if (rect.gw < 1 || rect.gh < 1) return;
    const jY = judgeLineY(rect, currentSettings.judgeLinePos);
    const geometry = buildFieldGeometry(chart);
    const curMs = session.ctx.sharedMs;

    drawPlayfield(
      ctx2d,
      canvas.width,
      canvas.height,
      rect,
      jY,
      geometry,
      timeline,
      chart.notes,
      curMs,
      currentSettings.scrollSpeed,
      currentSettings.mirror,
      currentSettings.noteThickness,
      null,
    );
    const heldLanes = new Set([...session.judgeState.keysHeld].map(laneOf));
    drawKeyBeams(ctx2d, rect, jY, geometry, timeline, curMs, currentSettings.mirror, heldLanes);
    if (currentSettings.showCombo) drawCombo(ctx2d, rect, jY, session.judgeState.combo);
    drawCounterPercent(
      ctx2d,
      rect,
      jY,
      session.gaugeState.counts,
      deriveAccuracy(session.gaugeState.counts, session.context.notes.totalUnits),
    );
  }

  function startInstantPlayback(): void {
    if (session !== null) return;
    const token = ++startToken;
    void loadMusicBuffer().then((musicBuffer) => {
      if (token !== startToken || session !== null) return; // Esc로 취소됐거나 이미 다른 세션이 떴다.
      startInstantPlaybackWithBuffer(musicBuffer);
    });
  }

  async function loadMusicBuffer(): Promise<AudioBuffer | null> {
    const blob = api.session.musicBlob;
    if (blob === null) return null;
    if (blob === cachedMusicBlob && cachedMusicBuffer !== null) return cachedMusicBuffer;
    try {
      const buffer = await api.audio.decode(await blob.arrayBuffer());
      cachedMusicBlob = blob;
      cachedMusicBuffer = buffer;
      return buffer;
    } catch {
      return null; // 무음으로 진행 — scene-gameplay.ts와 같은 관례.
    }
  }

  function startInstantPlaybackWithBuffer(musicBuffer: AudioBuffer | null): void {
    const songEnd = songEndOf(timeline, chart, null);
    const startChartMs = view.scrollMs;

    const ctx: CTX = {
      sharedMs: startChartMs,
      contentEndMs: songEnd.contentEndMs,
      hitVol: currentSettings.volMaster * currentSettings.volEffect,
      pvSpd: currentSettings.scrollSpeed,
      nThk: currentSettings.noteThickness,
      redrawIdle(): void {
        drawSession();
      },
    };

    const audioCtx = api.audio.getContext();
    if (hitSoundBuffer === null) hitSoundBuffer = createHitBuffer(audioCtx);

    session = createGameSession({
      ctx,
      chart,
      timeline,
      keyBindings: currentSettings.keyBindings,
      mirror: currentSettings.mirror,
      visualOffset: currentSettings.visualOffset,
      // editor-origin 즉시재생은 이 파일이 records를 아예 안 부르므로
      // autoplay/staticShape 값 자체는 no-record 판정에 영향이 없다 — quick
      // options 값을 그대로 반영해 미리보기만 정확하면 된다.
      autoplay: currentSettings.autoplay,
      gaugeMode: currentSettings.gaugeMode,
      startNowMs: performance.now(),
      playbackRate: 1,
      hitSound: { ctx: audioCtx, buffer: hitSoundBuffer },
      startChartMs,
      leadInMs: 0, // test scene 즉시재생 = lead-in 없음(editor-graph.md §5).
      engineHooks: {
        onAudioStart(fromMs): void {
          api.audio.stop();
          if (musicBuffer !== null) {
            api.audio.setVolume(currentSettings.volMaster * currentSettings.volMusic);
            api.audio.play(musicBuffer, fromMs);
          }
        },
        onSongEnd(): void {
          stopInstantPlayback();
        },
      },
    });

    const currentSession = session;
    const laneCodes = new Set(LANE_KEY_IDS.map((id) => currentSettings.keyBindings[id]));
    stopKeyInput = bindKeyInput(
      domKeyboardHost(),
      {
        onKeyDown: currentSession.input.onKeyDown,
        onKeyUp: currentSession.input.onKeyUp,
        onFocusLost(): void {},
        onVisibilityHidden(): void {},
      },
      (code) => laneCodes.has(code),
    );

    stopFrameLoop = startFrameLoop(window, currentSettings.frameCap, (nowMs) => {
      const activeSession = session;
      if (activeSession === null) return;
      activeSession.advance(nowMs);
      if (activeSession.result !== null) {
        stopInstantPlayback();
        return;
      }
      drawSession();
    });
  }

  function stopInstantPlayback(): void {
    startToken++; // 아직 decode 중이던 시작 요청을 취소한다.
    if (session === null) return;
    teardownSession();
    renderIdle();
  }

  renderQuickOptions();
  renderIdle();

  return {
    onKeyDown(event: KeyboardEvent): boolean {
      if (session !== null) {
        // 세션 중엔 Space가 key3 lane 입력이다 — 여기서 가로채지 않는다.
        // 정지는 Esc만(editor-editing.md §5).
        if (event.key === 'Escape') {
          event.preventDefault();
          stopInstantPlayback();
          return true;
        }
        return false;
      }
      if (onQuickOptionsKeyDown(event)) {
        event.preventDefault();
        return true;
      }
      if (event.key === ' ') {
        event.preventDefault();
        startInstantPlayback();
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        api.onEnterGameplay(view.scrollMs);
        return true;
      }
      return false;
    },
    update(next: Chart): void {
      chart = next;
      timeline = buildTimeline(next);
      if (session === null) renderIdle();
    },
    destroy(): void {
      teardownSession();
      scrollbar.destroy();
      wrap.remove();
    },
  };
}
