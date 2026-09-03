# build-order — 재구현 순서와 gate

> **무엇을 언제 만드는가**만 정한다. 레이어 의존 방향·CTX seam은 [[architecture]], 각 동작의 정의는 해당 spec 문서다. 여기서 재나열하지 않는다.
> 스택: TypeScript + Vite + Vitest.

---

## 0. 읽는 법

- **milestone** = 사람이 확인할 수 있는 큰 능력 단위. **step** = 독립적으로 검증 가능한 최소 동작 단위.
- **step 경계는 소프트하다.** 연속한 step을 한 번에 처리해도 된다. 다만 **gate가 걸린 경계는 넘지 않는다**.
- 각 step의 완료 기준은 **관찰 가능한 동작 문장**이다. 통과/불통과를 사람이 눈으로 판정할 수 있어야 하며, 문서 커버리지나 코드 존재는 기준이 아니다.
- **gate** = 그 지점에 들어가기 전에 닫아야 하는 결정 또는 실측이다. 열린 gate가 있으면 그 step에 진입하지 않는다.
- step 번호는 순서를 뜻하고 크기를 뜻하지 않는다.

### 레포 배치

구현 코드는 **이 명세 레포 안에** 산다 `[신규]`.

```
src/            구현
tests/golden/   원본에서 뜬 기대값 (관측 자료)
tools/golden/   기대값 추출 스크립트
```

명세를 고치고 그에 따라 코드를 고친 변경이 **한 커밋 안에서** 묶인다. 스펙↔구현 동기화(M6-4)가 두 레포 대조가 아니라 같은 트리 안의 문제가 된다.

---

## 1. 원본 대조 회귀

재구현은 behavior-preserving rewrite다. 결과가 원본과 같은지 확인하는 층을 둘로 나눈다.

### core 골든 테스트

원본 `conflux-editor`의 해당 함수에 같은 입력을 넣어 얻은 **기대값 표를 고정**하고 Vitest로 비교한다.

재구현은 원본을 따라가는 게 목적이 아니라 **더 나은 설계로 다시 짓는 것**이므로, 표와 어긋나는 자리가 정상적으로 생긴다. 표가 실제로 잡는 것은 **몰랐던 차이**다 — 원본을 잘못 읽었거나 스펙에 적히지 않은 동작을 건드렸을 때 그것이 질문으로 떠오르게 한다.

의도한 차이는 **설계 대장**(`tests/golden/DIVERGENCES.md`)에 등재한다. **대장에 없는 차이는 실패다** `[신규]`. 등재는 한 줄과 근거 링크면 되고, 설계 방향을 바꾸는 큰 결정만 `DECISION_LOG`로 승격한다 — 개선할 때마다 결정 사이클을 돌려야 한다면 그 마찰이 개선 자체를 억누른다.

대장은 어긋남만 담지 않는다. **`미커버`**(원본에 대응물이 있으나 골든이 뽑지 않음)와 **`없음`**(원본에 대응물 자체가 없음)도 등재한다. 골든도 안 걸고 대장에도 없으면 아무 검증 없이 통과하므로, **검증 공백은 어긋남보다 위험하다.** 대장 §7이 그 목록이며 각 항목에 담당 step이 붙는다.

M1 각 step의 완료 기준에 포함된다. 골든 테스트는 별도 step이 아니라 모든 core step에 깔리는 조건이다.

milestone 마감 시 `npm run mutate`를 `src/core` 전 파일에 실행한다. 생존 뮤턴트는 테스트를 추가해 죽이거나 `tools/audit/MUTATION_EQUIVALENTS.md`에 동등 사유와 함께 등재해야 gate를 통과한다.

**배치** `[신규]`

```
src/core/core-timing.ts
src/core/core-timing.test.ts      테스트는 대상 옆 — 함께 고쳐진다
tests/golden/timing.json          기대값은 별도 — 사람이 쓴 코드가 아니라 관측 자료다
tools/golden/extract-timing.mjs   그 표를 만든 스크립트
```

Vitest `environment: 'node'`. core 테스트는 DOM 없이 돈다 — [[architecture]] §2가 노린 이득의 실제 검증이다.

**기대값을 뜨는 방법** `[신규]`

- `conflux-editor`의 모듈을 Node에서 직접 import해 실행한다(브라우저 전역은 최소 스텁). 정해진 입력 세트를 넣고 결과를 JSON으로 떨군다.
- **재생성 가능한 것이 핵심이다.** 의심이 들 때 다시 돌려 확인할 수 있고, "기억으로 채우지 않는다"가 절차로 강제된다. 손으로 옮겨 적으면 그 순간이 오염 지점이 되고 재확인 비용도 매번 같다.
- 스크립트를 `tools/golden/`에 남겨 어떤 입력으로 떴는지가 기록된다.

**입력 세트** `[신규]`

합성 chart로 만든다 — 다중 BPM, 다중 박자, 경계 tick, 음수 tick, Hold 중첩, 6키 포화를 각각 노린 작은 chart들. 실제 곡보다 경계 조건을 조준하기 쉽고 실패 시 원인이 좁다.

### 수동 대조 시나리오

- M2 이후 각 milestone 종료 시, 원본과 재구현을 **같은 chart·같은 조작**으로 나란히 돌려 결과를 대조한다.
- milestone당 5~8개. 시나리오는 해당 milestone Exit에 적는다.
- 신규 설계 영역(song-select·`.cfx`·editor scene 그래프)은 원본에 대응물이 없으므로 대조 대상이 아니다. spec 준수만 본다.

### env 계약 검사 (M2-1) `[신규]` (D-2026-047)

`env`는 브라우저에 값을 물어보는 층이라 골든 표가 성립하지 않는다 — 소리가
났는지, 키가 언제 도착했는지는 Node에서 원본을 돌려 뽑을 수 없다. M2-1은
값 대조 대신 **mock으로 계약(실패 모드별 동작)을 검사**한다.

- `env` README·`architecture` §1이 가른 실패 모드 단위로 mock을 세운다: `env-audio`(AudioContext
  suspended → resume 경로), `env-canvas`(resize·DPR 변경 시 재계산), `env-time`(rAF 콜백 누락·`frameCap`
  상한), `env-input`(focus 이탈 시 keydown 무시, timestamp 단조 증가).
- 검사 대상은 **값이 아니라 동작** — "이 조건에서 이 복구/거부가 일어난다"는 문장 단위. 실제 브라우저
  값과의 일치는 M2 이후 수동 대조 시나리오(§1 위)가 맡는다.
- 골든 표·설계 대장(§0 범위)은 M2 이후로 넓히지 않는다 — env 계약 테스트는 `src/env/*.test.ts`에
  살고 판정자는 스펙 문서 자체다.

---

## 2. gate 목록

