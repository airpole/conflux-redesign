/**
 * editor-only 코드의 단일 진입점 — M6-2가 `app-main.ts`에서 여기로
 * 옮겼다(`_plan/architecture.md` §4 "빌드 게이트"). `app-main.ts`가
 * `if (FEATURES.editor) { await import('./app-editor.js') }`로만 이
 * 모듈에 닿는다 — public 빌드에서는 이 `import()` 자체가 죽은 코드로
 * 접혀 Rollup이 이 파일과 그 정적 import 그래프 전체(모든
 * `scene-editor-*`, `edit-*`, `format-cfx-*`)를 산출물에서 제외한다
 * (동적 import 경계 안쪽만 이 효과가 적용된다 — 정적 import는 대상이
 * 아니다).
 *
 * `boot()`가 들고 있던 editor 전용 상태·함수를 그대로 옮겼다 — 로직
 * 변경은 없다(behavior-preserving). `manager`(scene 전환)와
 * `pendingGameplayInput`(gameplay 진입 데이터)은 `app-main.ts`의
 * `boot()` 스코프에 남아 있어 콜백으로 받는다: `gotoScene`이
 * `manager.goScene`을, `setPendingGameplayInput`이
 * `pendingGameplayInput = ...`을 대신한다.
 */
import type { Scene } from '../scene/scene-manager.js';
import { mountEditorStartScene, type EditorStartSceneHandle } from '../scene/scene-editor-start.js';
import {
  mountEditorWorkspaceScene,
  EDITOR_CATEGORIES,
  type EditorCategory,
  type EditorWorkspaceSceneHandle,
} from '../scene/scene-editor-workspace.js';
import { mountEditorNotesBody } from '../scene/scene-editor-notes.js';
import { mountEditorShapesBody } from '../scene/scene-editor-shapes.js';
import { mountEditorMetaBody } from '../scene/scene-editor-meta.js';
import { mountEditorTestBody } from '../scene/scene-editor-test.js';
import { DEFAULT_SETTINGS, type Settings } from '../core/core-settings.js';
import { createInitChart } from '../edit/edit-chart-init.js';
import {
  createWorkspaceSession,
  loadRecoverableWorkspace,
  type WorkspaceSession,
} from '../edit/edit-workspace.js';
import { resolveSessionTransition } from '../edit/edit-session-transition.js';
import { createCommandHistory, type CommandHistory } from '../edit/edit-command.js';
import { openChartJson } from '../format/format-chart-open.js';
import {
  proposeSaveVersion,
  saveChartVersion,
  suggestChartFileName,
} from '../edit/edit-chart-save.js';
import { mountEditorSaveModal, type EditorSaveModalHandle } from '../scene/scene-editor-save.js';
import { groupBySongId, type CandidateChart } from '../format/format-cfx-package.js';
import { recommendCandidates, packageAndSaveCfx } from '../edit/edit-cfx-package.js';
import {
  validateCfxForImport,
  planLibraryRegistration,
  commitLibraryRegistration,
} from '../edit/edit-cfx-library.js';
import { createFileEnv, type FileOpenHost, type FileSaveHost } from '../env/env-file.js';
import { readSettings, writeSettings } from '../game/game-settings.js';
import type { StorageEnv } from '../env/env-storage.js';
import type { AudioEnv } from '../env/env-audio.js';
import type { GameplayStartInput } from '../scene/scene-gameplay.js';

export interface EditorScenesDeps {
  readonly root: HTMLElement;
  readonly storage: StorageEnv;
  readonly audioEnv: AudioEnv;
  readonly gotoScene: (id: string) => void;
  readonly setPendingGameplayInput: (input: GameplayStartInput) => void;
}

export interface EditorScenes {
  readonly editorStartScene: Scene;
  readonly editorWorkspaceScenes: readonly Scene[];
}

/** editor scene graph 전체를 만든다 — `app-main.ts`의 `boot()`가
 *  `FEATURES.editor`가 true일 때만, `createSceneManager([...])`를 만들기
 *  전에 한 번 부른다. */
