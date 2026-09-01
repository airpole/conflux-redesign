/**
 * song-select `viewState` 영속 — `env-storage`의 `viewState` store(M3-1)에
 * `category`/`groupBy`/`sortKey`/`sortDir`/`recordCellMode`/`lastSelected`를
 * 잇는다. 정의의 단일 출처는 [[song-select]] §12.
 *
 * §12는 이 6개 키만 영속한다고 정하고("검색어·folder 접힘 상태·페이지
 * 인덱스는 영속하지 않는다") 병합 규칙 자체는 정하지 않는다 — 여기는
 * `settings.md` §4의 원칙(알 수 없는 키 폐기, 필드 단위로 기본값 복귀)을
 * 유추 적용한다. 저장본이 손상돼도 앱이 죽지 않아야 한다는 같은 이유가
 * viewState에도 적용되지만, 이 병합 규칙 자체가 §12에 명시된 건 아니다 —
 * 필요하면 재검토.
 *
 * `edit-workspace.ts`의 고정 key 패턴(`WORKSPACE_KEY`)을 따른다 — store
 * 하나에 scene별로 다른 key를 쓸 수 있으니 `'song-select'`로 이름 붙인다.
 */
import type {
  CursorTarget,
  GroupByAxis,
  RecordCellMode,
  SongSelectViewState,
  SortDir,
  SortKey,
} from '../core/core-song-select.js';
import { GROUP_BY_AXES, SORT_KEYS, ALL_CATEGORY } from '../core/core-song-select.js';
import type { StorageEnv } from '../env/env-storage.js';

const VIEW_STATE_KEY = 'song-select';

export type { CursorTarget, RecordCellMode, SongSelectViewState };

export const DEFAULT_SONG_SELECT_VIEW_STATE: SongSelectViewState = {
  category: ALL_CATEGORY,
  groupBy: 'none',
  sortKey: 'default',
  sortDir: 'asc',
  recordCellMode: 'percent',
  lastSelected: null,
};

function isGroupByAxis(value: unknown): value is GroupByAxis {
  return typeof value === 'string' && (GROUP_BY_AXES as readonly string[]).includes(value);
}

function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value);
}

function isSortDir(value: unknown): value is SortDir {
  return value === 'asc' || value === 'desc';
}

function isRecordCellMode(value: unknown): value is RecordCellMode {
  return value === 'percent' || value === 'judge';
}

function isLastSelected(value: unknown): value is CursorTarget {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.songId === 'string' && typeof v.chartId === 'number';
}

/** 저장본이 무엇이든(파싱 실패, 잘못된 타입, 알 수 없는 키) 온전한
 *  viewState 하나로 만든다 — `settings.md` §4와 같은 원칙을 유추 적용. */
function mergeViewState(raw: unknown): SongSelectViewState {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SONG_SELECT_VIEW_STATE;
  const v = raw as Record<string, unknown>;

  return {
    category: typeof v.category === 'string' ? v.category : DEFAULT_SONG_SELECT_VIEW_STATE.category,
    groupBy: isGroupByAxis(v.groupBy) ? v.groupBy : DEFAULT_SONG_SELECT_VIEW_STATE.groupBy,
    sortKey: isSortKey(v.sortKey) ? v.sortKey : DEFAULT_SONG_SELECT_VIEW_STATE.sortKey,
    sortDir: isSortDir(v.sortDir) ? v.sortDir : DEFAULT_SONG_SELECT_VIEW_STATE.sortDir,
    recordCellMode: isRecordCellMode(v.recordCellMode)
      ? v.recordCellMode
      : DEFAULT_SONG_SELECT_VIEW_STATE.recordCellMode,
    lastSelected: isLastSelected(v.lastSelected)
      ? v.lastSelected
      : DEFAULT_SONG_SELECT_VIEW_STATE.lastSelected,
  };
}

export async function readSongSelectViewState(storage: StorageEnv): Promise<SongSelectViewState> {
  const raw = await storage.read('viewState', VIEW_STATE_KEY);
  return mergeViewState(raw);
}

export async function writeSongSelectViewState(
  storage: StorageEnv,
  state: SongSelectViewState,
): Promise<void> {
  await storage.write('viewState', VIEW_STATE_KEY, state);
}
