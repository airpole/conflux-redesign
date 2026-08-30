# ui-design (최소본) — tokens + result layout

status: draft (승인 대기) — §7-1 · §7-4 해소됨, ESC 항목 분리됨
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
│                              [선택으로 ENTER] [다시 SPACE] │
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
| ENTER | 확인 / 선택으로 |
| SPACE | 다시 하기 |

result 화면은 ESC를 쓰지 않는다. `scene.md`의 기존 ESC 바인딩은 이 문서의
범위 밖이며 **건드리지 않는다** — §9 참조.

구현 조건:
- `keydown`에서 `preventDefault()` (Space 스크롤 차단). `keyup`은 늦다
- 키 핸들러는 document 레벨, 버튼은 `tabindex="-1"`.
  포커스된 `<button>`이 Space를 클릭으로 소비하는 것을 막는다
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

## 6. scene.md §9 개정 필요 [보류]

§9 필드 목록에 없으나 이 레이아웃이 요구하는 항목. 별도 게이트로 처리한다.

| 필드 | 용도 |
|---|---|
| `gaugeTrace: number[]` | 게이지 궤적 그래프 |
| `progress: number` | 실패 시 중단 지점 (0~1) |
| `timing: { mean, sigma }` | 타이밍 분포 |
| `fast`, `slow` | 균형 바 |
| `chart.subtitle?: string` | 난이도 부제 |
| `options.settled?: GaugeType` | Cascade 확정 게이지 |
| `prevBest: {...} \| null` | 갱신 전 기록. null이면 0 기준선 |
| `playedAt` | 플레이 시각 |

---

## 7. 미해결 [보류]

1. ~~note 팔레트 충돌~~ **해소.** `#4ae8ff`가 `WIDE_COLOR`와 완전히 같은
   값임이 확인되어 `#4fbcd0`으로 교체했다. `--gauge-NORMAL`도 `#5ad1ff`가
   `TEXT_COLOR`와 가까워 초록 계열 `#4aa870`으로 옮겼다.
2. **티어 색 대 Shape 색 [미확인].** DRIFT `#4a9eff` / SURGE `#ff4d5e`가
   Shape의 Blue/Red 계열과 겹칠 수 있다. 티어 칩은 곡 선택창에도 노출된다.
   `shape.md` / `theme.md`와 대조 필요.
3. **SURGE 대 실패 적색 [미확인].** `#ff4d5e`와 `--j-miss` `#ff5f70`이 가깝다.
   곡 선택창에 실패 기록 표시를 넣으면 같은 화면에서 부딪힌다.
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

## 9. ESC — 범위 밖 [별도 게이트]

이 문서는 ESC를 쓰지 않으며 `scene.md`의 기존 바인딩을 변경하지 않는다.
아래는 별도 결정으로 올릴 사안이다.

전체화면을 지원하면 ESC는 전체화면 중 브라우저에 귀속되어 앱에 도달하지
않는다. `preventDefault()`로 막을 수 없다. 따라서 `scene.md`의 ESC 바인딩
(`Back/Esc → title`, `Back/Esc → mode-select`, `Esc → pause`,
song-select `Esc/Space`)은 **창 모드에서만 동작하고 전체화면에서는 동작하지
않는** 상태가 된다. 아예 못 쓰는 것보다 나쁘다.

선택지:

| 안 | 내용 | 대가 |
|---|---|---|
| A | 모든 ESC 바인딩에 비-ESC 대체키 추가 | 바인딩 4곳 수정 |
| B | `navigator.keyboard.lock(['Escape'])` | Chromium 전용. Firefox·Safari는 A로 폴백 |
| C | 전체화면 미지원 | 이미 지원 결정됨 |

부수 확인: song-select가 `Esc/Space`로 닫기를 쓴다. result가 Space를
재시도에 쓰므로 같은 키가 씬에 따라 닫기/재시도로 갈린다. 씬이 다르므로
충돌은 아니나 일관성 검토 대상이다.