| 지점 | gate | 내용 |
|---|---|---|
| ~~M1 진입~~ | 결정 | ~~`FEATURES` 목록·기본값 / `env` 내부 세분 / core 테스트 하네스~~ — **닫힘** (D-2026-033) |
| M1 진입 | 실측 | §3 M1 항목 |
| M2-2 전 | 실측 | §3 M2-2 항목 — **전부 해소** (D-2026-046 · lane 최소 간격은 D-2026-048로 "제한 없음" 확정) |
| ~~M2-5 전~~ | ~~결정~~ | ~~quick options overlay 내부 조작(이동·값 변경 키)~~ — **닫힘** (D-2026-049) |
| ~~M2-5 전~~ | ~~결정~~ | ~~히트음·효과음 asset 출처 — 구 코드 asset 계승 여부~~ — **닫힘** (D-2026-050) |
| ~~M2-6 전~~ | ~~결정~~ | ~~**ui-design 최소본** — 토큰(색·타이포·간격) + result 레이아웃~~ — **닫힘** (D-2026-051) |
| ~~M2-6 전~~ | ~~결정~~ | ~~티어 색 대 실패 적색 근접(`ui-design.md` §7-3)~~ — **닫힘** (D-2026-055, 형태 차이로 수용) |
| ~~M2-6 전~~ | ~~결정~~ | ~~`scene.md` §9 필드 8개 추가(`ui-design.md` §6)~~ — **닫힘** (D-2026-054, 실제 5필드로 확정) |
| ~~M3 진입~~ | ~~결정~~ | ~~**D-2026-021** — 라이브 웹 배포 / `.cfx` 보호 / 공개 서비스 기록 위치~~ — **닫힘** (D-2026-059: bundled 유지·평문·records 로컬 유지, D-2026-019는 별도 보류 유지) |
| ~~M4 진입~~ | ~~결정~~ | ~~**ui-design 전체** — song-select·settings·title·credits 레이아웃 → §6.5 M3.5~~ — **닫힘** (D-2026-080, M3.5-1~4 전부 완료: D-2026-072/073·074/075/076·078/079·080) |
| M4-3 전 | 결정 | 목록 옵션 overlay 진입 키 · `sortDir` 단축 전환 키 · 가속 스크롤 수치(초기 지연·반복 간격·가속 곡선) |
| M4-3 전 | 결정 | ~~song row 대표값 출처(title·jacket)~~ — **닫힘**(`_meta/cfx.md` §6 기존 스펙 적용, D-2026-084) · 정보 패널 BPM 표기 방식 · 곡 길이 표시 |
| M4-6 전 | 결정 | ~~key rebinding UI · volume 슬라이더 조작 단위~~ — **닫힘** (D-2026-091: capture-flow는 즉시 커밋·Esc 취소·충돌 거부, slider는 네이티브 `<input type=range>` + 필드별 `step`) — 기본값·범위는 `[보존]`으로 확정됨([[settings]] §4) |
| ~~M4-2 전~~ | ~~결정~~ | ~~credits scene 표시 내용~~ — **`Music`/`Chart`/`Jacket`은 닫힘**(M6-1, D-2026-107: `game-credits.ts`가 library를 스캔해 `musicBy`/`chartBy`/`jacketBy`를 필드별 자동 dedupe한다, song/chart로 안 묶음). `Project Staff`(수작업 유지 목록)의 실제 인원만 여전히 결정 필요 항목(`scene/scene.md` §11 잔여) — placeholder(`[Staff N]`)로 남아 있다 |
| ~~M5 진입~~ | ~~실측~~ | ~~§3 M5 항목~~ — **재배치됨**(D-2026-094) — §3 "M5-3 전"·"M5-1 이후(notes/shapes 실 렌더) 전"·"M5-4 전" 참조, M5 진입 자체는 더 이상 막혀 있지 않다 |
| ~~M5-3 전~~ | ~~실측~~ | ~~편집 미세 수치 — 히트 반경, 드래그 임계([[editor-editing]] §8)~~ — **닫힘**(D-2026-096: 히트 반경 `tpp*15`(화면상 15px), 드래그 임계 4px — `_extracted/EXTRACTED_FACTS.md` §13) |
| ~~M5-1 이후(notes/shapes 실 렌더) 전~~ | ~~실측/결정~~ | ~~`viewMs` 기본값·zoom 범위([[editor-graph]] §6)~~ — **닫힘**(D-2026-098: `viewMs=960000/(edZm×bpm)`, 120bpm 기준 선택 — 기본 8000ms·범위 [1000ms,32000ms]·step ×1.35/÷1.35, Z/X 배선 완료 — `_extracted/EXTRACTED_FACTS.md` §14) |
| ~~M5-4 전~~ | ~~실측~~ | ~~shape 보조 툴(normalize 등)의 계승 여부([[shape]] §8)~~ — **닫힘**(D-2026-099: 원본에 "normalize"라는 이름의 사용자 노출 툴/버튼은 없었다 — 유일한 "normalize"는 매 편집 커맨드 apply/undo마다 자동으로 도는 내부 배열 정합화 함수이고, 이건 이미 `editor-commands.md` §6이 "chain normalize"로 확정해 둔 요구사항이었다 — `_extracted/EXTRACTED_FACTS.md` §15) |
| M5-6 전 | 실측 | editor timeline(test scene seek 축)의 최소 표시 길이([[editor-graph]] §6) — M5-3에서 "notes 세로 스크롤과는 다른 항목"으로 범위 재확인, 여기로 재배치(D-2026-097) |

gate가 닫히면 해당 spec 문서에 반영하고 `DECISION_LOG`에 기록한 뒤 진입한다. build-order는 gate의 **위치**만 갖고 내용은 갖지 않는다.

---

## 3. 실측 gate

원본에서 값을 떠야 하는 항목. **기억으로 채우지 않는다** — `conflux-editor` raw를 직접 읽고, 읽은 위치를 `_extracted/EXTRACTED_FACTS.md`에 남긴다.

### M1 진입 전

- 골든 테스트 입력·기대값 세트: `tickToMs`/`msToTick`, measure 변환, 판정 산출, 게이지 증감 누적, shape chain 보간.
- `constants` 튜닝 수치와 `DEFAULT_SETTINGS` 기본값 전수 — 원본 `constants.js`·`settings.js`. [[settings]] §4가 값의 단일 출처이고, 골든 표 `constants.json`이 대조를 맡는다 (D-2026-036에서 해소).

### M2-2 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §12)

`[신규]` (D-2026-046) — 원래 "M2 진입 전"이었으나, M2-1(`env`)은 아래 수치를 하나도 쓰지 않는다. 값이 실제로 쓰이는 step 바로 앞으로 gate를 옮겼다 — 재는 시점과 쓰는 시점을 붙여 오독을 줄인다.

- [x] playfield 렌더 레이아웃 전수: 판정선 Y, `gw`/`gh` 산출, lane 구분선 굵기, 콤보 블록 앵커, 게이지 바 위치와 75% 색 반전, 히트 이펙트 반지름, sudden lane cover, 판정 텍스트 위치 — §12.1~12.8.
- [x] shape render 폭 매핑·선 굵기 — §12.3·§12.4, [[shape]] §8.
- [x] lane 최소 간격 px — **제한 없음으로 확정** (D-2026-048). 원본에도 대응물이 없었고(§12.9), 구분선이 붙어 선처럼 좁아지는 것을 의도된 연출로 승인받았다 — [[lane-events]] §7.

### M5-3 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §13)

`[수정]` (D-2026-094) — 원래 "M5 진입 전"이었으나, M5-1(scene 그래프·start scene·세션 소유)은 아래 수치를 하나도 쓰지 않는다. D-2026-046과 같은 이유로 값이 실제로 쓰이는 step 바로 앞으로 옮겼다.

- [x] 편집 미세 수치: 히트 반경, 드래그 임계 — [[editor-editing]] §8. `notes-input.js` 재실측(D-2026-096) — 히트 반경 `tpp*15`(화면상 15px, zoom 무관 고정), 드래그 임계 4px(모든 축 공통). shape/lane 서브모드 값(`shape-input.js`)은 M5-4에서 재실측(D-2026-099) — 히트 반경 35px(고정 px, `findDotAt`/`findShapeEvtAt`/del 툴 공통 `bd=35`), 드래그 임계는 dot 재배치 3px/사각선택·스크롤 4px로 나뉘지만 M5-4는 점 드래그 재배치를 구현하지 않아(이번 라운드 단순화 항목) 이번엔 쓰이지 않는다 — 값 자체는 기록해 뒀다(`_extracted/EXTRACTED_FACTS.md` §15).

### M5-1 이후(notes/shapes 실 렌더) 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §14)

`[수정]` (D-2026-094) — `viewMs`는 notes/shapes canvas가 실제로 그려지는 시점에야 필요하다. M5-1의 4 형제 scene은 아직 껍데기라 이 값을 안 쓴다.

- [x] `viewMs` 기본값·zoom 범위 — [[editor-graph]] §6. M5-3에서 시도했으나 단위 불일치(원본 `edZm`은 tick/beat 비례 축, 이 축은 ms 비례로 재설계됨)로 못 닫았던 것을(D-2026-097), `viewMs = 960000/(edZm×bpm)` 변환식과 120bpm 기준 tempo 선택으로 닫았다(D-2026-098) — 순수 측정이 아니라 번역/해석적 결정이다. 기본 8000ms·범위 [1000ms, 32000ms]·step ×1.35(Z)/÷1.35(X), `src/scene/scene-editor-notes.ts`에 배선 완료.
- ~~editor timeline 최소 표시 길이~~ — **범위 재확인**(D-2026-097): notes/shapes 세로 스크롤이 아니라 **test scene idle의 seek 축**(가로 스크럽 바) 얘기였다 — M5-3 조사 중 원본에서 대응하는 `getMinTick()`이 notes 세로 스크롤 하한(이미 `core-timing.ts`의 `minTick()`으로 구현됨)일 뿐 "최소 표시 길이" 개념과는 다른 것임을 확인했다. 이 항목은 M5-6(test scene) 진입 전으로 다시 옮긴다.

