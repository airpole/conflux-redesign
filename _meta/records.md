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

## 4. 기록 초기화 `[신규]` (D-2026-017)

유저가 chart 단위로 record를 삭제할 수 있다.

- 대상: 선택한 playable chart의 record 1개(§2의 5필드 전체). 삭제 후 해당 chart는 `N`(Not played)으로 돌아간다.
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

무적격 판은 result만 표시하고 record 저장·playCount 증가를 하지 않는다.

---

## 6. 소비처

- result: 이번 판과 best, NEW BEST 표시 → [[scene]] §8.
- song-select: 현재 playable chart에 대응하는 bestState·bestRank badge → [[scene]] §5.
- 현재 library chart와 연결할 수 없는 고아 기록은 표시하지 않는다.

---

## 7. 결정 완료 / 잔여

확정:
- [x] playable chart당 1기록, gaugeMode 통합
- [x] 5필드 스키마·독립 갱신
- [x] no-record 판은 표시만
- [x] init 제외
- [x] chartId migration/rename 감지 폐기 `[번복]`
- [x] 고아 기록 숨김·보존
- [x] 내용 변경 무판별 — 기록은 identity 유지, fingerprint 미도입 (D-2026-017)
- [x] 기록 초기화 — chart 단위·confirm·song-select 진입·internal 게이트 `[신규]` (D-2026-017)

잔여:
- (없음 — 서버 기반 기록·리더보드는 D-2026-019로 별도 보류.)
