/**
 * 브라우저 진입점. M4-1의 scene-manager 엔진과 M4-2의 title/mode-select/
 * credits scene 모듈을 여기서 조립해 실제로 부팅한다.
 *
 * `mount()`는 scene-manager 계약대로 lazy다 — 각 scene의 `mountXxxScene()`
 * 호출(실제 DOM 생성)을 `mount()` 클로저 안으로 미뤄, 처음 그 scene으로
 * 갈 때만 한 번 실행되게 한다. FEATURES 기반 gate 필터링은 scene-manager가
 * 아니라 이 파일(app 레이어)이 한다 — `scene-manager.ts` 설계 그대로
 * (`scene → app` 참조는 금지 방향이라 반대로는 못 함).
 *
 * `play`/`editor`/`settings` 선택은 아직 목적지 scene이 없다(M4-3·M4-5·
 * M4-6 범위) — 가짜 scene을 만들어 억지로 연결하지 않고, 선택 시 콘솔
 * 로그만 남긴다.
 */
import { BUILD_PROFILE, FEATURES } from './app-features.js';
import { createSceneManager, type Scene, type SceneManager } from '../scene/scene-manager.js';
import { mountTitleScene, type TitleSceneHandle } from '../scene/scene-title.js';
import { mountModeSelectScene, type ModeSelectSceneHandle } from '../scene/scene-mode-select.js';
import { mountCreditsScene, type CreditsSceneHandle } from '../scene/scene-credits.js';

console.info(`Conflux — build profile: ${BUILD_PROFILE}`);

function boot(root: HTMLElement): void {
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
          if (id === 'credits') {
            manager.goScene('credits');
            return;
          }
          console.info(`mode-select: '${id}' 목적지가 아직 없음 (M4-3/M4-5/M4-6 범위)`);
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

  const manager: SceneManager = createSceneManager([titleScene, modeSelectScene, creditsScene]);
  manager.goScene('title');
}

const root = document.getElementById('app');
if (root !== null) {
  boot(root);
}