### M5-4 전 — **해소** (`_extracted/EXTRACTED_FACTS.md` §15)

`[수정]` (D-2026-094) — shape 보조 툴 계승 여부는 M5-4(shapes scene)가 그 툴바를 만들 때만 필요하다.

- [x] shape 보조 툴(normalize 등)의 계승 여부 — [[shape]] §8. D-2026-099로 닫혔다: `shape-input.js`·`shape-tools.js`·HTML 툴바 전체에서 "normalize"라는 이름의 사용자 노출 툴/버튼은 없었다 — 유일한 "normalize"는 `shape.js`의 `normalizeShapeChain()`, 매 편집 커맨드의 apply/undo 안에서 자동으로 도는 내부 배열 정합화 함수였다. 이건 이미 `editor-commands.md` §6 "shape/lane command는 apply·undo 양쪽에서 chain normalize"로 확정돼 있던 요구사항이라 별도로 "계승할지" 결정할 대상이 아니었다 — `edit-shape-commands.ts`의 `normalizeShapeEvents`/`normalizeLaneEvents`로 구현했다.

### M5-6 전

`[신규]` (D-2026-097) — 원래 "M5-1 이후(notes/shapes 실 렌더) 전"에 `viewMs`와 함께 묶여 있었으나, M5-3 조사 중 이 항목이 실제로는 notes/shapes 세로 스크롤이 아니라 **test scene idle의 seek 축**(가로 스크럽 바) 얘기임을 확인했다 — 그 화면 자체가 M5-6 전에는 없다.

- editor timeline(test scene seek 축)의 최소 표시 길이 — [[editor-graph]] §6. 곡이 짧아도 seek 축이 붕괴하지 않게 하는 하한, 플레이 종료 시각([[timing]] §9)과는 별개 값.

---

## 4. M1 — core + 테스트 하네스

**목표**: 브라우저 없이 Node에서 판정·게이지·시간축이 원본과 같은 값을 낸다.

**진입 gate**: `FEATURES`·`env` 세분·하네스 형태 결정, §3 M1 실측.

| step | 범위 | 완료 기준 |
|---|---|---|
| M1-1 | 프로젝트 골격 — Vite + TS + Vitest, [[architecture]] §1 7레이어 폴더, `FEATURES` + 빌드 프로필 주입, import 방향 린트 | 빈 테스트가 `environment: 'node'`에서 통과한다. `core`가 상위 레이어를 import하면 린트가 실패한다. 프로필 미지정 빌드가 `public`으로 떨어진다. |
| M1-2 | chart 타입·스키마 검증·[[constants]] 값·[[settings]] 기본값 객체·무효 chart 런타임 폴백 | 정상 chart는 검증을 통과하고, [[judge]] §12의 각 무효 입력이 정의된 폴백 값으로 떨어진다. |
| M1-3 | [[timing]] — `tickToMs`/`msToTick`, measure 변환, `gridDivisor`, song end 4값 | 다중 BPM·다중 박자 chart에서 골든 표와 값이 일치한다. `songEndMs`가 §9 정의대로 나온다. |
| M1-4 | [[judge]] 기본 — 결정론적 후보 순서, 판정창, lane 매칭, mirror, `commitJudgment` | 같은 입력 열에서 원본과 같은 judgment 열이 나온다. mirror ON에서 `1↔4, 2↔3`이 적용되고 wide는 무시된다. |
| M1-5 | [[judge]] Hold 소유 — Normal 익명 수요, Wide 단일 소유·이양, tail release 임계, head MISS 2단위 | 동시 Hold 시나리오에서 소유가 원자적으로 이양된다. `HOLD_RELEASE_WINDOW_MS`(150) 안 release는 SYNC, 밖은 MISS. head MISS가 score·게이지 2단위를 즉시 확정한다. |
| M1-6 | [[judge]] 중간 시작·Resume — 카운트다운 등록 진입점, `seedPlayStateAt`, Resume 재조정 | crossing Hold가 mid-start 시드로 복원된다. 카운트다운 중 키 입력이 chart 시간을 진행시키지 않는다. Resume이 재시드 없이 pause anchor에서 재조정한다. |
| M1-7 | [[gauge]] — 6모드, terminate, cascade 병렬 평가, state·rank 산출 | [[gauge]] §4 검증 시나리오 6종이 명시된 state를 낸다. rank가 gauge와 독립으로 나온다. |
| M1-8 | overlap/conflict 검출 — [[data-model]] §5.1 활성 정의·검사 지점, 로컬 capacity와 global 6키 | lane 1·4는 2겹, lane 2·3은 3겹, Wide는 2겹부터 conflict로 잡힌다. conflict가 동시 활성 집합 전체에 표시된다. 로컬 capacity를 모두 통과한 7-입력이 global conflict로 잡히고 로컬 표시보다 우선한다. |
| M1-9 | [[shape]]·[[lane-events]] 체인 보간 — easing 3종 + anchor | 같은 이벤트 열에서 임의 tick의 보간값이 골든 표와 일치한다. Step 입력이 `Linear + duration 0`으로 저장된다. |

**Exit**: 위 9개 step의 골든 테스트가 모두 통과하고, core 어느 모듈도 전역 상태나 브라우저 API를 import하지 않는다.

---

## 5. M2 — minimal play

**목표**: chart 하나를 처음부터 끝까지 실제로 칠 수 있다. scene 그래프·파일 층은 아직 없고 chart는 고정 입력이다.

**진입 gate**: 없음 `[신규]` (D-2026-046) — M2-1은 §3 실측 수치를 쓰지 않는다. §3 M2-2 항목은 M2-2 진입 gate로 아래 표에 배치했다.

| step | 범위 | 완료 기준 |
|---|---|---|
| M2-1 | `env` — canvas·resize·rAF·입력·audio decode/재생/position | 음원이 재생되고 재생 위치를 ms로 읽을 수 있다. 키 press/release가 timestamp와 함께 도착한다. |
| M2-2 | (**진입 gate**: §3 M2-2 실측) playfield 레이아웃 + note 렌더 + 스크롤 | 실측 레이아웃대로 판정선·lane·노트가 그려지고, `scrollSpeed` 변경이 밀도만 바꾼다(재생 속도 불변). |
| M2-3 | engine loop — CTX seam, 3초 lead-in, `songEndMs` 종료 | lead-in 3초 뒤 정확히 tick 0에서 음악과 노트가 만난다. `songEndMs` 경과 시 판이 끝난다. |
| M2-4 | 입력 → judge 결선 + 판정 표시(콤보·판정 텍스트·FAST/SLOW·히트 이펙트) | 친 노트가 원본과 같은 판정을 받고 화면에 뜬다. autoplay가 정확한 타이밍에 자동 판정하고 히트음을 낸다. |
| M2-5 | gauge HUD + clear/fail 분기 + pause overlay + quick options 패널 | 게이지가 판정에 따라 증감하고 75% 경계 표시가 바뀐다. terminate 모드에서 0 도달이 즉시 판을 끝낸다. Esc가 pause를 열고 Resume이 되감기 없이 카운트다운 후 그 지점에서 재개한다. |
| M2-6 | result 화면 + Retry/Back | 판이 끝나면 result가 뜨고 rank·state·score·accuracy·판정 수·FAST/SLOW·max combo가 표시된다. autoplay 판은 result를 거치지 않는다. |
| M2-7 | 마감 — 탭 백그라운드 auto-pause, 브라우저 단축키 충돌 처리 `[수정]` (D-2026-057, 로딩 표시 분리) | 탭을 숨기면 pause가 열리고 blur만으로는 열리지 않는다. |

**Exit**: 같은 chart를 원본과 재구현에서 나란히 플레이해 **판정 열·게이지 곡선·최종 state·rank가 일치**한다. 수동 대조 시나리오 — 전 SYNC / 전 MISS / hard 사망 / cascade 강등 / Hold 동시 소유 / mid-start / pause Resume / 곡 끝 tail.

