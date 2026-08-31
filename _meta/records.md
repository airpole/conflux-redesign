# records — 플레이 기록 단일 출처

> 플레이 결과(best 기록)의 저장 단위·스키마·갱신 규칙을 정의한다.
> state는 [[gauge]], rank·점수식은 [[constants]] §3, no-record gate는 [[settings]] §2.
> `.cfx`와 library는 records를 마이그레이션하지 않는다([[cfx]], [[persistence]]).
> records는 로컬 개인 데이터다 — 각 플레이어 기기의 records store에만 존재하며 공유·서버 제출은 범위 밖이다(D-2026-019 보류).

---

## 1. 저장 단위 — chart당 1개

기록은 playable chart당 1개이며 gaugeMode별로 갈리지 않는다.

- key: `songId:chartId`.
- `songId`·`chartId` 의미는 [[cfx]] §3~§4.
- init(`chartId 0`)은 records 대상이 아니다.
- library에서 현재 대응 chart가 없으면 기록은 UI에서 숨기되 데이터를 즉시 삭제하지 않는다(고아 기록).
- chartId가 바뀌어도 기록을 새 id로 이전하지 않는다 `[번복]`.
- reimport loader는 본문 비교, rename 감지, record key 이동을 수행하지 않는다.

### 내용 변경과 기록 (D-2026-017)

기록은 chart identity를 따라 유지된다. 같은 `songId:chartId`에서 notes/timing/music이 수정되어도 시스템은 내용 변경을 판별하지 않으며, 기존 기록을 분리·숨김·이전하지 않는다. content fingerprint는 도입하지 않는다.

- 부작용 수용: 리차팅으로 총 콤보 수가 줄면 저장된 `maxCombo`가 새 내용의 최대치를 넘거나, `bestState`가 새 내용 기준으로 재현 불가능한 값일 수 있다. 시스템은 이를 검증하지 않는다.
- 내용판과 어긋난 기록의 정리는 유저가 기록 초기화(§4)로 수행한다.

---

## 2. 스키마 `[번복]` (D-2026-070)

```js
record = {
  bestJudgments: { sync, perfect, good, miss },  // 최고 점수 판의 판정 분포
  totalUnits,     // bestJudgments를 낸 그 판의 chart 실제 판정 단위 수
  bestState,
  maxCombo,
}
```

- `score`·`accuracy`·`rank`는 `bestJudgments`에서 파생한다. 공식 단일 출처는 [[constants]] §3 `[번복]`.
- **분모는 항상 `totalUnits`다 — 자기완결 근사(bestJudgments 자신의 합을 분모로 쓰는 방식)는 두지 않는다** `[번복]` (D-2026-070). 그 방식은 미완주 판(예: 10단위 중 4단위만 SYNC로 치고 hard 사망)이 판정된 몫만으로 accuracy 100%가 나오면서 `bestState`(항상 `F`)와 모순되는 조합을 만들 수 있었다. `totalUnits`를 `bestJudgments`와 함께 저장해 그 문제를 없앤다 — 둘은 항상 같이 갱신된다(§3).
- `totalUnits`는 **판정 단위 수**이지 note 수가 아니다 — Tap 1단위, Hold는 head+tail 2단위([[judge]] §8, [[glossary]] "judgment unit"). Hold가 있는 chart는 `totalUnits`가 note 수보다 크다.
- 리차팅으로 chart의 `totalUnits`가 바뀌어도 이미 저장된 record는 갱신하지 않는다 — §1 "내용 변경과 기록"의 무판별 원칙과 같다. 다음에 그 chart로 적격 판을 쳐 다시 best가 갱신될 때만 새 `totalUnits`가 들어온다.
- `playCount`는 저장하지 않는다 `[번복]`.
- FAST/SLOW는 그 판 result 표시값이며 저장하지 않는다.

---

## 3. 갱신 규칙 `[번복]` (D-2026-070)

적격 판이 끝날 때마다:

| 필드 | 규칙 |
|---|---|
| bestJudgments + totalUnits | 이번 판의 score(항상 그 판의 실제 `totalUnits` 기준)가 저장된 score(항상 저장된 `totalUnits` 기준)보다 크면 **둘을 함께** 이번 판 값으로 교체 |
| bestState | `AS > AP > FC > H > C > F > N` 우선순위 병합 |
| maxCombo | 독립 `max` |

bestState·maxCombo는 bestJudgments(+totalUnits)와 독립적으로 갱신한다. 좋은 값만 모으는 것이 목적이므로 세 필드가 같은 판에서 나온 값일 필요는 없다. `totalUnits`는 별도 필드가 아니라 `bestJudgments`에 붙는 짝 — `bestJudgments`가 교체될 때만 함께 바뀐다.

---

## 4. 기록 초기화 `[신규]` (D-2026-017)

유저가 chart 단위로 record를 삭제할 수 있다.

- 대상: 선택한 playable chart의 record 1개(§2의 3필드 전체). 삭제 후 해당 chart는 `N`(Not played)으로 돌아간다.
- confirm 필수. 실행 취소는 없다.
- 진입점: song-select의 선택 chart([[scene]] §5).
- 노출: `FEATURES.recordReset` — game-internal 빌드에서만 노출한다([[architecture]] §4). game-public 빌드에는 UI가 없다.
- records store만 건드린다. `.cfx`·library blob·chart JSON은 불변이다.

---

## 5. no-record

단일 출처는 [[settings]] §2.

```text
no-record = autoplay OR staticShape OR 중간시작 OR editorOrigin
```

무적격 판은 result만 표시하고 record를 저장하지 않는다.

---

## 6. 소비처

- result: 이번 판과 best, NEW BEST 표시 → [[scene]] §9.
- song-select: slot의 state 램프와 정보 패널의 2×2 기록 표시 → [[song-select]] §3·§9.
- 현재 library chart와 연결할 수 없는 고아 기록은 표시하지 않는다.

---

## 7. 결정 완료 / 잔여

확정:
- [x] playable chart당 1기록, gaugeMode 통합
- [x] 4필드 스키마(bestJudgments·totalUnits·bestState·maxCombo)·독립 갱신 — score·rank·accuracy는 항상 실제 totalUnits 기준 파생, 자기완결 근사 없음 `[번복]` (D-2026-070)
- [x] no-record 판은 표시만
- [x] init 제외
- [x] chartId migration/rename 감지 폐기 `[번복]`
- [x] 고아 기록 숨김·보존
- [x] 내용 변경 무판별 — 기록은 identity 유지, fingerprint 미도입 (D-2026-017)
- [x] 기록 초기화 — chart 단위·confirm·song-select 진입·internal 게이트 `[신규]` (D-2026-017)

잔여:
- (없음 — 서버 기반 기록·리더보드는 D-2026-019로 별도 보류.)
