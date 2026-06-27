# timing 재설계 검증 기록

> `core/timing.md` 작성 전, 현재 `conflux-editor`의 timing 로직을 헤드리스로 실행해
> "하는 일"을 추출하고, 단순화 재설계안이 동작을 보존하는지 수치로 검증한 기록.
> 출처: `airpole/conflux-editor` main (timing.js, game-render.js, play.js, cache.js).

---

## 1. 현재 로직이 실제로 하는 일

| 함수 | 하는 일 | core 여부 |
|---|---|---|
| `t2ms(tick)` | tempos 구간 누적 ms로 tick→ms. 구간 = `{st, ms(누적), bpm, mpt=60000/(bpm·TPB)}` | ✅ 순수 |
| `ms2t(ms)` | 같은 구간으로 ms→tick (역변환) | ✅ 순수 |
| `getBPMAt(tick)` | 그 tick의 bpm | ✅ 순수 (단, **호출처 없음** = 死코드) |
| `tk2y` (game-render 내부 클로저) | `jY − ((t2ms(tk)−curMs)/visMs)·(jY−gy)`. **독립 함수 아님** | ❌ 픽셀(jY/gy/gh) 의존 → render |
| `tickToMeasure/measureToTick/getGridLines` | 마디·박·라벨 표기, 마디선 생성 | 별도 주제 → grid 문서 후보 |
| clock: `curMs = playOffMs + (now()−playT0)·playbackRate` | 재생 시계 | ❌ now()/playbackRate/PS 의존 → game |

핵심:
- **스크롤은 ms 등속.** `tk2y`가 ms 공간에서 선형이라 노트 낙하 px 속도는 BPM 무관 일정. BPM은 노트 간격만 바꾼다. "가변속"은 별도 메커니즘이 아니라 `t2ms`의 BPM 누적의 부산물.
- `visMs = 2000 / scrollSpeed` (게임 가시 시간창). scrollSpeed는 여기에만, playbackRate는 clock에만 — 둘이 안 닿음(코드 확인).
- clock에 `playbackRate`가 곱해지나 항상 1.0 고정이라 무영향.

---

## 2. 검증: 단순화 재설계안 vs 현재

재설계안(`buildBpmSegments`/`tickToMs`/`msToTick`/`bpmAt`): 캐시 추상화 제거 → 순수 함수,
세 함수가 한 세그먼트 배열 공유(현재는 getBPMAt만 따로 정렬), 룩업을 `lastSeg(pred)`로 명시.

**비교 범위**: 4개 템포맵(단일/가속/감속+비정렬/극단) × tick −4000~12000(37틱 간격) = 1732 포인트, ms −2000~6000.

| 검사 | 결과 |
|---|---|
| `tickToMs` 현재=재설계 | **worst diff 0.000e+0** (완전 일치) |
| `msToTick` 현재=재설계 | **worst diff 0.000e+0** (완전 일치) |
| 왕복 tick→ms→tick | max err 4.5e-13 (FP 한계) |
| 왕복 ms→tick→ms | 0.000e+0 |
| `bpmAt` | **tick≥0 전부 일치.** tick<0에서만 차이 |

### bpmAt 음수-tick 차이 (무해)
- 현재 `getBPMAt`: 음수 tick에 매치 없음 → 하드코딩 **120** 반환.
- 재설계 `bpmAt`: 첫 세그먼트 외삽 → **첫 템포 bpm** 반환.
- **그러나 `getBPMAt`는 코드 어디서도 호출되지 않음**(死코드). 차이는 관측 불가.
- 재설계 동작(첫 세그먼트 외삽)이 `tickToMs`의 음수-tick 처리와 일관 → 그쪽 채택. `[수정]`이되 무영향.

---

## 3. 결론 (timing.md에 반영)

- timing core = `tickToMs` / `msToTick` / `bpmAt` + 스크롤 **진행도**(픽셀 아님) + gridDivisor.
- `scrollProgressAt(tick, nowMs) = (tickToMs(tick) − nowMs) / visMs`, `visMs = SCROLL_VIEW_MS / scrollSpeed`, `SCROLL_VIEW_MS = 2000`. [신규: 분리]
- `scrollYAt`(픽셀 Y)은 render 소관 — progress를 받아 `jY − progress·(jY−gy)`. timing.md 아님. → naming.md 수정 필요.
- clock 앵커링(leadIn/offset/playT0/playbackRate)은 game 소관. timing.md는 nowMs를 받기만.
- measure 표기/마디선(`tickToMeasure` 등)은 별도 문서 후보. timing.md엔 gridDivisor 정의만 흡수.
- `compBPM`/`invalidateTSCache` = 캐시 무효화 레거시. 재설계는 cache.js의 의존성 선언으로 대체 → 제거. [수정]
