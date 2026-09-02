/**
 * player settings 영속 — `env-storage`의 `settings` store(M3-1)에 잇는다.
 * 순수 병합·검증(`mergeSettings`, `core-settings.ts`)은 이미 있다 — 이
 * 파일은 그걸 store에 잇는 얇은 배선뿐이다(`game-viewstate.ts`와 같은
 * 패턴, `edit-workspace.ts`의 고정 key `SETTINGS_KEY`).
 *
 * M4-6이 `writeSettings`를 더했다 — settings 4 scene(`scene-settings.ts`)이
 * 필드 하나가 바뀔 때마다 settings 객체 전체를 다시 쓴다(부분 patch가
 * 아니다 — `mergeSettings`가 항상 전체 객체 하나를 다루는 계약과 맞춘다).
 */
import { mergeSettings, type Settings } from '../core/core-settings.js';
import type { StorageEnv } from '../env/env-storage.js';

const SETTINGS_KEY = 'current';

export async function readSettings(storage: StorageEnv): Promise<Settings> {
  const raw = await storage.read('settings', SETTINGS_KEY);
  return mergeSettings(raw).settings;
}

export async function writeSettings(storage: StorageEnv, settings: Settings): Promise<void> {
  await storage.write('settings', SETTINGS_KEY, settings);
}
