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
| M2-5 전 | 결정 | 히트음·효과음 asset 출처 — 구 코드 asset 계승 여부 |
| M2-6 전 | 결정 | **ui-design 최소본** — 토큰(색·타이포·간격) + result 레이아웃 |
| M3 진입 | 결정 | **D-2026-021** — 라이브 웹 배포 / `.cfx` 보호 / 공개 서비스 기록 위치. 파일·기록 층의 계약을 흔들 수 있으므로 이 층을 짓기 전에 닫는다 |
| M4 진입 | 결정 | **ui-design 전체** — song-select·settings·title·credits 레이아웃 |
| M4-3 전 | 결정 | 목록 옵션 overlay 진입 키 · `sortDir` 단축 전환 키 · 가속 스크롤 수치(초기 지연·반복 간격·가속 곡선) |
| M4-3 전 | 결정 | song row 대표값 출처(title·jacket) · 정보 패널 BPM 표기 방식 · 곡 길이 표시 |
| M4-6 전 | 결정 | key rebinding UI · volume 슬라이더 조작 단위 — 기본값·범위는 `[보존]`으로 확정됨([[settings]] §4) |
| M4-2 전 | 결정 | credits scene 표시 내용 |
| M5 진입 | 실측 | §3 M5 항목 |

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

### M5 진입 전

- 편집 미세 수치: 히트 반경, 드래그 임계 — [[editor-editing]] §8.
- `viewMs` 기본값·zoom 범위, editor timeline 최소 표시 길이 — [[editor-graph]] §6.
- shape 보조 툴(normalize 등)의 계승 여부 — [[shape]] §8.

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
| M2-7 | 마감 — 탭 백그라운드 auto-pause, 로딩 표시, 브라우저 단축키 충돌 처리 | 탭을 숨기면 pause가 열리고 blur만으로는 열리지 않는다. 지연이 임계를 넘으면 로딩 표시가 뜬다. |

**Exit**: 같은 chart를 원본과 재구현에서 나란히 플레이해 **판정 열·게이지 곡선·최종 state·rank가 일치**한다. 수동 대조 시나리오 — 전 SYNC / 전 MISS / hard 사망 / cascade 강등 / Hold 동시 소유 / mid-start / pause Resume / 곡 끝 tail.

---

## 6. M3 — persistence + `.cfx`

**목표**: chart를 파일로 열고 저장하고 배포 패키지로 묶고 다시 읽는다. 기록이 남는다.

**진입 gate**: **D-2026-021**.

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

## 8. M5 — editor

**목표**: chart를 처음부터 만들 수 있다.

**진입 gate**: §3 M5 실측.

| step | 범위 | 완료 기준 |
|---|---|---|
| M5-1 | editor graph + start scene + single-chart session | 네 scene이 자유 전환되고 `test`는 lazy mount된다. 세션이 chart 하나를 소유한다. |
| M5-2 | command / history 계약 | 모든 편집이 command로 들어가고 undo/redo가 원본과 같은 단위로 되감긴다. chart 구조 편집은 history 밖이다. |
| M5-3 | notes scene 편집 interaction | 노트 배치·이동·삭제·복사·붙여넣기·flip이 원본과 같은 결과를 낸다. overlap/conflict가 화면에 표시된다. |
| M5-4 | shapes scene — shape/lane 서브모드 | `T`로 서브모드가 갈리고 선택 필터가 서브모드를 따른다. Q/W/E/R 툴이 정의대로 배치한다. 현재 그룹·symmetry 쌍·`R` 모드가 툴바에 상시 표시된다. |
| M5-5 | meta scene — metadata·tempo·timeSignature·asset | 값 편집이 즉시 timing cache를 재구성한다. music·jacket 교체가 반영된다. |
| M5-6 | test scene — engine 재사용, embedded quick options | 같은 engine이 editor host에서 돈다. 현재 위치에서 lead-in 없이 즉시 재생되고 editor-origin은 항상 no-record다. |
| M5-7 | text events | 배치·편집·삭제가 되고 재생 시 정의된 fade로 표시된다. |

**Exit**: 빈 chart에서 시작해 노트·shape·lane·text·메타를 넣고 저장한 뒤 game에서 플레이할 수 있다. 수동 대조 시나리오 — 편집 조작별 결과 비교.

---

## 9. M6 — cleanup

| step | 범위 | 완료 기준 |
|---|---|---|
| M6-1 | 잔여 실측 수치 확정 | 각 spec 문서의 잔여 목록에 실측 미완 항목이 남아 있지 않다. |
| M6-2 | `FEATURES` 정리 + public/internal 빌드 검증 | public 빌드 **산출물에 editor 코드가 존재하지 않는다** — 경로 차단이 아니라 번들에서 제거됐음을 산출물 검사로 확인한다([[architecture]] §4). `recordReset` 진입점도 마찬가지다. |
| M6-3 | 전 시나리오 회귀 패스 | M2~M5의 수동 대조 시나리오를 한 번에 다시 돌려 전부 통과한다. |
| M6-4 | 스펙↔구현 동기화 | 구현 중 바뀐 결정이 spec과 `DECISION_LOG`에 반영돼 있다. |

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
