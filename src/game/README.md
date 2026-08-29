# game — 플레이 인터랙션

파일 접두사 `game-*`. `edit`과 **형제 축**이며 서로를 모른다.

play 엔진은 호스트를 모르고 `CTX` 하나만 본다 → `_plan/architecture.md` §3

정의 → `_plan/architecture.md` §1

`game-ctx.ts`(CTX 타입)·`game-engine.ts`(lead-in→곡 종료 시계)가 M2-3 범위다.
`curMs`는 항상 wall-clock 기준이고(`env-audio.getPositionMs()`를 매 프레임
재동기화에 안 쓴다, 원본 `play.js` `playLoop` 보존), 엔진이 매 프레임 쓰는
CTX 필드는 `sharedMs` 하나뿐이다. mid-start·Resume·judge 결선·gauge·HUD는
M2-4·M2-5.
