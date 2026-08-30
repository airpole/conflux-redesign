# ui-design (최소본) — tokens + result layout

status: Accepted (D-2026-051) — §6(scene.md §9 필드 추가)은 D-2026-054, §7-3(티어 색 대 실패 적색)은 D-2026-055로 닫혔다. §7-2(티어 색 대 Shape 색)는 결정이 아니라 scene 축 분리 확인으로 해소— 별도 D-log 없음
supersedes: D-2026-051 초안 (원본 `play-result.js` 계승안)
scope: UI 토큰 세트 + result 화면 레이아웃

원본 계승안에서 출발해 반복 수정한 결과물. 그룹 순서·토큰·타이포·간격이
모두 바뀌었으므로 원본과의 diff가 아니라 이 문서를 기준으로 구현한다.

---

## 1. 토큰

### 1.1 표면 / 텍스트 / 괘선

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg` | `#050508` | result 스테이지 배경 |
| `--text` | `#ececf4` | 본문 |
| `--dim` | `#9a9ab4` | 라벨, 보조 수치 |
| `--dimmer` | `#6b6b84` | 최하위 보조 |
| `--rule` | `#1e1e30` | 헤어라인 |
| `--rule-strong` | `#3a3a54` | 버튼 테두리, σ 구간선 |
| `--cyan` | `#4fbcd0` | 액센트 |
| `--on-accent` | `#04040a` | 액센트 위 글자 |

`--cyan`은 `theme.md`의 `WIDE_COLOR`(`#4AE8FF`)·`TEXT_COLOR`(`#4ae0ff`)와 같은
색상 계열이되 채도와 명도를 낮춘 값이다. 원본 초안의 보라 액센트는 채택하지
않았다. note 팔레트와 색상은 공유하고 톤으로 분리한다.

### 1.2 판정색 (파생의 뿌리)

| 토큰 | 값 |
|---|---|
| `--j-sync` | `#ffffff` |
| `--j-perfect` | `#ffd23f` |
| `--j-good` | `#5cff96` |
| `--j-miss` | `#ff5f70` |

### 1.3 게이지

| 토큰 | 값 |
|---|---|
| `--gauge-NORMAL` | `#4aa870` |
| `--gauge-HARD` | `#ffa63d` |
| `--gauge-FC` | `var(--j-good)` |
| `--gauge-AP` | `var(--j-perfect)` |
| `--gauge-AS` | `var(--j-sync)` |

### 1.4 클리어 상태 — 파생

| 상태 | 토큰 |
|---|---|
| AS | `var(--j-sync)` |
| AP | `var(--j-perfect)` |
| FC | `var(--j-good)` |
| H | `var(--gauge-HARD)` |
| C | `var(--gauge-NORMAL)` |
| P | `#8a8aa4` |
| N | `#6b6b84` |
| F | `var(--j-miss)` |

규칙: state 색을 독립 정의하지 않는다. AS/AP/FC/F는 판정색, H/C는 게이지색을
참조한다. 같은 클리어 조건은 어느 화면에서든 같은 색으로 나타난다.

`theme.md`에 state 색이 이미 정의돼 있으면 이 규칙으로 대체한다. 중복 정의
금지 원칙은 유지하되, 참조 방향이 판정 → state → 게이지가 되도록 한다.

### 1.5 난이도 티어 — B G R W D

| 티어 | `--tier-*` | `--ink-*` |
|---|---|---|
| TRACE | `#4a9eff` | `#050508` |
| DRIFT | `#4ade80` | `#050508` |
| SURGE | `#ff4d5e` | `#050508` |
| FLUX | `#ffffff` | `#050508` |
| PHASE | `#22222e` | `#ececf4` |

색은 글자가 아니라 박스 배경에 칠하고 글자를 반전한다. D(PHASE)가 어두운
배경에 묻히지 않게 하기 위한 필수 조건이며, 다섯 티어 모두 동일 방식으로
표기한다.

### 1.6 랭크

| 랭크 | 토큰 |
|---|---|
| U | `var(--cyan)` |
| S+, S | `#ffd23f` |
| A+, A | `#ececf4` |
| B | `#b0b0c8` |
| C, D | `#8a8aa4` |
| F | `var(--j-miss)` |

### 1.7 FAST / SLOW

| 토큰 | 값 |
|---|---|
| `--fast` | `#ff6b7a` |
| `--slow` | `#6aa8ff` |

값이 0이면 `--dimmer`로 표시한다.

### 1.8 타이포

```
--sans: "Pretendard Variable", Pretendard, ui-sans-serif, system-ui,
        -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
        "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
--mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
        "Liberation Mono", "Roboto Mono", monospace;
```

