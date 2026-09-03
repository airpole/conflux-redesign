/**
 * 브라우저 진입점. M4-1의 scene-manager 엔진, M4-2의 title/mode-select/
 * credits, M4-3의 song-select 목록 렌더를 여기서 조립해 실제로 부팅한다.
 *
 * `mount()`는 scene-manager 계약대로 lazy다 — 각 scene의 `mountXxxScene()`
 * 호출(실제 DOM 생성)을 `mount()` 클로저 안으로 미뤄, 처음 그 scene으로
 * 갈 때만 한 번 실행되게 한다. FEATURES 기반 gate 필터링은 scene-manager가
 * 아니라 이 파일(app 레이어)이 한다 — `scene-manager.ts` 설계 그대로
 * (`scene → app` 참조는 금지 방향이라 반대로는 못 함).
 *
 * `editor`/`settings` mode-select 선택은 아직 목적지 scene이 없다(M4-5·
 * M4-6 범위) — 가짜 scene을 만들어 억지로 연결하지 않고, 선택 시 콘솔
 * 로그만 남긴다. `play`는 M4-3부터 `song-select`로 연결된다.
 *
 * song-select의 axis 상태(category/groupBy/sortKey/sortDir/recordCellMode/
 * lastSelected)는 M4-4부터 `game-viewstate.ts`(`env-storage`의 `viewState`
 * store)로 영속한다([[song-select]] §12) — 실제 조작(정렬·그룹 바 *클릭*
 * 으로 바꾸는 것)은 여전히 없다(overlay 진입 키가 M4-3 前 게이트로 아직
 * 안 닫혔다, `scene-song-select.ts` 헤더 참조) — 카테고리 탭·커서(방향키·
 * 클릭)·검색·기록 칸 토글·기록 초기화만 이번 범위다. row 목록은 매
 * `onEnter`마다 다시 로드한다 — library가 바뀌었을 수 있는데 song-select는
 * 재진입마다 갱신돼야 자연스럽다([[song-select]] §11 로딩 표시 전제와도
 * 맞는다. 로딩 표시 자체는 M4-4 범위 밖).
 *
 * preview 재생은 `game-song-preview.ts`의 `createPreviewController`를 실제
 * `AudioEnv`(`env-audio.ts`)로 연결한다 — `onCursorChange`마다
 * `controller.onCursorSettle()`을 부르고, `game-song-select.ts`의
 * `loadPreviewAsset`으로 그 chart의 음원을 필요할 때만 다시 읽어 decode한다.
 *
 * 기록 초기화(`onResetRecord`)는 `FEATURES.recordReset`이 켜졌을 때만
 * 핸들러를 넘긴다 — `scene-song-select.ts`가 이 핸들러의 유무로 버튼 노출을
 * 결정한다(§13 "FEATURES.recordReset에서만 노출"). 초기화 확정 UI는
 * `confirm()`을 쓴다 — 스펙에 별도 확인 인터랙션이 정해져 있지 않아 되돌릴
 * 수 없는 동작에 대한 가장 단순한 방어로 골랐다(결정 필요 항목으로 별도
 * 보고).
 *
 * **M4-5**: song-select `Enter`(`onSelect`) → chart+음원 로드(`Loading…`
 * 표시, [[song-select]] §11) → song-credit(5초 fade) →
 * `goScene('gameplay', 'replace')` → 판 종료 → autoplay면 result 없이
 * `goBack()`으로 song-select(§9 "autoplay는 result 없이 song-select로"),
 * 아니면 `goScene('result', 'replace')` → Retry는 다시
 * `goScene('gameplay', 'replace')`, Back은 `goBack()`으로 song-select.
 * `song-credit → gameplay`의 replace 관례를 `gameplay → result`에도 그대로
 * 이었다 — Retry를 반복해도 스택이 자라지 않게 하려는 것으로, §6이 명시한
 * 건 song-credit→gameplay뿐이라 이 확장은 이 세션이 내린 결정이다
 * (결정 필요 항목으로 보고, 자세한 이유는 `scene-gameplay.ts` 헤더).
 * `pendingGameplayInput`/`pendingResultView`에 scene 사이로 넘길 데이터를
 * 잠깐 들고 있는다 — `mountResultScene`이 `update()`가 아니라 생성 시점에
 * view를 받는 계약이라(`scene-result.ts`, M2-6) scene-manager의 lazy-mount-
 * once 모델과 안 맞는다: `result` Scene의 `mount()`는 아무 것도 안 하고,
 * 실제 DOM 생성은 매번 `onEnter()`에서 새로 하고 `onExit()`에서
 * `destroy()`한다 — 다른 scene들의 "한 번 mount, 반복 show/hide"와 다른
 * 자리라 명시해 둔다.
 *
 * 기록 저장은 `saveRecordIfEligible`이 no-record 4조건으로 스스로 거르므로
 * (`game-records.ts`) 여기서 따로 안 막는다 — midStart·editorOrigin은 이
 * 진입 경로에서 항상 `false`다(mid-start·editor test host가 아니다).
 */
