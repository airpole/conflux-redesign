// overlap 골든 — 원본 `overlaps.js`의 note별 표시.
//
// 원본은 노트 **객체**를 열쇠로 하는 Map을 돌려준다. 재설계는 영속 note ID가 없어
// 순번으로 가리키므로(`data-model` §5.1), 여기서 `D.notes` 배열의 순번으로 옮겨 적는다.
// 순번은 배치 순서이고 원본도 그 순서를 보존하므로 대응이 1:1이다.
//
// 원본 이름을 그대로 쓴다 — `invalid`가 재설계의 `conflict`다. 명칭 매핑은
// 테스트 쪽이 갖는다(D-2026-034).
import { prepare, load, loadChart, emit } from './harness.mjs';
import { overlapFixtures } from './fixtures.mjs';

await prepare();
const { D } = await load('state.js');
const { invalidate } = await load('cache.js');
const ov = await load('overlaps.js');

const cases = [];

for (const [name, fixture] of Object.entries(overlapFixtures)) {
  await loadChart(fixture);
  invalidate(['notes']);
  const map = ov.computeNoteOverlaps();

  for (const [index, note] of D.notes.entries()) {
    const entry = map.get(note) ?? null;
    cases.push({
      fixture: name,
      index,
      note: {
        startTick: note.startTick,
        duration: note.duration,
        channel: note.channel,
        isWide: !!note.isWide,
      },
      // null = 원본이 아무 표시도 붙이지 않았다(겹치지 않음).
      expected: entry === null ? null : { ...entry },
    });
  }
}

await emit('overlap', {
  tolerance: { integer: 'exact' },
  fieldNames: 'original (conflux-editor)',
  note2:
    '원본은 3겹 이상을 conflict로 잡지 못하고(pairwise), 먼저 찍힌 표시를 유지한다. ' +
    '재설계와 갈리는 자리는 설계 대장 DM-3·DM-6.',
  cases,
});
