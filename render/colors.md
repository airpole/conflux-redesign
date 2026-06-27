# Colors — 색 단일 출처

> 모든 색을 한 곳에 모은다. 정의 문서(glossary 등)는 "무엇을 기록/표시하는가"만 담고, 색은 여기서만 정한다.
> 값은 현재 코드 실측(`constants.js`). 태그 `[보존]` (재구현 시 바꾸려면 [수정]로).

---

## 노트 (Note)

| 용도 | 상수 | HEX |
|---|---|---|
| wide head | `WIDE_COLOR` | `#4AE8FF` (ice-cyan) |
| wide body | `WIDE_BODY` | `#008898` |
| wide body (반투명, 그리드 비침) | `WIDE_BODY_ALPHA` | `#008898cc` |
| overlap (코드 노트) head | `OVERLAP_COLOR` | `#FFE14A` (gold) |
| overlap body | `OVERLAP_BODY` | `#C89830` |
| normal body | `NORMAL_BODY` | `#8888a0` (blue-gray) |
| text event | `TEXT_COLOR` | `#4ae0ff` |
| L1·L4 overlap 경고 | `INVALID_COLOR` | `#ff3040` (red) |

---

## state (결과 상태)

glossary state 종류의 표시 색. 정의는 [[glossary]], 색은 여기.

| state | 의미 | HEX |
|---|---|---|
| `AS` | All Sync | `#ffffff` (흰) |
| `AP` | All Perfect | `#ffd23f` (노랑) |
| `FC` | Full Combo | `#5ad1ff` (하늘) |
| `C` | Clear (normal) | `#4aff8a` (초록) |
| `H` | Hard clear | `#ff4a5a` (빨강) |
| `F` | Fail | `#ff4a5a` (빨강) |
| `N` | Not played | `#9aa0a6` (회색) |

---

## gauge (게이지 바)

| mode | HEX |
|---|---|
| `normal` | `#4aff8a` (초록) |
| `hard` | `#ff4a5a` (빨강) |
| AS/AP/FC 모드 바 | state 색 따름 (위 표) |

---

## 판정 피드백 (Fast / Slow)

| 용도 | 상수 | HEX |
|---|---|---|
| FAST | `FAST_COLOR` | `#ff5a6a` (빨강) |
| SLOW | `SLOW_COLOR` | `#5aa0ff` (파랑) |

---

## shape / lane 편집선

| 용도 | HEX | 굵기(px) |
|---|---|---|
| Blue 선 | `#6bb5ff` | 1.5 |
| Red 선 | `#ff6b8a` | 1.5 |
| Blue step connector | `#6bb5ffaa` | 1.5 |
| Red step connector | `#ff6b8aaa` | 1.5 |
| 그리드선 (배경) | `#383850` / `#1e1e30` | — |

> 게임 플레이필드 레이아웃 색·굵기(판정선, 레인 구분선, 히트이펙트 등)는 아직 미추출 → [[EXTRACTED_FACTS]] §5 placeholder. render/playfield 정밀 추출 시 이 문서로 합친다.
