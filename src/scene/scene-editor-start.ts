/**
 * editor start scene — 단일 출처 `editor/editor-graph.md` §1·9,
 * `_meta/persistence.md` §7·§9.
 *
 * editor 진입 때 한 번 거치는 정식 scene이다. 4개 진입 경로(새 chart(init)
 * 만들기 / chart JSON 열기 / `.cfx` 열기 / 이어서 편집)를 나열한다 — 실제
 * 비동기 I/O(파일 읽기·workspace 조회·`WorkspaceSession` 생성)는 이 파일이
 * 하지 않는다. 다른 scene 파일들과 같은 경계로, host(`app-main.ts`)가
 * `handlers`를 통해 그 결과(성공 시 다음 scene 전환, 실패 시 에러 문구)만
 * `update()`로 되돌려준다.
 *
 * **`.cfx` 열기는 이 M5-1 라운드에서 뺐다** — `env-file.ts`의 `FileOpenHost.
 * pickFile`은 텍스트만 돌려주는 계약이라(`OpenedFile.text: string`) 바이너리
 * ZIP인 `.cfx`를 열 방법이 없었다. **M5-8이 그 binary open 확장 자체는
 * 해소했다**(`pickBinaryFiles`, D-2026-062) — 아래 "Package .cfx"/"Import
 * .cfx"가 그걸 쓴다. 하지만 "Open .cfx"(이 chart를 편집 세션으로 여는
 * 것)는 `_meta/persistence.md` §9 "package 전체 검증 → init 포함 chart
 * 목록 표시 → chart 하나 선택 → workspace 복원"이 요구하는 chart 선택 UI가
 * 아직 없어 disabled로 남겨 뒀다 — 별도 범위(M5 Exit에 필요하지 않다).
 *
 * **M5-8(D-2026-105 후속)이 "Package .cfx"/"Import .cfx"를 더했다** —
 * M5's own Exit("저장한 뒤 game에서 플레이할 수 있다")가 chart JSON 저장
 * (Ctrl+S, `scene-editor-save.ts`)만으로는 안 닫혔다: song-select/game은
 * `library` store(`.cfx` blob)만 읽는다(`game-song-select.ts`). 그 사이
 * 두 단계(여러 chart JSON을 `.cfx`로 묶기, 그 `.cfx`를 library에 등록)에
 * UI가 전혀 없어 이 화면에 최소로 붙였다 — `_meta/cfx.md` §8·§9의 "패키징
 * 화면"이 정확히 어디 있어야 하는지는 스펙이 정하지 않아(결정 필요 항목)
 * 이미 파일 흐름 진입점들이 모여 있는 이 화면을 재사용했다. "Import .cfx"도
 * 마찬가지로 위치가 spec에 없다 — song-select(라이브러리를 보여주는 화면)가
 * 더 자연스러울 수 있지만, 이미 완성된 그 화면을 건드리지 않으려고 여기
 * 뒀다(결정 필요 항목).
 *
 * chart JSON 열기는 asset(music/jacket) 재연결 UI 없이도 스펙을 만족한다 —
 * `_meta/persistence.md` §10 "music Blob이 없을 때... 오디오 재생 불가
 * 상태 표시... 새 version JSON 저장 허용"이 그 경로를 명시적으로 허용해 뒀다.
 * 그래서 host는 `openChartJson`으로 얻은 chart를 musicBlob=null/jacketBlob=null
 * 로 바로 세션화한다 — 재연결 자체는 meta scene(M5-5) 몫으로 남긴다.
 *
 * songId 입력에 유일성 검사를 하지 않는다 — `editor-graph.md` §4 "다른
 * 파일을 모르는 editor는 group-wide duplicate를 최종 보장하지 않는다"가
 * 명시적으로 이 검사를 editor 책임 밖에 둔다.
 */
import './scene-editor-start.css';