**충족** (D-2026-058). 전 SYNC·전 MISS·hard 사망 셋은 원본을 직접 clone해
골든을 재추출한 실측 대조로 확인했다(무편차). cascade 강등·곡 끝 tail
둘은 원본에 대응물이 없거나(GA-4) 의도된 편차(TM-1, D-2026-030)라 "원본과
일치"가 애초에 목표가 아니다. 나머지 셋(Hold 동시 소유·mid-start·pause
Resume)은 원본 미정의 또는 wall-clock 실기기 확인이 필요해 headless로
실측할 수 없다 — 지금은 spec 테스트로 충분하다고 승인하고, 사람이
브라우저로 확인할 목록을 `_meta/manual-qa.md`(QA-1~3)에 남긴다.

로딩 표시(`.cfx` decode·음원 로드 등 비동기 작업이 [[constants]]
`LOADING_INDICATOR_DELAY_MS`를 넘기면 뜨는 표시)는 M2-7에서 분리했다
(D-2026-057) — 컴포넌트(`src/scene/scene-loading.ts`)는 이미 있지만
실제 비동기 호출부에 잇는 배선은 파일 로드 host가 있어야 성립하고, M2는
"scene 그래프·파일 층은 아직 없고 chart는 고정 입력"이 전제다(§5 목표).
호스트가 생기는 시점(M3 이후 유력)에 붙일 미배정 단위로 남긴다 —
milestone·step 번호는 그 host를 짓는 step이 정해질 때 붙인다.

---

## 6. M3 — persistence + `.cfx`

**목표**: chart를 파일로 열고 저장하고 배포 패키지로 묶고 다시 읽는다. 기록이 남는다.

**진입 gate**: ~~**D-2026-021**~~ — **닫힘** (D-2026-059).

| step | 범위 | 완료 기준 |
|---|---|---|
| M3-1 | store 5분리([[persistence]] §1) + 쓰기 실패 처리 | 다섯 store가 독립적으로 읽고 쓰인다. 쓰기 실패가 조용히 삼켜지지 않고 사용자에게 표시된다. |
| M3-2 | chart JSON 열기·저장 — version 저장 창, `updatedAt` | `Ctrl+S`가 매번 저장 창을 띄우고 현재보다 큰 version을 제안한다. 저장 성공 시에만 version과 `updatedAt`이 확정된다. |
| M3-3 | workspace dirty 복구 슬롯 + 세션 전환 confirm | dirty 상태에서 새로고침해도 chart와 asset이 복구된다. 저장 성공 시 workspace가 삭제된다. |
| M3-4 | `.cfx` packager — 입력 선택, 전체 검증, 상태 전이 | chart JSON 다중 선택으로 패키지가 만들어진다. init 누락·파일명 충돌·difficulty 중복이 패키징을 막고 이유를 표시한다. 원본 파일이 변경되지 않는다. |
| M3-5 | `.cfx` loader — 구조 검증, decode | 정상 `.cfx`가 chart 집합과 asset으로 풀린다. 손상·구 포맷은 명시적으로 거부된다. |
| M3-6 | game library — 등록, 같은 songId reimport 교체, 삭제 | 같은 songId를 다시 넣으면 confirm 후 blob 전체가 교체된다. 다운그레이드도 허용된다. |
| M3-7 | records — 3필드 저장, no-record gate, chart 단위 초기화 | 기록이 `songId:chartId`를 따라 유지되고 내용 변경으로 무효화되지 않는다. no-record 4조건 중 하나라도 걸리면 기록이 남지 않는다. score·rank·accuracy가 저장 필드가 아니라 파생으로 나온다. |

**Exit**: 에디터에서 만든 chart를 저장 → `.cfx`로 묶기 → 다른 프로필에서 열기 → 플레이 → 기록 저장 → 같은 songId reimport 후에도 기록 유지가 한 줄로 이어진다.

**충족** (D-2026-068). M3에는 아직 scene/UI가 없어(M4/M5) 사람이 브라우저로
누를 수 없다 — M2 Exit이 헤드리스 엔진 테스트로 검증된 것과 같은 방식으로,
`tests/integration/m3-persistence-chain.test.ts`가 M3-1~M3-7의 실제 함수를
그대로 한 줄로 이어 붙여 검증한다: `saveChartVersion`(M3-2) → `buildCfxPackage`
(M3-4) → 별도 `StorageEnv` 인스턴스("다른 프로필")에서 `loadCfxPackage`
(M3-5) → `validateCfxForImport`+`planLibraryRegistration`+
`commitLibraryRegistration`(M3-6, `add`) → `saveRecordIfEligible`(M3-7) →
trace를 v2로 올린 새 `.cfx`로 다시 `validateCfxForImport`+
`planLibraryRegistration`(`reimport-confirm-needed`, `upgraded` 확인)+
`commitLibraryRegistration` → `readRecord`로 기록이 그대로 유지됨을 확인.
workspace(M3-3)는 이 체인에 직접 걸리지 않아(에디터 세션 상태 복구는 파일
저장 경로와 별개) 별도 통합 지점이 필요 없다 — M3-3 자체 테스트가 이미
"새로고침해도 chart와 asset이 복구된다"를 검증했다.

실제 브라우저 조작(파일 다이얼로그 클릭, `.cfx` 다운로드, 다른 프로필
디렉토리 전환)으로 사람이 다시 확인하는 것은 M4/M5가 서서 실제 UI가 생긴
뒤의 일이다 — 지금은 메커니즘 수준의 검증이 목표다.

---

## 6.5. M3.5 — ui-design 전체

**목표**: M4 진입 gate("ui-design 전체")가 기다리는 네 화면(song-select·
settings·title·credits)의 레이아웃을 `ui-design.md`에 확정한다. `ui-design.md`
현재본(D-2026-051)은 제목 그대로 "최소본 — tokens + result layout"이라
이 네 화면을 다루지 않는다 — `song-select.md` §14도 "레이아웃·치수·모션·
램프 색: ui-design 소관"이라고 명시적으로 위임해 뒀다. 코드 구현은 없다 —
이 milestone은 문서(spec) 산출물만 낸다.

**진입 gate**: 없음 — M3 종료 직후 바로 연다.

| step | 범위 | 완료 기준 |
|---|---|---|
| M3.5-1 | song-select 레이아웃 — category 탭·row/slot·folder·정보 패널·검색창·quick options overlay 배치 | `ui-design.md`가 `song-select.md` §1~§13의 각 요소(층 구성, slot 표시값 3종, folder 헤더, 기록 2×2 패널, 검색 진입 등)에 대응하는 구체 레이아웃·치수·색 참조를 제공하고 사용자 승인을 받는다. |
| M3.5-2 | settings 레이아웃 — PLAY/VISUAL/GAUGE/OPTION 4 scene 공통 틀 + key rebinding UI | `ui-design.md`가 4 category scene의 공통 틀(탭/네비게이션)과 각 필드 유형(슬라이더·토글·선택·키 바인딩)의 표현을 정의하고 사용자 승인을 받는다. |
| M3.5-3 | title 레이아웃 | `ui-design.md`가 title scene(로고/타이틀 표시, "아무 입력 → mode-select" 유도)의 레이아웃을 정의하고 사용자 승인을 받는다. |
| M3.5-4 | credits 레이아웃 | `ui-design.md`가 credits scene의 레이아웃 골격을 정의한다 — 표시 **내용** 자체는 별도 gate(M4-2 전 결정)라 이 step은 골격(스크롤 목록 형태 등)만 다룬다. |

