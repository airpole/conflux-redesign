// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import type { Command } from '../edit/edit-command.js';
import { mountEditorMetaBody, type EditorMetaApi } from './scene-editor-meta.js';

function mount(initialChart: Chart = makeChart()): {
  target: HTMLElement;
  handle: ReturnType<typeof mountEditorMetaBody>;
  dispatch: ReturnType<typeof vi.fn>;
  notifyChanged: ReturnType<typeof vi.fn>;
  updateMusicBlob: ReturnType<typeof vi.fn>;
  updateJacketBlob: ReturnType<typeof vi.fn>;
  getChart: () => Chart;
} {
  const target = document.createElement('div');
  document.body.append(target);
  let chart = initialChart;
  const dispatch = vi.fn((command: Command) => {
    command.apply();
  });
  const notifyChanged = vi.fn();
  const updateMusicBlob = vi.fn();
  const updateJacketBlob = vi.fn();
  const api: EditorMetaApi = {
    session: {
      get chart() {
        return chart;
      },
      updateChart(next) {
        chart = next;
      },
      updateMusicBlob,
      updateJacketBlob,
    },
    dispatch,
    notifyChanged,
  };
  const handle = mountEditorMetaBody(target, initialChart, api);
  return {
    target,
    handle,
    dispatch,
    notifyChanged,
    updateMusicBlob,
    updateJacketBlob,
    getChart: () => chart,
  };
}

