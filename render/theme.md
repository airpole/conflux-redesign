# theme — 표현 값 단일 출처

> render가 화면을 그릴 때 참조하는 **정해진 표현 값**(색·draw order·치수·폰트)을 한 곳에 모은다.
> core의 [[constants]](로직 수치: 판정창·게이지 증감)와 분리된다 — 이건 "어떻게 보이나", 저건 "어떻게 동작하나". 바꾸면 보이는 것만 달라진다.
> 정의 문서(glossary 등)는 "무엇을 표시하는가"만, 표현 값은 여기서만 정한다. 값은 현재 코드 실측, 태그 `[보존]`(바꾸려면 [수정]).
> 값은 현재 코드 실측, 태그 `[보존]`(바꾸려면 [수정]). 색·draw order·치수·폰트 모두 실측 확정. 남은 건 일부 색의 변수 경유 hex 재확인(§5 잔여)뿐 — 기억으로 채우지 않는다.

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

## 3. 치수 (dimension)

실측: `play-render.js` / `game-render.js`. 모든 치수는 플레이필드 폭 `gw` 또는 높이 `gh`의 비율로 잡혀 해상도 독립이다. 태그 `[보존]`.

### 플레이필드 박스

| 값 | 산출 | 비고 |
|---|---|---|
| 종횡비 | **16:9** (`asp = 16/9`) | 캔버스에 레터박스, 중앙 정렬 |
| `gw/gh/gx/gy` | 캔버스 `cw/ch`에서 16:9로 맞춰 산출 | 넘치는 축에 여백, DPR 반영 |
| 캔버스 바깥 | `#000`, 플레이필드 바닥 `#050508` | §1 배경 |
| 클립 | 플레이필드 박스로 `ctx.clip()` | 바깥으로 안 새게 |

### 판정선 · 게이지 바

| 값 | 산출 |
|---|---|
| 판정선 Y | `jY = gy + gh × min(8/9, judgeLinePos)`. 기본 `8/9`=최하단, raise-only → [[settings]] |
| 게이지 트랙 두께 | `6px` (`jY−3 … jY+3`) |
| 게이지 글로우 | `12px` (`jY−6 … jY+6`), leading edge |
| baseline 선 | `1px` 흰선 |

### notes · lane

| 값 | 산출 |
|---|---|
| 노트 두께 | `noteThickness × (wide ? 1 : 0.9)`. 기본 `noteThickness=15px` → [[settings]] |
| 노트 좌우 패딩 | normal `lnW × 0.05`, wide `0` |
| lane 폭 `lnW` | wide=전폭 `sw`; normal=`(lines[li]/100) × sw` (구분선 비율) |
| conflict 테두리 | `lineWidth 2`, `CONFLICT_COLOR` |

### 키 빔 · 선

| 값 | 산출 |
|---|---|
| 키 빔 상단 | `beamTop = gy + gh × 0.30` (1/3 지점부터 페이드 인), jY까지 |
| 키 빔 헤드 | `jY−10 … jY` 높이 10px |
| 마디선 | `lineWidth 1.5`, `#ffffff22` |
| step 선(shape 점프) | `lineWidth 2`, `#7ad6ff66` (마디선 위, sky-blue) |

### sudden · hit effect

| 값 | 산출 |
|---|---|
| sudden 커버 높이 | `(jY − gy) × min(0.95, sudden/100)` — 상단부터, 최대 95% |
| hit effect 반지름 | `FIXED_R = gw × 0.045` (shape 폭과 무관, 고정) |
| effect 지속 | `300ms` (hold fade `250ms`) |

### HUD (drawUnifiedHUD)

기준 격자 `cell = gw / 16`. 글자 크기는 전부 `gw`(또는 cell) 비율.

| 값 | 산출 |
|---|---|
| combo 글자 | `gw × 0.06` |
| 판정 텍스트 | `gw × 0.021` |
| 카운터 | `gw × 0.014` |
| 퍼센트 | `gw × 0.01625` |
| F/S 텍스트 | `gw × 0.016` |
| combo 블록 Y | `comboY = jY − gh × (8/9 − 0.22)` — 판정선 따라 이동 |
| 판정 Y | `comboY + comboSz/2 + G + judgeSz/2` (`G = gw × 0.008`) |
| pause 버튼 | 좌상단 cell 내 두 막대 `barW=cell×0.12`, `barH=cell×0.45` |
| 곡정보 띠 | 기본 밴드 `[jYDefault → 바닥]`에 **고정**(판정선 raise 무관) |
| 곡명 | `cell × 0.28`, `#ffffffdd` |
| 아티스트 | `titleSz × 0.8`, `#ffffff99` |

> **HUD 밴드 고정**: 곡정보 띠는 늘 기본 밴드(`jYDefault = gy + gh × 8/9` 아래)에 그려져, 판정선을 올려도(`judgeLinePos`) 띠는 제자리·combo 블록만 따라 오른다 → §2 draw order.

---

## 4. 폰트 · 텍스트 스타일

실측: HUD·text event 전부 **`bold {size}px sans-serif`** 한 패밀리. 크기는 §3 표(전부 `gw`/`cell` 비율). 정렬·그림자만 추가:

| 요소 | 정렬 | 그림자(blur) |
|---|---|---|
| combo | center | `gw × 0.012` |
| 판정 텍스트 | center | `gw × 0.01` |
| 카운터·퍼센트 | center | `gw × 0.008` |
| F/S | center | `gw × 0.008` |
| 곡명·아티스트 | left | `gw × 0.006` |
| pause 막대 | — | `gw × 0.004` |

- 전 텍스트 **수직 중앙 정렬**(`drawTextVC`: ascent/descent 보정).
- text event 색 `TEXT_COLOR`(§1), 폰트 동일 sans-serif.

> 폰트 패밀리가 `sans-serif` 단일이라 별도 폰트 로딩 없음. 굵기는 전부 bold. 커스텀 폰트는 미사용 [보존].

---

## 5. 결정 완료 / 잔여

확정:
- [x] theme = render 표현값 단일 출처, core constants(로직)와 분리
- [x] colors.md 흡수·승격 (색 전부 이전)
- [x] `INVALID_COLOR`→`CONFLICT_COLOR` 개명 ([[glossary]] overlap/conflict와 정합)
- [x] draw order(z-층) 실측 확정 — sudden 위치·판정선=게이지·HUD 밴드 고정·pause DOM
- [x] 판정 색(hit effect)·배경 색 추가 추출
- [x] §3 치수 전수 추출 (16:9 박스·jY·노트/lane·키빔·sudden·hit effect·HUD 앵커)
- [x] §4 폰트 — `bold {size}px sans-serif` 단일, 커스텀 폰트 없음

잔여:
- [ ] 게이지 75%(`NORMAL_CLEAR_PCT`) 반전 색 정확한 hex (코드가 변수라 리터럴 미확정)
- [ ] state·gauge 일부 색의 정확한 hex 재확인 (추출 시 변수 경유분)
