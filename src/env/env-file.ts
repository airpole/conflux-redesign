/**
 * 파일 열기·저장 창 — chart JSON을 사용자 상호작용으로 읽고 쓴다.
 *
 * 실패 모드: 사용자 상호작용(취소 가능)이라는 점이 `env-storage`(조용한 영속,
 * 절대 던지지 않음)와 다르다 `[신규]` — 여기서는 **취소**와 **쓰기 실패**를
 * 구별한다. 취소는 정상 흐름(호출측이 상태를 그대로 둔다)이고, 실패는 던져서
 * 호출측이 사용자에게 알리게 한다.
 *
 * 브라우저 API는 호스트로 주입받는다(다른 env-* 파일과 동일 패턴) — File
 * System Access API 모양(`showOpenFilePicker`/`showSaveFilePicker`)을 최소
 * 표면으로 추상화했다. 실제 브라우저 지원 폭(File System Access API 미지원
 * 브라우저의 폴백)은 M3-2 범위 밖 — 결정 필요 항목으로 별도 보고한다.
 */

export interface OpenedFile {
  readonly name: string;
  readonly text: string;
}

/** `showOpenFilePicker` 모양의 최소 표면. 사용자가 취소하면 `null`. */
export interface FileOpenHost {
  pickFile(accept: readonly string[]): Promise<OpenedFile | null>;
}

/** `showSaveFilePicker` 모양의 최소 표면. 사용자가 취소하면 `null`. */
export interface FileSaveHost {
  saveFile(suggestedName: string, contents: string): Promise<{ readonly name: string } | null>;
}

export type OpenOutcome =
  { readonly kind: 'opened'; readonly file: OpenedFile } | { readonly kind: 'cancelled' };

export type SaveFileOutcome =
  { readonly kind: 'saved'; readonly name: string } | { readonly kind: 'cancelled' };

export interface FileEnv {
  /** 취소는 `cancelled`로 돌아온다. 읽기 실패는 던진다. */
  open(host: FileOpenHost, accept: readonly string[]): Promise<OpenOutcome>;
  /** 취소는 `cancelled`로 돌아온다. 쓰기 실패는 던진다. */
  save(host: FileSaveHost, suggestedName: string, contents: string): Promise<SaveFileOutcome>;
}

export function createFileEnv(): FileEnv {
  return {
    async open(host, accept) {
      const file = await host.pickFile(accept);
      return file === null ? { kind: 'cancelled' } : { kind: 'opened', file };
    },

    async save(host, suggestedName, contents) {
      const result = await host.saveFile(suggestedName, contents);
      return result === null ? { kind: 'cancelled' } : { kind: 'saved', name: result.name };
    },
  };
}
