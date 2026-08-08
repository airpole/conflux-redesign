/**
 * 브라우저 진입점. M1-1 시점에는 부팅할 scene 그래프가 아직 없다.
 * 실제 부트스트랩은 M4-1에서 scene-manager와 함께 들어온다.
 */
import { BUILD_PROFILE } from './app-features.js';

console.info(`Conflux — build profile: ${BUILD_PROFILE}`);
