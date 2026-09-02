/**
 * player settings 영속 — `env-storage`의 `settings` store(M3-1)에 잇는다.
 * 순수 병합·검증(`mergeSettings`, `core-settings.ts`)은 이미 있다 — 이
 * 파일은 그걸 store에 잇는 얇은 배선뿐이다(`game-viewstate.ts`와 같은
 * 패턴, `edit-workspace.ts`의 고정 key `SETTINGS_KEY`).
 *
 * settings 4 scene(M4-6, 실제 설정 화면·key rebinding UI)은 아직 없어
 * `writeSettings`는 이 파일에 없다 — M4-5는 gameplay가 **읽기만** 하면
 * 된다(설정을 바꿀 UI가 아직 없으므로). store가 비어 있으면(첫 실행,
 * 아직 아무도 쓴 적 없음) `mergeSettings(undefined)`가 `DEFAULT_SETTINGS`로
 * 떨어진다.
 */
import { mergeSettings, type Settings } from '../core/core-settings.js';
import type { StorageEnv } from '../env/env-storage.js';

const SETTINGS_KEY = 'current';

export async function readSettings(storage: StorageEnv): Promise<Settings> {
  const raw = await storage.read('settings', SETTINGS_KEY);
  return mergeSettings(raw).settings;
}