import { BUILD_PROFILE, FEATURES } from './app-features.js';
import { createSceneManager, type Scene, type SceneManager } from '../scene/scene-manager.js';
import { mountTitleScene, type TitleSceneHandle } from '../scene/scene-title.js';
import { mountModeSelectScene, type ModeSelectSceneHandle } from '../scene/scene-mode-select.js';
import { mountCreditsScene, type CreditsSceneHandle } from '../scene/scene-credits.js';
import {
  mountSongSelectScene,
  type SongSelectHandlers,
  type SongSelectSceneHandle,
} from '../scene/scene-song-select.js';
import { mountSongCreditScene, type SongCreditSceneHandle } from '../scene/scene-song-credit.js';
import { mountGameplayScene, type GameplaySceneHandle } from '../scene/scene-gameplay.js';
import {
  mountResultScene,
  type ResultSceneHandle,
  type ResultView,
} from '../scene/scene-result.js';
import { mountLoadingIndicator } from '../scene/scene-loading.js';
import {
  mountSettingsScene,
  SETTINGS_CATEGORIES,
  type SettingsCategory,
  type SettingsSceneHandle,
} from '../scene/scene-settings.js';
import type { CursorTarget } from '../core/core-song-select.js';
import { buildJudgeNotes } from '../core/core-judge.js';
import { buildTimeline } from '../core/core-timing.js';
import {
  deriveRecordSummary,
  type NoRecordConditions,
  type RecordCandidate,
} from '../core/core-records.js';
import type { ResultData } from '../game/game-session.js';
import {
  loadPlayableChart,
  loadPreviewAsset,
  loadSongSelectRows,
} from '../game/game-song-select.js';
import { readRecord, resetRecord, saveRecordIfEligible } from '../game/game-records.js';
import { readSongSelectViewState, writeSongSelectViewState } from '../game/game-viewstate.js';
import { readSettings, writeSettings } from '../game/game-settings.js';
import { createPreviewController } from '../game/game-song-preview.js';
import { createAudioEnv } from '../env/env-audio.js';
import { createIndexedDbBackend, createStorageEnv, type StorageEnv } from '../env/env-storage.js';
import { createFileEnv, type FileOpenHost } from '../env/env-file.js';
import type { GameplayStartInput } from '../scene/scene-gameplay.js';
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
import { createInitChart } from '../edit/edit-chart-init.js';
import {
  createWorkspaceSession,
  loadRecoverableWorkspace,
  type WorkspaceSession,
} from '../edit/edit-workspace.js';
import { resolveSessionTransition } from '../edit/edit-session-transition.js';
import { createCommandHistory, type CommandHistory } from '../edit/edit-command.js';
import { openChartJson } from '../format/format-chart-open.js';

console.info(`Conflux — build profile: ${BUILD_PROFILE}`);

