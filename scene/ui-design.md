# ui-design — 최소본 (DRAFT, 승인 대기)

> **상태: 초안.** 아직 승인되지 않았다 — 코드에 반영하지 않는다. 사용자가 확정하면
> 이 헤더를 지우고 `_plan/build-order.md` §2의 "ui-design 최소본" gate를 닫는다.
> 범위는 M2-6(result 화면)까지만 — song-select·settings·title·credits 등
> 나머지 화면은 M4 진입 gate("ui-design 전체")에서 다시 다룬다.

DOM으로 그리는 UI 화면(overlay·scene) 전용 값이다. 플레이필드 캔버스 자체의
색·치수·폰트는 이미 확정된 [[theme]]을 그대로 쓴다 — 겹치는 개념(state 색,
게이지 색)을 여기서 새로 정의하지 않고 링크만 한다(DESIGN_PRINCIPLES §3·§4).

---

## 0. 방향

플레이필드가 이미 어두운 배경(`#000`/`#050508`)과 절제된 네온 팔레트(cyan·gold·
magenta 계열 노트 색)를 쓰고 있다 — UI 화면이 그 다음에 바로 이어지므로
톤이 갑자기 바뀌면 눈에 튄다. **게임 화면과 같은 어두운 배경 위에, 채도를
낮춘 중립 표면 + 절제된 보라 계열 accent** 하나로 좁혀 정보 위계를 색이 아니라
크기·굵기로 표현한다. 장식보다 가독성 — result는 숫자를 빨리 읽는 화면이다.

---

## 1. 색 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| `--ui-bg` | `#08080d` | scene 배경 (플레이필드 바깥 `#000`과 같은 계열, 살짝 밝여 화면 전환 시 완전한 암전을 피함) |
| `--ui-surface` | `#14141f` | 카드·패널 표면 |
| `--ui-border` | `#26263c` | 패널 테두리·구분선 |
| `--ui-text` | `#e4e4f2` | 본문 텍스트 |
| `--ui-text-dim` | `#8888a8` | 보조 텍스트(아티스트명·메타 정보) — [[theme]] §1 `normal body #8888a0`과 사실상 동일 계열로 맞춤 |
| `--ui-accent` | `#8a7cf5` | 강조(버튼·포커스) — note 팔레트(cyan/gold/red)와 겹치지 않는 보라로 UI 요소와 게임 요소를 시각적으로 분리 |
| `--ui-accent-text` | `#0b0b12` | accent 배경 위 텍스트 |

state 색(`AS`/`AP`/`FC`/`H`/`C`/`F`/`N`)과 게이지 색은 새로 정의하지 않는다 —
[[theme]] §1 "state" / "gauge" 표를 그대로 쓴다.

---

## 2. 타이포그래피

플레이필드 HUD와 같은 `sans-serif` 계열 하나만 쓴다(폰트 로딩 없음, [[theme]]
§4와 동일 원칙). 굵기 2단계(`600`/`800`)로만 위계를 나눈다.

| 역할 | 크기 | 굵기 |
|---|---|---|
| display (rank·score) | `48px` | 800 |
| heading (곡명·state 배지) | `20px` | 800 |
| body (수치·라벨) | `14px` | 600 |
| caption (아티스트·메타) | `12px` | 600 |

## 3. 간격

8px 기준 그리드: `4 · 8 · 16 · 24 · 32` (px). 패널 안쪽 여백은 `24`, 항목 간
기본 간격은 `16`, 밀접한 라벨-값 쌍은 `4`.

---

## 4. result 레이아웃

`scene.md` §9 "result 표시"가 요구하는 필드 — title·musicBy·difficulty·
subtitle·level / rank·state / score·accuracy / NEW BEST / judgment count /
FAST·SLOW / max combo / best record / applied options — 를 아래 순서로
세로 한 열에 쌓는다(원본 `play-result.js`의 그룹 순서와 같다 — 그룹 순서
자체는 정보 위계상 자연스러워 바꿀 이유가 없다는 판단, 색·수치·타이포는
전부 새 값):

```
┌───────────────────────────────┐
│  곡명 (heading)                │
│  아티스트 · difficulty+level    │  caption, --ui-text-dim
├───────────────────────────────┤
│      RANK        [STATE]       │  display / heading, state 배지는
│                                 │  theme.md STATE_COLOR 테두리+글자색
│        0000000                 │  score, display, tabular-nums
│   99.99%  [NEW BEST]           │  body + accent 배지
├───────────────────────────────┤
│  SYNC 12   PERFECT 3            │  2열 grid, body
│  GOOD 1    MISS 0                │
│  FAST 2         SLOW 1          │  body
├───────────────────────────────┤
│  MAX COMBO 120                  │  caption 라벨 + body 값
│  BEST 0000000 · FC              │
│  OPTIONS HARD · BLUE↓           │  (있을 때만)
├───────────────────────────────┤
│   [ RETRY ]      [ BACK ]       │  accent 배경 / outline
└───────────────────────────────┘
```

- 패널은 `--ui-surface` 배경 + `--ui-border` 1px 테두리, 화면 중앙에 고정 폭(약 360px)으로 떠 있다. 바깥은 `--ui-bg` 위에 반투명 스크림(`rgba(4,4,8,.85)`)을 깔아 이전 플레이필드 프레임이 완전히 사라지지 않고 은은히 비친다.
- state 배지 색·테두리는 [[theme]] §1 state 표를 그대로 참조(중복 정의 아님).
- RETRY는 `--ui-accent` 채움 버튼, BACK은 outline 버튼(`--ui-border` 테두리, 투명 배경) — 원본의 1차/2차 액션 구분과 동일한 위계.
- autoplay 판은 이 화면 자체를 거치지 않는다(`scene.md` §9 "autoplay로 돌린 판은 곡이 끝나면 result를 거치지 않고 song-select로 돌아간다") — 이 문서가 정하는 범위는 수동 판에서만 뜨는 화면이다.

---

## 5. 승인 후 처리

1. 이 문서 헤더의 "DRAFT" 표시를 지우고 `Status: Accepted`로 바꾼다.
2. `DECISION_LOG.md`에 D-2026-051로 기록한다.
3. `_plan/build-order.md` §2의 "ui-design 최소본" gate를 닫는다.
4. M2-6 구현에 착수한다.