- 모든 수치는 `--mono` + `font-variant-numeric: tabular-nums`
- 곡 제목/아티스트/버튼은 `--sans`
- 마이크로 라벨: `font-size: max(9px, .82cqw)`, `letter-spacing: .18em`, 대문자
- 하한(`max()`) 필수. cqw 단독은 좁은 스테이지에서 9px 이하로 내려간다

---

## 2. 레이아웃

스테이지 16:9 고정, `container-type: size`, 내부 단위는 `cqw`.
780px 이하에서 비율 고정을 풀고 세로 스택 + px 타이포로 전환한다.

```
┌─ 곡 (4.4fr) ─┬─ 결과 (11.6fr) ──────────────────────────┐
│ 자켓          │ [1] score  rank  state                   │
│ 제목 (2줄)    │     accuracy (라벨 없음)                  │
│ 아티스트      │ ─────────────────────────────────────── │
│ BPM · 길이    │ [2] Best score / Best acc / Max combo    │
│ (spacer)      │ ─────────────────────────────────────── │
│ 티어 칩 [부제]│ [3] Judgment      │ Timing               │
│ Gauge/Mods/   │     + 게이지 그래프│ + 분포 + FAST/SLOW   │
│ Played        │                   │                      │
├───────────────┴──────────────────────────────────────────┤
│                        [선택으로 BACKSPACE] [다시 ENTER] │
└──────────────────────────────────────────────────────────┘
```

### 2.1 [1] 성적

- `score` · `rank` · `state` 세 요소가 **같은 폰트 크기**(3.7cqw)로 한 줄.
  색으로만 구분한다. state는 테두리 박스 없이 풀네임(FULL COMBO, ALL SYNC,
  HARD CLEAR, CLEAR, FAILED)으로 표기한다. 약어(FC/AS)는 곡 선택창 전용.
- `accuracy`는 그 아래 2.1cqw, 라벨 없이 값만. 색 `--dim`.
- 명칭은 **Accuracy**. Sync%가 아니다. SYNC는 판정 이름으로만 쓴다.

### 2.2 [2] 기록

3열 그리드 — 라벨 / 값 / 델타. 세 행 모두 같은 축에 정렬.

| 행 | 값 | 델타 |
|---|---|---|
| Best score | 갱신 전 최고 점수 | 현재 − 이전 |
| Best acc | 갱신 전 최고 정확도 | 현재 − 이전 |
| Max combo | 이번 판 최대 콤보 | 없음 |

- 기록이 없으면 기준선을 `0` / `0.00%`로 두고 전체 값이 델타가 된다
- 델타 색: 양수 `--cyan`, 음수 `--j-miss`, 동률 `--dim` (`+0` 표기)
- NEW 배지 없음. 부호가 갱신 여부를 말한다
- 정렬: 값은 우측(min-width 7cqw), 델타는 좌측. 라벨–값 1.6cqw,
  값–델타 1cqw. 세로는 baseline이 아니라 `center`
- 부동소수점 방지: 델타 부호 판정 전에 표시 자릿수로 반올림한다

### 2.3 [3] 판정 · 타이밍

**판정 열** — 숫자만. 바·비율 없음.

```
Judgment
SYNC          842
PERFECT        36
GOOD            4
MISS            0
─────────────────
TOTAL NOTES   882
```

전부 `--text` 단색. TOTAL NOTES는 목록 하단에 헤어라인으로 분리.

**게이지 그래프** — 판정 목록 아래, 열 바닥에 붙임.

- 라벨은 `Gauge`만. 종류는 좌측 옵션 패널에 이미 있다
- 라인 색 = `--gauge-{종류}`
- 우측에 종료 시점 잔량 %
- 임계선·실패 마커 없음. 실패 시 궤적이 중단 지점에서 끝난다
- 높이 5.6cqw

**타이밍 열**

- 히스토그램 막대를 판정 창별로 칠한다. 텍스트 라벨 없음
  - `|오차| ≤ 25` → `--j-sync`
  - `≤ 50` → `--j-perfect`
  - `≤ 100` → `--j-good`
  - 초과 → `--j-miss`
- Wide는 제외하지 않는다. 판정 창이 넓을 뿐 SYNC로 들어가므로 같은 분포
- 축 `±110ms`, 눈금은 `−50 / 0 / +50` 숫자만
- 통계 라벨은 `Average` / `Spread` (Mean / σ 아님)
- 하단 FAST/SLOW 균형 바 + 좌우 텍스트. 화살표 기호 없음

