import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart, LaneEvent, ShapeEvent } from '../core/core-chart.js';
import {
  addLaneEventsCommand,
  addShapeEventsCommand,
  deleteLaneEventsCommand,
  deleteShapeEventsCommand,
  normalizeLaneEvents,
  normalizeShapeEvents,
  type ShapeSessionLike,
} from './edit-shape-commands.js';

function session(chart: Chart): ShapeSessionLike & { getChart(): Chart } {
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

const blueInit: ShapeEvent = {
  startTick: 0,
  duration: 0,
  isBlue: true,
  targetPos: -2,
  easing: null,
};
const redInit: ShapeEvent = {
  startTick: 0,
  duration: 0,
  isBlue: false,
  targetPos: 2,
  easing: null,
};

describe('edit-shape-commands', () => {
  describe('normalizeShapeEvents', () => {
    it('anchor는 건드리지 않는다', () => {
      const out = normalizeShapeEvents([blueInit]);
      expect(out[0]).toEqual(blueInit);
    });

    it('보간 이벤트를 dest 오름차순으로 이어붙인다(순서는 유지)', () => {
      // dest 1000짜리를 먼저 배열에 두고, dest 500짜리를 나중에 둬도
      // 정규화 후엔 500이 먼저 오도록 duration이 재계산된다.
      const first: ShapeEvent = {
        startTick: 999,
        duration: 1,
        isBlue: true,
        targetPos: 4,
        easing: 'Linear',
      }; // dest 1000
      const second: ShapeEvent = {
        startTick: 100,
        duration: 400,
        isBlue: true,
        targetPos: 2,
        easing: 'Linear',
      }; // dest 500
      const out = normalizeShapeEvents([blueInit, first, second]);
      // 배열 순서는 유지 — index 1(first, dest 1000)이 나중 구간이 된다.
      expect(out[2]!.startTick + out[2]!.duration).toBe(500); // second: prevEnd(0)~500
      expect(out[1]!.startTick).toBe(500); // first: 이어서 500~1000
      expect(out[1]!.startTick + out[1]!.duration).toBe(1000);
    });

    it('duration===0(step)은 startTick=dest·duration=0으로 고정된다', () => {
      const step: ShapeEvent = {
        startTick: 123,
        duration: 456,
        isBlue: true,
        targetPos: 3,
        easing: 'Linear',
      };
      // duration을 0으로 바꿔도(=step) dest(그대로 123+456=579가 아니라
      // step은 duration 자체가 0이므로 dest=startTick) startTick=dest.
      const stepEvent: ShapeEvent = { ...step, duration: 0 };
      const out = normalizeShapeEvents([blueInit, stepEvent]);
      expect(out[1]!.startTick).toBe(123);
      expect(out[1]!.duration).toBe(0);
    });

    it('Blue·Red 체인을 독립적으로 normalize한다', () => {
      const blueTrans: ShapeEvent = {
        startTick: 0,
        duration: 1000,
        isBlue: true,
        targetPos: 4,
        easing: 'Linear',
      };
      const redTrans: ShapeEvent = {
        startTick: 0,
        duration: 2000,
        isBlue: false,
        targetPos: -4,
        easing: 'Linear',
      };
      const out = normalizeShapeEvents([blueInit, redInit, blueTrans, redTrans]);
      expect(out[2]!.duration).toBe(1000);
      expect(out[3]!.duration).toBe(2000);
    });
  });

  describe('addShapeEventsCommand / deleteShapeEventsCommand', () => {
    it('추가는 배열 끝에 붙이고 normalize한다', () => {
      const chart = makeChart({ shapeEvents: [blueInit, redInit] });
      const s = session(chart);
      const cmd = addShapeEventsCommand(s, [
        { startTick: 500, duration: 500, isBlue: true, targetPos: 4, easing: 'Linear' },
      ]);
      cmd.apply();
      expect(s.getChart().shapeEvents).toHaveLength(3);
      cmd.undo();
      expect(s.getChart().shapeEvents).toEqual([blueInit, redInit]);
    });

    it('삭제는 index로 제거하고 normalize한다', () => {
      const target: ShapeEvent = {
        startTick: 500,
        duration: 500,
        isBlue: true,
        targetPos: 4,
        easing: 'Linear',
      };
      const chart = makeChart({ shapeEvents: [blueInit, redInit, target] });
      const s = session(chart);
      const cmd = deleteShapeEventsCommand(s, [2]);
      cmd.apply();
      expect(s.getChart().shapeEvents).toHaveLength(2);
      cmd.undo();
      expect(s.getChart().shapeEvents).toHaveLength(3);
    });

    it('invalidates는 shapeEvents 하나뿐이다', () => {
      const chart = makeChart({ shapeEvents: [blueInit, redInit] });
      const cmd = addShapeEventsCommand(session(chart), []);
      expect(cmd.invalidates).toEqual(['shapeEvents']);
    });
  });

  const line1Init: LaneEvent = {
    startTick: 0,
    duration: 0,
    lineNum: 1,
    targetPos: 0.25,
    easing: null,
  };
  const line2Init: LaneEvent = {
    startTick: 0,
    duration: 0,
    lineNum: 2,
    targetPos: 0.5,
    easing: null,
  };
  const line3Init: LaneEvent = {
    startTick: 0,
    duration: 0,
    lineNum: 3,
    targetPos: 0.75,
    easing: null,
  };

  describe('addLaneEventsCommand / deleteLaneEventsCommand', () => {
    it('추가·삭제·undo가 notes command와 같은 snapshot 패턴을 따른다', () => {
      const chart = makeChart({ laneEvents: [line1Init, line2Init, line3Init] });
      const s = session(chart);
      const addCmd = addLaneEventsCommand(s, [
        { startTick: 200, duration: 200, lineNum: 2, targetPos: 0.6, easing: 'Linear' },
      ]);
      addCmd.apply();
      expect(s.getChart().laneEvents).toHaveLength(4);
      addCmd.undo();
      expect(s.getChart().laneEvents).toEqual([line1Init, line2Init, line3Init]);

      const delCmd = deleteLaneEventsCommand(s, [1]);
      delCmd.apply();
      expect(s.getChart().laneEvents).toHaveLength(2);
      delCmd.undo();
      expect(s.getChart().laneEvents).toHaveLength(3);
    });

    it('normalizeLaneEvents는 구분선 3체인을 독립적으로 다룬다', () => {
      const t1: LaneEvent = {
        startTick: 0,
        duration: 1000,
        lineNum: 1,
        targetPos: 0.1,
        easing: 'Linear',
      };
      const t2: LaneEvent = {
        startTick: 0,
        duration: 3000,
        lineNum: 3,
        targetPos: 0.9,
        easing: 'Linear',
      };
      const out = normalizeLaneEvents([line1Init, line2Init, line3Init, t1, t2]);
      expect(out[3]!.duration).toBe(1000);
      expect(out[4]!.duration).toBe(3000);
    });
  });
});
