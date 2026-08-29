/**
 * CTX seam — play 엔진이 호스트(editor embedded test scene / game scene)를
 * 몰라도 되게 하는 유일한 접점. 정의는 `_plan/architecture.md` §3.
 *
 * 정본 필드는 **데이터 5개 + 훅 1개**뿐이다. 엔진이 매 프레임 쓰는 건
 * `sharedMs` 하나이고, 나머지는 read-only로 다른 레이어(render/audio)가 읽는다.
 * `judgeLinePos`는 이 정본 seam에 없다 — 호스트가 얹어 보내는 추가 값이다.
 */
export interface CTX {
  /** 현재 재생 위치(ms). 엔진이 매 프레임 쓰는 유일한 필드. */
  sharedMs: number;
  /** 곡 내용이 끝나는 chart time(ms). 진행 표시 분모 — 종료 조건이 아니다. */
  readonly contentEndMs: number;
  readonly hitVol: number;
  readonly pvSpd: number;
  readonly nThk: number;
  /** 세션 종료 후 idle 프레임을 다시 그릴지 호스트가 판단한다. */
  redrawIdle(): void;
}
