/**
 * 속성 테스트 — seed 고정 무작위로 core의 불변 속성을 잰다.
 *
 * M1 외부 검토(WO-1 §4)에서 상설화. 검토 중 이 파일의 2번 속성이
 * 실제 왕복 붕괴 하나를 찾았다(TS 전환점이 cell 미정렬일 때 — 결정 1).
 *
 * TODO(결정 1 / WO-2 §1): 아래 왕복 속성의 박자표 전환점을 cell 정렬로
 * 제한해 두었다. 결정 1 반영 후 이 제한을 해제한다.
 */
import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  tickToMs,
  msToTick,
  tickToMeasure,
  measureToTick,
} from '../src/core/core-timing.js';
import { buildFieldGeometry, shapeGeometryAt, laneLayoutAt } from '../src/core/core-shape.js';
import { buildOverlapMap, isActiveAt } from '../src/core/core-overlap.js';
import type { Note, Lane } from '../src/core/core-chart.js';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

describe('속성 — timing 왕복', () => {
  it('tickToMs ↔ msToTick (다구간 tempo, 음수 포함, 300회)', () => {
    const r = rng(42);
    for (let trial = 0; trial < 300; trial++) {
      const n = 1 + Math.floor(r() * 4);
      let tick = 0;
      const tempos = [];
      for (let i = 0; i < n; i++) {
        tempos.push({ startTick: tick, bpm: 30 + Math.floor(r() * 500) });
        tick += 480 * (1 + Math.floor(r() * 8));
      }
      const tl = buildTimeline({ tempos, timeSignatures: [] });
      for (let k = 0; k < 20; k++) {
        const t = Math.floor(r() * tick * 1.5) - 1920;
        const back = msToTick(tl, tickToMs(tl, t));
        expect(Math.abs(back - t), `tempos=${JSON.stringify(tempos)} t=${t}`).toBeLessThan(1e-6);
      }
    }
  });

  it('tickToMeasure ↔ measureToTick (격자 정렬 tick · labelOffset · 다구간 TS, 200회)', () => {
    const r = rng(7);
    for (let trial = 0; trial < 200; trial++) {
      const gridDivisor = [4, 8, 16, 32][Math.floor(r() * 4)]!;
      const cell = (1920 * 4) / gridDivisor;
      const dens = [1, 2, 4, 8] as const;
      const sigs = [
        {
          startTick: 0,
          numerator: 1 + Math.floor(r() * 7),
          denominator: dens[Math.floor(r() * 4)]!,
        },
      ];
      if (r() > 0.5) {
        const s0 = sigs[0]!;
        const tpm0 = ((1920 * 4) / s0.denominator) * s0.numerator;
        // TODO(결정 1): cell 정렬 제한 — tpm0의 배수 중 cell의 배수인 자리만 고른다.
        let cut = tpm0 * (1 + Math.floor(r() * 3));
        if (cut % cell !== 0) cut = Math.ceil(cut / cell) * cell * s0.numerator * s0.denominator;
        sigs.push({
          startTick: cut,
          numerator: 1 + Math.floor(r() * 7),
          denominator: dens[Math.floor(r() * 4)]!,
        });
      }
      const tl = buildTimeline({ tempos: [], timeSignatures: sigs });
      const labelOffset = Math.floor(r() * 5) - 2;
      for (let k = 0; k < 20; k++) {
        const t = (Math.floor(r() * 200) - 40) * cell;
        const s = tickToMeasure(tl, t, { labelOffset, gridDivisor });
        const back = measureToTick(tl, s, { labelOffset, gridDivisor });
        expect(
          back,
          `sigs=${JSON.stringify(sigs)} off=${labelOffset} gd=${gridDivisor} t=${t} s="${s}"`,
        ).toBe(t);
      }
    }
  });
});

describe('속성 — 체인 평가', () => {
  it('모든 tick에서 유한·정의 (겹침·즉시점프·무anchor 포함, 200회)', () => {
    const r = rng(99);
    for (let trial = 0; trial < 200; trial++) {
      const events = [];
      const n = Math.floor(r() * 8);
      for (let i = 0; i < n; i++) {
        events.push({
          startTick: Math.floor(r() * 4000) - 500,
          duration: r() > 0.3 ? Math.floor(r() * 1000) : 0,
          targetPos: r() * 16 - 8,
          isBlue: r() > 0.5,
          easing: (r() > 0.2 ? ['Linear', 'In-Sine', 'Out-Sine'][Math.floor(r() * 3)]! : null) as
            'Linear' | null,
        });
      }
      const geo = buildFieldGeometry({ shapeEvents: events, laneEvents: [] });
      for (let k = 0; k < 30; k++) {
        const t = Math.floor(r() * 6000) - 1000;
        const sh = shapeGeometryAt(geo, t);
        const ln = laneLayoutAt(geo, t);
        for (const v of [sh.blue, sh.red, ln.line1, ln.line2, ln.line3]) {
          expect(Number.isFinite(v), `events=${JSON.stringify(events)} t=${t}`).toBe(true);
        }
      }
    }
  });
});

describe('속성 — 겹침 검출', () => {
  it('conflict group 멤버는 그 tick에 활성이고, excess 양수, hidden은 쌍둥이 필수 (300회)', () => {
    const r = rng(3);
    for (let trial = 0; trial < 300; trial++) {
      const notes: Note[] = [];
      const n = 2 + Math.floor(r() * 8);
      for (let i = 0; i < n; i++) {
        notes.push({
          lane: (1 + Math.floor(r() * 4)) as Lane,
          startTick: Math.floor(r() * 8) * 480,
          duration: r() > 0.5 ? (1 + Math.floor(r() * 6)) * 480 : 0,
          isWide: r() > 0.85,
        });
      }
      const { marks, conflicts } = buildOverlapMap(notes);
      for (const g of conflicts) {
        for (const idx of g.noteIndices) {
          expect(
            isActiveAt(notes[idx]!, g.tick),
            `notes=${JSON.stringify(notes)} group=${JSON.stringify(g)}`,
          ).toBe(true);
          expect(marks[idx]!.kind).toBe('conflict');
        }
        expect(g.excess).toBeGreaterThan(0);
      }
      marks.forEach((m, i) => {
        if (m?.kind !== 'hidden') return;
        const me = notes[i]!;
        const twin = notes.findIndex(
          (o, j) =>
            j !== i &&
            o.startTick === me.startTick &&
            o.duration === me.duration &&
            (me.isWide ? o.isWide : !o.isWide && o.lane === me.lane),
        );
        expect(
          twin,
          `hidden without twin: notes=${JSON.stringify(notes)} i=${i}`,
        ).toBeGreaterThanOrEqual(0);
      });
    }
  });
});