### 2.4 곡 열

- 제목 2줄 클램프, `word-break: keep-all`
- 티어 칩: 배경 `--tier-*`, 글자 `--ink-*`, 콘텐츠 폭. `TIER LEVEL`까지만 포함
- 부제는 칩 **밖**, 같은 폰트 크기, `--text`. 표기 `[Subtitle]`
- 옵션: Gauge / Mods / Played. **오디오 오프셋은 표시하지 않는다**
- Cascade는 표기하지 않는다. 확정된 게이지 이름과 색만 쓴다

---

## 3. 좌표 유도

플롯 좌표를 상수로 박지 않는다.

```js
export const WINDOW = { SYNC: 25, PERFECT: 50, GOOD: 100 }  // ms
export const AXIS = 110                                      // ±ms
export const msToPct = ms => ((ms + AXIS) / (AXIS * 2)) * 100
```

밴드·평균선·눈금 위치는 전부 위 상수에서 계산한다. 판정 창을 조정하면
그래프가 자동으로 따라간다.

---

## 4. 키 바인딩

| 키 | 동작 |
|---|---|
| BACKSPACE | 선택으로(Back → song-select) |
| ENTER | 다시 하기(Retry) |

Space는 result에서 쓰지 않는다.

**Back = Backspace, Retry = Enter** (D-2026-053, D-2026-052 정정) — 1차
근거는 **일관성**이다: D-2026-052가 Backspace를 전 씬 공통 "한 화면 뒤로"로
통일했으므로, result도 그 의미를 따른다. Back이 Enter였다면 그 통일에
result만 예외로 남았을 것이다. Backspace를 Back에 두면 예외가 사라지고,
남은 Enter가 자연스럽게 실행/재시도가 된다. 2차 근거는 반사 입력 차단 —
곡 종료 직후 손이 아직 lane 키(Space 포함) 위에 있어 마지막 노트에 대한
연타 관성이 재시작으로 흘러들 수 있다. F5는 브라우저 새로고침 단축키와
겹쳐 애초에 후보가 아니었다.

result 화면은 ESC를 쓰지 않는다. `scene.md`의 기존 ESC 바인딩은 이 문서의
범위 밖이었으나 D-2026-052로 결정됐다 — §9 참조.

구현 조건:
- `keydown`에서 `preventDefault()`. `keyup`은 늦다
- 키 핸들러는 document 레벨, 버튼은 `tabindex="-1"`.
  포커스된 `<button>`이 Enter를 클릭으로 소비하는 것을 막는다
- 진입 후 400ms 입력 락아웃 → 첫 입력은 연출 스킵으로 소비 → 두 번째부터 동작.
  마지막 노트 직후의 반사적 연타를 흡수한다

---

## 5. 접근성 / 기타

- 버튼은 실제 `<button>`, `:focus-visible` 링 필수
- `--st-F` 대비 5.0:1 이상 유지. 원본 계열의 어두운 적색은 2.3:1로 미달
- 마이너스 부호는 U+2212(`−`)로 통일. 하이픈 혼용 금지
- FAST/SLOW를 색으로만 구분하지 않는다. 위치와 텍스트를 함께 쓴다
- 등장 연출: 점수 카운트업 → rank/state 스탬프. `prefers-reduced-motion` 대응
- 결과 요약을 `aria-live="polite"`로 한 문장 제공

---

## 6. scene.md §9 개정 필요 [계획]

§9 `result` 표시 목록과 대조해 실제로 빠진 다섯 필드만 남긴다(재검토 경과는
DECISION_LOG D-2026-0xx). `chart.subtitle`·`fast`/`slow`(표시)·`prevBest`(표시
자체)는 이미 §9 "result 표시" 줄에 있어 제외했다 — `prevBest`는 필드 추가가
아니라 §9 문면에 **null 허용과 0 기준선 동작**을 명시하는 문제로 남는다(§6.1).
`options.settled`는 §6.2에서 확인한 대로 `tier` 전달 경로 문제이지 result의
표시 필드 문제가 아니다.

| 필드 | 타입 | 용도 | 수집 시점 / 보관 위치 |
|---|---|---|---|
| `gaugeTrace` | `number[]` | 게이지 궤적 그래프 | §6.3 |
| `progress` | `number` (0~1) | 실패 시 중단 지점. clear 시 항상 `1` | 세션 종료(`finalize`) 시 1회 계산 — `forceEnded ? (종료 tick / songEnd tick) : 1` |
| `timingErrors` | `Float32Array` | 타이밍 오차 분포 원자료(§6.4) — 통계(`mean`/`sigma`)는 result 화면이 계산한다 | 판정마다 1개 push, `playState`에 노트 수만큼 누적 |
| `fastCount` / `slowCount` | `number` | 균형 바 | 이미 `playState.fastCount`/`slowCount`([[naming]] §4, D-2026-039) — **신규 필드 아님**, §9 result 표시 줄의 "FAST·SLOW"가 이 값을 읽는다고 명시만 하면 된다 |
| `playedAt` | `number` (epoch ms) | 플레이 시각 | 세션 종료 시 1회, `Date.now()` |

