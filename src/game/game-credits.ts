/**
 * credits scene의 Music/Chart/Jacket 섹션 데이터 — library 전체를 스캔해
 * `musicBy`/`chartBy`/`jacketBy`를 필드별로 중복 제거한 평평한 이름 목록으로
 * 만든다. 정의의 단일 출처는 `scene/ui-design.md` §2.8.1·§2.8.5(M6-1이
 * 실제로 배선했다).
 *
 * song이나 chart 단위로 묶지 않는다(§2.8.1) — 같은 songId 그룹 안에서도
 * chart마다 이 값들이 다를 수 있어(`core/data-model.md` §1) "그 song의
 * 대표"를 고를 필요 자체를 없앤 설계다. 한 사람이 여러 역할을 겸하면 그
 * 사람이 실제로 갖는 각 역할 섹션에 각각 나타난다 — `music`/`chart`/
 * `jacket` 세 Set이 서로 독립인 것으로 이미 그렇게 된다.
 *
 * `scene`(credits) → `game`(이 파일) → `env`(storage) 방향은
 * `architecture.md`의 단방향 의존을 어기지 않는다(§2.8.5가 이미 확인해 둔
 * 경계) — engine 미사용(credits는 정적 scene)과 store 조회는 별개다.
 */
import { loadCfxPackage } from '../format/format-cfx-load.js';
import type { StorageEnv } from '../env/env-storage.js';

export interface CreditsRoleNames {
  readonly music: readonly string[];
  readonly chart: readonly string[];
  readonly jacket: readonly string[];
}

/**
 * library 전체를 스캔한다. 구조가 깨진 library entry(이론상 song-select와
 * 같은 경합/손상 사례)는 그 songId만 건너뛴다 — credits가 전체 화면을
 * 못 띄우는 것보다 일부 이름이 빠지는 쪽이 낫다. 빈 문자열(필드 미기입)은
 * 표시할 이름이 없으므로 제외한다. 정렬 순서는 스펙이 정하지 않아 알파벳
 * 순으로 결정적이게 뒀다(결정 필요 항목으로 별도 보고).
 */
export async function loadCreditsRoleNames(storage: StorageEnv): Promise<CreditsRoleNames> {
  const songIds = await storage.keys('library');
  const music = new Set<string>();
  const chart = new Set<string>();
  const jacket = new Set<string>();

  for (const songId of songIds) {
    const bytes = (await storage.read('library', songId)) as Uint8Array | undefined;
    if (bytes === undefined) continue;
    const loaded = loadCfxPackage(bytes);
    if (!loaded.ok) continue;

    for (const candidate of loaded.charts) {
      const c = candidate.chart;
      if (c.metadata.musicBy !== '') music.add(c.metadata.musicBy);
      if (c.chartBy !== '') chart.add(c.chartBy);
      if (c.metadata.jacketBy !== '') jacket.add(c.metadata.jacketBy);
    }
  }

  return {
    music: [...music].sort(),
    chart: [...chart].sort(),
    jacket: [...jacket].sort(),
  };
}
