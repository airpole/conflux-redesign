/**
 * workspace — dirty 전용 복구 슬롯.
 *
 * 정의의 단일 출처는 `_meta/persistence.md` §6(과 §5 dirty 정의)다. workspace는
 * "아직 파일로 저장하지 않은 dirty 편집 작업의 비정상 종료 복구용 단일 슬롯"이며
 * `env-storage`의 `workspace` store 안에 **한 슬롯**만 둔다.
 *
 * 최소 복구 메타(§6): `chart + musicBlob + jacketBlob|null + dirty + baseVersion`.
 * `dirty`·`baseVersion`은 chart JSON이나 `.cfx` 스키마 밖이다 — 여기서만 산다.
 *
 * 규칙 요약:
 * - autosave는 마지막 변경 30초 뒤 실행한다(§6). `dirty`를 해제하지 않는다(§5).
 * - 파일 저장 성공 시에만 `dirty`를 해제하고 workspace를 삭제한다 — 삭제 전
 *   먼저 `dirty = false`로 갱신해 쓴 뒤 삭제를 시도한다(§6). 삭제 실패가 파일
 *   저장 성공을 무효화하지 않는다 `[신규]` — 그리고 `env-storage.write`가 이미
 *   던지지 않으므로(M3-1) 여기서 추가로 삼킬 실패가 없다.
 * - 다음 실행에서 `dirty = false`인 workspace는 stale로 보고 노출 없이 정리한다.
 * - 복구된 세션은 dirty 상태로 시작한다.
 *
 * 실제 트리거(command dispatch·undo/redo·chart 필드 변경 등, §5)는 에디터
 * 인터랙션 자체가 아직 없어(M5) 여기서 걸지 않는다 — `markDirty`/`updateChart`
 * 등은 M5가 물릴 자리를 미리 만들어 둔 것이다.
 */
import type { Chart } from '../core/core-chart.js';
import type { StorageEnv } from '../env/env-storage.js';

export interface WorkspaceSlot {
  readonly chart: Chart;
  readonly musicBlob: Blob | null;
  readonly jacketBlob: Blob | null;
  readonly dirty: boolean;
  /** 이 워크스페이스가 파생된 파일의 version. 아직 저장된 적 없으면 `null`(§4). */
  readonly baseVersion: number | null;
}

/** workspace store는 슬롯이 하나뿐이라 고정 key를 쓴다. */
const WORKSPACE_KEY = 'current';

/** 마지막 변경 이후 autosave까지의 지연(§6). */
export const AUTOSAVE_DELAY_MS = 30_000;

export async function readWorkspace(storage: StorageEnv): Promise<WorkspaceSlot | null> {
  const raw = await storage.read('workspace', WORKSPACE_KEY);
  return (raw as WorkspaceSlot | undefined) ?? null;
}

export async function writeWorkspace(storage: StorageEnv, slot: WorkspaceSlot): Promise<void> {
  await storage.write('workspace', WORKSPACE_KEY, slot);
}

export async function deleteWorkspace(storage: StorageEnv): Promise<void> {
  await storage.remove('workspace', WORKSPACE_KEY);
}

/**
 * 부팅 시 호출. `dirty = false`인 workspace는 stale이므로 정리하고 `null`을
 * 돌려준다 — "이어서 편집"은 이 함수가 `null`이 아닌 것을 돌려줄 때만 유효하다
 * (§6·§9).
 */
export async function loadRecoverableWorkspace(storage: StorageEnv): Promise<WorkspaceSlot | null> {
  const slot = await readWorkspace(storage);
  if (slot === null) return null;
  if (!slot.dirty) {
    await deleteWorkspace(storage);
    return null;
  }
  return slot;
}