**Exit**: `ui-design.md`가 네 화면 전부를 커버해 M4 진입 gate("ui-design
전체")가 닫힌다.

**충족** (D-2026-080). 네 step 전부 사용자 승인을 받아 `ui-design.md`에
반영됐다 — §2.5(M3.5-1, D-2026-072/073) · §2.6(M3.5-2, D-2026-074/075/076)
· §2.7(M3.5-3, D-2026-078/079) · §2.8(M3.5-4 골격, D-2026-080). M4-2 前
게이트(credits 표시 내용)만 별도로 열려 있으며 M3.5 자체의 완료를
막지 않는다.

역할 분담: 시각/제품 디자인 판단(레이아웃 구조, 무엇을 강조할지, 색·간격의
구체값)은 사용자 몫이다. Claude Code는 각 화면이 이미 확정한 spec
(scene.md·song-select.md·settings.md 등)에서 무엇을 담아야 하는지 정리해
레이아웃 초안을 제안하고, 사용자 검토 후 `ui-design.md`에 반영한다 — 여기서
제품 디자인 결정을 임의로 확정하지 않는다.

---

## 7. M4 — game graph

**목표**: 타이틀부터 곡 선택을 거쳐 플레이하고 돌아오는 전체 흐름이 돈다.

**진입 gate**: **ui-design 전체**.

| step | 범위 | 완료 기준 |
|---|---|---|
| M4-1 | scene-manager + root 그래프 + lazy mount + build gate | scene 전환과 `goBack`이 스택대로 동작한다. 꺼진 축의 scene은 `mount()`가 호출되지 않는다. |
| M4-2 | title / mode-select / credits | 세 scene이 그래프대로 오간다. |
| M4-3 | song-select 목록 모델 + 렌더 — row·slot, category 탭, groupBy folder, sortKey·sortDir | library의 chart가 song row + chart slot으로 뜬다. 세 축을 바꾸면 목록이 그에 맞게 재구성된다. folder 헤더에 클리어 진척이 뜬다. slot에 level·difficulty·state 램프가 함께 뜬다. |
| M4-4 | song-select 조작 — 커서·검색·preview·`viewState` 복원·기록 초기화 | 타이핑 즉시 검색되고, 정렬을 바꿔도 커서가 유지된다. 커서가 멈춘 뒤 preview가 지연 재생된다. 재진입 시 `lastSelected`가 복원된다. |
| M4-5 | song-credit + gameplay 진입 결선 | 선택한 chart의 credit이 fade로 흐른 뒤 gameplay가 그 chart로 시작한다. 종료 후 result를 거쳐 song-select로 돌아온다. |
| M4-6 | settings 4 scene + key rebinding UI | 네 category가 각자 scene으로 열린다. 바꾼 값이 영속하고 다음 플레이에 적용된다. rebinding이 lane 매핑은 건드리지 않는다. |
| M4-7 | quick options overlay 배치 + no-record 결선 | song-select에서 Space로 열리고 열린 동안 scene 입력이 막힌다. 값 변경이 settings 영속 필드에 그대로 반영된다. no-record 조건이 걸린 판은 result에 기록이 남지 않는다. |

**Exit**: 부팅 → 곡 선택 → 플레이 → result → 곡 선택 복귀가 끊김 없이 돈다. 수동 대조 시나리오는 gameplay 구간에 한정한다(song-select는 신규 설계라 대조 대상이 아니다).

---

## 7.5. M4.5 — gameplay HUD·pause overlay 디자인

**목표**: M4-5가 최소 기능 레이아웃으로 남겨둔 gameplay 화면의 HUD(콤보·
판정 텍스트·FAST/SLOW·게이지 바 배치)와 pause overlay(Resume/Retry/Exit)
시각 디자인을 `ui-design.md`에 확정한다. `scene-gameplay.ts`/
`scene-gameplay.css`의 헤더 주석이 이미 "ui-design이 아직 gameplay를
다루지 않아 결정 필요 항목"이라고 명시해 둔 자리다.

**범위**: gameplay 화면의 HUD 요소·pause overlay 레이아웃/시각 디자인만
다룬다. 새 gameplay 메커닉(예: HUD에 새 데이터 필드 추가)은 범위 밖이다.

**진입 gate**: 없음 — M4-5 종료 직후 바로 연다.

| step | 범위 | 완료 기준 |
|---|---|---|
| M4.5-1 | gameplay HUD 레이아웃 — 콤보·마지막 판정·FAST/SLOW·게이지 바 배치 | `ui-design.md`가 canvas 위 HUD 요소들의 구체 위치·치수·색 참조를 제공하고 사용자 승인을 받는다. |
| M4.5-2 | pause overlay 레이아웃 — Resume/Retry/Exit | `ui-design.md`가 pause overlay의 배치·치수·색을 정의하고 사용자 승인을 받는다. |

**Exit**: `ui-design.md`가 gameplay HUD·pause overlay를 커버해, `scene-gameplay.ts`/`.css`의 "결정 필요 항목" 주석을 닫을 수 있다.

**충족** (D-2026-090). M3.5와 달리 이 milestone은 문서 확정과 구현이
한 라운드로 합쳐졌다 — HUD 요소 대부분이 `render/theme.md`에 이미 실측
값으로 있어서(원본 게임에서 가져온 값, 새로 설계할 게 없었다) "레이아웃을
정하고 나중에 구현" 단계를 나눌 이유가 약했고, 사용자가 명시적으로 구현까지
함께 지시했다. `ui-design.md` §2.10이 canvas HUD(M4.5-1)·pause overlay
DOM 색(M4.5-2 해당분)을 함께 확정했고, `scene-gameplay.ts`/
`render-playfield.ts`/`render-theme.ts`가 그대로 구현했다 — 판정 텍스트
지속시간·카운터/퍼센트 Y순서·pause 아이콘 클릭의 결정 필요 항목 셋도
이 라운드에서 함께 닫혔다(§2.10.2).

역할 분담은 M3.5(§6.5)와 같다 — 시각/제품 디자인 판단은 사용자 몫, Claude
Code는 이미 확정한 spec(`scene.md` §9·§10)에서 무엇을 담아야 하는지 정리해
초안을 제안한다.

---

## 7.6. M4.6 — quick options overlay 디자인

**목표**: M3.5-1의 원래 범위 문구("quick options overlay 배치")가 실제로는
`ui-design.md` §2.5에 반영되지 못한 채 넘어간 자리를 닫는다(D-2026-072가
닫은 두 유보 항목에도 이 자리는 없었다 — 유보가 아니라 누락이었다).
M4-7이 이 공백을 최소 기능 placeholder(설정 화면과 같은 기존 토큰, 중앙
모달)로 메워 뒀다 — `scene-song-select.ts` 헤더 주석과 D-2026-092가 이
자리를 "결정 필요 항목"으로 명시해 뒀다.

**범위**: song-select quick options 오버레이(5필드 — scrollSpeed·gaugeMode·
mirror·staticShape·autoplay) 하나의 배치·치수·시각 디자인만 다룬다.
editor test의 embedded 상시 panel(M5-6)은 범위 밖이다. `scene.md` §5·§10이
이미 정한 것들(필드 5개와 순서, ↑↓/Enter/row 이동 시 draft 폐기, 열고
닫는 키 Space/Esc, 열림 중 scene 입력 차단, song-select와 editor test의
component 공유)은 재검토 대상이 아니다.

**진입 gate**: 없음 — M4가 main에 이미 완료돼 있어 바로 연다.

| step | 범위 | 완료 기준 |
|---|---|---|
| M4.6-1 | quick options overlay 레이아웃 — 배치·치수·5필드 표현·클릭 상호작용 | `ui-design.md`가 이 오버레이의 구체 위치·치수·색 참조와 scrollSpeed/gaugeMode 클릭 상호작용 방식을 정의하고, 닫을 때의 미확정 draft 처리를 확정하며, 사용자 승인을 받는다. |

**Exit**: `ui-design.md`가 이 오버레이를 커버해, `scene-song-select.ts`의
"오버레이 배치는 결정 필요 항목" 주석(D-2026-092)을 닫을 수 있다.

**충족** (D-2026-093). M4.6-1 하나로 세 항목(배치·치수·시각 디자인,
scrollSpeed/gaugeMode 클릭 상호작용, 닫을 때의 draft 처리) 전부 확정돼
`ui-design.md` §2.5.8로 반영됐고 `scene-song-select.ts`/`.css`가 그대로
구현했다 — M3.5·M4.5와 달리 이번엔 문서 확정과 구현이 한 라운드였다.
클릭 상호작용은 scrollSpeed=native slider·gaugeMode=segmented control로
확정돼 settings 화면(§2.6.3)의 기존 위젯을 그대로 재사용했고(새 위젯
없음), 닫을 때의 draft 처리는 discard(D-2026-092의 잠정 결정)에서
confirm으로 뒤집혔다. M4.6은 완전히 닫혔다 — 남은 항목 없음.

역할 분담은 M3.5(§6.5)·M4.5(§7.5)와 같다 — 시각/제품 디자인 판단은
사용자 몫, Claude Code는 이미 확정한 spec(`scene.md` §5·§10)에서 무엇을
담아야 하는지 정리해 레이아웃 초안을 제안한다.

---

## 8. M5 — editor

**목표**: chart를 처음부터 만들 수 있다.

**진입 gate**: 없음(D-2026-094) — §3의 M5 실측 3항목은 각 값이 실제로 쓰이는 step 앞으로 재배치됐다(§3 "M5-3 전"·"M5-1 이후(notes/shapes 실 렌더) 전"·"M5-4 전", D-2026-046과 같은 이유). M5-1 자신은 그 값들을 쓰지 않아 막힘없이 시작한다.

| step | 범위 | 완료 기준 |
|---|---|---|
| M5-1 | editor graph + start scene + single-chart session | 네 scene이 자유 전환되고 `test`는 lazy mount된다. 세션이 chart 하나를 소유한다. |

**M5-1 진행 상황**: `.cfx` 열기를 뺀 나머지(scene 그래프·New Chart·Open JSON·Continue Editing·세션 소유)는 구현됐다(D-2026-094) — `.cfx` 열기는 `env-file.ts`의 binary open 확장이 필요해 결정 필요 항목으로 별도 보고했다. notes/shapes/meta/test 4 scene은 이번 라운드엔 chart identity만 표시하는 껍데기다 — 실제 내용은 M5-3~M5-6.

**M5-2 진행 상황**: command/history 엔진(scope 분할·dispatch/undo/redo·listener·history baseline)은 완성됐다(D-2026-095) — chart-agnostic이라 `app-main.ts`가 세션마다 새로 만들어 붙여 뒀다. §6의 구체 command 목록(AddNotes 등 실제 chart 배열 편집)은 이 엔진에 붙는 실 편집 인터랙션이 필요해 M5-3(notes)·M5-4(shapes/lane)·M5-5(tempo/timeSignature)·M5-7(textEvents)로 이월했다 — M5-2 자신의 Exit 기준(모든 편집이 command로 들어감·undo/redo가 원본과 같은 단위로 되감김·chart 구조 편집은 history 밖)은 엔진 단위 테스트와 통합 테스트로 확인했다.

**M5-3 진행 상황**: notes 관련 command 6개(§6, `edit-notes-commands.ts`)와 편집 캔버스(`scene-editor-notes.ts`)가 구현됐다(D-2026-097) — 배치·이동·삭제·복사·붙여넣기·flip과 overlap/conflict 표시(이미 있던 `core-overlap.ts` 재사용) 전부 충족. `viewMs` 기본값·zoom 범위 gate는 D-2026-098로 닫혔다(§3 "M5-1 이후(notes/shapes 실 렌더) 전" 참조). lane 2·3 자동 치환 등 6가지 단순화는 결정 필요 항목으로 D-2026-097에 남겼다.

**M5-4 진행 상황**: shapes scene(shape/lane 서브모드)의 command 4개(`AddShapeEvents`/`DeleteShapeEvents`/`AddLaneEvents`/`DeleteLaneEvents`, `edit-shape-commands.ts`)와 편집 캔버스(`scene-editor-shapes.ts`)가 구현됐다(D-2026-099) — `T` 서브모드 전환·서브모드별 선택 필터·Q/W/E/R 정의대로 배치(Blue/center/Red/pinch, lane 그룹+간격유지/pinch)·symmetry(동적 스냅샷 축)·easing 선택(1/2/3/4, Arc 해석 포함)·현재 그룹/symmetry 상태/`R` 모드 툴바 상시 표시까지 Exit 기준을 충족했다. `viewMs`/`scrollMs`를 notes와 공유하도록 `scene-editor-view.ts`로 옮겼다(`editor-graph.md` §2, M5-3 때는 대상이 없어 로컬이었다). 후속 라운드(D-2026-100)가 단순화 항목 #1(기존 점 드래그 재배치)을 마저 채웠다 — `MutateShapeEvents`/`MutateLaneEvents`가 위치(`targetPos`)만 바꾸고(tick은 그대로), symmetry는 드래그에 적용되지 않는다(원본 재확인). 다음 후속(D-2026-101)이 composite dot(center/pinch 쌍) 드래그도 채웠다 — 원본 `findDotAt`의 그룹핑 규칙(pinch=둘 다·차이 0.5 미만·non-anchor, center=한쪽만 있어도)을 재확인해 그대로 옮겼고, 두 점 갱신은 `mutateShapeEventsCommand`(단수→복수 일반화)로 한 undo에 묶는다. **아직 남은 단순화 지점(전부 결정 필요 항목)**: Ctrl+F mirror·클립보드 없음, symmetry 축 수동 조절 없음(항상 동적 스냅샷), lane 그룹은 물리적 키-hold 대신 토글-누적 방식, lane symmetry는 그룹 정확히 2개일 때만 적용, `laneGridDivisor` 드롭다운·`V` 위치 스냅 순환 UI 없음(각각 4·0.25 고정), 같은 dest tick 중복 배치는 조용히 스킵(원본처럼 easing 갱신 안 함) — 자세한 목록은 `scene-editor-shapes.ts` 헤더.
| M5-2 | command / history 계약 | 모든 편집이 command로 들어가고 undo/redo가 원본과 같은 단위로 되감긴다. chart 구조 편집은 history 밖이다. |
| M5-3 | notes scene 편집 interaction | 노트 배치·이동·삭제·복사·붙여넣기·flip이 원본과 같은 결과를 낸다. overlap/conflict가 화면에 표시된다. |
| M5-4 | shapes scene — shape/lane 서브모드 | `T`로 서브모드가 갈리고 선택 필터가 서브모드를 따른다. Q/W/E/R 툴이 정의대로 배치한다. 현재 그룹·symmetry 쌍·`R` 모드가 툴바에 상시 표시된다. |
| M5-5 | meta scene — metadata·tempo·timeSignature·asset | 값 편집이 즉시 timing cache를 재구성한다. music·jacket 교체가 반영된다. |

**M5-5 진행 상황**: meta scene의 command 6개(`AddTempo`/`DeleteTempo`/`EditTempo`·`AddTimeSignature`/`DeleteTimeSignature`/`EditTimeSignature`, `edit-meta-commands.ts`, D-2026-102)와 편집 폼(`scene-editor-meta.ts`)이 구현됐다 — identity(songId 읽기전용·chartId 자동규칙·difficulty·subtitle·level·chartBy)·metadata 6필드·tempo/timeSignature 목록(마지막 한 줄 삭제 방지)·asset(music/jacket) 교체까지 Exit 기준을 충족했다. identity/metadata/asset은 `editor-commands.md` §7대로 command가 아니라 `session.updateChart()` 직접 호출이라, 그 경로만 새 `notifyChanged` 콜백으로 `editorWorkspaceHandle.update()`를 명시적으로 부른다(tempo/timeSignature는 기존 `onDispatch` 구독으로 충분). asset 교체는 표준 `<input type=file accept="audio/*|image/*">`를 직접 만들어 클릭을 위임했다(`env-file.ts`의 텍스트 전용 `FileOpenHost`는 바이너리에 안 맞아 재사용하지 않았다). chartId 자동 규칙은 `editor-graph.md` §4 예시(1/2/3/4)가 생략한 Phase(5번 슬롯)를 `core/data-model.md` §4의 5칸 표로 완성해 구현했다. **범위 밖으로 둔 것(결정 필요 항목)**: "새 난이도" 파생(session 교체·dirty confirm이 엮인 별도 기능, Exit 기준 밖), `measureLabelOffset`(chart 데이터가 아니라 player 전역 설정, 아직 소비자도 없음) — 자세한 근거는 `scene-editor-meta.ts` 헤더.
| M5-6 | test scene — engine 재사용, embedded quick options | 같은 engine이 editor host에서 돈다. 현재 위치에서 lead-in 없이 즉시 재생되고 editor-origin은 항상 no-record다. |

**M5-6 진행 상황(부분)**: engine/session 층의 mid-start를 구현했다(D-2026-103) —
`game-engine.ts`의 `startEngineSession`이 `startChartMs`(기본 0)·`leadInMs`(기본
`LEAD_IN_MS`)를 새로 받아, 0이 아닌 위치에서 chart 시계를 계속 흐르게 열되([[judge]]
§10, 노트 스크롤-in 연출 유지) anchor(`startChartMs`)에 닿기 전까지는 `paused`가
`true`인 새 `leadIn` phase로 입력을 `registerKeyDown`/`registerKeyUp`만 받게 막는다
(judging 시도 없음). `leadInMs=0`이면 카운트다운 없이 첫 프레임에 바로 anchor를
넘어 test scene의 "즉시 재생"(lead-in 없음, [[editor-graph]] §5)을 그대로
표현한다. `game-session.ts`의 `createGameSession`은 `startChartMs≠0`이면 세션을
열기 전에 동기로 `seedPlayStateAt`을 한 번 불러 anchor 이전 note를 SYNC로 미리
채운다([[judge]] §10) — `game-records.ts`의 `NoRecordConditions.midStart`/
`editorOrigin` 필드는 M3-7에서 이미 정의돼 있어 host가 그 값만 채우면 된다(이
변경 자체는 안 건드렸다). `game-engine.test.ts`(+6)·`game-session.test.ts`(+4)로
mid-start를 검증했고, 기존 94개 game-layer 테스트·전체 1323개 테스트가 그대로
통과한다(default 인자라 `startChartMs===0 && leadInMs===LEAD_IN_MS`는 byte-for-byte
기존 동작과 같다).

**seek 축 최소 표시 길이(D-2026-097 재배치분)도 실측으로 닫혔다** — 원본
`conflux-editor`의 `load-chart.js`(25행) `ES.totalMs = Math.max(ES.audioMs || 0,
getChartEndMs(), 5000)`: **5000ms(5초) 하한**이다. `songEndMs`(플레이 종료 조건,
[[timing]] §9)와는 다른 값 — seek 축 total은 `Math.max(contentEndMs, 5000)`이고,
`scene-editor-test.ts`의 `SEEK_AXIS_MIN_MS`로 실제 반영됐다(아래).

**후속 라운드(D-2026-104)가 "current position" 결정과 scene 층을 마저 채웠다** —
사용자 확인: 새 playhead 상태를 만들지 않고 notes/shapes와 이미 공유하는
`EditorViewState.scrollMs`를 그대로 재생 시작점으로 쓴다("지금 타임라인 맨
아래에 보이는 시각"이 곧 "현재 위치") — notes/shapes 탭을 오가도 같은 참조라
자동으로 유지된다. `scene-editor-test.ts`(idle static preview·embedded quick
options 패널·seek bar·Space=즉시재생[leadInMs=0]·Enter=gameplay 진입 위임)를
새로 만들고 `scene-editor-workspace.ts`에 `mountTest` 자리를 붙였다(notes/
shapes/meta와 같은 delegation 패턴). `app-main.ts`가 `enterGameplayFromEditorTest`
로 `scene-gameplay.ts`(M5-6 확장, `startChartMs`/`leadInMs`/`editorOrigin` 필드
추가)를 3초 lead-in·editor-origin으로 push하고, `onGameplayFinished`가
`editorOrigin`이면 result를 건너뛰고 `goBack()`으로 test scene에 복귀한다
([[scene]] §9). no-record 4조건(`NoRecordConditions.editorOrigin`/`midStart`)도
이 경로에서 실제로 채워진다(M3-7이 정의해 둔 필드를 처음 실제로 쓴다).

**"seek bar"(D-2026-104의 추가 요구, 사용자 확인)** — notes/shapes/test 우측에
드래그 가능한 세로 scrollbar를 새로 붙였다(`scene-editor-view.ts`의
`mountEditorScrollbar`, `scrollMs`를 시각화·드래그-seek). **원본에는 대응하는
스크롤바가 없다**(`load-chart.js`/`notes-render.js`/`shape-tools.js` 전부 실측
확인) — 완전히 새 UI 요소이지 재유도가 아니다, 기존 토큰만 재사용한 최소
트리트먼트다(`scene-editor-view.css` 참조). `editor-editing.md`의 "seek bar"
문구는 idle의 정적 요소 목록(HUD·conflict 표시·quick options와 나란히)으로만
쓰여 있어 (a)"현재 위치를 고르는 컨트롤" 하나만 가리킨다 — 재생 **중** 스크럽
(pause 없이 mid-playback 점프)을 가리키는 문구는 어디에도 없어 (b) 해석은
기각했다. 5000ms 하한은 (a)에만 적용된다(재생 중 이동 자체가 이번 라운드
범위 밖 — 정지[Esc]→위치 다시 seek→재시작(Space/Enter)만 지원).

**남은 결정 필요 항목**: notes/shapes 스크롤바의 상한이 고정 총량 없이(원래
무제한 위쪽 스크롤 모델) 현재 스크롤 위치까지 동적으로 늘어난다 —
`scene-editor-notes.ts`/`scene-editor-shapes.ts`의 `scrollbarRange()`. Enter가
quick options row 확정과 gameplay 진입 두 곳에서 겹쳐(embedded 패널이라
song-select overlay처럼 모달로 못 가른다) "미확정 draft가 있을 때만 quick
options가 삼킨다"로 절충했다 — `scene-editor-test.ts` 헤더 참조. 즉시재생 HUD는
playfield·notes·판정선·key 빔·콤보·카운터/퍼센트만 그린다(jacket·sudden
cover·text event·hit effect는 Exit 기준 밖으로 남겼다). idle static preview의
conflict 표시는 계산·렌더 배선이 아직 없다.
| M5-7 | text events | 배치·편집·삭제가 되고 재생 시 정의된 fade로 표시된다. |

**M5-7 진행 상황**: `edit-text-commands.ts`(AddTextEvents/DeleteTextEvents/
EditTextEvent, D-2026-105)와 `scene-editor-notes.ts`의 새 `T` 툴이 구현됐다 —
2클릭(시작→끝)으로 tick 범위를 잡은 뒤 content textarea·position select가 있는
편집 모달을 연다(원본 `text-events.js`의 모달 폼 재확인, `transition`/`mode`
필드는 `data-model.md` §8이 이미 폐기해 둬 없다). **원본과 달리 클릭 자체는
모달을 열지 않는다** — 이 코드베이스가 notes에 이미 세워 둔 "클릭=선택,
Shift+클릭=토글" 모델을 text event에도 그대로 적용해(`editor-editing.md` §1
"선택에 textEvents가 포함되면 함께 복사·붙여넣기") 별도 `textSelection`으로
관리하고, **더블클릭이 기존 이벤트의 편집 모달을 연다**(해석적 결정으로 별도
보고). tick 범위는 배치 시점에 고정되고 모달에서 재편집하지 않는다(원본의
measure 입력 재현은 범위 밖). delete/copy-paste는 note와 textEvent를 각각
별도 dispatch로 처리한다(한 undo로 합치지 않음, 결정 필요 항목). 재생 시
fade 표시는 이미 M4.5-1(`render-playfield.ts`의 `computeActiveTextEvents`/
`drawTextEvent`, `scene-gameplay.ts`가 이미 호출)이 구현해 뒀다 — 이번
라운드는 그 소비자를 위한 데이터를 만드는 편집 쪽만 채웠다. 테스트 신규:
`edit-text-commands.test.ts` 4개, `scene-editor-notes.test.ts` +7 — 전체
1345/1345 통과.

**M5-8이 저장 UI 갭을 닫았다(D-2026-106)** — 조사 결과 갭은 세 개였다(M5-7
보고 당시엔 하나로만 보였다):

1. **chart JSON 저장(Ctrl+S)** — `edit-chart-save.ts`(M3-2)가 이미 갖고 있던
   순수 로직(`proposeSaveVersion`/`saveChartVersion`/`suggestChartFileName`)
   위에 실제 저장 창(`scene-editor-save.ts`, version 입력·파일명 표시·
   Save/Cancel)을 얹었다. `Ctrl+S`는 어느 scene의 `onKeyDown`도 거치지 않는
   완전히 독립된 `document` 리스너다(이 레포는 `stopPropagation`을 쓰지
   않아 항상 실행된다) — `editor-editing.md` §6 "text input에 focus가
   있어도 Ctrl+S는 예외"를 이 구조가 공짜로 만족한다.
2. **`.cfx` 내보내기** — song-select/game은 `library` store(`.cfx` blob)만
   읽는다(`game-song-select.ts`) — chart JSON 저장만으로는 게임에서 안
   보인다. `_meta/cfx.md` §9 "패키징 진입점은 직접 다중 파일 선택 하나다"
   그대로, `editor-start` 화면에 "Package .cfx" 버튼을 더했다 — 여러 chart
   JSON을 골라 `songId`별로 그룹화(`groupBySongId`)하고, `chartId`별 최고
   version을 추천(`recommendCandidates`, 동률 충돌은 그 그룹만 건너뜀)한
   뒤, 참조된 asset(binary)을 별도로 골라 `packageAndSaveCfx`로 묶는다.
   **`.cfx`는 init(chartId 0) + playable chart(1개 이상) 조합을 요구한다**
   (`validatePackageGroup`) — 한 editor 세션에서 meta 탭의 difficulty
   전환(init→Trace 등, M5-5가 이미 구현해 둔 chartId 자동 규칙)으로 같은
   songId의 두 chart를 각각 Ctrl+S로 저장하면 이 조합이 만들어진다.
3. **`.cfx` → library 등록** — `.cfx`를 만들어도 `library` store에 넣는
   UI가 없으면 song-select가 여전히 못 본다. 같은 화면에 "Import .cfx"
   버튼을 더했다 — `.cfx` binary를 읽어 `validateCfxForImport`(구조 검증
   + playable music decode 검증)을 통과시키고, 이미 등록된 songId면
   `planLibraryRegistration`의 비교 결과를 `confirm()`으로 보여준 뒤
   `commitLibraryRegistration`으로 등록한다.

2·3번 둘 다 binary 파일을 읽어야 했는데 `env-file.ts`의 `FileOpenHost`는
텍스트 전용이었다 — M5-1이 "Open .cfx" 버튼을 disabled로 남기며 결정
필요 항목으로 미뤄 뒀던 바로 그 지점(D-2026-062)이다. `pickFiles`(다중
텍스트)·`pickBinaryFiles`(binary) 두 메서드를 **추가**해(기존 `pickFile`
계약은 안 건드림) 닫았다.

**"Package .cfx"/"Import .cfx" 배치는 spec에 위치가 정해져 있지 않다**
(결정 필요 항목) — `_meta/cfx.md`는 "패키징 화면"이라고만 부르지 어디
있어야 하는지 안 정한다. 이미 파일-흐름 진입점들이 모인 `editor-start`
화면을 재사용했다 — mode-select의 항목 목록(play/editor/settings/credits)
은 이미 확정된 spec이라 새 항목을 추가하지 않았고, song-select(더
자연스러울 수 있는 후보)는 이미 완성된 M4-3/M4-4/M4-6/M4-7 화면이라
건드리지 않았다.

이걸로 M5 자체 Exit 기준("빈 chart에서 시작해 노트·shape·lane·text·메타를
넣고 저장한 뒤 game에서 플레이할 수 있다")이 **수동 다중 단계 경로로
end-to-end 충족된다**: New Chart → notes/shapes/lane/text 편집 → meta에서
difficulty를 init→Trace로 바꾸고 music 연결 → Ctrl+S 두 번(init·Trace 각각)
→ editor-start의 "Package .cfx"(두 JSON + music 파일 선택) → "Import .cfx"
→ song-select에서 플레이. 빠진 단계 없음. 테스트 신규: `env-file.test.ts`
+6(`openMultiple`/`openBinary`), `scene-editor-save.test.ts` 6개,
`scene-editor-start.test.ts` +2 — 전체 1359/1359 통과.

**Exit**: 빈 chart에서 시작해 노트·shape·lane·text·메타를 넣고 저장한 뒤 game에서 플레이할 수 있다. 수동 대조 시나리오 — 편집 조작별 결과 비교.

---

## 9. M6 — cleanup

| step | 범위 | 완료 기준 |
|---|---|---|
| M6-1 | 잔여 실측 수치 확정 | 각 spec 문서의 잔여 목록에 실측 미완 항목이 남아 있지 않다. |
| M6-2 | `FEATURES` 정리 + public/internal 빌드 검증 | public 빌드 **산출물에 editor 코드가 존재하지 않는다** — 경로 차단이 아니라 번들에서 제거됐음을 산출물 검사로 확인한다([[architecture]] §4). `recordReset` 진입점도 마찬가지다. |
| M6-3 | 전 시나리오 회귀 패스 | M2~M5의 수동 대조 시나리오를 한 번에 다시 돌려 전부 통과한다. |
| M6-4 | 스펙↔구현 동기화 | 구현 중 바뀐 결정이 spec과 `DECISION_LOG`에 반영돼 있다. |

**M6-1 진행 상황**(D-2026-107): 레포 전체 spec 문서의 `- [ ]` 잔여 항목을
훑었다(`editor-graph.md`·`scene/scene.md`·`core/judge.md`·`core/naming.md`·
`core/lane-events.md`·`_meta/settings.md`·`_plan/build-order.md` 7개 파일).
**"실측 미완"으로 남아 있던 항목은 없었다** — 전부 이미 이전 milestone에서
실제로 구현·확정됐는데 체크박스만 안 뒤집혀 있던 문서 동기화 누락이었다:
`editor-graph.md`의 seek 축 최소 표시 길이(D-2026-097, 5000ms, M5-6이 이미
구현), `core/judge.md`의 `playJudgQueue`→표시 레이어 연결(M2-5/M4.5-1이 이미
구현), `core/lane-events.md`의 init 이동 편집 UI(M5-4가 이미 구현),
`_meta/settings.md`의 key rebinding·volume 슬라이더(D-2026-091, M4-6이 이미
구현), `core/naming.md`의 입력단계 지역변수 정리(재구현 자체가 처음부터
`lane`/`targetPos`로 일관 명명해 애초에 문제가 없었다 — `grep -rn linePos
src/` 결과 없음 확인). 전부 해당 문서에 확정 근거와 함께 체크박스를 옮겼다.

**유일하게 진짜 미완이었던 건 `scene/scene.md`의 "credits scene 표시
내용"**이었다 — 다만 이것도 "실측"(수치)이 아니라 콘텐츠/배선 항목이라
M6-1의 좁은 의미("잔여 실측 **수치**")에는 안 들어맞을 수 있다(결정 필요
항목으로 별도 명시, 아래). `ui-design.md` §2.8.5가 이미 방향을 정해 둔
대로 `Music`/`Chart`/`Jacket` 세 섹션(library 스캔·자동 dedupe, song/chart
로 안 묶음)을 실제로 배선했다(`game-credits.ts`) — `scene-credits.ts`가
매 `onEnter`마다 다시 스캔해 반영한다. `Project Staff`(수작업 유지 목록)는
그대로 뒀다 — 실제 인원 이름은 이 재구현 프로젝트 자체의 제작진 정보라
소스에서 추출할 방법이 없다(`scene/scene.md` §11에 결정 필요 항목으로
남김). 이 라운드가 새로 내린 결정: (1) 목록이 비면 그 섹션을 숨긴다
(§2.8.5가 "여기서 정하지 않는다"고 열어 둔 자리), (2) 빈 문자열 필드는
목록에서 제외한다, (3) 정렬은 알파벳순(스펙이 순서를 안 정해 결정적이게
택함) — 전부 `scene-credits.ts`/`game-credits.ts` 헤더에 명시.

테스트 신규: `game-credits.test.ts` 6개, `scene-credits.test.ts`
(재작성, 6개) — 전체 통과.

---

## 10. 결정 완료 / 잔여

확정:
- [x] milestone 6단계 정의와 경계
- [x] M3 = persistence, M4 = game graph — song-select가 처음부터 실제 library·records를 읽도록 순서를 뒤집었다 `[신규]`
- [x] step = 독립 검증 단위, 경계는 소프트하되 gate는 넘지 않음
- [x] 완료 기준 = 관찰 가능한 동작 문장
- [x] 회귀 = core 골든 테스트 + milestone별 수동 대조 시나리오
- [x] 실측 gate를 milestone 진입 조건으로 명문화
- [x] D-2026-021을 M3 진입 조건으로 배치
- [x] 구현 코드는 명세 레포 안에 산다 `[신규]` (D-2026-033)
- [x] 골든 테스트 배치·추출 절차·입력 세트 (D-2026-033)
- [x] 설계 대장 — 대장에 없는 차이는 실패, `미커버`·`없음`도 등재 `[신규]` (D-2026-035)

잔여:
- [ ] 수동 대조 시나리오의 구체 목록 — 각 milestone 진입 시 작성