### 6.1 `prevBest` — null 기준선 [계획]

기록이 없는 chart(M3 이전 전부, M3 이후에도 최초 플레이)는 `prevBest: null`을
정상 값으로 받는다. result 화면은 `prevBest == null`일 때 `0`/`0.00%`를
기준선으로 NEW BEST 델타를 계산한다 — M3(기록 저장)를 기다릴 필요 없이 지금
붙여도 동작한다. §9 "best record" 줄에 이 문장을 추가한다.

### 6.2 `options.settled` — 필드 아닌 전달 경로 문제 [확인 완료]

`PlayResult`(`src/core/core-gauge.ts:246`)에 `tier`가 없다. `evaluateState`가
`GaugeState.tier`를 내부에서 소비해 `state`를 산출하지만 `tier` 자체는
`computeResult` 반환값에서 버려진다 — result가 필요한 것은 `state`(마크)가
아니라 게이지 종류(`Tier`) 자체이므로 지금은 정말로 얻을 방법이 없다.

→ **새 result 필드가 아니라 `PlayResult.tier: Tier`를 core에 추가하는
문제**다. `render/theme.md`의 `--gauge-{tier}` 토큰과 옵션 패널의 게이지
이름 표시가 이 값을 그대로 쓴다. `game-session.ts`에서 `computeResult`
호출부 수정이 필요하다 — Change Scope에 포함한다.

### 6.3 `gaugeTrace` — 샘플링과 Cascade 범위 [계획]

- **샘플 개수·간격**: 고정 200포인트, **진행률(songEnd 200등분) 간격**이다
  `[번복 — 초안의 ms 간격 폐기]`. 고정 개수와 ms 간격은 같이 성립하지 않는다
  — ms 간격을 쓰려면 곡 길이로 나눠 정해야 하는데 그게 곧 진행률 간격이고,
  실패로 중간에 끊기면 ms 간격은 200개가 안 차 화면이 `progress`로 가로
  폭을 잡는 방식과 어긋난다. 진행률 간격은 곡이 끝나면 정확히 200개, 실패
  시 앞쪽 일부만 차 `progress` 폭 계산과 그대로 맞는다. pause·카운트다운은
  tick이 안 흐르므로 애초에 샘플이 밀리지 않는다 — ms 간격을 골랐던 이유
  자체가 사라진다.
- **Cascade 범위**: 게이지 종류별로 각각 200포인트 배열을 기록하다가, 세션
  종료 시 **확정된 tier의 배열만 남기고 나머지는 버린다** `[번복 — 초안의
  "매 샘플 최고 tier 하나" 폐기]`. "매 샘플 시점의 최고 tier"를 한 배열에
  이어붙이면 HARD 구간과 NORMAL 구간이 한 선으로 이어지며 확정색(하나) 아래
  값이 도약한다 — 화면은 단색 라인으로 확정돼 있어(§1) 전환 지점을 데이터로
  얹는 쪽(색이 중간에 바뀌는 안)은 그 레이아웃을 다시 여는 것이라 채택하지
  않는다. 메모리는 200 × 게이지 종류 수로 여전히 사소하다.

### 6.4 `timingErrors` — MISS 처리 [계획]

MISS는 오차 없는 판정이라 `NaN`으로 push한다. `0`으로 넣으면 분포 정가운데
가짜 봉우리가 생긴다 — result 화면의 히스토그램/σ 계산은 `NaN`을 표본에서
제외한다(개수 자체는 judgment count 쪽에 이미 집계됨, `fastCount`/`slowCount`와
동일하게 SYNC·MISS·wide·autoplay는 여기서도 제외 대상 — [[glossary]] §2 규칙과
정합).

**소비 쪽 주의 — 그대로 포팅하면 걸린다.** 원본 `js/judgment.js`의
`histogram()`은 범위 검사만 하고 `NaN`을 그대로 통과시켜 인덱스가 `NaN`이
되고, `timingStats()`는 평균이 통째로 `NaN`이 된다. 재구현하는 두 함수 모두
진입부에서 `Number.isFinite()`로 걸러야 한다 — Change Scope에 포함한다.

