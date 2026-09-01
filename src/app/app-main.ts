/**
 * 브라우저 진입점. M4-1이 scene-manager 엔진(`scene-manager.ts`)을
 * 들여왔지만, 실제로 `goScene('title')`을 불러 부팅하려면 title/
 * mode-select/credits scene 모듈이 있어야 한다 — 그건 M4-2 범위다.
 * 여기 실제 root graph 조립(`createSceneManager(filteredScenes)`)을
 * 붙이는 건 그 scene들이 생긴 뒤로 미룬다. `FEATURES.editor`로
 * 어떤 scene을 걸러 넘길지는 `scene-manager.ts`의 문서 주석이 이미
 * 설계를 정해 뒀다 — app 레이어(여기)가 필터링해서 넘기고, scene
 * 레이어는 `app`을 import하지 않는다(`architecture.md` §1 단방향 의존).
 */
import { BUILD_PROFILE } from './app-features.js';

console.info(`Conflux — build profile: ${BUILD_PROFILE}`);
