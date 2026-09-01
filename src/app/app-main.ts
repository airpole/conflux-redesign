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
 * song-select의 axis 상태(category/groupBy/sortKey/sortDir/recordCellMode/
 * lastSelected)는 M4-4부터 `game-viewstate.ts`(`env-storage`의 `viewState`
 * store)로 영속한다([[song-select]] §12) — 실제 조작(정렬·그룹 바 *클릭*
 * 으로 바꾸는 것)은 여전히 없다(overlay 진입 키가 M4-3 前 게이트로 아직
 * 안 닫혔다, `scene-song-select.ts` 헤더 참조) — 카테고리 탭·커서(방향키·
 * 클릭)·검색·기록 칸 토글·기록 초기화만 이번 범위다. row 목록은 매
 * `onEnter`마다 다시 로드한다 — library가 바뀌었을 수 있는데 song-select는
 * 재진입마다 갱신돼야 자연스럽다([[song-select]] §11 로딩 표시 전제와도
 * 맞는다. 로딩 표시 자체는 M4-4 범위 밖).
 *
 * preview 재생은 `game-song-preview.ts`의 `createPreviewController`를 실제
 * `AudioEnv`(`env-audio.ts`)로 연결한다 — `onCursorChange`마다
 * `controller.onCursorSettle()`을 부르고, `game-song-select.ts`의
 * `loadPreviewAsset`으로 그 chart의 음원을 필요할 때만 다시 읽어 decode한다.
 *
 * 기록 초기화(`onResetRecord`)는 `FEATURES.recordReset`이 켜졌을 때만
 * 핸들러를 넘긴다 — `scene-song-select.ts`가 이 핸들러의 유무로 버튼 노출을
 * 결정한다(§13 "FEATURES.recordReset에서만 노출"). 초기화 확정 UI는
 * `confirm()`을 쓴다 — 스펙에 별도 확인 인터랙션이 정해져 있지 않아 되돌릴
 * 수 없는 동작에 대한 가장 단순한 방어로 골랐다(결정 필요 항목으로 별도
 * 보고).
 */
import { BUILD_PROFILE, FEATURES } from './app-features.js';
import { createSceneManager, type Scene, type SceneManager } from '../scene/scene-manager.js';
import { mountTitleScene, type TitleSceneHandle } from '../scene/scene-title.js';
import { mountModeSelectScene, type ModeSelectSceneHandle } from '../scene/scene-mode-select.js';
import { mountCreditsScene, type CreditsSceneHandle } from '../scene/scene-credits.js';
import {
  mountSongSelectScene,
  type SongSelectHandlers,
  type SongSelectSceneHandle,
} from '../scene/scene-song-select.js';
import type { CursorTarget } from '../core/core-song-select.js';
import { loadPreviewAsset, loadSongSelectRows } from '../game/game-song-select.js';
import { resetRecord } from '../game/game-records.js';
import { readSongSelectViewState, writeSongSelectViewState } from '../game/game-viewstate.js';
import { createPreviewController } from '../game/game-song-preview.js';
import { createAudioEnv } from '../env/env-audio.js';
import { createIndexedDbBackend, createStorageEnv, type StorageEnv } from '../env/env-storage.js';

console.info(`Conflux — build profile: ${BUILD_PROFILE}`);

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

  const audioEnv = createAudioEnv(() => new AudioContext());
  const previewController = createPreviewController(audioEnv);

  let songSelectHandle: SongSelectSceneHandle | undefined;
  const songSelectScene: Scene = {
    id: 'song-select',
    mount(): void {
      const handlers: SongSelectHandlers = {
        onCategoryChange(category): void {
          void (async () => {
            const view = { ...(await readSongSelectViewState(storage)), category };
            await writeSongSelectViewState(storage, view);
            await refreshSongSelect(view);
          })();
        },
        onBack(): void {
          previewController.stop();
          manager.goScene('mode-select');
        },
        onCursorChange(target): void {
          // target이 null이면 커서가 folder 헤더에 있다는 뜻이다(M4-4,
          // scene-song-select.ts) — chart 정체성이 없어 lastSelected를
          // 지울 게 아니라 마지막으로 실제 chart에 있었던 값을 그대로
          // 둔다.
          if (target !== null) {
            void (async () => {
              const view = { ...(await readSongSelectViewState(storage)), lastSelected: target };
              await writeSongSelectViewState(storage, view);
            })();
          }

          if (target === null) {
            previewController.stop();
            return;
          }
          previewController.onCursorSettle(async () => {
            const asset = await loadPreviewAsset(storage, target.songId, target.chartId);
            if (asset === null) return null;
            const buffer = await audioEnv.decode(asset.bytes.buffer as ArrayBuffer);
            return { buffer, startMs: asset.previewStartMs };
          });
        },
        onSelect(target): void {
          console.info(`song-select: '${target.songId}:${target.chartId}' 선택됨 (M4-5 범위)`);
        },
        onRecordCellModeChange(mode): void {
          void (async () => {
            const view = { ...(await readSongSelectViewState(storage)), recordCellMode: mode };
            await writeSongSelectViewState(storage, view);
            await refreshSongSelect(view);
          })();
        },
      };
      songSelectHandle = mountSongSelectScene(root, {
        ...handlers,
        ...(FEATURES.recordReset
          ? {
              onResetRecord(target: CursorTarget): void {
                if (!confirm('이 chart의 기록을 초기화할까요?')) return;
                void (async () => {
                  await resetRecord(storage, target.songId, target.chartId);
                  await refreshSongSelect(await readSongSelectViewState(storage));
                })();
              },
            }
          : {}),
      });
    },
    onEnter(): void {
      songSelectHandle!.show();
      void (async () => {
        await refreshSongSelect(await readSongSelectViewState(storage));
      })();
    },
    onExit(): void {
      previewController.stop();
      songSelectHandle!.hide();
    },
  };

  async function refreshSongSelect(
    view: Awaited<ReturnType<typeof readSongSelectViewState>>,
  ): Promise<void> {
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
