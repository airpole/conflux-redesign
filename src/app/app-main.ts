/**
 * 브라우저 진입점. M4-1의 scene-manager 엔진, M4-2의 title/mode-select/
 * credits, M4-3의 song-select 목록 렌더를 여기서 조립해 실제로 부팅한다.
 *
 * `mount()`는 scene-manager 계약대로 lazy다 — 각 scene의 `mountXxxScene()`
 * 호출(실제 DOM 생성)을 `mount()` 클로저 안으로 미뤄, 처음 그 scene으로
 * 갈 때만 한 번 실행되게 한다. FEATURES 기반 gate 필터링은 scene-manager가
 * 아니라 이 파일(app 레이어)이 한다 — `scene-manager.ts` 설계 그대로
 * (`scene → app` 참조는 금지 방향이라 반대로는 못 함).
 *
 * `editor`/`settings` mode-select 선택은 아직 목적지 scene이 없다(M4-5·
 * M4-6 범위) — 가짜 scene을 만들어 억지로 연결하지 않고, 선택 시 콘솔
 * 로그만 남긴다. `play`는 M4-3부터 `song-select`로 연결된다.
 *
 * song-select의 axis 상태(category/groupBy/sortKey/sortDir)는 여기서
 * 가장 단순한 기본값(`All`/`none`/`default`/`asc`)으로 고정해 둔다 — 실제
 * 조작(정렬·그룹 바 클릭, 검색, 커서)은 M4-4 범위라 아직 UI가 없다. row
 * 목록은 매 `onEnter`마다 다시 로드한다 — library가 바뀌었을 수 있는데
 * song-select는 재진입마다 갱신돼야 자연스럽다([[song-select]] §11 로딩
 * 표시 전제와도 맞는다. 로딩 표시 자체는 M4-4 범위).
 */
import { BUILD_PROFILE, FEATURES } from './app-features.js';
import { createSceneManager, type Scene, type SceneManager } from '../scene/scene-manager.js';
import { mountTitleScene, type TitleSceneHandle } from '../scene/scene-title.js';
import { mountModeSelectScene, type ModeSelectSceneHandle } from '../scene/scene-mode-select.js';
import { mountCreditsScene, type CreditsSceneHandle } from '../scene/scene-credits.js';
import {
  mountSongSelectScene,
  type SongSelectSceneHandle,
  type SongSelectViewState,
} from '../scene/scene-song-select.js';
import { loadSongSelectRows } from '../game/game-song-select.js';
import { createIndexedDbBackend, createStorageEnv, type StorageEnv } from '../env/env-storage.js';

console.info(`Conflux — build profile: ${BUILD_PROFILE}`);

const DEFAULT_SONG_SELECT_VIEW: SongSelectViewState = {
  category: 'All',
  groupBy: 'none',
  sortKey: 'default',
  sortDir: 'asc',
};

function boot(root: HTMLElement, storage: StorageEnv): void {
  let titleHandle: TitleSceneHandle | undefined;
  const titleScene: Scene = {
    id: 'title',
    mount(): void {
      titleHandle = mountTitleScene(root, () => manager.goScene('mode-select'));
    },
    onEnter(): void {
      titleHandle!.show();
    },
    onExit(): void {
      titleHandle!.hide();
    },
  };

  let modeSelectHandle: ModeSelectSceneHandle | undefined;
  const modeSelectScene: Scene = {
    id: 'mode-select',
    mount(): void {
      modeSelectHandle = mountModeSelectScene(root, FEATURES.editor, {
        onSelect(id): void {
          if (id === 'play') {
            manager.goScene('song-select');
            return;
          }
          if (id === 'credits') {
            manager.goScene('credits');
            return;
          }
          console.info(`mode-select: '${id}' 목적지가 아직 없음 (M4-5/M4-6 범위)`);
        },
        onBack(): void {
          manager.goScene('title');
        },
      });
    },
    onEnter(): void {
      modeSelectHandle!.show();
    },
    onExit(): void {
      modeSelectHandle!.hide();
    },
  };

  let creditsHandle: CreditsSceneHandle | undefined;
  const creditsScene: Scene = {
    id: 'credits',
    mount(): void {
      creditsHandle = mountCreditsScene(root, () => manager.goScene('mode-select'));
    },
    onEnter(): void {
      creditsHandle!.show();
    },
    onExit(): void {
      creditsHandle!.hide();
    },
  };

  let songSelectHandle: SongSelectSceneHandle | undefined;
  const songSelectScene: Scene = {
    id: 'song-select',
    mount(): void {
      songSelectHandle = mountSongSelectScene(root, {
        onCategoryChange(category): void {
          void refreshSongSelect({ ...DEFAULT_SONG_SELECT_VIEW, category });
        },
        onBack(): void {
          manager.goScene('mode-select');
        },
      });
    },
    onEnter(): void {
      songSelectHandle!.show();
      void refreshSongSelect(DEFAULT_SONG_SELECT_VIEW);
    },
    onExit(): void {
      songSelectHandle!.hide();
    },
  };

  async function refreshSongSelect(view: SongSelectViewState): Promise<void> {
    const { rows, warnings } = await loadSongSelectRows(storage);
    if (warnings.length > 0) {
      console.warn(`song-select: decode 실패한 library entry — ${warnings.join(', ')}`);
    }
    songSelectHandle!.update(rows, view);
  }

  const manager: SceneManager = createSceneManager([
    titleScene,
    modeSelectScene,
    creditsScene,
    songSelectScene,
  ]);
  manager.goScene('title');
}

const root = document.getElementById('app');
if (root !== null && typeof indexedDB !== 'undefined') {
  boot(root, createStorageEnv(createIndexedDbBackend(indexedDB)));
}
