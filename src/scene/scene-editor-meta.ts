/**
 * meta 씬 — chart identity·metadata·tempo·timeSignature·asset 편집 폼,
 * M5-5. 단일 출처 `editor/editor-graph.md` §4, 필드 스키마는
 * `core/data-model.md` §2~§4, command 목록은 `editor/editor-commands.md`
 * §6(tempo/timeSignature)·§7(그 외는 command가 아니다).
 *
 * `scene-editor-workspace.ts`의 `EditorCategoryController` delegation
 * 자리에 꽂힌다 — `scene-editor-notes.ts`(M5-3)/`scene-editor-shapes.ts`
 * (M5-4)와 같은 패턴이지만, 캔버스가 아니라 **폼**이라 pointer/wheel
 * 배선이 없다. `onKeyDown`은 항상 `false`를 돌려준다 — `editor-editing.md`
 * §1~§7 어디에도 meta 탭 전용 단축키가 없다(전부 notes/shapes 탭
 * 키표뿐이고, 공통 모디파이어(§5)는 여기서도 workspace의 기본 처리
 * (Tab/Backspace/Escape)로 충분하다).
 *
 * **두 가지 편집 경로가 섞여 있다**(`editor-commands.md` §6·§7):
 * - **identity·metadata·asset**(chartId/difficulty/subtitle/level/
 *   chartBy, metadata 6필드, musicFile/jacketFile) — **command가
 *   아니다**. `api.session.updateChart()`를 직접 부르고 undo 불가,
 *   history scope도 없다. 이 파일이 로컬 `chart`도 즉시 갱신하고,
 *   `api.notifyChanged()`로 workspace 전체(다른 탭의 `EditorViewState`
 *   렌더 등)를 새로고침한다 — 이 경로는 `editorCommandHistory.onDispatch`
 *   구독을 거치지 않으므로 그 자동 새로고침이 안 걸린다.
 * - **tempo·timeSignature** — command다(§6 Add/Delete/EditTempo,
 *   Add/Delete/EditTimeSignature, `edit-meta-commands.ts`, scope `m`).
 *   `api.dispatch()`로 넣으면 기존 `onDispatch` 구독이 알아서
 *   `update()`를 불러 준다 — `notifyChanged()`를 따로 안 부른다.
 *
 * **timing cache 재구성**(M5-5 Exit 기준)은 새 캐시 객체가 없다
 * (`core-timing.ts`가 이미 "캐시도 무효화도 없다, 매번 chart에서 다시
 * 계산" 설계, `edit-command.ts` 헤더가 이미 같은 이유를 적어 뒀다) —
 * tempo/timeSignature 편집이 command→`onDispatch`→
 * `editorWorkspaceHandle.update(chart)`→notes/shapes controller의
 * `update(chart)`(내부에서 `buildTimeline(next)` 재호출)로 이어지는
 * 기존 경로가 그대로 "즉시 재구성"을 만족한다 — 이 파일이 새로 만들
 * 것이 없다.
 *
 * **asset 교체**는 `env-file.ts`의 `FileOpenHost`(텍스트 전용, chart
 * JSON용)를 재사용하지 않는다 — music/jacket은 바이너리라 다른 표면이
 * 필요하다. 대신 표준 `<input type="file" accept="audio/*|image/*">`를
 * 직접 만들어 클릭을 위임한다(원본 파일 선택 자체가 이미 브라우저
 * 네이티브 다이얼로그이고, File System Access API 전용 표면을 쓸 이유가
 * 없다 — `showOpenFilePicker`류는 저장까지 있는 `Ctrl+S`/`Ctrl+O` 흐름
 * 전용으로 남겨 둔다). 선택 즉시 `session.updateMusicBlob/JacketBlob`과
 * `musicFile/jacketFile` 필드명 갱신을 한 번에 한다
 * (`_meta/persistence.md` §10 "다시 선택한 파일명이 다르면 해당 필드를
 * 새 이름으로 갱신").
 *
 * **chartId 자동 규칙**(`editor-graph.md` §4)을 그대로 구현했다: `init`
 * → 0(잠금), subtitle 없는 고정 난이도(Trace/Drift/Surge/Flux/Phase) →
 * 1~5(잠금), 그 외("추가 chart") → 5 이상 직접 입력(미만은 거부). 스펙
 * 원문은 "1/2/3/4"만 예로 들고 Phase(5번 슬롯)를 언급하지 않는데,
 * `core/data-model.md` §4("`chartId 0`은 init, `1~5`는 Trace/Drift/
 * Surge/Flux/Phase 고정 슬롯")가 5칸 전부를 못박아 뒀으므로 그 표를
 * 그대로 완성했다 — 두 문서가 실제로 다른 규칙을 말하는 게 아니라
 * editor-graph.md 예시가 5번째 칸을 생략한 것으로 판단했다.
 *
 * **이번 라운드가 범위 밖으로 둔 것(결정 필요 항목)**:
 * - **"새 난이도" 파생**(같은 songId의 새 독립 chart 세션 시작,
 *   `editor-graph.md` §4 "새 chart 파생" · `persistence.md` §8)은 M5-5
 *   Exit 기준("값 편집이 즉시 timing cache를 재구성한다. music·jacket
 *   교체가 반영된다")에 없다 — session 교체·dirty confirm 흐름까지
 *   엮인 별도 기능이라 후속 라운드로 미룬다.
 * - **`measureLabelOffset`**(editor-graph.md §4 "editor settings")은
 *   chart 데이터가 아니라 player 전역 설정이다(`core/data-model.md` §2
 *   "measureLabelOffset은 에디터 설정이며 chart 데이터가 아니다",
 *   `_meta/settings.md`). `game-settings.ts`의 read/writeSettings 저장소를
 *   따로 물려야 하고, 지금은 그 값을 실제로 읽는 렌더 소비자(notes/
 *   shapes의 마디 라벨)도 아직 없어 이번 라운드에 넣지 않았다.
 * - tempo/timeSignature 목록에 정렬·중복 tick 경고 UI는 없다 — 저장
 *   순서가 그대로고(§0 "핵심 pattern"이 조회 시점에 정렬한다) 도메인
 *   검증(빈 배열·`timeSignatures[0].startTick≠0` 등)은 `core-validate.ts`
 *   가 이미 보고 전용으로 처리하는 자리라 이 폼이 다시 만들지 않는다.
 *   마지막 한 줄 삭제만 이 폼이 막는다(아래).
 */
