/**
 * settings 4 scene — 단일 출처 `scene/ui-design.md` §2.6, scene 그래프
 * 규칙은 [[scene]] §3(`play ↔ visual ↔ sound ↔ option` 평면 4 scene).
 *
 * **하나의 DOM host, 네 개의 scene id.** 네 category(`settings-play`/
 * `-visual`/`-sound`/`-option`)는 nav 바·필드 위젯 어휘를 전부 공유하므로
 * `mountSettingsScene()`을 한 번만 호출해 만든 host 하나가 category만
 * 바꿔가며 재사용된다 — `app-main.ts`가 네 `Scene.mount()` 중 처음
 * 불리는 것에서만 실제로 `mountSettingsScene`을 호출하고 나머지는
 * `show(category)`만 부르는 방식으로 lazy-mount-once 계약을 지킨다.
 *
 * **Tab/Shift+Tab 순환**은 §2.6.2가 정한 대로 `PLAY → VISUAL → SOUND →
 * OPTION → PLAY` 4개 전부를 순환한다 — 이 파일은 다음 category를
 * 계산해 `handlers.onCategoryChange`만 부르고, 실제 scene 전환
 * (`goScene`)은 host(`app-main.ts`) 몫이다(scene 레이어는 scene-manager를
 * 직접 조작하지 않는다, `scene-song-select.ts`와 같은 경계).
 *
 * **필드 위젯은 네이티브 DOM 컨트롤을 그대로 쓴다** — `<input type=range>`
 * (slider)·`<input type=number>`(number)·checkbox 스타일 버튼(toggle)·
 * 세그먼트 버튼 그룹(select)·capture 버튼(key-rebind). 이러면 "volume
 * slider interaction unit"(M4-6 前 게이트)이 사실상 `<input type=range>`의
 * `step` 속성 하나로 해소된다 — 클릭 점프·드래그·화살표 step을 브라우저가
 * 공짜로 준다. `step` 값 자체는 스펙에 없어 이 세션이 골랐다(결정 필요
 * 항목으로 보고): `scrollSpeed`는 기존 `SCROLL_SPEED_STEP`(0.1)을 그대로
 * 쓰고, `volMaster`/`volMusic`/`volEffect`/`laneOpacity`는 0.05(20단계),
 * `sudden`/`jacketBrightness`는 1(정수 퍼센트), `judgeLinePos`는 0.01.
 * `audioOffset`/`visualOffset`/`noteThickness`(number 필드)도 같은 이유로
 * step 1을 썼다. 숫자 입력은 커밋 전 `SETTING_CHECKS`로 검증한다 — 범위를
 * 이 파일에서 다시 정의하지 않는다.
 *
 * **key rebinding 캡처 흐름**(M4-6 前 게이트 나머지 절반)도 이 세션이
 * 정했다: idle 버튼 클릭 → capturing(다음 keydown을 가로챈다) →
 * 그 즉시 커밋(별도 확인 단계 없음, `CLAUDE.md`의 "가장 단순한 구현"
 * 원칙) — `Esc`는 캡처를 취소(원래 값 유지)한다. **충돌은 커밋을
 * 거부한다**(임시로 conflict 상태만 보여주고 capturing으로 되돌아간다) —
 * `core-settings.ts`의 `conflictingLaneKey`가 새 값이 다른 lane key와
 * 겹치는지 검사한다. 이건 취향이 아니라 기술적 필요다:
 * `game-judge-input.ts`의 `codeToKey`가 물리 key→lane key 1:1 map이라
 * 중복을 그대로 커밋하면 한쪽 lane이 조용히 입력을 잃는다.
 */
import {
  DEFAULT_SETTINGS,
  FRAME_CAPS,
  JUDGE_LINE_DEFAULT,
  NOTE_SKINS,
  SETTING_CHECKS,
  conflictingLaneKey,
  type FrameCap,
  type LaneKeyId,
  type NoteSkin,
  type Settings,
} from '../core/core-settings.js';
import type { GaugeMode } from '../core/core-gauge.js';
import { SCROLL_SPEED_MAX, SCROLL_SPEED_MIN, SCROLL_SPEED_STEP } from '../core/core-constants.js';
import { translate } from '../core/core-i18n.js';
import './scene-settings.css';

export const SETTINGS_CATEGORIES = ['play', 'visual', 'sound', 'option'] as const;
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

