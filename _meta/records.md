# records — 플레이 기록 단일 출처

> 곡을 친 결과(best 기록)의 저장 단위·스키마·갱신 규칙을 정의한다.
> 사람이 정하는 값([[settings]])과 성격이 다르다 — records는 게임이 쓰는 값이다. 근거 → [[rationale#records를 별도 문서로 둔 이유]].
> state 정의·우선순위는 [[gauge]], rank·점수식은 [[constants]] §3, 무기록 게이트는 [[settings]] §2.
> 출처: `play-result.js` 실측. 태그 명시 없으면 `[보존]`.

---

## 1. 저장 단위 — chart당 1개

기록은 **chart(난이도)당 1개**다. gaugeMode별로 갈리지 않는다 — 어느 모드로 쳤든 한 기록에 병합된다. cascade 판도 같다(결과 state가 그대로 병합).

- **키**: `songId:chartId` `[수정]` — songId = UUID, chartId = song 내 식별 정수([[cfx]] §4·§5). UI 표기는 3자리 패딩(`001`). (구 metadata 슬러그 폐기 — 구 기록은 이관하지 않는다.)
- **고아 기록**: 라이브러리 곡을 chartId 구성이 바뀐 .cfx로 덮어쓰면 대응 없는 기록은 표시되지 않는다(데이터는 잔존, 삭제 안 함) `[신규]`.
- **매체**: 로컬 영속. 저장 설비는 env 소관([[architecture]]) — 이 문서는 계약(스키마·갱신 규칙)만 정한다.

---

## 2. 스키마

```
record = {
  bestScore,   // 최고 점수 (백만점제 → constants §3)
  bestRank,    // 최고 점수 판의 rank
  bestState,   // state 우선순위 병합 — 점수와 독립 (→ gauge)
  maxCombo,    // 독립 최대
  playCount,   // 적격 판 수
}
```

- rank는 점수의 순수 함수([[constants]] §3)라 `bestRank` = 최고 rank와 동치.
- `fastCount`/`slowCount`는 저장하지 않는다(그 판 result 표시 전용, [[glossary]] FAST/SLOW).

---

## 3. 갱신 규칙

적격 판(§4)이 끝날 때마다:

| 필드 | 규칙 |
|---|---|
| `bestScore` | `max(이번, 저장)` |
| `bestRank` | 이번 점수가 최고면 이번 rank, 아니면 유지 |
| `bestState` | [[gauge]] state 우선순위(`AS > AP > FC > H > C > F > N`)로 병합 — **점수와 독립**. 낮은 점수의 FC 판도 state는 갱신한다 |
| `maxCombo` | `max(이번, 저장)` — 점수·state와 독립 |
| `playCount` | +1 |

---

## 4. 무기록 (no-record)

게이트 정의는 [[settings]] §2가 단일 출처(`autoplay ‖ staticShape ‖ 중간시작`). 무적격 판은 **result 화면만 표시**하고, 저장·`playCount` 증가를 모두 하지 않는다.

---

## 5. 소비처

- **result** — 이번 판과 best를 나란히 표시, NEW BEST = 이번 점수 > 저장 `bestScore` → [[scene]] §8.
- **song-select** — 곡 목록에 chart별 `bestState`·`bestRank` 뱃지 → [[scene]] §5.

---

## 6. 결정 완료 / 잔여

확정:
- [x] chart당 1개, 전 gaugeMode 통합 (cascade 포함)
- [x] 필드 5종 (`bestScore`/`bestRank`/`bestState`/`maxCombo`/`playCount`)
- [x] `bestState`는 점수와 독립 병합, `maxCombo` 독립 최대
- [x] 무적격 판은 표시만 — 저장·playCount 없음
- [x] 매체는 env 소관, 이 문서는 계약만

확정 (추가):
- [x] 키 = `songId:chartId`, 구 기록 이관 없음, 고아 기록 숨김·보존

잔여:
- (없음)