import type { Chart, ChartMetadata, Difficulty, Tempo, TimeSignature } from '../core/core-chart.js';
import { DIFFICULTIES } from '../core/core-chart.js';
import { TICKS_PER_BEAT } from '../core/core-constants.js';
import {
  addTempoCommand,
  addTimeSignatureCommand,
  deleteTempoCommand,
  deleteTimeSignatureCommand,
  editTempoCommand,
  editTimeSignatureCommand,
  type MetaSessionLike,
} from '../edit/edit-meta-commands.js';
import type { Command } from '../edit/edit-command.js';
import type { EditorCategoryController } from './scene-editor-workspace.js';
import './scene-editor-meta.css';

/** `session.updateChart` 외에 asset blob 갱신도 필요하다(`WorkspaceSession`
 *  구조 그대로 duck-type — `edit-notes-commands.ts`의 `NotesSessionLike`와
 *  같은 최소 표면 관례). */
export interface EditorMetaSession extends MetaSessionLike {
  updateMusicBlob(blob: Blob | null): void;
  updateJacketBlob(blob: Blob | null): void;
}

export interface EditorMetaApi {
  readonly session: EditorMetaSession;
  dispatch(command: Command): void;
  /** command가 아닌 직접 필드 편집 뒤 workspace 전체를 새로고침한다 —
   *  헤더 docstring 참조. */
  notifyChanged(): void;
}

/** difficulty별 고정 chartId 슬롯(`core/data-model.md` §4). */
const FIXED_SLOT: Partial<Record<Difficulty, number>> = {
  Trace: 1,
  Drift: 2,
  Surge: 3,
  Flux: 4,
  Phase: 5,
};