export interface SettingsHandlers {
  /** 필드 하나가 커밋될 때마다(즉시, 확인 단계 없음) 전체 settings와 함께 불린다. */
  readonly onChange: (settings: Settings) => void;
  /** nav 클릭 또는 Tab/Shift+Tab 순환으로 category가 바뀔 때 — 실제
   *  scene 전환은 호출측(`goScene`)이 한다. */
  readonly onCategoryChange: (category: SettingsCategory) => void;
  /** Backspace/Esc — mode-select로 복귀(다른 mode-select 자식 scene과
   *  같은 통일 Back 키, [[scene]] §9 D-2026-052 관례의 확장 — settings
   *  전용 Back 키가 스펙에 별도 명시돼 있지는 않다). */
  readonly onBack: () => void;
}

export interface SettingsSceneHandle {
  /** 저장값이 바뀌었을 수 있을 때(재진입 등) 필드 표시를 새로 고친다. */
  update(settings: Settings): void;
  show(category: SettingsCategory): void;
  hide(): void;
}

const CATEGORY_LABEL: Record<SettingsCategory, string> = {
  play: 'PLAY',
  visual: 'VISUAL',
  sound: 'SOUND',
  option: 'OPTION',
};

const GAUGE_LABEL: Record<GaugeMode, string> = {
  normal: 'NORMAL',
  hard: 'HARD',
  fc: 'FC',
  ap: 'AP',
  as: 'AS',
  cascade: 'CASCADE',
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function mountSettingsScene(
  target: HTMLElement,
  handlers: SettingsHandlers,
): SettingsSceneHandle {
  const root = el('div', 'settings-scene');
  root.hidden = true;

  const nav = el('div', 'settings-nav');
  const body = el('div', 'settings-body');
  root.append(nav, body);
  target.append(root);

  // `update()`가 `show()`보다 먼저 불려야 한다(app-main.ts의 계약) — 여기
  // 자리표시자는 그 계약이 지켜지는 한 실제로 렌더되지 않는다.
  let settings: Settings = DEFAULT_SETTINGS;
  let category: SettingsCategory = 'play';
  let capturing: { readonly key: LaneKeyId; readonly conflict: boolean } | null = null;

  function commit(next: Settings): void {
    settings = next;
    handlers.onChange(next);
    render();
  }

  function renderNav(): void {
    nav.replaceChildren();
    for (const cat of SETTINGS_CATEGORIES) {
      const pill = el('button', 'settings-nav-pill');
      pill.type = 'button';
      pill.textContent = CATEGORY_LABEL[cat];
      pill.classList.toggle('active', cat === category);
      pill.addEventListener('click', () => handlers.onCategoryChange(cat));
      nav.append(pill);
    }
  }

  // ── 필드 위젯 ──────────────────────────────────────────────

  function fieldRow(label: string): { row: HTMLElement; control: HTMLElement } {
    const row = el('div', 'field-row');
    const labelEl = el('span', 'field-label');
    labelEl.textContent = label;
    const control = el('div', 'field-control');
    row.append(labelEl, control);
    return { row, control };
  }

  function toggleField(
    container: HTMLElement,
    label: string,
    value: boolean,
    onChange: (next: boolean) => void,
  ): void {
    const { row, control } = fieldRow(label);
    const btn = el('button', `toggle-switch${value ? ' on' : ''}`);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(value));
    btn.addEventListener('click', () => onChange(!value));
    control.append(btn);
    container.append(row);
  }

  function sliderField(
    container: HTMLElement,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (next: number) => void,
    format: (v: number) => string = (v) => v.toFixed(2),
  ): void {
    const { row, control } = fieldRow(label);
    const input = el('input', 'slider-input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    const valueEl = el('span', 'slider-value');
    valueEl.textContent = format(value);
    input.addEventListener('input', () => {
      const next = Number(input.value);
      valueEl.textContent = format(next);
      onChange(next);
    });
    control.append(input, valueEl);
    container.append(row);
  }

  function selectField<T extends string>(
    container: HTMLElement,
    label: string,
    options: readonly T[],
    value: T,
    onChange: (next: T) => void,
  ): void {
    const { row, control } = fieldRow(label);
    const group = el('div', 'segment-group');
    for (const opt of options) {
      const btn = el('button', `segment-btn${opt === value ? ' active' : ''}`);
      btn.type = 'button';
      btn.textContent = opt;
      btn.addEventListener('click', () => onChange(opt));
      group.append(btn);
    }
    control.append(group);
    container.append(row);
  }

  function numberField(
    container: HTMLElement,
    label: string,
    value: number,
    step: number,
    unit: string,
    check: (v: unknown) => boolean,
    onChange: (next: number) => void,
  ): void {
    const { row, control } = fieldRow(label);
    const input = el('input', 'number-input');
    input.type = 'number';
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('change', () => {
      const next = Number(input.value);
      if (Number.isFinite(next) && check(next)) {
        onChange(next);
      } else {
        input.value = String(value); // 검증 실패 — 원래 값으로 되돌린다.
      }
    });
    const unitEl = el('span', 'field-unit');
    unitEl.textContent = unit;
    control.append(input, unitEl);
    container.append(row);
  }

  function keyRebindField(container: HTMLElement, id: LaneKeyId): void {
    const btn = el('button', 'key-rebind-btn');
    btn.type = 'button';
    const isCapturing = capturing?.key === id;
    if (isCapturing) {
      btn.classList.add(capturing!.conflict ? 'conflict' : 'capturing');
      btn.textContent = capturing!.conflict ? 'Conflict' : 'Press a key';
    } else {
      btn.textContent = settings.keyBindings[id];
    }
    btn.addEventListener('click', () => {
      capturing = { key: id, conflict: false };
      render();
    });
    container.append(btn);
  }

  // ── category별 본문 ────────────────────────────────────────

  function renderPlay(): void {
    const group1 = el('div', 'field-group');
    sliderField(
      group1,
      'Scroll Speed',
      settings.scrollSpeed,
      SCROLL_SPEED_MIN,
      SCROLL_SPEED_MAX,
      SCROLL_SPEED_STEP,
      (v) => commit({ ...settings, scrollSpeed: v }),
      (v) => v.toFixed(1),
    );

    const group2 = el('div', 'field-group');
    numberField(
      group2,
      'Audio Offset',
      settings.audioOffset,
      1,
      'ms',
      SETTING_CHECKS.audioOffset,
      (v) => commit({ ...settings, audioOffset: v }),
    );
    numberField(
      group2,
      'Visual Offset',
      settings.visualOffset,
      1,
      'ms',
      SETTING_CHECKS.visualOffset,
      (v) => commit({ ...settings, visualOffset: v }),
    );

    const group3 = el('div', 'field-group key-rebind-group');
    // lane 슬롯 배치(§2.6.4) — lane1/lane2(key2+key4)/lane3(key3+key5)/lane4.
    const laneSlots: readonly (readonly LaneKeyId[])[] = [
      ['key1'],
      ['key2', 'key4'],
      ['key3', 'key5'],
      ['key6'],
    ];
    for (const slot of laneSlots) {
      const slotEl = el('div', 'lane-slot');
      for (const id of slot) keyRebindField(slotEl, id);
      group3.append(slotEl);
    }

    body.append(group1, group2, group3);
  }

  function renderVisual(): void {
    const group1 = el('div', 'field-group');
    selectField(group1, 'Note Skin', NOTE_SKINS, settings.noteSkin, (v: NoteSkin) =>
      commit({ ...settings, noteSkin: v }),
    );
    selectField(group1, 'Frame Cap', FRAME_CAPS.map(String), String(settings.frameCap), (v) =>
      commit({ ...settings, frameCap: Number(v) as FrameCap }),
    );

    const group2 = el('div', 'field-group');
    numberField(
      group2,
      'Note Thickness',
      settings.noteThickness,
      1,
      'px',
      SETTING_CHECKS.noteThickness,
      (v) => commit({ ...settings, noteThickness: v }),
    );

    const group3 = el('div', 'field-group');
    sliderField(group3, 'Lane Opacity', settings.laneOpacity, 0, 1, 0.05, (v) =>
      commit({ ...settings, laneOpacity: v }),
    );
    // judgeLinePos: raise-only — 트랙 하한이 고정 0이 아니라 "지금 저장값"이다(§2.6.5).
    sliderField(
      group3,
      'Judge Line',
      settings.judgeLinePos,
      settings.judgeLinePos,
      JUDGE_LINE_DEFAULT,
      0.01,
      (v) => commit({ ...settings, judgeLinePos: v }),
    );
    sliderField(
      group3,
      'Sudden',
      settings.sudden,
      0,
      90,
      1,
      (v) => commit({ ...settings, sudden: v }),
      (v) => `${v}%`,
    );
    sliderField(
      group3,
      'Jacket Brightness',
      settings.jacketBrightness,
      0,
      100,
      1,
      (v) => commit({ ...settings, jacketBrightness: v }),
      (v) => `${v}%`,
    );

    const group4 = el('div', 'field-group');
    toggleField(group4, 'Hit Effect', settings.hitEffect, (v) =>
      commit({ ...settings, hitEffect: v }),
    );
    toggleField(group4, 'Show Combo', settings.showCombo, (v) =>
      commit({ ...settings, showCombo: v }),
    );
    toggleField(group4, 'Show Judgment', settings.showJudgment, (v) =>
      commit({ ...settings, showJudgment: v }),
    );
    toggleField(group4, 'Show Fast/Slow', settings.showFastSlow, (v) =>
      commit({ ...settings, showFastSlow: v }),
    );

    body.append(group1, group2, group3, group4);
  }

  function renderSound(): void {
    const group = el('div', 'field-group');
    sliderField(group, 'Master', settings.volMaster, 0, 1, 0.05, (v) =>
      commit({ ...settings, volMaster: v }),
    );
    sliderField(group, 'Music', settings.volMusic, 0, 1, 0.05, (v) =>
      commit({ ...settings, volMusic: v }),
    );
    sliderField(group, 'Effect', settings.volEffect, 0, 1, 0.05, (v) =>
      commit({ ...settings, volEffect: v }),
    );
    body.append(group);
  }

  function renderOption(): void {
    const gaugeGroup = el('div', 'gauge-strip');
    for (const mode of ['normal', 'hard', 'fc', 'ap', 'as'] as const) {
      const btn = el(
        'button',
        `gauge-peer gauge-${mode}${settings.gaugeMode === mode ? ' active' : ''}`,
      );
      btn.type = 'button';
      btn.textContent = GAUGE_LABEL[mode];
      btn.addEventListener('click', () => commit({ ...settings, gaugeMode: mode }));
      gaugeGroup.append(btn);
    }
    const divider = el('span', 'gauge-divider');
    gaugeGroup.append(divider);
    const cascadeBtn = el(
      'button',
      `gauge-cascade${settings.gaugeMode === 'cascade' ? ' active' : ''}`,
    );
    cascadeBtn.type = 'button';
    cascadeBtn.textContent = GAUGE_LABEL.cascade;
    cascadeBtn.addEventListener('click', () => commit({ ...settings, gaugeMode: 'cascade' }));
    gaugeGroup.append(cascadeBtn);

    const optionGroup = el('div', 'field-group');
    toggleField(optionGroup, 'Mirror', settings.mirror, (v) => commit({ ...settings, mirror: v }));
    toggleField(optionGroup, 'Autoplay', settings.autoplay, (v) =>
      commit({ ...settings, autoplay: v }),
    );
    toggleField(optionGroup, 'Static Shape', settings.staticShape, (v) =>
      commit({ ...settings, staticShape: v }),
    );
    const notice = el('div', 'no-record-notice');
    notice.textContent = translate('settings.option.noRecordNotice', 'en').text;
    optionGroup.append(notice);

    body.append(gaugeGroup, optionGroup);
  }

  function render(): void {
    renderNav();
    body.replaceChildren();
    switch (category) {
      case 'play':
        renderPlay();
        return;
      case 'visual':
        renderVisual();
        return;
      case 'sound':
        renderSound();
        return;
      case 'option':
        renderOption();
        return;
    }
  }

  function nextCategory(direction: 1 | -1): SettingsCategory {
    const i = SETTINGS_CATEGORIES.indexOf(category);
    const next = (i + direction + SETTINGS_CATEGORIES.length) % SETTINGS_CATEGORIES.length;
    return SETTINGS_CATEGORIES[next]!;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (capturing !== null) {
      if (event.key === 'Escape') {
        event.preventDefault();
        capturing = null;
        render();
        return;
      }
      event.preventDefault();
      const target = capturing.key;
      const conflict = conflictingLaneKey(settings.keyBindings, target, event.code);
      if (conflict !== null) {
        capturing = { key: target, conflict: true };
        render();
        return;
      }
      capturing = null;
      commit({ ...settings, keyBindings: { ...settings.keyBindings, [target]: event.code } });
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      handlers.onCategoryChange(nextCategory(event.shiftKey ? -1 : 1));
      return;
    }
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      handlers.onBack();
    }
  }

  return {
    update(next: Settings): void {
      settings = next;
      render();
    },
    show(nextCategory: SettingsCategory): void {
      category = nextCategory;
      capturing = null;
      root.hidden = false;
      render();
      document.addEventListener('keydown', onKeyDown);
    },
    hide(): void {
      root.hidden = true;
      capturing = null;
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
