# 골든 표 — 원본에서 뜬 기대값

`tests/golden/*.json`은 **원본 `conflux-editor`를 Node에서 실행해 얻은 관측 자료**다.
사람이 쓴 코드가 아니므로 **손으로 고치지 않는다.** 값이 의심스러우면 재생성한다.

## 재생성

```bash
CONFLUX_EDITOR_DIR=/path/to/conflux-editor node tools/golden/extract-all.mjs
```

`CONFLUX_EDITOR_DIR`을 생략하면 `../conflux-editor`를 본다.

## 이 표가 보는 것

재구현은 원본을 따라가는 게 목적이 아니라 **더 나은 설계로 다시 짓는 것**이다.
그래서 표와 어긋나는 자리가 정상적으로 생긴다.

표가 실제로 잡는 것은 "원본을 따르라"가 아니라 **몰랐던 차이를 드러내는 것**이다 —
원본을 잘못 읽었거나 스펙에 적히지 않은 동작을 건드렸을 때, 그것이 질문으로
떠오르게 하는 장치다. 의도한 개선은 `tests/golden/DIVERGENCES.md`(설계 대장)에
등재한다.

**대장에 없는 차이는 실패다.** 등재된 차이는 통과하고, 등재되지 않은 불일치는
테스트를 실패시킨다. 등재는 한 줄과 근거 링크면 되고, 설계 방향을 바꾸는 큰
결정만 `DECISION_LOG`로 승격한다.

## 명칭

표는 **원본 명칭**을 쓴다 (`startTick`·`isWide`·`channel`·`gaugeType`·`gaugeValue`).
재설계 명칭(`gaugeMode` 등)으로의 매핑은 테스트 쪽이 갖는다 — 관측 자료는 관측
대상의 이름을 쓰고, 매핑표가 한 곳에 모여야 개명 누락이 드러난다.

## 허용 오차

정수형 결과(tick·카운트·판정 종류·state·rank)는 **완전 일치**.
실수형(ms·게이지·보간값)은 상대 오차 `1e-9`.

원본에는 누산 순서에서 나온 IEEE 잡음이 있다 — 예를 들어 `t2ms(1920)`은
`500`이 아니라 `500.00000000000006`이다. 이 폭은 그 잡음을 흡수하되 실제
계산 차이는 잡는다.

## 스텁

`audio.js` **하나만** 대체한다(`stubs/audio.js`). `play-judgment.js`가
`playHit`을 끌어오는데 원본 `audio.js`는 `editor-state.js`를 거쳐 WebAudio로
번진다. 판정 결과는 소리에 의존하지 않는다.

나머지는 원본 그대로 돈다. `constants.js`의 `$ = id => document.getElementById(id)`는
화살표 함수라 호출 전에는 평가되지 않아 스텁이 필요 없다.

## 빈 표 방어

추출 스크립트는 표가 비었거나 기대값이 전부 `null`이면 **실패로 종료**한다.
원본 함수는 필드명이 어긋나도 예외 대신 `null`/`undefined`를 조용히 돌려주므로,
그 상태가 표에 굳는 것을 막는다.

## 파일

| 파일 | 내용 |
|---|---|
| `fixtures.mjs` | 합성 chart 세트 — 다중 BPM·다중 박자·경계 tick·음수 tick·Hold 중첩·6키 포화 |
| `harness.mjs` | 원본 적재, 스텁 주입, 지문 기록, 빈 표 방어 |
| `extract-*.mjs` | 영역별 추출 |
| `extract-constants.mjs` | 튜닝 수치·`DEFAULT_SETTINGS` — 함수 결과가 아니라 **선언된 값 자체**를 뜬다. 이 값들이 나머지 표를 만든 입력이므로 손으로 옮기지 않는다 |
| `extract-all.mjs` | 전체 재생성 |
| `../../tests/golden/DIVERGENCES.md` | 설계 대장 — 원본에서 벗어난 자리 전부 |

## judge 표의 필드

`noteChannel`·`noteIsWide`를 반드시 남긴다. 같은 tick에 wide와 normal이 공존하면
`startTick`만으로는 **어느 쪽을 골랐는지 표에서 사라진다** — 그게 D-2026-024가
`[번복]`한 후보 순서 규칙의 검증 지점이다. 표 크기를 줄이려고 빼지 않는다.
