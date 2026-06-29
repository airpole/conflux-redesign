# theme — 표현 값 단일 출처

> render가 화면을 그릴 때 참조하는 **정해진 표현 값**(색·draw order·치수·폰트)을 한 곳에 모은다.
> core의 [[constants]](로직 수치: 판정창·게이지 증감)와 분리된다 — 이건 "어떻게 보이나", 저건 "어떻게 동작하나". 바꾸면 보이는 것만 달라진다.
> 정의 문서(glossary 등)는 "무엇을 표시하는가"만, 표현 값은 여기서만 정한다. 값은 현재 코드 실측, 태그 `[보존]`(바꾸려면 [수정]).
> 색·draw order는 이번에 확정. **치수·폰트(§3·§4)는 game-render 정밀 추출 후 채울 placeholder** — 기억으로 채우지 않는다.

---

## 1. 색

### 노트 (Note)

| 용도 | 상수 | HEX |
|---|---|---|
| wide head | `WIDE_COLOR` | `#4AE8FF` (ice-cyan) |
| wide body | `WIDE_BODY` | `#008898` |
| wide body (반투명, 그리드 비침) | `WIDE_BODY_ALPHA` | `#008898cc` |
| overlap head | `OVERLAP_COLOR` | `#FFE14A` (gold) |
| overlap body | `OVERLAP_BODY` | `#C89830` |
| normal body | `NORMAL_BODY` | `#8888a0` (blue-gray) |
| text event | `TEXT_COLOR` | `#4ae0ff` |
| conflict 경고 테두리 | `CONFLICT_COLOR` | `#ff3040` (red) |

> `overlap`(2키 lane 겹침, 노랑)과 `conflict`(1키 lane·Wide-on-Wide 겹침, 빨강 테두리)의 정의·검출은 → [[glossary]] / [[data-model]] §5.1. 구 `INVALID_COLOR`→`CONFLICT_COLOR` 개명.

### state (결과 상태)

종류 정의는 [[glossary]], 색은 여기.

| state | 의미 | HEX |
|---|---|---|
| `AS` | All Sync | `#ffffff` (흰) |
| `AP` | All Perfect | `#ffd23f` (노랑) |
| `FC` | Full Combo | `#5ad1ff` (하늘) |
| `C` | Clear (normal) | `#4aff8a` (초록) |
| `H` | Hard clear | `#ff4a5a` (빨강) |
| `F` | Fail | `#ff4a5a` (빨강) |
| `N` | Not played | `#9aa0a6` (회색) |

### gauge (게이지 바)

| mode | HEX |
|---|---|
| `normal` | `#4aff8a` (초록) |
| `normal` 75%(`NORMAL_CLEAR_PCT`) 도달 | `#…` 밝은 하늘 (clear-secured 신호) |
| `hard` | `#ff4a5a` (빨강) |
| AS/AP/FC 모드 바 | state 색 따름 (위 표) |

> 게이지 75% 색 반전 임계 `NORMAL_CLEAR_PCT`의 **수치**는 [[constants]](로직), 그때의 **색**은 여기. 정확한 hex는 §3 추출 패스에서 확정.

### 판정 피드백 (Fast / Slow)

| 용도 | 상수 | HEX |
|---|---|---|
| FAST | `FAST_COLOR` | `#ff5a6a` (빨강) |
| SLOW | `SLOW_COLOR` | `#5aa0ff` (파랑) |

### 판정 색 (hit effect)

| 판정 | HEX |
|---|---|
| SYNC | `#ffffff` |
| PERFECT | `#ffe44a` |
| GOOD | `#4aff8a` |
| MISS | `#ff4a6a` |

### shape / lane 편집선

| 용도 | HEX | 굵기(px) |
|---|---|---|
| Blue 선 | `#6bb5ff` | 1.5 |
| Red 선 | `#ff6b8a` | 1.5 |
| Blue step connector | `#6bb5ffaa` | 1.5 |
| Red step connector | `#ff6b8aaa` | 1.5 |
| 그리드선 (배경) | `#383850` / `#1e1e30` | — |

### 배경

| 용도 | HEX |
|---|---|
| 캔버스 바깥 | `#000` |
| 플레이필드 바닥 | `#050508` |

