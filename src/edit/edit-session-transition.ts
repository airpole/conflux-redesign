/**
 * 세션 전환 confirm — `_meta/persistence.md` §5.
 *
 * 다음 동작으로 현재 chart 세션을 교체하거나 이탈할 때(`Ctrl+O`, 새 난이도
 * 생성, editor에서 mode-select/title로 이탈, 다른 복구 상태·chart로 교체)
 * dirty라면 확인한다. 선택지는 `Save New Version` / `Discard Changes` /
 * `Cancel`.
 *
 * 이 함수는 **결정**만 담는다 — 실제로 사용자에게 무엇을 물어볼지(다이얼로그
 * UI)는 아직 없는 scene 층(M4/M5)의 몫이다. 호출측이 이미 고른 선택지를
 * 받아, 그 선택에 따라 저장/폐기를 실행하고 전환 가부를 돌려준다.
 */

export type SessionTransitionChoice = 'saveNewVersion' | 'discardChanges' | 'cancel';

export type SessionTransitionResult =
  | { readonly kind: 'proceed'; readonly reason: 'clean' | 'saved' | 'discarded' }
  | { readonly kind: 'stay'; readonly reason: 'cancelled' | 'save-cancelled' };

/**
 * - clean이면 확인 없이 전환한다(`choice`는 무시된다).
 * - dirty에서 `saveNewVersion`: 저장이 성공해야만 전환을 계속한다. 취소·실패
 *   (`saveNewVersion` 콜백이 `'cancelled'`를 돌려주거나 던지면)는 현재 세션을
 *   유지한다 — 던진 에러는 이 함수가 삼키지 않고 그대로 전파한다(실제 쓰기
 *   실패는 호출측이 사용자에게 알려야 하므로).
 * - dirty에서 `discardChanges`: 현재 메모리 변경과 workspace 복구본을 폐기하고
 *   전환한다.
 * - dirty에서 `cancel`(또는 선택 없음): 전환을 취소하고 현재 세션을 유지한다.
 */
export async function resolveSessionTransition(
  dirty: boolean,
  choice: SessionTransitionChoice | null,
  actions: {
    /** 저장 성공 시 `'saved'`, 사용자가 저장 창을 취소하면 `'cancelled'`. 쓰기 실패는 던진다. */
    readonly saveNewVersion: () => Promise<'saved' | 'cancelled'>;
    /** 현재 메모리 변경 + workspace 복구본 폐기(예: `WorkspaceSession.discard`). */
    readonly discard: () => Promise<void>;
  },
): Promise<SessionTransitionResult> {
  if (!dirty) return { kind: 'proceed', reason: 'clean' };

  switch (choice) {
    case 'saveNewVersion': {
      const outcome = await actions.saveNewVersion();
      return outcome === 'saved'
        ? { kind: 'proceed', reason: 'saved' }
        : { kind: 'stay', reason: 'save-cancelled' };
    }
    case 'discardChanges':
      await actions.discard();
      return { kind: 'proceed', reason: 'discarded' };
    case 'cancel':
    case null:
      return { kind: 'stay', reason: 'cancelled' };
  }
}