export function mountEditorScenes(deps: EditorScenesDeps): EditorScenes {
  const { root, storage, audioEnv, gotoScene, setPendingGameplayInput } = deps;

  // ── M5-1: editor scene graph + single-chart session ───────────────────
  // editor-graph.md §1·§2, persistence.md §6·§7·§9. WorkspaceSession
  // 하나를 start + 네 형제 scene이 공유한다 — settingsHandle과 같은
  // "host가 들고 있다가 scene에 넘겨준다" 패턴.

  const fileEnv = createFileEnv();

  interface MinimalFileHandle {
    getFile(): Promise<File>;
  }
  type ShowOpenFilePicker = (options: {
    types?: readonly { accept: Record<string, readonly string[]> }[];
    multiple?: boolean;
  }) => Promise<readonly MinimalFileHandle[]>;

  interface MinimalWritable {
    write(data: Uint8Array | string): Promise<void>;
    close(): Promise<void>;
  }
  interface MinimalSaveFileHandle {
    readonly name: string;
    createWritable(): Promise<MinimalWritable>;
  }
  type ShowSaveFilePicker = (options: {
    suggestedName?: string;
    types?: readonly { accept: Record<string, readonly string[]> }[];
  }) => Promise<MinimalSaveFileHandle>;

  // File System Access API는 DOM lib 타입에 아직 없어(관련 패키지 미설치)
  // 이 파일에서만 최소 표면으로 duck-type한다 — `env-file.ts`가 이미
  // "실제 브라우저 지원 폭·폴백은 범위 밖"이라고 명시해 둔 자리다
  // (D-2026-062). 여기서 그 결정을 다시 열지 않고 그대로 따른다:
  // 미지원 브라우저에서는 `null`(취소)로 처리한다.
  //
  // M5-8이 `pickFiles`(다중 텍스트, `.cfx` 패키징의 chart JSON 선택)·
  // `pickBinaryFiles`(binary, `.cfx` import·패키징의 asset)를 이 같은 host
  // 객체에 추가했다 — D-2026-062가 "binary open 확장"으로 열어 둔 자리를
  // 여기서 닫는다. `pickFile`(단일 텍스트) 계약은 그대로다.
  const jsonOpenHost: FileOpenHost = {
    async pickFile(accept) {
      const picker = (window as unknown as { showOpenFilePicker?: ShowOpenFilePicker })
        .showOpenFilePicker;
      if (picker === undefined) return null;
      let handles: readonly MinimalFileHandle[];
      try {
        handles = await picker({
          types: [{ accept: { 'application/json': accept } }],
          multiple: false,
        });
      } catch {
        return null; // 사용자 취소(AbortError) — env-file 계약대로 취소는 null.
      }
      const file = await handles[0]!.getFile();
      return { name: file.name, text: await file.text() };
    },
    async pickFiles(accept) {
      const picker = (window as unknown as { showOpenFilePicker?: ShowOpenFilePicker })
        .showOpenFilePicker;
      if (picker === undefined) return null;
      let handles: readonly MinimalFileHandle[];
      try {
        handles = await picker({
          types: [{ accept: { 'application/json': accept } }],
          multiple: true,
        });
      } catch {
        return null;
      }
      const files = await Promise.all(handles.map((h) => h.getFile()));
      return Promise.all(files.map(async (file) => ({ name: file.name, text: await file.text() })));
    },
    async pickBinaryFiles(accept, multiple) {
      const picker = (window as unknown as { showOpenFilePicker?: ShowOpenFilePicker })
        .showOpenFilePicker;
      if (picker === undefined) return null;
      let handles: readonly MinimalFileHandle[];
      try {
        handles = await picker({
          types: [{ accept: { 'application/octet-stream': accept } }],
          multiple,
        });
      } catch {
        return null;
      }
      const files = await Promise.all(handles.map((h) => h.getFile()));
      return Promise.all(
        files.map(async (file) => ({
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      );
    },
  };

  // chart JSON 저장(Ctrl+S)·`.cfx` 내보내기 둘 다 이 host로 쓴다 —
  // 저장할 내용(`contents: string | Uint8Array`)만 다르고 대화상자
  // 자체는 같다.
  const browserSaveHost: FileSaveHost = {
    async saveFile(suggestedName, contents) {
      const picker = (window as unknown as { showSaveFilePicker?: ShowSaveFilePicker })
        .showSaveFilePicker;
      if (picker === undefined) return null;
      let handle: MinimalSaveFileHandle;
      try {
        handle = await picker({
          suggestedName,
          types: [
            { accept: { 'application/octet-stream': [`.${suggestedName.split('.').pop()}`] } },
          ],
        });
      } catch {
        return null; // 사용자 취소.
      }
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      return { name: handle.name };
    },
  };

  let editorSession: WorkspaceSession | undefined;
  let editorCommandHistory: CommandHistory | undefined;
  let editorWorkspaceHandle: EditorWorkspaceSceneHandle | undefined;
  // test 탭의 quick options 패널이 여는 순간 스냅샷 출처 — song-select
  // overlay의 `currentSettings`와 같은 관례(M4-7). editor에는 설정 화면
  // 진입점이 없어 `editor-test` scene의 onEnter가 매번 다시 읽어 채운다.
  let editorTestSettings: Settings = DEFAULT_SETTINGS;

  // ── M5-8: chart JSON 저장(Ctrl+S) — editor-editing.md §7, persistence.md
  // §4. 순수 결정 로직(`edit-chart-save.ts`)은 M3-2 때 이미 있었다 — 이
  // 라운드는 실제 UI(`scene-editor-save.ts`)와 배선만 더한다. ─────────────
  const editorSaveModal: EditorSaveModalHandle = mountEditorSaveModal(root, {
    onConfirm(chosenVersion): void {
      void handleSaveConfirm(chosenVersion);
    },
    onCancel(): void {
      editorSaveModal.close();
    },
  });

  function openSaveModal(): void {
    const session = editorSession;
    if (session === undefined) return;
    const proposal = proposeSaveVersion(session.chart, session.baseVersion);
    const fileName = suggestChartFileName(session.chart, proposal.proposedVersion);
    editorSaveModal.open(proposal, fileName);
  }

  async function handleSaveConfirm(chosenVersion: number): Promise<void> {
    const session = editorSession;
    if (session === undefined) return;
    const outcome = await saveChartVersion(
      session.chart,
      chosenVersion,
      session.baseVersion,
      () => new Date().toISOString(),
      async (candidate) => {
        const fileName = suggestChartFileName(candidate, candidate.version);
        const result = await fileEnv.save(
          browserSaveHost,
          fileName,
          JSON.stringify(candidate, null, 2),
        );
        return result.kind === 'saved'
          ? { kind: 'saved', name: result.name }
          : { kind: 'cancelled' };
      },
    );
    if (outcome.kind === 'invalid-version') {
      editorSaveModal.showError('버전은 현재 열린 버전보다 커야 한다.');
      return;
    }
    if (outcome.kind === 'cancelled') {
      editorSaveModal.close();
      return;
    }
    // §4 "파일 저장에 성공한 경우에만 메모리의 version을 확정한다" —
    // updateChart가 dirty를 다시 켜지만(edit-workspace.ts) 바로 뒤
    // onFileSaveSuccess가 그걸 꺼서 최종 상태는 clean이다.
    session.updateChart(outcome.chart);
    await session.onFileSaveSuccess(outcome.chart.version);
    editorWorkspaceHandle?.update(session.chart);
    editorSaveModal.close();
  }

  // Ctrl+S는 `editor-editing.md` §6 "text input에 focus가 있어도 예외로
  // 동작한다"의 대상이다 — 이 리스너는 어느 scene-*.ts의 onKeyDown도 거치지
  // 않는 완전히 독립된 document 리스너라(이 레포는 stopPropagation을 쓰지
  // 않는다) 다른 컨트롤러가 뭘 하든 항상 실행된다.
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
      if (editorSession === undefined) return;
      event.preventDefault();
      openSaveModal();
    }
  });

  /** editor test scene의 Enter — gameplay scene을 mid-start(3초 lead-in,
   *  editor-origin)로 push한다(`scene-gameplay.ts` M5-6 확장, D-2026-103).
   *  song-credit→gameplay의 기존 replace 진입과 별개 경로다 — 여기는 result
   *  없이 곧장 editor로 돌아와야 해서 스택에 editor-test를 그대로 남겨 둔다
   *  (`goBack()`이 그리로 돌아간다). */
  async function enterGameplayFromEditorTest(startChartMs: number): Promise<void> {
    const session = editorSession;
    if (session === undefined) return;
    let musicBuffer: AudioBuffer | null = null;
    if (session.musicBlob !== null) {
      try {
        musicBuffer = await audioEnv.decode(await session.musicBlob.arrayBuffer());
      } catch {
        musicBuffer = null;
      }
    }
    let jacket: GameplayStartInput['jacket'] = null;
    if (session.jacketBlob !== null) {
      try {
        const bitmap = await createImageBitmap(session.jacketBlob);
        jacket = { image: bitmap, width: bitmap.width, height: bitmap.height };
      } catch {
        jacket = null;
      }
    }
    setPendingGameplayInput({
      chart: session.chart,
      musicBuffer,
      settings: editorTestSettings,
      jacket,
      startChartMs,
      editorOrigin: true,
    });
    gotoScene('gameplay'); // push(replace 아님) — goBack()이 editor-test로 돌아간다.
  }

  function mountEditorWorkspaceIfNeeded(): void {
    if (editorWorkspaceHandle !== undefined) return;
    editorWorkspaceHandle = mountEditorWorkspaceScene(root, {
      onCategoryChange(category): void {
        gotoScene(`editor-${category}`);
      },
      onBack(): void {
        void leaveEditor();
      },
      // M5-3: notes body를 실제로 채운다 — session/commandHistory는 항상
      // beginEditorSession()이 먼저 만들어 둔 뒤에만 category가 notes로
      // 들어올 수 있다(editor-start를 거치지 않고는 editor-notes에 닿지
      // 않는다).
      mountNotes(container, chart, view) {
        return mountEditorNotesBody(container, chart, {
          session: editorSession!,
          dispatch: (command) => editorCommandHistory!.dispatch(command),
          view,
        });
      },
      // M5-4: shapes body를 실제로 채운다 — notes와 같은 전제(session/
      // commandHistory는 beginEditorSession()이 먼저 만들어 둔다), `view`는
      // workspace가 notes와 공유하는 같은 참조를 그대로 넘겨받는다.
      mountShapes(container, chart, view) {
        return mountEditorShapesBody(container, chart, {
          session: editorSession!,
          dispatch: (command) => editorCommandHistory!.dispatch(command),
          view,
        });
      },
      // M5-5: meta body를 실제로 채운다 — identity/metadata/asset 직접
      // 필드 편집은 command를 안 거쳐(editor-commands.md §7)
      // editorCommandHistory.onDispatch 구독이 안 걸리므로, 그 경로만
      // notifyChanged로 editorWorkspaceHandle.update를 직접 부른다.
      mountMeta(container, chart) {
        return mountEditorMetaBody(container, chart, {
          session: editorSession!,
          dispatch: (command) => editorCommandHistory!.dispatch(command),
          notifyChanged: () => editorWorkspaceHandle?.update(editorSession!.chart),
        });
      },
      // M5-6: test body를 실제로 채운다 — `editorTestSettings`는
      // `editor-test` scene의 onEnter가 매번 새로 읽어 채운다(아래
      // `makeEditorWorkspaceScene`의 test 특수 케이스).
      mountTest(container, chart, view) {
        return mountEditorTestBody(container, chart, {
          session: editorSession!,
          view,
          settings: editorTestSettings,
          audio: audioEnv,
          onQuickOptionsChange(settings): void {
            editorTestSettings = settings;
            void writeSettings(storage, settings);
          },
          onEnterGameplay(startChartMs): void {
            void enterGameplayFromEditorTest(startChartMs);
          },
        });
      },
    });
  }

  /** Backspace/Esc로 editor를 나갈 때 — dirty 세션 전환 확인(persistence.md
   *  §5)을 거친다. M5-1은 아직 chart 편집 인터랙션이 없어(M5-2+) dirty가
   *  실제로 true가 될 경로가 없다 — `saveNewVersion`이 저장 창 UI 없이
   *  즉시 취소를 돌려주는 건 그 경로가 열리기 전까지의 안전한 자리표시자
   *  (닿으면 전환하지 않고 세션을 유지해, 실제 저장 창이 붙기 전에
   *  조용히 버려지는 일이 없게 한다) — 결정 필요 항목으로 보고, 실제
   *  저장 창은 M5-2 이후 붙는다. */
  async function leaveEditor(): Promise<void> {
    const session = editorSession;
    if (session === undefined) {
      gotoScene('mode-select');
      return;
    }
    const result = await resolveSessionTransition(session.dirty, session.dirty ? 'cancel' : null, {
      saveNewVersion: async () => 'cancelled',
      discard: async () => {
        await session.discard();
      },
    });
    if (result.kind === 'proceed') {
      session.dispose();
      editorSession = undefined;
      editorCommandHistory = undefined;
      editorWorkspaceHandle = undefined;
      gotoScene('mode-select');
    }
  }

  async function refreshEditorStartAvailability(error: string | null): Promise<void> {
    const slot = await loadRecoverableWorkspace(storage);
    editorStartHandle!.update({ hasRecoverableWorkspace: slot !== null, error });
  }

  // ── M5-8: "Package .cfx"/"Import .cfx" — M5 Exit의 마지막 두 연결 고리.
  // 둘 다 별도 화면 없이 editor-start의 상태줄(`refreshEditorStartAvailability`
  // 의 `error` 슬롯 — 이름은 error지만 성공 메시지도 여기로 보여준다, 별도
  // toast UI가 없어 재사용했다, 결정 필요 항목)로 결과를 알린다. ─────────

  function describeCfxLoadFailure(
    result: Extract<Awaited<ReturnType<typeof validateCfxForImport>>, { readonly ok: false }>,
  ): string {
    switch (result.reason) {
      case 'corrupt-zip':
        return `손상된 .cfx: ${result.message}`;
      case 'invalid-chart':
        return `"${result.fileName}"이 유효한 chart가 아니다: ${result.message}`;
      case 'invalid-package':
        return `package 검증 실패: ${result.issues.map((i) => i.message).join('; ')}`;
      case 'audio-decode-failed':
        return `"${result.fileName}" 음원 decode 실패: ${result.message}`;
    }
  }

  /** "Package .cfx" — 여러 chart JSON을 골라 songId별로 `.cfx`를 만든다
   *  (`_meta/cfx.md` §9 "패키징 진입점은 직접 다중 파일 선택 하나다").
   *  동률 version 충돌은 자동 선택하지 않고 그 songId 그룹만 건너뛴다(§9). */
  async function handlePackageCfx(): Promise<void> {
    const opened = await fileEnv.openMultiple(jsonOpenHost, ['.json']);
    if (opened.kind === 'cancelled') return;

    const candidates: CandidateChart[] = [];
    const rejected: string[] = [];
    for (const file of opened.files) {
      const parsed = openChartJson(file.text);
      if (parsed.kind !== 'opened') {
        rejected.push(file.name);
        continue;
      }
      candidates.push({ chart: parsed.chart, fileName: file.name });
    }
    if (candidates.length === 0) {
      await refreshEditorStartAvailability(`chart로 읽지 못한 파일: ${rejected.join(', ')}`);
      return;
    }

    const groups = groupBySongId(candidates);
    const referencedAssetNames = new Set<string>();
    for (const group of groups) {
      for (const candidate of group.charts) {
        if (candidate.chart.musicFile !== null) referencedAssetNames.add(candidate.chart.musicFile);
        if (candidate.chart.jacketFile !== null)
          referencedAssetNames.add(candidate.chart.jacketFile);
      }
    }

    let assetBytesByName = new Map<string, Uint8Array>();
    if (referencedAssetNames.size > 0) {
      // 참조된 파일명과 정확히 일치하는 것만 쓴다 — "다른 파일명 asset으로
      // 참조를 바꾸지 않는다"(persistence.md §11). 취소해도 계속 진행한다
      // — asset 없이 시도하면 검증이 unresolved-asset으로 정확히 알려준다.
      const openedAssets = await fileEnv.openBinary(jsonOpenHost, [], true);
      if (openedAssets.kind === 'opened') {
        assetBytesByName = new Map(openedAssets.files.map((f) => [f.name, f.bytes]));
      }
    }

    const results: string[] = [];
    for (const group of groups) {
      const recommended = recommendCandidates(group.charts);
      const conflicted = recommended.filter((r) => r.recommended === null);
      if (conflicted.length > 0) {
        results.push(
          `${group.songId}: chartId ${conflicted.map((c) => c.chartId).join(',')} version 동률 충돌 — 건너뜀`,
        );
        continue;
      }
      const selected = recommended.map((r) => r.recommended!);
      const assetNames = new Set<string>();
      for (const candidate of selected) {
        if (candidate.chart.musicFile !== null) assetNames.add(candidate.chart.musicFile);
        if (candidate.chart.jacketFile !== null) assetNames.add(candidate.chart.jacketFile);
      }
      const assets = [...assetNames]
        .filter((name) => assetBytesByName.has(name))
        .map((name) => ({ name, bytes: assetBytesByName.get(name)! }));

      const outcome = await packageAndSaveCfx({ selected, assets }, async (fileName, bytes) => {
        const result = await fileEnv.save(browserSaveHost, fileName, bytes);
        return result.kind;
      });
      if (outcome.kind === 'saved') results.push(`${group.songId}: "${outcome.fileName}" 저장됨`);
      else if (outcome.kind === 'cancelled') results.push(`${group.songId}: 취소됨`);
      else
        results.push(
          `${group.songId}: 검증 실패 — ${outcome.issues.map((i) => i.message).join('; ')}`,
        );
    }
    await refreshEditorStartAvailability(results.join(' / '));
  }

  /** "Import .cfx" — `.cfx` 하나를 골라 game library(song-select/game이
   *  읽는 `library` store)에 등록한다. `_meta/persistence.md` §12. */
  async function handleImportCfx(): Promise<void> {
    const opened = await fileEnv.openBinary(jsonOpenHost, ['.cfx'], false);
    if (opened.kind === 'cancelled') return;
    const file = opened.files[0]!;

    const validated = await validateCfxForImport(file.bytes, {
      decodeAudio: (buf) => audioEnv.decode(buf),
    });
    if (!validated.ok) {
      await refreshEditorStartAvailability(
        `.cfx import 실패: ${describeCfxLoadFailure(validated)}`,
      );
      return;
    }
    const songId = validated.charts[0]?.chart.songId;
    if (songId === undefined) {
      await refreshEditorStartAvailability('.cfx import 실패: chart가 없다.');
      return;
    }

    const plan = await planLibraryRegistration(storage, songId, validated.charts);
    if (plan.kind === 'reimport-confirm-needed') {
      const summary = plan.changes.map((c) => `chartId ${c.chartId}: ${c.kind}`).join('\n');
      // 다운그레이드 포함 reimport confirm(D-2026-018) — 되돌릴 수 없는
      // 동작에 대한 최소 방어로 `confirm()`을 썼다(record-reset과 같은
      // 관례, `scene-song-select.ts`의 D-2026-093 참조).
      if (!confirm(`이미 등록된 songId다 — 교체할까요?\n${summary}`)) return;
    }

    await commitLibraryRegistration(storage, songId, file.bytes);
    const jacketWarning =
      validated.jacketWarnings.length > 0
        ? ` (jacket decode 실패: ${validated.jacketWarnings.join(', ')})`
        : '';
    await refreshEditorStartAvailability(`"${songId}" library에 등록됨${jacketWarning}`);
  }

  /** 새 세션을 시작할 때마다 부른다 — command history도 함께 새로 만들어
   *  session 교체 시 모든 scope stack이 비어 있게 한다(editor-commands.md
   *  §5 "history baseline", 매번 새 인스턴스를 만드는 게 가장 단순한
   *  구현이라 `resetBaseline()`을 여기서 따로 부르지 않는다). `onDispatch`
   *  구독은 §3 "active scene redraw"의 최소 배선이다. */
  function beginEditorSession(session: WorkspaceSession): void {
    editorSession = session;
    editorCommandHistory = createCommandHistory();
    editorCommandHistory.onDispatch(() => {
      editorWorkspaceHandle?.update(editorSession!.chart);
    });
    mountEditorWorkspaceIfNeeded();
    gotoScene('editor-notes');
  }

  let editorStartHandle: EditorStartSceneHandle | undefined;
  const editorStartScene: Scene = {
    id: 'editor-start',
    mount(): void {
      editorStartHandle = mountEditorStartScene(root, {
        onNewChart(songId): void {
          const chart = createInitChart(songId, () => new Date().toISOString());
          beginEditorSession(
            createWorkspaceSession({
              storage,
              chart,
              musicBlob: null,
              jacketBlob: null,
              baseVersion: null,
              timerHost: window,
            }),
          );
        },
        onOpenJson(): void {
          void (async () => {
            const outcome = await fileEnv.open(jsonOpenHost, ['.json']);
            if (outcome.kind === 'cancelled') return;
            const parsed = openChartJson(outcome.file.text);
            if (parsed.kind === 'invalid-json') {
              await refreshEditorStartAvailability('JSON을 파싱할 수 없다.');
              return;
            }
            if (parsed.kind === 'rejected') {
              await refreshEditorStartAvailability(
                `chart 구조가 유효하지 않다: ${parsed.errors.map((e) => e.path).join(', ')}`,
              );
              return;
            }
            beginEditorSession(
              createWorkspaceSession({
                storage,
                chart: parsed.chart,
                musicBlob: null,
                jacketBlob: null,
                baseVersion: parsed.chart.version,
                timerHost: window,
              }),
            );
          })();
        },
        onContinueEditing(): void {
          void (async () => {
            const slot = await loadRecoverableWorkspace(storage);
            if (slot === null) return; // 버튼이 안 보였어야 하지만 방어적으로.
            beginEditorSession(
              createWorkspaceSession({
                storage,
                chart: slot.chart,
                musicBlob: slot.musicBlob,
                jacketBlob: slot.jacketBlob,
                baseVersion: slot.baseVersion,
                recovered: true,
                timerHost: window,
              }),
            );
          })();
        },
        onBack(): void {
          gotoScene('mode-select');
        },
        onPackageCfx(): void {
          void handlePackageCfx();
        },
        onImportCfx(): void {
          void handleImportCfx();
        },
      });
    },
    onEnter(): void {
      editorStartHandle!.show();
      void refreshEditorStartAvailability(null);
    },
    onExit(): void {
      editorStartHandle!.hide();
    },
  };

  function makeEditorWorkspaceScene(category: EditorCategory): Scene {
    return {
      id: `editor-${category}`,
      mount(): void {
        mountEditorWorkspaceIfNeeded();
      },
      onEnter(): void {
        if (category === 'test') {
          // quick options 패널 스냅샷을 매 진입마다 새로 읽는다 — editor에는
          // settings 화면 진입점이 없어(song-select overlay의 `update()`가
          // settings를 받는 것과 달리) 여기서 직접 읽어 채운다.
          void (async () => {
            editorTestSettings = await readSettings(storage);
            editorWorkspaceHandle!.update(editorSession!.chart);
            editorWorkspaceHandle!.show(category);
          })();
          return;
        }
        editorWorkspaceHandle!.update(editorSession!.chart);
        editorWorkspaceHandle!.show(category);
      },
      onExit(): void {
        editorWorkspaceHandle!.hide();
      },
    };
  }
  const editorWorkspaceScenes = EDITOR_CATEGORIES.map(makeEditorWorkspaceScene);

  return { editorStartScene, editorWorkspaceScenes };
}
