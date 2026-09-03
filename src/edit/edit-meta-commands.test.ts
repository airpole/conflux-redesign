import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart } from '../core/core-chart.js';
import {
  addTempoCommand,
  addTimeSignatureCommand,
  deleteTempoCommand,
  deleteTimeSignatureCommand,
  editTempoCommand,
  editTimeSignatureCommand,
  type MetaSessionLike,
} from './edit-meta-commands.js';

function session(chart: Chart): MetaSessionLike & { getChart(): Chart } {
  let current = chart;
  return {
    get chart() {
      return current;
    },
    updateChart(next) {
      current = next;
    },
    getChart: () => current,
  };
}

describe('edit-meta-commands', () => {
  describe('tempo', () => {
    it('add는 배열 끝에 붙이고 undo로 되돌아간다', () => {
      const chart = makeChart({ tempos: [{ startTick: 0, bpm: 120 }] });
      const s = session(chart);
      const cmd = addTempoCommand(s, { startTick: 1920, bpm: 140 });
      cmd.apply();
      expect(s.getChart().tempos).toEqual([
        { startTick: 0, bpm: 120 },
        { startTick: 1920, bpm: 140 },
      ]);
      cmd.undo();
      expect(s.getChart().tempos).toEqual([{ startTick: 0, bpm: 120 }]);
    });

    it('delete는 index로 제거한다', () => {
      const chart = makeChart({
        tempos: [
          { startTick: 0, bpm: 120 },
          { startTick: 1920, bpm: 140 },
        ],
      });
      const s = session(chart);
      const cmd = deleteTempoCommand(s, 1);
      cmd.apply();
      expect(s.getChart().tempos).toEqual([{ startTick: 0, bpm: 120 }]);
      cmd.undo();
      expect(s.getChart().tempos).toHaveLength(2);
    });

    it('edit는 index 하나를 통째로 치환한다', () => {
      const chart = makeChart({ tempos: [{ startTick: 0, bpm: 120 }] });
      const s = session(chart);
      const cmd = editTempoCommand(s, 0, { startTick: 0, bpm: 180 });
      cmd.apply();
      expect(s.getChart().tempos).toEqual([{ startTick: 0, bpm: 180 }]);
      cmd.undo();
      expect(s.getChart().tempos).toEqual([{ startTick: 0, bpm: 120 }]);
    });

    it('invalidates는 tempos 하나뿐이다(scope m)', () => {
      const chart = makeChart({ tempos: [{ startTick: 0, bpm: 120 }] });
      expect(addTempoCommand(session(chart), { startTick: 0, bpm: 100 }).invalidates).toEqual([
        'tempos',
      ]);
    });
  });

  describe('timeSignature', () => {
    it('add/delete/edit가 notes command와 같은 snapshot 패턴을 따른다', () => {
      const chart = makeChart({
        timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
      });
      const s = session(chart);
      const addCmd = addTimeSignatureCommand(s, { startTick: 3840, numerator: 3, denominator: 4 });
      addCmd.apply();
      expect(s.getChart().timeSignatures).toHaveLength(2);
      addCmd.undo();
      expect(s.getChart().timeSignatures).toHaveLength(1);

      const editCmd = editTimeSignatureCommand(s, 0, {
        startTick: 0,
        numerator: 6,
        denominator: 8,
      });
      editCmd.apply();
      expect(s.getChart().timeSignatures[0]).toEqual({
        startTick: 0,
        numerator: 6,
        denominator: 8,
      });
      editCmd.undo();
      expect(s.getChart().timeSignatures[0]).toEqual({
        startTick: 0,
        numerator: 4,
        denominator: 4,
      });

      const delCmd = deleteTimeSignatureCommand(s, 0);
      delCmd.apply();
      expect(s.getChart().timeSignatures).toHaveLength(0);
      delCmd.undo();
      expect(s.getChart().timeSignatures).toHaveLength(1);
    });

    it('invalidates는 timeSignatures 하나뿐이다(scope m)', () => {
      const chart = makeChart({
        timeSignatures: [{ startTick: 0, numerator: 4, denominator: 4 }],
      });
      expect(deleteTimeSignatureCommand(session(chart), 0).invalidates).toEqual(['timeSignatures']);
    });
  });
});
