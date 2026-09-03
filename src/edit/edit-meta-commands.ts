/**
 * meta 씬(M5-5) tempo/timeSignature command — `editor/editor-commands.md`
 * §6 중 `AddTempo`/`DeleteTempo`/`EditTempo`·`AddTimeSignature`/
 * `DeleteTimeSignature`/`EditTimeSignature` 6개. `edit-command.ts`(M5-2)
 * 엔진에 꽂는다. `invalidates`가 `tempos`/`timeSignatures`뿐이라 전부
 * scope `m`이다(`edit-command.ts` §2).
 *
 * notes/shape의 snapshot 패턴을 그대로 따르지만 **chain normalize가
 * 없다** — `timing.md` §0 "핵심 pattern"이 이미 "1. startTick 정렬"을
 * **평가 시점**(tick→ms 변환)의 첫 단계로 두고 있어, 저장 배열 자체는
 * 정렬돼 있을 필요가 없다(notes/shapeEvents와 같은 전제 — 배치 순서로
 * 저장하고 조회 시 정렬한다). 그래서 이 파일의 command는 배열을 그대로
 * 추가/삭제/치환할 뿐, shape/lane처럼 저장값을 다시 계산하는 단계가
 * 없다.
 *
 * **빈 배열 방지는 이 파일이 하지 않는다** — `tempos`/`timeSignatures`가
 * 비면 안 된다는 규칙(`data-model.md` §11 structural은 아니고 domain
 * 검증 대상)은 이미 `core-validate.ts`가 **거부가 아니라 보고**하는
 * 자리다(§11 "편집 중 chart는 항상 잠깐 domain-invalid하다"). 마지막
 * 하나를 지우게 둘지 막을지는 UI 판단이라 `scene-editor-meta.ts`가
 * 막는다(shape의 anchor 삭제 방지와 같은 위치 — 커맨드 계층이 아니라
 * scene 계층).
 *
 * metadata·chart identity(chartId/difficulty/subtitle/level/chartBy)·
 * asset(musicFile/jacketFile) 필드 편집은 command가 **아니다**
 * (`editor-commands.md` §7 "chart identity·metadata·asset 연결 필드
 * 편집은 command가 아니다") — `scene-editor-meta.ts`가
 * `session.updateChart()`를 직접 부른다. 이 파일에는 그 경로가 없다.
 */
import type { Chart, Tempo, TimeSignature } from '../core/core-chart.js';
import type { Command } from './edit-command.js';

export interface MetaSessionLike {
  readonly chart: Chart;
  updateChart(chart: Chart): void;
}

function tempoCommand(
  name: string,
  session: MetaSessionLike,
  before: readonly Tempo[],
  after: readonly Tempo[],
): Command {
  return {
    name,
    invalidates: ['tempos'],
    apply: () => session.updateChart({ ...session.chart, tempos: after }),
    undo: () => session.updateChart({ ...session.chart, tempos: before }),
  };
}

function timeSignatureCommand(
  name: string,
  session: MetaSessionLike,
  before: readonly TimeSignature[],
  after: readonly TimeSignature[],
): Command {
  return {
    name,
    invalidates: ['timeSignatures'],
    apply: () => session.updateChart({ ...session.chart, timeSignatures: after }),
    undo: () => session.updateChart({ ...session.chart, timeSignatures: before }),
  };
}

/** 새 tempo 하나를 배열 끝에 추가한다(§6 AddTempo). */
export function addTempoCommand(session: MetaSessionLike, tempo: Tempo): Command {
  const before = session.chart.tempos;
  return tempoCommand('AddTempo', session, before, [...before, tempo]);
}

/** 순번(index) 하나를 삭제한다(§6 DeleteTempo). 마지막 하나 보호는
 *  호출측(scene) 몫이다. */
export function deleteTempoCommand(session: MetaSessionLike, index: number): Command {
  const before = session.chart.tempos;
  return tempoCommand(
    'DeleteTempo',
    session,
    before,
    before.filter((_, i) => i !== index),
  );
}

/** 기존 tempo 하나를 통째로 치환한다(§6 EditTempo). */
export function editTempoCommand(session: MetaSessionLike, index: number, tempo: Tempo): Command {
  const before = session.chart.tempos;
  return tempoCommand(
    'EditTempo',
    session,
    before,
    before.map((t, i) => (i === index ? tempo : t)),
  );
}

/** 새 timeSignature 하나를 배열 끝에 추가한다(§6 AddTimeSignature). */
export function addTimeSignatureCommand(
  session: MetaSessionLike,
  timeSignature: TimeSignature,
): Command {
  const before = session.chart.timeSignatures;
  return timeSignatureCommand('AddTimeSignature', session, before, [...before, timeSignature]);
}

/** 순번(index) 하나를 삭제한다(§6 DeleteTimeSignature). */
export function deleteTimeSignatureCommand(session: MetaSessionLike, index: number): Command {
  const before = session.chart.timeSignatures;
  return timeSignatureCommand(
    'DeleteTimeSignature',
    session,
    before,
    before.filter((_, i) => i !== index),
  );
}

/** 기존 timeSignature 하나를 통째로 치환한다(§6 EditTimeSignature). */
export function editTimeSignatureCommand(
  session: MetaSessionLike,
  index: number,
  timeSignature: TimeSignature,
): Command {
  const before = session.chart.timeSignatures;
  return timeSignatureCommand(
    'EditTimeSignature',
    session,
    before,
    before.map((t, i) => (i === index ? timeSignature : t)),
  );
}