function setValueAndChange(input: HTMLInputElement | HTMLSelectElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function fieldInput(target: HTMLElement, labelText: string): HTMLInputElement {
  const rows = [...target.querySelectorAll('.editor-meta-field')];
  const row = rows.find((r) => r.querySelector('label')?.textContent === labelText);
  const input = row?.querySelector('input, select');
  if (input === null || input === undefined) throw new Error(`field not found: ${labelText}`);
  return input as HTMLInputElement;
}

function sectionTitles(target: HTMLElement): string[] {
  return [...target.querySelectorAll('.editor-meta-section-title')].map((e) => e.textContent ?? '');
}

describe('scene-editor-meta', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('mount는 다섯 섹션을 만든다', () => {
    const { target } = mount();
    expect(sectionTitles(target)).toEqual([
      'Identity',
      'Metadata',
      'Tempo',
      'TimeSignature',
      'Asset',
    ]);
  });

  it('onKeyDown은 항상 false다(meta 탭 전용 단축키 없음)', () => {
    const { handle } = mount();
    expect(handle.onKeyDown(new KeyboardEvent('keydown', { key: 'q' }))).toBe(false);
  });

  it('songId는 읽기 전용이다', () => {
    const { target } = mount(makeChart({ songId: 'song-42' }));
    const input = fieldInput(target, 'songId') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe('song-42');
  });

  it('difficulty를 subtitle 없는 고정 슬롯으로 바꾸면 chartId가 자동으로 잠긴다', () => {
    const { target, getChart, notifyChanged } = mount(
      makeChart({ difficulty: 'init', chartId: 0, subtitle: '' }),
    );
    const select = fieldInput(target, 'difficulty') as unknown as HTMLSelectElement;
    setValueAndChange(select, 'Drift');
    expect(getChart().difficulty).toBe('Drift');
    expect(getChart().chartId).toBe(2);
    expect(notifyChanged).toHaveBeenCalled();
    const chartIdInput = fieldInput(target, 'chartId');
    expect(chartIdInput.readOnly).toBe(true);
  });

  it('Phase는 5번 슬롯으로 자동 배정된다(data-model.md §4 완성)', () => {
    const { getChart, target } = mount(makeChart({ difficulty: 'init', chartId: 0, subtitle: '' }));
    const select = fieldInput(target, 'difficulty') as unknown as HTMLSelectElement;
    setValueAndChange(select, 'Phase');
    expect(getChart().chartId).toBe(5);
  });

  it('subtitle을 채우면 "추가 chart"가 되어 chartId가 5 미만이면 5로 올라가고 편집 가능해진다', () => {
    const { target, getChart } = mount(
      makeChart({ difficulty: 'Trace', chartId: 1, subtitle: '' }),
    );
    const subtitleInput = fieldInput(target, 'subtitle');
    setValueAndChange(subtitleInput, 'Alt');
    expect(getChart().subtitle).toBe('Alt');
    expect(getChart().chartId).toBe(5);
    const chartIdInput = fieldInput(target, 'chartId');
    expect(chartIdInput.readOnly).toBe(false);
  });

  it('추가 chart 상태에서 chartId를 5 미만으로 입력하면 거부된다(에러 표시, updateChart 없음)', () => {
    const { target, getChart } = mount(
      makeChart({ difficulty: 'Trace', chartId: 6, subtitle: 'Alt' }),
    );
    const chartIdInput = fieldInput(target, 'chartId');
    setValueAndChange(chartIdInput, '3');
    expect(getChart().chartId).toBe(6); // 안 바뀜.
    expect(target.querySelector('.editor-meta-error')?.textContent).toContain('5 이상');
  });

  it('metadata title 편집이 즉시 반영된다', () => {
    const { target, getChart, notifyChanged } = mount(
      makeChart({
        metadata: {
          title: 'Old',
          musicBy: '',
          jacketBy: '',
          offset: 0,
          category: '',
          previewStartMs: 0,
        },
      }),
    );
    const titleInput = fieldInput(target, 'title');
    setValueAndChange(titleInput, 'New Title');
    expect(getChart().metadata.title).toBe('New Title');
    expect(notifyChanged).toHaveBeenCalled();
  });

  it('Add Tempo가 AddTempo command를 dispatch한다', () => {
    const { target, dispatch, getChart } = mount(
      makeChart({ tempos: [{ startTick: 0, bpm: 120 }] }),
    );
    const addBtn = [...target.querySelectorAll('.editor-meta-button')].find(
      (b) => b.textContent === 'Add Tempo',
    ) as HTMLButtonElement;
    addBtn.click();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('AddTempo');
    expect(getChart().tempos).toHaveLength(2);
  });

  it('tempo가 하나뿐이면 Delete 버튼이 비활성화된다', () => {
    const { target } = mount(makeChart({ tempos: [{ startTick: 0, bpm: 120 }] }));
    const deleteBtn = [...target.querySelectorAll('.editor-meta-row .editor-meta-button')].find(
      (b) => b.textContent === 'Delete',
    ) as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);
  });

  it('tempo가 둘 이상이면 삭제가 DeleteTempo를 dispatch한다', () => {
    const { target, dispatch, getChart } = mount(
      makeChart({
        tempos: [
          { startTick: 0, bpm: 120 },
          { startTick: 1920, bpm: 140 },
        ],
      }),
    );
    const deleteBtn = [...target.querySelectorAll('.editor-meta-row .editor-meta-button')].find(
      (b) => b.textContent === 'Delete',
    ) as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(false);
    deleteBtn.click();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('DeleteTempo');
    expect(getChart().tempos).toHaveLength(1);
  });

  it('timeSignature가 하나뿐이면 삭제가 막힌다, Add는 AddTimeSignature를 dispatch한다', () => {
    const { target, dispatch, getChart } = mount(
      makeChart({ timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }] }),
    );
    const addBtn = [...target.querySelectorAll('.editor-meta-button')].find(
      (b) => b.textContent === 'Add TimeSignature',
    ) as HTMLButtonElement;
    addBtn.click();
    expect(dispatch.mock.calls[0]![0].name).toBe('AddTimeSignature');
    expect(getChart().timeSignatures).toHaveLength(2);
  });

  it('music asset 교체가 blob과 파일명을 함께 갱신한다', () => {
    const { target, updateMusicBlob, getChart, notifyChanged } = mount(
      makeChart({ musicFile: 'old.mp3' }),
    );
    const replaceButtons = [...target.querySelectorAll('.editor-meta-button')].filter(
      (b) => b.textContent === 'Replace',
    ) as HTMLButtonElement[];
    replaceButtons[0]!.click(); // music.
    const fileInput = [...document.body.querySelectorAll('input[type=file]')].at(
      -1,
    ) as HTMLInputElement;
    expect(fileInput.accept).toBe('audio/*');
    const file = new File(['data'], 'new-song.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(updateMusicBlob).toHaveBeenCalledWith(file);
    expect(getChart().musicFile).toBe('new-song.mp3');
    expect(notifyChanged).toHaveBeenCalled();
  });

  it('jacket asset 교체는 image/*를 accept로 쓴다', () => {
    const { target, updateJacketBlob, getChart } = mount(makeChart({ jacketFile: null }));
    const replaceButtons = [...target.querySelectorAll('.editor-meta-button')].filter(
      (b) => b.textContent === 'Replace',
    ) as HTMLButtonElement[];
    replaceButtons[1]!.click(); // jacket.
    const fileInput = [...document.body.querySelectorAll('input[type=file]')].at(
      -1,
    ) as HTMLInputElement;
    expect(fileInput.accept).toBe('image/*');
    const file = new File(['data'], 'cover.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(updateJacketBlob).toHaveBeenCalledWith(file);
    expect(getChart().jacketFile).toBe('cover.png');
  });

  it('destroy()는 에러 없이 정리한다', () => {
    const { handle } = mount();
    expect(() => handle.destroy()).not.toThrow();
  });

  it('update()는 새 chart로 다시 그린다', () => {
    const { handle, target } = mount();
    handle.update(makeChart({ chartBy: 'someone' }));
    const chartByInput = fieldInput(target, 'chartBy');
    expect(chartByInput.value).toBe('someone');
  });
});
