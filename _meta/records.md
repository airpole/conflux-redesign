# records — 플레이 기록 단일 출처

> 플레이 결과(best 기록)의 저장 단위·스키마·갱신 규칙을 정의한다.
> state는 [[gauge]], rank·점수식은 [[constants]] §3, no-record gate는 [[settings]] §2.
> `.cfx`와 library는 records를 마이그레이션하지 않는다([[cfx]], [[persistence]]).

---

## 1. 저장 단위 — chart당 1개

기록은 playable chart당 1개이며 gaugeMode별로 갈리지 않는다.

- 현재 key: `songId:chartId`.
- `songId`·`chartId` 의미는 [[cfx]] §3~§4.
- init(`chartId 0`)은 records 대상이 아니다.
- library에서 현재 대응 chart가 없으면 기록은 UI에서 숨기되 데이터를 즉시 삭제하지 않는다(고아 기록).
- chartId가 바뀌어도 기록을 새 id로 이전하지 않는다 `[번복]`.
- reimport loader는 본문 비교, rename 감지, record key 이동을 수행하지 않는다.

> **보류:** 같은 `songId + chartId`에서 notes/timing/music이 수정됐을 때 기존 기록을 어떻게 분리·보존·재표시할지는 후속 `records / game library` review에서 결정한다. content fingerprint와 key 변경을 이 문서에서 아직 정의하지 않는다.

---

## 2. 스키마

```js
record = {
  bestScore,
  bestRank,
  bestState,
  maxCombo,
  playCount,
}
```

- `bestRank`는 최고 점수 판의 rank.
- FAST/SLOW는 그 판 result 표시값이며 저장하지 않는다.

---

## 3. 갱신 규칙

적격 판이 끝날 때마다:

| 필드 | 규칙 |
|---|---|
| bestScore | `max(이번, 저장)` |
| bestRank | 이번 점수가 최고면 이번 rank, 아니면 유지 |
| bestState | `AS > AP > FC > H > C > F > N` 우선순위 병합 |
| maxCombo | 독립 `max` |
| playCount | +1 |

bestState·maxCombo는 bestScore와 독립적으로 갱신한다.

---

## 4. no-record

단일 출처는 [[settings]] §2.

```text
no-record = autoplay OR staticShape OR 중간시작 OR editorOrigin
```

무적격 판은 result만 표시하고 record 저장·playCount 증가를 하지 않는다.

---

## 5. 소비처

- result: 이번 판과 best, NEW BEST 표시 → [[scene]] §8.
- song-select: 현재 playable chart에 대응하는 bestState·bestRank badge → [[scene]] §5.
- 현재 library chart와 연결할 수 없는 고아 기록은 표시하지 않는다.

---

## 6. 결정 완료 / 잔여

확정:
- [x] playable chart당 1기록, gaugeMode 통합
- [x] 5필드 스키마·독립 갱신
- [x] no-record 판은 표시만
- [x] init 제외
- [x] chartId migration/rename 감지 폐기 `[번복]`
- [x] 고아 기록 숨김·보존

잔여 `[보류]`:
- [ ] 같은 identity에서 playable content가 변경될 때 기록 연결·분리
- [ ] content fingerprint의 입력·hash·record key 적용
- [ ] 과거 fingerprint 기록의 보존·재표시 UX