/** autosave debounce에 필요한 최소 타이머 표면. `env-canvas`의 `ResizeWatchHost`와 같은 패턴. */
export interface AutosaveTimerHost {
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export interface WorkspaceSessionOptions {
  readonly storage: StorageEnv;
  readonly chart: Chart;
  readonly musicBlob: Blob | null;
  readonly jacketBlob: Blob | null;
  /** 아직 파일로 저장된 적 없으면 `null`. */
  readonly baseVersion: number | null;
  /** 복구된 세션이면 `true`로 시작한다(§6). 기본 `false`(새 세션은 clean으로 시작). */
  readonly recovered?: boolean;
  readonly timerHost: AutosaveTimerHost;
  readonly autosaveDelayMs?: number;
}

export interface WorkspaceSession {
  readonly dirty: boolean;
  readonly baseVersion: number | null;
  readonly chart: Chart;
  readonly musicBlob: Blob | null;
  readonly jacketBlob: Blob | null;
  updateChart(chart: Chart): void;
  updateMusicBlob(blob: Blob | null): void;
  updateJacketBlob(blob: Blob | null): void;
  /** command dispatch·undo/redo처럼 chart 참조 자체는 안 바뀌어도 dirty를 켜야 할 때. */
  markDirty(): void;
  /** 30초 debounce와 무관하게 지금 즉시 workspace에 쓴다(editor 이탈 등, §6). clean이면 아무 것도 하지 않는다. */
  flush(): Promise<void>;
  /** 파일 저장 성공 후 호출한다 — dirty 해제·workspace 삭제·baseVersion 갱신을 §6 순서대로 수행한다. */
  onFileSaveSuccess(newVersion: number): Promise<void>;
  /** 세션 전환 confirm에서 Discard를 골랐을 때 — workspace를 지운다. */
  discard(): Promise<void>;
  /** 대기 중인 autosave 타이머를 취소한다(세션 정리, 저장/폐기와 무관하게). */
  dispose(): void;
}

export function createWorkspaceSession(options: WorkspaceSessionOptions): WorkspaceSession {
  let chart = options.chart;
  let musicBlob = options.musicBlob;
  let jacketBlob = options.jacketBlob;
  let dirty = options.recovered ?? false;
  let baseVersion = options.baseVersion;
  const delayMs = options.autosaveDelayMs ?? AUTOSAVE_DELAY_MS;
  let timer: number | null = null;

  const currentSlot = (): WorkspaceSlot => ({ chart, musicBlob, jacketBlob, dirty, baseVersion });

  const cancelTimer = (): void => {
    if (timer !== null) {
      options.timerHost.clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleAutosave = (): void => {
    cancelTimer();
    timer = options.timerHost.setTimeout(() => {
      timer = null;
      // autosave 자체의 쓰기 실패는 `env-storage`가 이미 조용히 삼키지 않고
      // 상태로만 남긴다(M3-1) — 여기서 추가로 처리할 것이 없다.
      void writeWorkspace(options.storage, currentSlot());
    }, delayMs);
  };

  const setDirty = (): void => {
    dirty = true;
    scheduleAutosave();
  };

  return {
    get dirty() {
      return dirty;
    },
    get baseVersion() {
      return baseVersion;
    },
    get chart() {
      return chart;
    },
    get musicBlob() {
      return musicBlob;
    },
    get jacketBlob() {
      return jacketBlob;
    },

    updateChart(next) {
      chart = next;
      setDirty();
    },
    updateMusicBlob(blob) {
      musicBlob = blob;
      setDirty();
    },
    updateJacketBlob(blob) {
      jacketBlob = blob;
      setDirty();
    },
    markDirty() {
      setDirty();
    },

    async flush() {
      if (!dirty) return; // clean 상태에서는 workspace를 유지하지 않는다(§6).
      cancelTimer();
      await writeWorkspace(options.storage, currentSlot());
    },

    async onFileSaveSuccess(newVersion) {
      cancelTimer();
      dirty = false;
      baseVersion = newVersion;
      // 삭제 전 먼저 dirty=false로 갱신해 쓴다(§6) — 삭제가 실패해도 남는
      // 슬롯이 stale로 보여 다음 부팅 때 조용히 정리된다.
      await writeWorkspace(options.storage, currentSlot());
      await deleteWorkspace(options.storage);
    },

    async discard() {
      cancelTimer();
      dirty = false;
      await deleteWorkspace(options.storage);
    },

    dispose() {
      cancelTimer();
    },
  };
}