---

## 7. 미해결 [보류]

1. ~~note 팔레트 충돌~~ **해소.** `#4ae8ff`가 `WIDE_COLOR`와 완전히 같은
   값임이 확인되어 `#4fbcd0`으로 교체했다. `--gauge-NORMAL`도 `#5ad1ff`가
   `TEXT_COLOR`와 가까워 초록 계열 `#4aa870`으로 옮겼다.
2. **티어 색 대 Shape 색 [해소].** DRIFT `#4a9eff` / SURGE `#ff4d5e`가 Shape의
   Blue/Red 계열(`theme.md` §2 `#6bb5ff`/`#ff6b8a`)과 색상 계열은 겹치지만,
   Shape 경계는 `drawGameFrame`(gameplay 캔버스, editor test-play 공유)에서만
   그려지고 티어 칩은 song-select·result 두 scene에서만 노출된다 — `scene.md`
   §9 mode graph가 한 번에 한 scene만 활성화하므로 두 색이 같은 화면에
   동시에 뜨는 경로 자체가 없다(scene 축 분리). 코드로 확인됨 — `theme.md`
   §2 draw order·`scene.md` §9 mode graph 대조.
3. **SURGE 대 실패 적색 [수용]** (D-2026-055). `#ff4d5e`와 `--j-miss`
   `#ff5f70`이 가깝지만 렌더 형태가 다르다 — 티어 칩은 배경이 칠해진 박스,
   실패 표시는 작은 글자·아이콘이라 나란히 놓여도 형태로 갈린다. §7-5(CLEAR
   대 FULL COMBO)와 같은 논리 — 거기는 풀네임 텍스트가, 여기는 박스 대
   표식이 구분을 담당한다. 두 색이 실제로 만나는 조건(곡 선택창 실패 기록
   표시)은 M3(기록 저장) 이후에나 성립하므로 여기서 확정해 M3에서 재론하지
   않는다.
4. ~~`theme.md` 중복~~ **해소.** state·게이지 색은 §1.4 파생 규칙을 단일
   출처로 삼는다. `theme.md`에 중복 정의가 있으면 제거한다.
5. **CLEAR 대 FULL COMBO [수용].** `--st-C` `#4aa870`과 `--st-FC` `#5cff96`가
   같은 색상 계열이다. 명도·채도로 갈리고 배지가 풀네임을 쓰므로 수용한다.
   기본 상태를 어둡게 두어 FC/AP/AS가 도드라지는 것이 의도다.

---

## 8. 이관 메모

프로토타입은 React로 작성됐다. 코드는 그대로 이관되지 않는다.

| 대상 | 이관 |
|---|---|
| CSS 토큰 + 시맨틱 클래스 | 그대로 |
| `WINDOW` / `AXIS` / 포맷터 | `.js`로 그대로 |
| 렌더 | 플랫 ES 모듈 + `data-action` 패턴으로 재작성 |

---

## 9. ESC — 결정됨 (D-2026-052)

**안 A 채택** — 모든 ESC 바인딩에 비-ESC 대체키를 추가한다. `scene.md`에
반영됐다.

| 위치 | 기존 | 대체키 |
|---|---|---|
| credits → title | Esc | **Backspace** |
| song-select → mode-select | Esc | **Backspace** |
| gameplay → pause overlay | Esc | **Backspace** (다른 화면의 Back과 같은 키로 통일 — gameplay에서도 "뒤로"가 pause를 연다) |
| song-select quick options 닫기 | Esc/Space | 이미 Space가 있어 추가 불필요 |

B(`navigator.keyboard.lock`)는 Chromium 전용이라 채택하지 않았다 — Firefox·
Safari에서 결국 A로 폴백해야 해 대체키를 두 벌 유지하는 비용이 더 크다.

부수 확인: result가 D-2026-053으로 Space를 완전히 놓으면서(Back=Backspace,
Retry=Enter) 이 항목은 자동으로 해소됐다 — result에 더 이상 Space가 없다.

song-select의 quick options 닫기(`Esc/Space`)를 Backspace로도 옮길지는
**이 게이트의 범위 밖**이다(D-2026-053). result의 반사 입력 근거(곡 종료
직후 손이 lane 키 위)는 song-select에는 없는 조건이라 그대로 옮길 수 없고,
Backspace-as-back 통일 관점에서 바꾸려면 "오버레이 닫기가 화면 뒤로가기인지
패널 닫기인지"부터 song-select UX를 보고 정해야 한다. song-select 작업 때
별도로 처리한다.