function boot(root: HTMLElement, storage: StorageEnv): void {
  let titleHandle: TitleSceneHandle | undefined;
  const titleScene: Scene = {
    id: 'title',
    mount(): void {
      titleHandle = mountTitleScene(root, () => manager.goScene('mode-select'));
    },
    onEnter(): void {
      titleHandle!.show();
    },
    onExit(): void {
      titleHandle!.hide();
    },
  };

  let modeSelectHandle: ModeSelectSceneHandle | undefined;
  const modeSelectScene: Scene = {
    id: 'mode-select',
    mount(): void {
      modeSelectHandle = mountModeSelectScene(root, FEATURES.editor, {
        onSelect(id): void {
          if (id === 'play') {
            manager.goScene('song-select');
            return;
          }
          if (id === 'credits') {
            manager.goScene('credits');
            return;
          }
          if (id === 'settings') {
            manager.goScene('settings-play');
            return;
          }
          if (id === 'editor') {
            manager.goScene('editor-start');
            return;
          }
          console.info(`mode-select: '${id}' 목적지가 아직 없음`);
        },
        onBack(): void {
          manager.goScene('title');
        },
      });
    },
    onEnter(): void {
      modeSelectHandle!.show();
    },
    onExit(): void {
      modeSelectHandle!.hide();
    },
  };

  let creditsHandle: CreditsSceneHandle | undefined;
  const creditsScene: Scene = {
    id: 'credits',
    mount(): void {
      creditsHandle = mountCreditsScene(root, () => manager.goScene('mode-select'));
    },
    onEnter(): void {
      creditsHandle!.show();
    },
    onExit(): void {
      creditsHandle!.hide();
    },
  };

  const audioEnv = createAudioEnv(() => new AudioContext());
  const previewController = createPreviewController(audioEnv);

  let songSelectHandle: SongSelectSceneHandle | undefined;
  const songSelectScene: Scene = {
    id: 'song-select',
    mount(): void {
      const handlers: SongSelectHandlers = {
        onCategoryChange(category): void {
          void (async () => {
            const view = { ...(await readSongSelectViewState(storage)), category };
            await writeSongSelectViewState(storage, view);
            await refreshSongSelect(view);
          })();
        },
        onBack(): void {
          previewController.stop();
          manager.goScene('mode-select');
        },
        onCursorChange(target): void {
          // target이 null이면 커서가 folder 헤더에 있다는 뜻이다(M4-4,
          // scene-song-select.ts) — chart 정체성이 없어 lastSelected를
          // 지울 게 아니라 마지막으로 실제 chart에 있었던 값을 그대로
          // 둔다.
          if (target !== null) {
            void (async () => {
              const view = { ...(await readSongSelectViewState(storage)), lastSelected: target };
              await writeSongSelectViewState(storage, view);
            })();
          }

          if (target === null) {
            previewController.stop();
            return;
          }
          previewController.onCursorSettle(async () => {
            const asset = await loadPreviewAsset(storage, target.songId, target.chartId);
            if (asset === null) return null;
            const buffer = await audioEnv.decode(asset.bytes.buffer as ArrayBuffer);
            return { buffer, startMs: asset.previewStartMs };
          });
        },
        onSelect(target): void {
          void enterSongCredit(target);
        },
        onRecordCellModeChange(mode): void {
          void (async () => {
            const view = { ...(await readSongSelectViewState(storage)), recordCellMode: mode };
            await writeSongSelectViewState(storage, view);
            await refreshSongSelect(view);
          })();
        },
        onQuickOptionsChange(settings): void {
          void writeSettings(storage, settings);
        },
      };
      songSelectHandle = mountSongSelectScene(root, {
        ...handlers,
        ...(FEATURES.recordReset
          ? {
              onResetRecord(target: CursorTarget): void {
                if (!confirm('이 chart의 기록을 초기화할까요?')) return;
                void (async () => {
                  await resetRecord(storage, target.songId, target.chartId);
                  await refreshSongSelect(await readSongSelectViewState(storage));
                })();
              },
            }
          : {}),
      });
    },
    onEnter(): void {
      songSelectHandle!.show();
      void (async () => {
        await refreshSongSelect(await readSongSelectViewState(storage));
      })();
    },
    onExit(): void {
      previewController.stop();
      songSelectHandle!.hide();
    },
  };

  async function refreshSongSelect(
    view: Awaited<ReturnType<typeof readSongSelectViewState>>,
  ): Promise<void> {
    const [{ rows, warnings }, settings] = await Promise.all([
      loadSongSelectRows(storage),
      readSettings(storage),
    ]);
    if (warnings.length > 0) {
      console.warn(`song-select: decode 실패한 library entry — ${warnings.join(', ')}`);
    }
    songSelectHandle!.update(rows, view, settings);
  }

  // ── M4-5: song-credit → gameplay → result ────────────────────────────

  let pendingGameplayInput: GameplayStartInput | null = null;
  let pendingResultView: ResultView | undefined;

  async function enterSongCredit(target: CursorTarget): Promise<void> {
    previewController.stop();
    const loading = mountLoadingIndicator(root);
    loading.start();
    try {
      const [playable, settings] = await Promise.all([
        loadPlayableChart(storage, target.songId, target.chartId),
        readSettings(storage),
      ]);
      if (playable === null) {
        console.warn(`song-select: '${target.songId}:${target.chartId}' chart를 못 읽었다`);
        return;
      }
      let musicBuffer: AudioBuffer | null = null;
      if (playable.musicBytes !== null) {
        try {
          musicBuffer = await audioEnv.decode(playable.musicBytes.buffer as ArrayBuffer);
        } catch {
          musicBuffer = null; // 무음으로 진행 — game-song-select.ts의 PlayableChart 계약과 같다.
        }
      }
      let jacket: GameplayStartInput['jacket'] = null;
      if (playable.jacketBytes !== null) {
        try {
          const bitmap = await createImageBitmap(
            new Blob([playable.jacketBytes.buffer as ArrayBuffer]),
          );
          jacket = { image: bitmap, width: bitmap.width, height: bitmap.height };
        } catch {
          jacket = null; // 배경 없이 진행 — M4.5-1 jacket 배경은 있으면 좋은 장식이지 필수 데이터가 아니다.
        }
      }
      pendingGameplayInput = { chart: playable.chart, musicBuffer, settings, jacket };
      manager.goScene('song-credit');
    } finally {
      loading.stop();
      loading.destroy();
    }
  }

  let songCreditHandle: SongCreditSceneHandle | undefined;
  const songCreditScene: Scene = {
    id: 'song-credit',
    mount(): void {
      songCreditHandle = mountSongCreditScene(root, {
        onDone: () => manager.goScene('gameplay', 'replace'),
      });
    },
    onEnter(): void {
      songCreditHandle!.update(pendingGameplayInput!.chart);
      songCreditHandle!.show();
    },
    onExit(): void {
      songCreditHandle!.hide();
    },
  };

  let gameplayHandle: GameplaySceneHandle | undefined;
  const gameplayScene: Scene = {
    id: 'gameplay',
    mount(): void {
      gameplayHandle = mountGameplayScene(root, audioEnv, {
        onFinished(result): void {
          void onGameplayFinished(result);
        },
        onExit(): void {
          manager.goBack();
        },
      });
    },
    onEnter(): void {
      gameplayHandle!.show();
      gameplayHandle!.start(pendingGameplayInput!);
    },
    onExit(): void {
      gameplayHandle!.hide();
    },
  };

  async function onGameplayFinished(result: ResultData): Promise<void> {
    const input = pendingGameplayInput;
    if (input === null) return;
    const { chart, settings } = input;

    const timeline = buildTimeline(chart);
    const totalUnits = buildJudgeNotes(chart, timeline).totalUnits;
    const conditions: NoRecordConditions = {
      autoplay: settings.autoplay,
      staticShape: settings.staticShape,
      midStart: false,
      editorOrigin: false,
    };
    const candidate: RecordCandidate = {
      judgments: result.counts,
      totalUnits,
      state: result.state,
      maxCombo: result.maxCombo,
    };

    const prevRecord = await readRecord(storage, chart.songId, chart.chartId);
    const prevBest = prevRecord !== null ? deriveRecordSummary(prevRecord) : null;
    await saveRecordIfEligible(storage, chart.songId, chart.chartId, candidate, conditions);

    if (settings.autoplay) {
      // [[scene]] §9 "autoplay로 돌린 판은 곡이 끝나면 result를 거치지
      // 않고 song-select로 돌아간다".
      manager.goBack();
      return;
    }

    const mods: string[] = [];
    if (settings.mirror) mods.push('Mirror');
    if (settings.autoplay) mods.push('Autoplay');
    if (settings.staticShape) mods.push('Static Shape');

    pendingResultView = {
      chart,
      result,
      prevBest: prevBest !== null ? { score: prevBest.score, accuracy: prevBest.accuracy } : null,
      mods,
    };
    manager.goScene('result', 'replace');
  }

  let resultHandle: ResultSceneHandle | undefined;
  const resultScene: Scene = {
    id: 'result',
    // `mountResultScene`은 다른 scene과 달리 생성 시점에 view를 통째로
    // 받는 계약이다(`scene-result.ts`, M2-6) — lazy-mount-once와 안 맞아
    // 여기 `mount()`는 비워 두고 실제 생성은 매 `onEnter()`에서 한다.
    mount(): void {},
    onEnter(): void {
      resultHandle = mountResultScene(root, pendingResultView!, {
        onRetry(): void {
          manager.goScene('gameplay', 'replace');
        },
        onBack(): void {
          manager.goBack();
        },
      });
    },
    onExit(): void {
      resultHandle?.destroy();
      resultHandle = undefined;
    },
  };

  // ── M4-6: settings 4 scene ────────────────────────────────────────────
  // 하나의 host를 네 scene id가 공유한다(scene-settings.ts 헤더 참조) —
  // 처음 mount되는 쪽에서만 실제로 mountSettingsScene을 부른다.

  let settingsHandle: SettingsSceneHandle | undefined;
  function mountSettingsIfNeeded(): void {
    if (settingsHandle !== undefined) return;
    settingsHandle = mountSettingsScene(root, {
      onChange(settings): void {
        void writeSettings(storage, settings);
      },
      onCategoryChange(category): void {
        manager.goScene(`settings-${category}`);
      },
      onBack(): void {
        manager.goScene('mode-select');
      },
    });
  }

  function makeSettingsScene(category: SettingsCategory): Scene {
    return {
      id: `settings-${category}`,
      mount(): void {
        mountSettingsIfNeeded();
      },
      onEnter(): void {
        void (async () => {
          settingsHandle!.update(await readSettings(storage));
          settingsHandle!.show(category);
        })();
      },
      onExit(): void {
        settingsHandle!.hide();
      },
    };
  }

  const settingsScenes = SETTINGS_CATEGORIES.map(makeSettingsScene);

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

  // File System Access API는 DOM lib 타입에 아직 없어(관련 패키지 미설치)
  // 이 파일에서만 최소 표면으로 duck-type한다 — `env-file.ts`가 이미
  // "실제 브라우저 지원 폭·폴백은 범위 밖"이라고 명시해 둔 자리다
  // (D-2026-062). 여기서 그 결정을 다시 열지 않고 그대로 따른다:
  // 미지원 브라우저에서는 `null`(취소)로 처리한다.
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
  };

  let editorSession: WorkspaceSession | undefined;
  let editorCommandHistory: CommandHistory | undefined;
  let editorWorkspaceHandle: EditorWorkspaceSceneHandle | undefined;

  function mountEditorWorkspaceIfNeeded(): void {
    if (editorWorkspaceHandle !== undefined) return;
    editorWorkspaceHandle = mountEditorWorkspaceScene(root, {
      onCategoryChange(category): void {
        manager.goScene(`editor-${category}`);
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
      manager.goScene('mode-select');
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
      manager.goScene('mode-select');
    }
  }

  async function refreshEditorStartAvailability(error: string | null): Promise<void> {
    const slot = await loadRecoverableWorkspace(storage);
    editorStartHandle!.update({ hasRecoverableWorkspace: slot !== null, error });
  }

  /** 새 세션을 시작할 때마다 부른다 — command history도 함께 새로 만들어
   *  session 교체 시 모든 scope stack이 비어 있게 한다(editor-commands.md
   *  §5 "history baseline", 매번 새 인스턴스를 만드는 게 가장 단순한
   *  구현이라 `resetBaseline()`을 여기서 따로 부르지 않는다). `onDispatch`
   *  구독은 §3 "active scene redraw"의 최소 배선이다 — 지금은 notes/
   *  shapes/meta/test가 전부 껍데기라(M5-1) 실제로 command를 dispatch할
   *  곳이 없지만, M5-3+이 command를 만들기 시작하면 이 구독이 바로
   *  작동한다. */
  function beginEditorSession(session: WorkspaceSession): void {
    editorSession = session;
    editorCommandHistory = createCommandHistory();
    editorCommandHistory.onDispatch(() => {
      editorWorkspaceHandle?.update(editorSession!.chart);
    });
    mountEditorWorkspaceIfNeeded();
    manager.goScene('editor-notes');
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
          manager.goScene('mode-select');
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
        editorWorkspaceHandle!.update(editorSession!.chart);
        editorWorkspaceHandle!.show(category);
      },
      onExit(): void {
        editorWorkspaceHandle!.hide();
      },
    };
  }
  const editorWorkspaceScenes = EDITOR_CATEGORIES.map(makeEditorWorkspaceScene);

  const manager: SceneManager = createSceneManager([
    titleScene,
    modeSelectScene,
    creditsScene,
    songSelectScene,
    songCreditScene,
    gameplayScene,
    resultScene,
    ...settingsScenes,
    editorStartScene,
    ...editorWorkspaceScenes,
  ]);
  manager.goScene('title');
}

const root = document.getElementById('app');
if (root !== null && typeof indexedDB !== 'undefined') {
  boot(root, createStorageEnv(createIndexedDbBackend(indexedDB)));
}