---

## 2. draw order (z-층)

한 화면 안 쌓임 순서. **캔버스 패스 순서가 곧 z-순서**다(아래부터 그려 위에 덮는다). pause만 캔버스 위 DOM 1층(§아래). 실측: `play-render.js` 외곽 + `game-render.js` `drawGameFrame`.

아래(먼저 그림) → 위(나중):

```
0  캔버스 바닥(#000) · 플레이필드 바닥(#050508)      [play-render 외곽]
1  jacket 배경 (jacketBrightness 적용)               ┐
2  playfield: shape 경계(Blue·Red) · step connector  │
3  키 빔 (눌린 lane 하이라이트, live 세션만)           │ drawGameFrame
4  마디선 · step 선                                   │ (game-render)
5  notes (body→head 2패스, overlap z정렬)             │
6  sudden (상단 불투명 레인 커버)                      │
7  판정선 / 게이지 바 (판정선이 게이지를 겸함)          │
8  hit effect (물결 반원)                             │
9  text event 표시                                   ┘
10 HUD: combo 블록 · 곡정보 띠 · pause 버튼           [play-render, drawGameFrame 위]
── (DOM) ──────────────────────────────────────────
11 pause overlay (메뉴·버튼)                          [인터랙티브, 캔버스 위 DOM]
```

확정 포인트 (실측):
- **sudden은 notes 뒤·판정선 앞**(5 < 6 < 7) — 노트를 가리되 판정선·게이지·이펙트는 가리지 않는다.
- **판정선 = 게이지 바**: 같은 자리(`jY`)에 그려지고, live 세션이면 게이지로 채워진다.
- **HUD 띠는 기본 밴드 고정**: 판정선을 raise해도(`judgeLinePos`) 하단 곡정보 띠는 기본 위치에 남고, combo 블록만 판정선을 따라 올라간다 → [[settings]] judgeLinePos.
- **pause만 DOM**: 버튼 클릭 판정이 필요해 캔버스가 아니라 위 DOM 층. 나머지는 전부 캔버스 패스. overlay 개념 → [[scene]] §9.

---

## 3. 치수 (dimension) — placeholder

> ⚠️ **미추출.** jY(판정선 Y 비율)·gw/gh 산출·선 굵기·히트이펙트 반지름·HUD 앵커 등 레이아웃 수치는 `game-render.js`/`play-render.js` 정밀 추출 패스에서 실측으로 채운다. 기억으로 채우지 않는다. 현재까지 단서(실측 일부):

- 판정선 기본 위치: `jY = gy + gh × min(8/9, judgeLinePos)`. 기본 `8/9`(최하단), raise-only → [[settings]].
- 게이지 바 두께: `6px`(track), leading glow `12px` 언저리.
- combo 글자: `gw × 0.06`, 판정 텍스트: `gw × 0.021`.
- combo 블록 Y: `jY − gh × (8/9 − 0.22)` 근방 (판정선 따라 이동).
- hit effect 반지름: `gw × 0.045` 언저리.
- (전수: 레인 구분선 굵기, 곡정보 띠 레이아웃, sudden 커버 높이 = sudden% × … 등)

---

## 4. 폰트 · 텍스트 스타일 — placeholder

> ⚠️ **미추출.** 곡명·콤보 숫자·판정 텍스트·text event의 폰트 패밀리·웨이트·정렬을 추출 패스에서 채운다.

---

## 5. 결정 완료 / 잔여

확정:
- [x] theme = render 표현값 단일 출처, core constants(로직)와 분리
- [x] colors.md 흡수·승격 (색 전부 이전)
- [x] `INVALID_COLOR`→`CONFLICT_COLOR` 개명 ([[glossary]] overlap/conflict와 정합)
- [x] draw order(z-층) 실측 확정 — sudden 위치·판정선=게이지·HUD 밴드 고정·pause DOM
- [x] 판정 색(hit effect)·배경 색 추가 추출

잔여:
- [ ] §3 치수 전수 추출 (game-render/play-render 정밀 패스) — 별도 세션
- [ ] §4 폰트·텍스트 스타일 추출
- [ ] 게이지 75% 반전 색 정확한 hex
