import { describe, expect, it } from 'vitest';
import { makeChart } from '../core/core-chart-fixture.js';
import type { Chart, LaneEvent, ShapeEvent } from '../core/core-chart.js';
import {
  addLaneEventsCommand,
  addShapeEventsCommand,
  deleteLaneEventsCommand,
  deleteShapeEventsCommand,
  mirrorEventsCommand,
  mutateLaneEventCommand,
  mutateShapeEventsCommand,
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

  describe('mutateShapeEventsCommand / mutateLaneEventCommand', () => {
    it('targetPos만 바꾸고 dest tick(startTick+duration)은 그대로 둔다', () => {
      // normalize가 매 커맨드마다 도니, 이 fixture처럼 normalize된 형태로
      // 미리 둔다(dest=1000, prevEnd=0이므로 startTick=0·duration=1000).
      const target: ShapeEvent = {
        startTick: 0,
        duration: 1000,
        isBlue: true,
        targetPos: 4,
        easing: 'Linear',
      };
      const chart = makeChart({ shapeEvents: [blueInit, redInit, target] });
      const s = session(chart);
      const cmd = mutateShapeEventsCommand(s, [{ index: 2, targetPos: 6 }]);
      cmd.apply();
      const moved = s.getChart().shapeEvents[2]!;
      expect(moved.targetPos).toBe(6);
      expect(moved.startTick + moved.duration).toBe(1000);
      cmd.undo();
      expect(s.getChart().shapeEvents[2]).toEqual(target);
    });

    it('anchor(init)도 위치를 옮길 수 있다 — 삭제 방지와는 다른 규칙', () => {
      const chart = makeChart({ shapeEvents: [blueInit, redInit] });
      const s = session(chart);
      const cmd = mutateShapeEventsCommand(s, [{ index: 0, targetPos: -3 }]);
      cmd.apply();
      expect(s.getChart().shapeEvents[0]!.targetPos).toBe(-3);
      expect(s.getChart().shapeEvents[0]!.easing).toBe(null);
    });

    it('둘 이상의 index를 한 번에 갱신하면 한 undo 단위가 된다(composite 드래그용)', () => {
      const blueTrans: ShapeEvent = {
        startTick: 0,
        duration: 500,
        isBlue: true,
        targetPos: 4,
        easing: 'Linear',
      };
      const redTrans: ShapeEvent = {
        startTick: 0,
        duration: 500,
        isBlue: false,
        targetPos: 4,
        easing: 'Linear',
      };
      const chart = makeChart({ shapeEvents: [blueInit, redInit, blueTrans, redTrans] });
      const s = session(chart);
      const cmd = mutateShapeEventsCommand(s, [
        { index: 2, targetPos: 1 },
        { index: 3, targetPos: 1 },
      ]);
      cmd.apply();
      expect(s.getChart().shapeEvents[2]!.targetPos).toBe(1);
      expect(s.getChart().shapeEvents[3]!.targetPos).toBe(1);
      cmd.undo();
      expect(s.getChart().shapeEvents[2]!.targetPos).toBe(4);
      expect(s.getChart().shapeEvents[3]!.targetPos).toBe(4);
    });

    it('lane도 같은 패턴으로 targetPos만 바꾼다', () => {
      const chart = makeChart({ laneEvents: [line1Init, line2Init, line3Init] });
      const s = session(chart);
      const cmd = mutateLaneEventCommand(s, 1, 0.8);
      cmd.apply();
      expect(s.getChart().laneEvents[1]!.targetPos).toBe(0.8);
      expect(s.getChart().laneEvents[1]!.startTick).toBe(0);
      cmd.undo();
      expect(s.getChart().laneEvents[1]).toEqual(line2Init);
    });

    it('invalidates는 각각 shapeEvents/laneEvents 하나뿐이다', () => {
      const shapeChart = makeChart({ shapeEvents: [blueInit, redInit] });
      const laneChart = makeChart({ laneEvents: [line1Init, line2Init, line3Init] });
      expect(
        mutateShapeEventsCommand(session(shapeChart), [{ index: 0, targetPos: -1 }]).invalidates,
      ).toEqual(['shapeEvents']);
      expect(mutateLaneEventCommand(session(laneChart), 0, 0.1).invalidates).toEqual([
        'laneEvents',
      ]);
    });
  });

  describe('mirrorEventsCommand', () => {
    it('shape는 축 0 기준 위치를 뒤집고 isBlue를 반전한다', () => {
      const target: ShapeEvent = {
        startTick: 500,
        duration: 500,
        isBlue: true,
        targetPos: 3,
        easing: 'Linear',
      };
      const chart = makeChart({ shapeEvents: [blueInit, redInit, target] });
      const s = session(chart);
      const cmd = mirrorEventsCommand(s, [2], []);
      cmd.apply();
      const mirrored = s.getChart().shapeEvents.find((e) => e.targetPos === -3);
      expect(mirrored).toBeDefined();
      expect(mirrored!.isBlue).toBe(false);
      cmd.undo();
      expect(s.getChart().shapeEvents).toEqual([blueInit, redInit, target]);
    });

    it('lane은 축 0.5 기준 위치를 뒤집고 lineNum은 그대로 둔다', () => {
      const chart = makeChart({ laneEvents: [line1Init, line2Init, line3Init] });
      const s = session(chart);
      const cmd = mirrorEventsCommand(s, [], [0]);
      cmd.apply();
      expect(s.getChart().laneEvents[0]!.targetPos).toBe(0.75); // 1 - 0.25
      expect(s.getChart().laneEvents[0]!.lineNum).toBe(1);
      cmd.undo();
      expect(s.getChart().laneEvents).toEqual([line1Init, line2Init, line3Init]);
    });

    it('shape·lane 선택을 한 번에 합쳐 한 undo로 낸다', () => {
      const shapeTarget: ShapeEvent = {
        startTick: 500,
        duration: 500,
        isBlue: false,
        targetPos: -5,
        easing: 'Linear',
      };
      const chart = makeChart({
        shapeEvents: [blueInit, redInit, shapeTarget],
        laneEvents: [line1Init, line2Init, line3Init],
      });
      const s = session(chart);
      const cmd = mirrorEventsCommand(s, [2], [2]);
      cmd.apply();
      expect(s.getChart().shapeEvents.some((e) => e.targetPos === 5 && e.isBlue)).toBe(true);
      expect(s.getChart().laneEvents[2]!.targetPos).toBe(0.25); // 1 - 0.75
      cmd.undo();
      expect(s.getChart().shapeEvents).toEqual([blueInit, redInit, shapeTarget]);
      expect(s.getChart().laneEvents).toEqual([line1Init, line2Init, line3Init]);
    });

    it('invalidates는 shapeEvents·laneEvents 둘 다다', () => {
      const chart = makeChart({ shapeEvents: [blueInit, redInit], laneEvents: [line1Init] });
      expect(mirrorEventsCommand(session(chart), [], []).invalidates).toEqual([
        'shapeEvents',
        'laneEvents',
      ]);
    });
  });
});