/** chartId 자동값 — 잠글 수 있으면 그 값을, 아니면 `null`(사용자 입력). */
function autoChartId(difficulty: Difficulty, subtitle: string): number | null {
  if (difficulty === 'init') return 0;
  const slot = FIXED_SLOT[difficulty];
  if (slot !== undefined && subtitle === '') return slot;
  return null;
}

export function mountEditorMetaBody(
  container: HTMLElement,
  initialChart: Chart,
  api: EditorMetaApi,
): EditorCategoryController {
  const wrap = document.createElement('div');
  wrap.className = 'editor-meta-body';
  container.append(wrap);

  let chart = initialChart;

  function dispatchMetaCommand(build: (s: MetaSessionLike) => Command): void {
    api.dispatch(build(api.session));
  }

  /** identity/metadata/asset 직접 필드 편집 — command가 아니다(§7). */
  function updateChartField(next: Chart): void {
    chart = next;
    api.session.updateChart(next);
    api.notifyChanged();
    render();
  }

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className !== undefined) node.className = className;
    return node;
  }

  function labelEl(text: string): HTMLLabelElement {
    const label = el('label');
    label.textContent = text;
    return label;
  }

  function fieldRow(labelText: string, control: HTMLElement): HTMLDivElement {
    const row = el('div', 'editor-meta-field');
    row.append(labelEl(labelText), control);
    return row;
  }

  function textInput(
    value: string,
    onCommit: (v: string) => void,
    readOnly = false,
  ): HTMLInputElement {
    const input = el('input');
    input.type = 'text';
    input.value = value;
    input.readOnly = readOnly;
    if (!readOnly) {
      input.addEventListener('change', () => onCommit(input.value));
    }
    return input;
  }

  function numberInput(
    value: number,
    onCommit: (v: number) => void,
    opts: { min?: number | undefined; readOnly?: boolean } = {},
  ): HTMLInputElement {
    const input = el('input');
    input.type = 'number';
    input.value = String(value);
    if (opts.min !== undefined) input.min = String(opts.min);
    input.readOnly = opts.readOnly ?? false;
    if (!(opts.readOnly ?? false)) {
      input.addEventListener('change', () => {
        const n = Number(input.value);
        if (!Number.isFinite(n)) {
          input.value = String(value);
          return;
        }
        onCommit(n);
      });
    }
    return input;
  }

  // ── identity ─────────────────────────────────────────────

  function renderIdentitySection(): HTMLElement {
    const section = el('div', 'editor-meta-section');
    const title = el('div', 'editor-meta-section-title');
    title.textContent = 'Identity';
    section.append(title);

    section.append(
      fieldRow(
        'songId',
        textInput(chart.songId, () => {}, true),
      ),
    );

    const difficultySelect = el('select');
    for (const d of DIFFICULTIES) {
      const opt = el('option');
      opt.value = d;
      opt.textContent = d;
      if (d === chart.difficulty) opt.selected = true;
      difficultySelect.append(opt);
    }
    difficultySelect.addEventListener('change', () => {
      const difficulty = difficultySelect.value as Difficulty;
      const auto = autoChartId(difficulty, chart.subtitle);
      const chartId = auto ?? Math.max(chart.chartId, 5);
      updateChartField({ ...chart, difficulty, chartId });
    });
    section.append(fieldRow('difficulty', difficultySelect));

    const subtitleInput = textInput(chart.subtitle, (v) => {
      const auto = autoChartId(chart.difficulty, v);
      const chartId = auto ?? Math.max(chart.chartId, 5);
      updateChartField({ ...chart, subtitle: v, chartId });
    });
    section.append(fieldRow('subtitle', subtitleInput));

    const autoId = autoChartId(chart.difficulty, chart.subtitle);
    const chartIdError = el('div', 'editor-meta-error');
    const chartIdInput = numberInput(
      chart.chartId,
      (v) => {
        if (v < 5) {
          chartIdError.textContent = '추가 chart의 chartId는 5 이상이어야 한다.';
          return;
        }
        chartIdError.textContent = '';
        updateChartField({ ...chart, chartId: v });
      },
      { min: autoId !== null ? undefined : 5, readOnly: autoId !== null },
    );
    section.append(fieldRow('chartId', chartIdInput));
    if (autoId === null) section.append(chartIdError);

    section.append(
      fieldRow(
        'level',
        numberInput(chart.level, (v) => updateChartField({ ...chart, level: v }), { min: 1 }),
      ),
    );
    section.append(
      fieldRow(
        'chartBy',
        textInput(chart.chartBy, (v) => updateChartField({ ...chart, chartBy: v })),
      ),
    );

    return section;
  }

  // ── metadata ─────────────────────────────────────────────

  function updateMetadata(patch: Partial<ChartMetadata>): void {
    updateChartField({ ...chart, metadata: { ...chart.metadata, ...patch } });
  }

  function renderMetadataSection(): HTMLElement {
    const section = el('div', 'editor-meta-section');
    const title = el('div', 'editor-meta-section-title');
    title.textContent = 'Metadata';
    section.append(title);

    const m = chart.metadata;
    section.append(
      fieldRow(
        'title',
        textInput(m.title, (v) => updateMetadata({ title: v })),
      ),
    );
    section.append(
      fieldRow(
        'musicBy',
        textInput(m.musicBy, (v) => updateMetadata({ musicBy: v })),
      ),
    );
    section.append(
      fieldRow(
        'jacketBy',
        textInput(m.jacketBy, (v) => updateMetadata({ jacketBy: v })),
      ),
    );
    section.append(
      fieldRow(
        'offset(ms)',
        numberInput(m.offset, (v) => updateMetadata({ offset: v })),
      ),
    );
    section.append(
      fieldRow(
        'category',
        textInput(m.category, (v) => updateMetadata({ category: v })),
      ),
    );
    section.append(
      fieldRow(
        'previewStartMs',
        numberInput(m.previewStartMs, (v) => updateMetadata({ previewStartMs: v }), { min: 0 }),
      ),
    );

    return section;
  }

  // ── tempo / timeSignature ────────────────────────────────

  function renderTempoSection(): HTMLElement {
    const section = el('div', 'editor-meta-section');
    const title = el('div', 'editor-meta-section-title');
    title.textContent = 'Tempo';
    section.append(title);

    const list = el('div', 'editor-meta-row-list');
    chart.tempos.forEach((tempo, index) => {
      const row = el('div', 'editor-meta-row');
      const startTickInput = numberInput(tempo.startTick, (v) => {
        dispatchMetaCommand((s) => editTempoCommand(s, index, { ...tempo, startTick: v }));
      });
      const bpmInput = numberInput(
        tempo.bpm,
        (v) => {
          dispatchMetaCommand((s) => editTempoCommand(s, index, { ...tempo, bpm: v }));
        },
        { min: 1 },
      );
      const del = el('button', 'editor-meta-button');
      del.type = 'button';
      del.textContent = 'Delete';
      del.disabled = chart.tempos.length <= 1;
      del.addEventListener('click', () => {
        if (chart.tempos.length <= 1) return; // 마지막 tempo는 지울 수 없다.
        dispatchMetaCommand((s) => deleteTempoCommand(s, index));
      });
      row.append(labelEl('startTick'), startTickInput, labelEl('bpm'), bpmInput, del);
      list.append(row);
    });
    section.append(list);

    const add = el('button', 'editor-meta-button');
    add.type = 'button';
    add.textContent = 'Add Tempo';
    add.addEventListener('click', () => {
      const lastTick = chart.tempos.reduce((max, t) => Math.max(max, t.startTick), 0);
      const newTempo: Tempo = { startTick: lastTick + TICKS_PER_BEAT, bpm: 120 };
      dispatchMetaCommand((s) => addTempoCommand(s, newTempo));
    });
    section.append(add);

    return section;
  }

  function renderTimeSignatureSection(): HTMLElement {
    const section = el('div', 'editor-meta-section');
    const title = el('div', 'editor-meta-section-title');
    title.textContent = 'TimeSignature';
    section.append(title);

    const list = el('div', 'editor-meta-row-list');
    chart.timeSignatures.forEach((ts, index) => {
      const row = el('div', 'editor-meta-row');
      const startTickInput = numberInput(ts.startTick, (v) => {
        dispatchMetaCommand((s) => editTimeSignatureCommand(s, index, { ...ts, startTick: v }));
      });
      const numInput = numberInput(
        ts.numerator,
        (v) => {
          dispatchMetaCommand((s) => editTimeSignatureCommand(s, index, { ...ts, numerator: v }));
        },
        { min: 1 },
      );
      const denInput = numberInput(
        ts.denominator,
        (v) => {
          dispatchMetaCommand((s) => editTimeSignatureCommand(s, index, { ...ts, denominator: v }));
        },
        { min: 1 },
      );
      const del = el('button', 'editor-meta-button');
      del.type = 'button';
      del.textContent = 'Delete';
      del.disabled = chart.timeSignatures.length <= 1;
      del.addEventListener('click', () => {
        if (chart.timeSignatures.length <= 1) return;
        dispatchMetaCommand((s) => deleteTimeSignatureCommand(s, index));
      });
      row.append(
        labelEl('startTick'),
        startTickInput,
        labelEl('num'),
        numInput,
        labelEl('den'),
        denInput,
        del,
      );
      list.append(row);
    });
    section.append(list);

    const add = el('button', 'editor-meta-button');
    add.type = 'button';
    add.textContent = 'Add TimeSignature';
    add.addEventListener('click', () => {
      const lastTick = chart.timeSignatures.reduce((max, t) => Math.max(max, t.startTick), 0);
      const newTs: TimeSignature = {
        startTick: lastTick + TICKS_PER_BEAT * 4,
        numerator: 4,
        denominator: 4,
      };
      dispatchMetaCommand((s) => addTimeSignatureCommand(s, newTs));
    });
    section.append(add);

    return section;
  }

  // ── asset ────────────────────────────────────────────────

  function pickAsset(accept: string, onPicked: (file: File) => void): void {
    const input = el('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file !== undefined) onPicked(file);
      input.remove();
    });
    document.body.append(input);
    input.click();
  }

  function renderAssetSection(): HTMLElement {
    const section = el('div', 'editor-meta-section');
    const title = el('div', 'editor-meta-section-title');
    title.textContent = 'Asset';
    section.append(title);

    const musicRow = el('div', 'editor-meta-row');
    const musicLabel = el('span');
    musicLabel.textContent = `music: ${chart.musicFile ?? '(없음)'}`;
    const musicBtn = el('button', 'editor-meta-button');
    musicBtn.type = 'button';
    musicBtn.textContent = 'Replace';
    musicBtn.addEventListener('click', () => {
      pickAsset('audio/*', (file) => {
        api.session.updateMusicBlob(file);
        updateChartField({ ...chart, musicFile: file.name });
      });
    });
    musicRow.append(musicLabel, musicBtn);
    section.append(musicRow);

    const jacketRow = el('div', 'editor-meta-row');
    const jacketLabel = el('span');
    jacketLabel.textContent = `jacket: ${chart.jacketFile ?? '(없음)'}`;
    const jacketBtn = el('button', 'editor-meta-button');
    jacketBtn.type = 'button';
    jacketBtn.textContent = 'Replace';
    jacketBtn.addEventListener('click', () => {
      pickAsset('image/*', (file) => {
        api.session.updateJacketBlob(file);
        updateChartField({ ...chart, jacketFile: file.name });
      });
    });
    jacketRow.append(jacketLabel, jacketBtn);
    section.append(jacketRow);

    return section;
  }

  function render(): void {
    wrap.replaceChildren(
      renderIdentitySection(),
      renderMetadataSection(),
      renderTempoSection(),
      renderTimeSignatureSection(),
      renderAssetSection(),
    );
  }

  render();

  return {
    onKeyDown(): boolean {
      return false;
    },
    update(next: Chart): void {
      chart = next;
      render();
    },
    destroy(): void {
      wrap.remove();
    },
  };
}