export interface EditorStartState {
  /** `loadRecoverableWorkspace`가 `null`이 아닌 걸 돌려줄 때만 true —
   *  "이어서 편집"은 그럴 때만 노출한다(`persistence.md` §6·§9). */
  readonly hasRecoverableWorkspace: boolean;
  /** 열기 실패 등 최근 시도의 에러 메시지. 없으면 `null`. */
  readonly error: string | null;
}

export interface EditorStartHandlers {
  readonly onNewChart: (songId: string) => void;
  readonly onOpenJson: () => void;
  readonly onContinueEditing: () => void;
  /** Backspace/Esc — mode-select로 복귀(D-2026-052 통일 Back 키 관례). */
  readonly onBack: () => void;
  /** "Package .cfx"(M5-8) — 여러 chart JSON을 골라 `.cfx`로 묶는다. */
  readonly onPackageCfx: () => void;
  /** "Import .cfx"(M5-8) — `.cfx` 하나를 골라 game library에 등록한다. */
  readonly onImportCfx: () => void;
}

export interface EditorStartSceneHandle {
  update(state: EditorStartState): void;
  show(): void;
  hide(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

export function mountEditorStartScene(
  target: HTMLElement,
  handlers: EditorStartHandlers,
): EditorStartSceneHandle {
  const root = el('div', 'editor-start-scene');
  root.hidden = true;

  const title = el('div', 'editor-start-title');
  title.textContent = 'Editor';

  const songIdInput = el('input', 'songid-input');
  songIdInput.type = 'text';
  songIdInput.placeholder = 'songId';

  const newChartBtn = el('button', 'editor-start-btn');
  newChartBtn.type = 'button';
  newChartBtn.textContent = 'New Chart';
  newChartBtn.addEventListener('click', () => {
    const songId = songIdInput.value.trim();
    if (songId === '') return;
    handlers.onNewChart(songId);
  });
  const newChartRow = el('div', 'editor-start-row');
  newChartRow.append(songIdInput, newChartBtn);

  const openJsonBtn = el('button', 'editor-start-btn');
  openJsonBtn.type = 'button';
  openJsonBtn.textContent = 'Open Chart JSON';
  openJsonBtn.addEventListener('click', () => handlers.onOpenJson());

  const openCfxBtn = el('button', 'editor-start-btn');
  openCfxBtn.type = 'button';
  openCfxBtn.textContent = 'Open .cfx';
  openCfxBtn.disabled = true;
  openCfxBtn.title =
    '결정 필요 항목 — binary file open 확장 승인 대기(scene-editor-start.ts 헤더 참조)';

  const continueBtn = el('button', 'editor-start-btn');
  continueBtn.type = 'button';
  continueBtn.textContent = 'Continue Editing';
  continueBtn.addEventListener('click', () => handlers.onContinueEditing());

  const packageCfxBtn = el('button', 'editor-start-btn');
  packageCfxBtn.type = 'button';
  packageCfxBtn.textContent = 'Package .cfx';
  packageCfxBtn.addEventListener('click', () => handlers.onPackageCfx());

  const importCfxBtn = el('button', 'editor-start-btn');
  importCfxBtn.type = 'button';
  importCfxBtn.textContent = 'Import .cfx';
  importCfxBtn.addEventListener('click', () => handlers.onImportCfx());

  const errorEl = el('div', 'editor-start-error');

  root.append(
    title,
    newChartRow,
    openJsonBtn,
    openCfxBtn,
    continueBtn,
    packageCfxBtn,
    importCfxBtn,
    errorEl,
  );
  target.append(root);

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      if (document.activeElement === songIdInput) return; // 텍스트 입력 중엔 통과.
      event.preventDefault();
      handlers.onBack();
    }
  }

  return {
    update(state: EditorStartState): void {
      continueBtn.hidden = !state.hasRecoverableWorkspace;
      errorEl.textContent = state.error ?? '';
      errorEl.hidden = state.error === null;
    },
    show(): void {
      root.hidden = false;
      document.addEventListener('keydown', onKeyDown);
    },
    hide(): void {
      root.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
