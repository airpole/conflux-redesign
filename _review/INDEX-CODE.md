# INDEX-CODE — 구현 시그니처·테스트 인벤토리

> 기계 생성물. `node tools/review/dossier.mjs`. 손으로 고치지 마라.

| | |
|---|---|
| 기준 커밋 | `6f4214e79ada390aedb5b3ab17bf1de90db6c15c` |
| 브랜치 | `claude/astra-6-code-review-orchestration-rnhyvm` |
| raw base | `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm` |
| 생성 시각 | 2026-09-05T05:27:34.297Z |

원문이 필요하면 **raw base + `/` + 파일 경로**로 URL 을 만들어 직접 fetch 해라.
예: `https://raw.githubusercontent.com/airpole/conflux-redesign/claude/astra-6-code-review-orchestration-rnhyvm/core/timing.md`

스펙↔구현 대조는 여기서 시작한다. 본문이 필요한 파일은 raw URL 로 가져가라.

---

## 1. 구현 export 색인

본문은 없다. 시그니처만이다.

### `src/app/app-editor.ts` — 669줄

- L59 `export interface EditorScenesDeps`
- L67 `export interface EditorScenes`
- L75 `export function mountEditorScenes(deps: EditorScenesDeps): EditorScenes`

### `src/app/app-env.d.ts` — 14줄

- (export 없음)

### `src/app/app-features.ts` — 24줄

- L13 `export const BUILD_PROFILE =`
- L16 `export const FEATURES =`
- L23 `export type Features = typeof FEATURES;`

### `src/app/app-main.ts` — 518줄

- (export 없음)

### `src/core/core-chart-fixture.ts` — 42줄

- L12 `export function makeChart(overrides: Partial<Chart> = {}): Chart`

### `src/core/core-chart.ts` — 128줄

- L13 `export const SCHEMA_VERSION = 1;`
- L16 `export type Lane = 1 | 2 | 3 | 4;`
- L19 `export const DIFFICULTIES = ['init', 'Trace', 'Drift', 'Surge', 'Flux', 'Phase'] as const;`
- L20 `export type Difficulty = (typeof DIFFICULTIES)[number];`
- L23 `export const EASINGS = ['Linear', 'In-Sine', 'Out-Sine'] as const;`
- L24 `export type Easing = (typeof EASINGS)[number] | null;`
- L26 `export const TEXT_POSITIONS = [`
- L35 `export type TextPosition = (typeof TEXT_POSITIONS)[number];`
- L37 `export interface Tempo`
- L42 `export interface TimeSignature`
- L49 `export interface Note`
- L58 `export interface ShapeEvent`
- L68 `export interface LaneEvent`
- L81 `export interface TextEvent`
- L90 `export interface ChartMetadata`
- L102 `export interface Chart`

### `src/core/core-constants.ts` — 144줄

- L16 `export const TICKS_PER_BEAT = 1920;`
- L25 `export const GRID_DIVISORS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256] as const;`
- L32 `export const GRID_DIVISOR_DEFAULT = 8;`
- L35 `export const LEAD_IN_MS = 3000;`
- L38 `export const RESUME_LEAD_MS = 3000;`
- L42 `export const WINDOW_SYNC_MS = 25;`
- L43 `export const WINDOW_PERFECT_MS = 50;`
- L44 `export const WINDOW_GOOD_MS = 100;`
- L46 `export const WINDOW_WIDE_SYNC_MS = 100;`
- L49 `export const HOLD_RELEASE_GRACE_MS = 50;`
- L62 `export const HOLD_RELEASE_WINDOW_MS = WINDOW_GOOD_MS + HOLD_RELEASE_GRACE_MS;`
- L66 `export const GAUGE_MAX = 100;`
- L67 `export const GAUGE_START = { normal: 0, hard: 100 } as const;`
- L68 `export const NORMAL_CLEAR_PCT = 75;`
- L70 `export const GAUGE_NORMAL_TOTAL_GAIN = 150;`
- L79 `export const GAUGE_DELTA =`
- L87 `export const RANK_TABLE = [`
- L103 `export const SCROLL_VIEW_MS = 2000;`
- L105 `export const SCROLL_SPEED_MIN = 1.0;`
- L106 `export const SCROLL_SPEED_MAX = 10.0;`
- L107 `export const SCROLL_SPEED_STEP = 0.1;`
- L112 `export const CREDIT_FADE_IN_MS = 500;`
- L113 `export const CREDIT_HOLD_MS = 4000;`
- L114 `export const CREDIT_FADE_OUT_MS = 500;`
- L117 `export const TEXT_FADE_MS = 300;`
- L121 `export const SLOTS_PER_ROW = 5;`
- L122 `export const PREVIEW_DELAY_MS = 400;`
- L123 `export const PREVIEW_LOOP_MS = 15000;`
- L124 `export const PREVIEW_FADE_OUT_MS = 5000;`
- L128 `export const LOADING_INDICATOR_DELAY_MS = 300;`
- L132 `export const SONG_END_TAIL_MS = 3000;`
- L137 `export const TOTAL_KEYS = 6;`
- L140 `export const OVERLAP_LANES = [2, 3] as const;`
- L143 `export const LANE_CAPACITY = { 1: 1, 2: 2, 3: 2, 4: 1 } as const;`

### `src/core/core-gauge.ts` — 293줄

- L38 `export const TIER_LADDER = ['as', 'ap', 'fc', 'hard', 'normal'] as const;`
- L39 `export type Tier = (typeof TIER_LADDER)[number];`
- L41 `export const GAUGE_MODES = ['normal', 'hard', 'fc', 'ap', 'as', 'cascade'] as const;`
- L42 `export type GaugeMode = (typeof GAUGE_MODES)[number];`
- L45 `export type BreakBehavior = 'terminate' | 'demote';`
- L47 `export interface GaugeModeSpec`
- L58 `export const GAUGE_MODE_TABLE: Readonly<Record<GaugeMode, GaugeModeSpec>> =`
- L85 `export type JudgmentCounts = Record<Judgment, number>;`
- L88 `export const PLAY_STATES = ['AS', 'AP', 'FC', 'H', 'C', 'F'] as const;`
- L89 `export type PlayState = (typeof PLAY_STATES)[number];`
- L91 `export type Rank = (typeof RANK_TABLE)[number][0];`
- L97 `export interface GaugeState`
- L120 `export function resetGauge(mode: GaugeMode, totalUnits: number): GaugeState`
- L154 `export function applyGaugeChange(state: GaugeState, judgment: Judgment, units = 1): void`
- L206 `export function evaluateState(state: GaugeState): PlayState`
- L231 `export const SCORE_WEIGHT: Readonly<JudgmentCounts> = { SYNC: 1, PERFECT: 1, GOOD: 0.5, MISS: 0 };`
- L232 `export const ACCURACY_WEIGHT: Readonly<JudgmentCounts> =`
- L239 `export function weighted(counts: JudgmentCounts, weight: Readonly<JudgmentCounts>): number`
- L249 `export function scoreToRank(score: number): Rank`
- L256 `export interface PlayResult`
- L276 `export function computeResult(state: GaugeState, maxCombo: number): PlayResult`

### `src/core/core-i18n.ts` — 56줄

- L17 `export const LOCALES = ['en', 'ko'] as const;`
- L18 `export type LocaleCode = (typeof LOCALES)[number];`
- L20 `export const DEFAULT_LOCALE: LocaleCode = 'en';`
- L22 `export type StringKey = 'songSelect.search.noResults' | 'settings.option.noRecordNotice';`
- L40 `export interface TranslateResult`
- L48 `export function translate(key: StringKey, locale: LocaleCode): TranslateResult`

### `src/core/core-judge.ts` — 842줄

- L40 `export const MIRROR_LANE_MAP: Readonly<Record<Lane, Lane>> =`
- L48 `export type LaneMap = Readonly<Record<Lane, Lane>> | null;`
- L50 `export function laneMapOf(mirror: boolean): LaneMap`
- L63 `export function judgeLaneOf(note: Note, laneMap: LaneMap): Lane | null`
- L70 `export const JUDGMENTS = ['SYNC', 'PERFECT', 'GOOD', 'MISS'] as const;`
- L71 `export type Judgment = (typeof JUDGMENTS)[number];`
- L81 `export type JudgmentPart = 'tap' | 'head' | 'tail';`
- L87 `export function judgmentOf(diff: number, isWide: boolean): Judgment`
- L106 `export function toJudgeMs(rawMs: number, visualOffset: number): number`
- L119 `export interface JudgeNote`
- L129 `export interface JudgeNotes`
- L174 `export function buildJudgeNotes(chart: Pick<Chart, 'notes'>, timeline: Timeline): JudgeNotes`
- L199 `export type NoteStatus = 'pending' | 'hit' | 'missed';`
- L208 `export interface JudgeState`
- L231 `export function createJudgeState(notes: JudgeNotes): JudgeState`
- L256 `export type JudgmentEvent =`
- L281 `export interface CandidateContext`
- L299 `export function selectCandidate(`
- L319 `export function heldCount(state: JudgeState, lane: Lane): number`
- L326 `export function normalDemand(state: JudgeState, lane: Lane): number`
- L368 `export function commitJudgment(`
- L467 `export function closeTail(`
- L520 `export function reconcileHeldCapacity(`
- L576 `export function heldCapacityViolations(state: JudgeState, context: CandidateContext): string[]`
- L694 `export function registerKeyDown(state: JudgeState, key: LaneKeyId): void`
- L706 `export function registerKeyUp(state: JudgeState, key: LaneKeyId): void`
- L720 `export function judgeAdvance(`
- L734 `export function judgeKeyDown(`
- L758 `export function judgeKeyUp(`
- L813 `export function seedPlayStateAt(`

### `src/core/core-overlap.ts` — 294줄

- L29 `export type OverlapMark =`
- L50 `export type ConflictScope = 'local' | 'global';`
- L59 `export interface ConflictGroup`
- L70 `export interface NoteOverlapMap`
- L104 `export function isActiveAt(note: Note, tick: number): boolean`
- L144 `export function buildOverlapMap(notes: readonly Note[]): NoteOverlapMap`
- L291 `export function allowsOverlap(lane: Lane): boolean`

### `src/core/core-quick-options.ts` — 152줄

- L33 `export const QUICK_OPTION_FIELDS = [`
- L40 `export type QuickOptionField = (typeof QUICK_OPTION_FIELDS)[number];`
- L42 `export type QuickOptionValues = Pick<Settings, QuickOptionField>;`
- L44 `export interface QuickOptionsState`
- L52 `export function openQuickOptions(settings: Settings): QuickOptionsState`
- L71 `export function moveQuickOptionsRow(`
- L98 `export function stepQuickOption(`
- L129 `export function jumpQuickOption(`
- L139 `export function confirmQuickOption(state: QuickOptionsState): QuickOptionsState`
- L149 `export function applyQuickOptions(settings: Settings, state: QuickOptionsState): Settings`

### `src/core/core-records.ts` — 163줄

- L48 `export interface ChartRecord`
- L56 `export function recordKey(songId: string, chartId: number): string`
- L61 `export function deriveScore(judgments: JudgmentCounts, totalUnits: number): number`
- L68 `export function deriveAccuracy(judgments: JudgmentCounts, totalUnits: number): number`
- L72 `export interface RecordSummary`
- L79 `export function deriveRecordSummary(record: ChartRecord): RecordSummary`
- L102 `export interface RecordCandidate`
- L109 `export interface MergeRecordResult`
- L129 `export function mergeRecord(`
- L149 `export interface NoRecordConditions`
- L158 `export function isNoRecord(conditions: NoRecordConditions): boolean`

### `src/core/core-settings.ts` — 270줄

- L15 `export const NOTE_SKINS = ['bar', 'circle'] as const;`
- L16 `export type NoteSkin = (typeof NOTE_SKINS)[number];`
- L18 `export const GAUGE_MODES = ['normal', 'hard', 'fc', 'ap', 'as', 'cascade'] as const;`
- L19 `export type GaugeMode = (typeof GAUGE_MODES)[number];`
- L21 `export const FRAME_CAPS = [0, 30, 60] as const;`
- L22 `export type FrameCap = (typeof FRAME_CAPS)[number];`
- L25 `export const JUDGE_LINE_DEFAULT = 8 / 9;`
- L27 `export const LANE_KEY_IDS = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6'] as const;`
- L28 `export type LaneKeyId = (typeof LANE_KEY_IDS)[number];`
- L36 `export const DEFAULT_LANE_KEYS =`
- L45 `export const DEFAULT_ACTION_KEYS =`
- L51 `export interface Settings`
- L96 `export const DEFAULT_SETTINGS: Settings =`
- L164 `export const SETTING_CHECKS: Record<keyof Settings, Check> =`
- L198 `export interface SettingsMergeReport`
- L205 `export interface MergedSettings`
- L214 `export function mergeSettings(saved: unknown): MergedSettings`
- L245 `export function laneOf(key: LaneKeyId): 1 | 2 | 3 | 4`
- L260 `export function conflictingLaneKey(`

### `src/core/core-shape.ts` — 276줄

- L33 `export function applyEasing(t: number, easing: string | null): number`
- L149 `export const SHAPE_INIT_FALLBACK = { blue: -2, red: 2 } as const;`
- L152 `export const LANE_INIT_FALLBACK = { line1: 0.25, line2: 0.5, line3: 0.75 } as const;`
- L158 `export interface FieldGeometry`
- L169 `export type FieldGeometrySource = Pick<Chart, 'shapeEvents' | 'laneEvents'>;`
- L183 `export function buildFieldGeometry(source: FieldGeometrySource): FieldGeometry`
- L202 `export function shapeGeometryAt(`
- L217 `export function laneLayoutAt(`
- L229 `export function isStepTick(geometry: FieldGeometry, tick: number): boolean`
- L234 `export function stepTicks(geometry: FieldGeometry, fromTick: number, toTick: number): number[]`
- L254 `export function resolveArcEasing(`

### `src/core/core-song-select.ts` — 585줄

- L28 `export type SongSelectState = PlayState | 'N';`
- L30 `export interface SlotView`
- L43 `export interface SongRow`
- L55 `export interface SongChartInput`
- L70 `export function buildSongRow(`
- L108 `export const UNCATEGORIZED = 'Uncategorized';`
- L109 `export const ALL_CATEGORY = 'All';`
- L113 `export function deriveCategoryTabs(rows: readonly SongRow[]): readonly string[]`
- L122 `export function filterByCategory(rows: readonly SongRow[], tab: string): readonly SongRow[]`
- L130 `export const SORT_KEYS = [`
- L141 `export type SortKey = (typeof SORT_KEYS)[number];`
- L142 `export type SortDir = 'asc' | 'desc';`
- L212 `export function sortRows(rows: readonly SongRow[], key: SortKey, dir: SortDir): readonly SongRow[]`
- L240 `export const GROUP_BY_AXES = ['none', 'updated', 'title'] as const;`
- L241 `export type GroupByAxis = (typeof GROUP_BY_AXES)[number];`
- L243 `export interface Folder`
- L289 `export function groupRows(rows: readonly SongRow[], axis: GroupByAxis): readonly Folder[]`
- L332 `export type CursorStop =`
- L344 `export function buildCursorStops(`
- L363 `export function folderIndexOf(`
- L378 `export interface CursorPosition`
- L385 `export interface CursorTarget`
- L393 `export type RecordCellMode = 'percent' | 'judge';`
- L395 `export interface SongSelectViewState`
- L428 `export function locateCursor(`
- L450 `export function cursorTarget(`
- L466 `export function moveCursorHorizontal(`
- L489 `export function moveCursorVertical(`
- L521 `export function moveCursorByPage(`
- L537 `export function moveCursorHome(stops: readonly CursorStop[]): CursorPosition`
- L542 `export function moveCursorEnd(stops: readonly CursorStop[]): CursorPosition`
- L567 `export function matchesSearch(row: SongRow, rawQuery: string): boolean`
- L582 `export function filterBySearch(rows: readonly SongRow[], query: string): readonly SongRow[]`

### `src/core/core-timing.ts` — 460줄

- L27 `export interface TempoSegment`
- L35 `export interface MeasureSegment`
- L50 `export interface Timeline`
- L121 `export function buildTimeline(chart: TimelineSource): Timeline`
- L142 `export function tempoSegmentAt(timeline: Timeline, tick: number): TempoSegment`
- L147 `export function measureSegmentAt(timeline: Timeline, tick: number): MeasureSegment`
- L153 `export function tickToMs(timeline: Timeline, tick: number): number`
- L158 `export function msToTick(timeline: Timeline, ms: number): number`
- L169 `export function scrollProgressAt(`
- L186 `export interface MeasureOptions`
- L192 `export function cellTickOf(gridDivisor: number): number`
- L198 `export function snapTick(tick: number, gridDivisor: number): number`
- L225 `export function tickToMeasure(`
- L264 `export function measureToTick(`
- L330 `export interface GridLine`
- L343 `export function gridLines(`
- L408 `export function minTick(timeline: Timeline): number`
- L415 `export interface SongEnd`
- L448 `export function songEndOf(`

### `src/core/core-validate.ts` — 222줄

- L26 `export interface ValidationIssue`
- L32 `export interface StructuralResult`
- L37 `export interface DomainResult`
- L69 `export function validateChartStructure(value: unknown): StructuralResult`
- L138 `export function validateChartDomain(chart: Chart): DomainResult`

### `src/edit/edit-cfx-library.ts` — 249줄

- L35 `export async function readLibraryEntry(`
- L43 `export async function writeLibraryEntry(`
- L52 `export async function deleteLibraryEntry(storage: StorageEnv, songId: string): Promise<void>`
- L56 `export function listLibrarySongIds(storage: StorageEnv): Promise<readonly string[]>`
- L62 `export interface ImportDecoders`
- L74 `export type ImportValidationResult =`
- L103 `export async function validateCfxForImport(`
- L155 `export type ReimportChange =`
- L177 `export function compareReimport(`
- L211 `export type RegisterPlan =`
- L219 `export async function planLibraryRegistration(`
- L242 `export async function commitLibraryRegistration(`

### `src/edit/edit-cfx-package.ts` — 165줄

- L38 `export interface ChartIdCandidates`
- L54 `export function recommendCandidates(`
- L76 `export function suggestCfxFileName(representative: Chart): string`
- L82 `export interface CfxPackageInput`
- L88 `export type CfxBuildResult =`
- L103 `export function buildCfxPackage(input: CfxPackageInput): CfxBuildResult`
- L145 `export type PackageOutcome =`
- L155 `export async function packageAndSaveCfx(`

### `src/edit/edit-chart-init.ts` — 44줄

- L15 `export function createInitChart(songId: string, now: () => string): Chart`

### `src/edit/edit-chart-save.ts` — 102줄

- L21 `export interface VersionProposal`
- L28 `export function proposeSaveVersion(`
- L44 `export function isSaveVersionValid(`
- L53 `export type SaveChartOutcome =`
- L63 `export async function saveChartVersion(`
- L87 `export function sanitizeFileNameSegment(s: string): string`
- L92 `export function suggestChartFileName(chart: Chart, version: number): string`

### `src/edit/edit-command.ts` — 174줄

- L53 `export type Scope = 'n' | 's' | 'm';`
- L54 `export const SCOPES: readonly Scope[] = ['n', 's', 'm'];`
- L57 `export type InvalidateField =`
- L69 `export interface Command`
- L76 `export type DispatchKind = 'dispatch' | 'undo' | 'redo';`
- L78 `export interface DispatchEvent`
- L85 `export const SCOPE_DEPTH = 60;`
- L87 `export interface CommandHistory`
- L118 `export function createCommandHistory(): CommandHistory`

### `src/edit/edit-meta-commands.ts` — 129줄

- L33 `export interface MetaSessionLike`
- L67 `export function addTempoCommand(session: MetaSessionLike, tempo: Tempo): Command`
- L74 `export function deleteTempoCommand(session: MetaSessionLike, index: number): Command`
- L85 `export function editTempoCommand(session: MetaSessionLike, index: number, tempo: Tempo): Command`
- L96 `export function addTimeSignatureCommand(`
- L105 `export function deleteTimeSignatureCommand(session: MetaSessionLike, index: number): Command`
- L116 `export function editTimeSignatureCommand(`

### `src/edit/edit-notes-commands.ts` — 179줄

- L28 `export interface NotesSessionLike`
- L48 `export function addNotesCommand(session: NotesSessionLike, notesToAdd: readonly Note[]): Command`
- L56 `export function deleteNotesCommand(session: NotesSessionLike, indices: readonly number[]): Command`
- L67 `export function moveNotesCommand(`
- L86 `export function mirrorNotesCommand(session: NotesSessionLike, indices: readonly number[]): Command`
- L97 `export function setNoteDurationCommand(`
- L109 `export function replaceNotesCommand(`
- L134 `export function pasteNotesAndTextEventsCommand(`
- L159 `export function deleteNotesAndTextEventsCommand(`

### `src/edit/edit-session-transition.ts` — 57줄

- L14 `export type SessionTransitionChoice = 'saveNewVersion' | 'discardChanges' | 'cancel';`
- L16 `export type SessionTransitionResult =`
- L30 `export async function resolveSessionTransition(`

### `src/edit/edit-shape-commands.ts` — 325줄

- L59 `export interface ShapeSessionLike`
- L112 `export function normalizeShapeEvents(events: readonly ShapeEvent[]): ShapeEvent[]`
- L119 `export function normalizeLaneEvents(events: readonly LaneEvent[]): LaneEvent[]`
- L156 `export function addShapeEventsCommand(`
- L168 `export function deleteShapeEventsCommand(`
- L189 `export function mutateShapeEventsCommand(`
- L220 `export function updateShapeEasingCommand(`
- L237 `export function addLaneEventsCommand(`
- L247 `export function deleteLaneEventsCommand(`
- L260 `export function mutateLaneEventCommand(`
- L277 `export function updateLaneEasingCommand(`
- L297 `export function mirrorEventsCommand(`

### `src/edit/edit-text-commands.ts` — 64줄

- L14 `export interface TextEventsSessionLike`
- L34 `export function addTextEventsCommand(`
- L43 `export function deleteTextEventsCommand(`
- L55 `export function editTextEventCommand(`

### `src/edit/edit-workspace.ts` — 203줄

- L27 `export interface WorkspaceSlot`
- L40 `export const AUTOSAVE_DELAY_MS = 30_000;`
- L42 `export async function readWorkspace(storage: StorageEnv): Promise<WorkspaceSlot | null>`
- L47 `export async function writeWorkspace(storage: StorageEnv, slot: WorkspaceSlot): Promise<void>`
- L51 `export async function deleteWorkspace(storage: StorageEnv): Promise<void>`
- L60 `export async function loadRecoverableWorkspace(storage: StorageEnv): Promise<WorkspaceSlot | null>`
- L71 `export interface AutosaveTimerHost`
- L76 `export interface WorkspaceSessionOptions`
- L89 `export interface WorkspaceSession`
- L110 `export function createWorkspaceSession(options: WorkspaceSessionOptions): WorkspaceSession`

### `src/env/env-audio.ts` — 159줄

- L17 `export interface AudioEnv`
- L31 `export function createAudioEnv(createContext: () => AudioContext): AudioEnv`
- L117 `export function createHitBuffer(ctx: AudioContext): AudioBuffer`
- L144 `export function playHitSound(`

### `src/env/env-canvas.ts` — 77줄

- L13 `export function resizeCanvas(`
- L26 `export interface ResizeWatchHost`
- L33 `export function watchResize(host: ResizeWatchHost, onSettled: () => void): () => void`
- L64 `export interface FullscreenHost`
- L70 `export function isFullscreen(host: FullscreenHost): boolean`
- L74 `export function toggleFullscreen(host: FullscreenHost, el: Element): Promise<void>`

### `src/env/env-file.ts` — 329줄

- L34 `export interface OpenedFile`
- L39 `export interface OpenedBinaryFile`
- L45 `export interface FileOpenHost`
- L60 `export interface FileSaveHost`
- L67 `export type OpenOutcome =`
- L70 `export type OpenMultipleOutcome =`
- L74 `export type OpenBinaryOutcome =`
- L78 `export type SaveFileOutcome =`
- L81 `export interface FileEnv`
- L100 `export function createFileEnv(): FileEnv`
- L136 `export interface ZipEntry`
- L149 `export function createZipArchive(entries: readonly ZipEntry[]): Uint8Array`
- L226 `export function readZipArchive(bytes: Uint8Array): ZipEntry[]`

### `src/env/env-input.ts` — 61줄

- L11 `export interface RawKeyboardEvent`
- L17 `export interface KeyEvent`
- L23 `export interface KeyboardHost`
- L31 `export interface KeyInputHandlers`
- L38 `export function bindKeyInput(`

### `src/env/env-storage.ts` — 187줄

- L21 `export const STORE_NAMES = ['workspace', 'library', 'records', 'settings', 'viewState'] as const;`
- L22 `export type StoreName = (typeof STORE_NAMES)[number];`
- L24 `export interface StoreWriteStatus`
- L32 `export interface StorageBackend`
- L39 `export interface StorageEnv`
- L59 `export function createStorageEnv(backend: StorageBackend): StorageEnv`
- L133 `export function createIndexedDbBackend(`

### `src/env/env-time.ts` — 47줄

- L16 `export interface TimeLoopHost`
- L21 `export function startFrameLoop(`

### `src/format/format-cfx-load.ts` — 118줄

- L42 `export type CfxLoadResult =`
- L76 `export function loadCfxPackage(bytes: Uint8Array): CfxLoadResult`

### `src/format/format-cfx-package.ts` — 222줄

- L21 `export interface CandidateChart`
- L27 `export interface SongGroup`
- L33 `export function groupBySongId(charts: readonly CandidateChart[]): readonly SongGroup[]`
- L55 `export interface AssetFile`
- L61 `export interface PackageValidationIssue`
- L80 `export interface PackageValidationResult`
- L90 `export function validatePackageGroup(`

### `src/format/format-chart-open.ts` — 49줄

- L20 `export type OpenChartOutcome =`
- L34 `export function openChartJson(text: string): OpenChartOutcome`

### `src/game/game-credits.ts` — 59줄

- L20 `export interface CreditsRoleNames`
- L33 `export async function loadCreditsRoleNames(storage: StorageEnv): Promise<CreditsRoleNames>`

### `src/game/game-ctx.ts` — 20줄

- L9 `export interface CTX`

### `src/game/game-engine.ts` — 183줄

- L46 `export interface EngineHooks`
- L53 `export interface EngineSession`
- L90 `export function startEngineSession(`

### `src/game/game-judge-autoplay.ts` — 57줄

- L28 `export function advanceAutoplay(`

### `src/game/game-judge-display.ts` — 75줄

- L13 `export interface JudgmentFlash`
- L18 `export interface FastSlowFlash`
- L23 `export interface HitEffectSpawn`
- L29 `export interface JudgeDisplayState`
- L35 `export function createJudgeDisplayState(): JudgeDisplayState`
- L40 `export function recordFastSlow(`
- L52 `export function applyJudgmentEvents(`
- L68 `export function pruneHitEffects(`

### `src/game/game-judge-input.ts` — 69줄

- L31 `export interface JudgeInputHandlers`
- L36 `export function createJudgeInputHandlers(`

### `src/game/game-pause-keys.ts` — 22줄

- L13 `export function attachPauseKeys(session: Pausable, doc: Document = document): () => void`

### `src/game/game-records.ts` — 91줄

- L31 `export async function readRecord(`
- L54 `export async function resetRecord(`
- L62 `export type SaveRecordOutcome =`
- L75 `export async function saveRecordIfEligible(`

### `src/game/game-session.ts` — 291줄

- L49 `export interface HitSoundSource`
- L54 `export interface GameSessionOptions`
- L85 `export interface ResultData extends PlayResult`
- L99 `export const GAUGE_TRACE_SAMPLES = 200;`
- L101 `export interface GameSession`
- L125 `export function createGameSession(options: GameSessionOptions): GameSession`

### `src/game/game-settings.ts` — 24줄

- L16 `export async function readSettings(storage: StorageEnv): Promise<Settings>`
- L21 `export async function writeSettings(storage: StorageEnv, settings: Settings): Promise<void>`

### `src/game/game-song-preview.ts` — 106줄

- L24 `export interface PreviewSource`
- L29 `export interface PreviewController`
- L38 `export function createPreviewController(audio: AudioEnv): PreviewController`

### `src/game/game-song-select.ts` — 166줄

- L28 `export interface SongSelectLoadResult`
- L35 `export interface PreviewAsset`
- L47 `export async function loadPreviewAsset(`
- L67 `export interface PlayableChart`
- L82 `export async function loadPlayableChart(`
- L112 `export async function loadSongSelectRows(storage: StorageEnv): Promise<SongSelectLoadResult>`

### `src/game/game-viewstate.ts` — 94줄

- L29 `export type { CursorTarget, RecordCellMode, SongSelectViewState };`
- L31 `export const DEFAULT_SONG_SELECT_VIEW_STATE: SongSelectViewState =`
- L83 `export async function readSongSelectViewState(storage: StorageEnv): Promise<SongSelectViewState>`
- L88 `export async function writeSongSelectViewState(`

### `src/game/game-visibility.ts` — 49줄

- L20 `export interface Pausable`
- L30 `export function attachAutoPause(`

### `src/render/render-layout.ts` — 85줄

- L9 `export interface PlayfieldRect`
- L21 `export function computePlayfieldRect(canvasWidth: number, canvasHeight: number): PlayfieldRect`
- L34 `export const JUDGE_LINE_DEFAULT_FRAC = 8 / 9;`
- L37 `export function judgeLineY(rect: PlayfieldRect, judgeLinePos?: number): number`
- L48 `export function shapePosToField(value: number): number`
- L53 `export function shapeX(rect: PlayfieldRect, value: number, mirror: boolean): number`
- L66 `export function projectLaneLayout(layout:`
- L82 `export function scrollYAt(rect: PlayfieldRect, jY: number, progress: number): number`

### `src/render/render-playfield.ts` — 870줄

- L64 `export interface DrawContext`
- L87 `export interface FieldSample`
- L98 `export function buildFieldSamplePoints(`
- L140 `export function drawShapeBoundary(ctx: DrawContext, samples: readonly FieldSample[]): void`
- L153 `export function drawLaneDividers(ctx: DrawContext, samples: readonly FieldSample[]): void`
- L166 `export interface NoteRect`
- L195 `export function computeNoteHeadRect(`
- L230 `export function drawNoteHead(ctx: DrawContext, note: NoteRect): void`
- L243 `export function drawJudgeTrack(ctx: DrawContext, rect: PlayfieldRect, jY: number): void`
- L261 `export function drawGaugeBar(`
- L297 `export interface JacketInput`
- L304 `export function drawPlayfield(`
- L382 `export interface JudgmentTextView`
- L387 `export interface FastSlowView`
- L392 `export interface HitEffectView`
- L399 `export function drawCombo(ctx: DrawContext, rect: PlayfieldRect, jY: number, combo: number): void`
- L436 `export function drawJudgmentText(`
- L455 `export function drawFastSlow(`
- L478 `export function drawCounterPercent(`
- L507 `export function computeHitEffectVisual(`
- L548 `export function drawHitEffect(`
- L574 `export function drawJacketBackground(`
- L614 `export function drawKeyBeams(`
- L650 `export function drawMeasureLines(`
- L691 `export function drawSuddenCover(`
- L706 `export interface ActiveTextEvent`
- L716 `export function computeActiveTextEvents(`
- L752 `export function drawTextEvent(`
- L816 `export function drawSongInfoStrip(`
- L841 `export function pauseIconHitRegion(rect: PlayfieldRect):`
- L852 `export function pauseIconHitTest(rect: PlayfieldRect, x: number, y: number): boolean`
- L858 `export function drawPauseIcon(ctx: DrawContext, rect: PlayfieldRect): void`

### `src/render/render-theme.ts` — 185줄

- L10 `export const CANVAS_BG = '#000';`
- L11 `export const PLAYFIELD_BG = '#050508';`
- L16 `export const JACKET_BG =`
- L21 `export const PLAYFIELD_ASPECT = 16 / 9;`
- L23 `export const NOTE_COLOR =`
- L33 `export const WIDE_BODY_ALPHA = '#008898cc';`
- L38 `export const OVERLAP_COLOR =`
- L43 `export const SHAPE_BOUNDARY =`
- L48 `export const LANE_DIVIDER =`
- L53 `export const SHAPE_STEP_LINE =`
- L59 `export const JUDGE_TRACK =`
- L71 `export const GAUGE_COLOR =`
- L78 `export const JUDGMENT_COLOR =`
- L85 `export const FAST_SLOW_COLOR =`
- L91 `export const HIT_EFFECT =`
- L99 `export const HUD_TEXT =`
- L124 `export const HUD_COUNTER_PERCENT =`
- L131 `export const SONG_INFO_STRIP =`
- L145 `export const PAUSE_ICON =`
- L154 `export const KEY_BEAM =`
- L164 `export const MEASURE_LINE =`
- L170 `export const SUDDEN_COVER =`
- L179 `export const TEXT_EVENT =`

### `src/scene/scene-credits.ts` — 128줄

- L27 `export interface CreditsSceneHandle`
- L51 `export function mountCreditsScene(target: HTMLElement, onBack: () => void): CreditsSceneHandle`

### `src/scene/scene-editor-meta.ts` — 521줄

- L94 `export interface EditorMetaSession extends MetaSessionLike`
- L99 `export interface EditorMetaApi`
- L124 `export function mountEditorMetaBody(`

### `src/scene/scene-editor-notes.ts` — 1261줄

- L148 `export interface EditorNotesApi`
- L323 `export function mountEditorNotesBody(`

### `src/scene/scene-editor-save.ts` — 102줄

- L20 `export interface EditorSaveModalHandlers`
- L25 `export interface EditorSaveModalHandle`
- L40 `export function mountEditorSaveModal(`

### `src/scene/scene-editor-shapes.ts` — 1712줄

- L270 `export interface EditorShapesApi`
- L422 `export function mountEditorShapesBody(`

### `src/scene/scene-editor-start.ts` — 171줄

- L46 `export interface EditorStartState`
- L54 `export interface EditorStartHandlers`
- L66 `export interface EditorStartSceneHandle`
- L81 `export function mountEditorStartScene(`

### `src/scene/scene-editor-test.ts` — 554줄

- L101 `export interface EditorTestSessionLike`
- L106 `export interface EditorTestApi`
- L161 `export function mountEditorTestBody(`

### `src/scene/scene-editor-view.ts` — 162줄

- L35 `export const VIEW_MS_DEFAULT = 8000;`
- L37 `export const VIEW_MS_MIN = 1000;`
- L39 `export const VIEW_MS_MAX = 32000;`
- L41 `export const VIEW_MS_ZOOM_STEP = 1.35;`
- L44 `export interface EditorViewState`
- L49 `export function createEditorViewState(): EditorViewState`
- L54 `export function zoomOut(view: EditorViewState): void`
- L58 `export function zoomIn(view: EditorViewState): void`
- L63 `export interface ScrollbarRange`
- L68 `export interface EditorScrollbar`
- L81 `export function mountEditorScrollbar(`

### `src/scene/scene-editor-workspace.ts` — 234줄

- L50 `export const EDITOR_CATEGORIES = ['notes', 'shapes', 'meta', 'test'] as const;`
- L51 `export type EditorCategory = (typeof EDITOR_CATEGORIES)[number];`
- L57 `export interface EditorCategoryController`
- L69 `export interface EditorWorkspaceHandlers`
- L103 `export interface EditorWorkspaceSceneHandle`
- L125 `export function mountEditorWorkspaceScene(`

### `src/scene/scene-gameplay.ts` — 501줄

- L93 `export interface GameplayJacket`
- L99 `export interface GameplayStartInput`
- L117 `export interface GameplayHandlers`
- L124 `export interface GameplaySceneHandle`
- L175 `export function mountGameplayScene(`

### `src/scene/scene-loading.ts` — 62줄

- L15 `export interface LoadingIndicatorHandle`
- L23 `export function mountLoadingIndicator(`

### `src/scene/scene-manager.ts` — 119줄

- L36 `export interface Scene`
- L43 `export interface SceneManager`
- L63 `export function createSceneManager(scenes: readonly Scene[]): SceneManager`

### `src/scene/scene-mode-select.ts` — 119줄

- L18 `export type ModeSelectId = 'play' | 'editor' | 'settings' | 'credits';`
- L32 `export interface ModeSelectHandlers`
- L37 `export interface ModeSelectSceneHandle`
- L51 `export function mountModeSelectScene(`

### `src/scene/scene-result-format.ts` — 245줄

- L14 `export const WINDOW =`
- L21 `export const AXIS_MS = 110;`
- L24 `export function msToPct(ms: number): number`
- L29 `export function judgmentColorVar(absMs: number): string`
- L38 `export interface TimingStats`
- L49 `export function timingStats(errors: ArrayLike<number>): TimingStats`
- L62 `export interface HistogramBucket`
- L73 `export function histogramBuckets(errors: ArrayLike<number>, bucketWidthMs = 5): HistogramBucket[]`
- L102 `export function stateColorVar(state: PlayState): string`
- L120 `export function stateLabel(state: PlayState): string`
- L142 `export function rankColorVar(rank: Rank): string`
- L165 `export function tierChipColors(difficulty: Difficulty): { bg: string; ink: string } | null`
- L185 `export function gaugeLabel(tier: Tier): string`
- L189 `export function gaugeColorVar(tier: Tier): string`
- L197 `export interface Delta`
- L207 `export function computeDelta(current: number, previous: number, decimals: number): Delta`
- L217 `export function deltaColorVar(sign: Delta['sign']): string`
- L225 `export function fastSlowColorVar(count: number, side: 'FAST' | 'SLOW'): string`
- L232 `export function formatScore(score: number): string`
- L236 `export function formatAccuracy(accuracy: number): string`
- L240 `export function formatPlayedAt(epochMs: number): string`

### `src/scene/scene-result.ts` — 356줄

- L29 `export interface ResultView`
- L38 `export interface ResultHandlers`
- L43 `export interface ResultSceneHandle`
- L60 `export function mountResultScene(`

### `src/scene/scene-settings.ts` — 512줄

- L58 `export const SETTINGS_CATEGORIES = ['play', 'visual', 'sound', 'option'] as const;`
- L59 `export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];`
- L61 `export interface SettingsHandlers`
- L73 `export interface SettingsSceneHandle`
- L105 `export function mountSettingsScene(`

### `src/scene/scene-song-credit.ts` — 109줄

- L25 `export interface SongCreditSceneHandle`
- L33 `export interface SongCreditHandlers`
- L48 `export function mountSongCreditScene(`

### `src/scene/scene-song-select.ts` — 806줄

- L113 `export type { SongSelectViewState };`
- L119 `export interface SongSelectSceneHandle`
- L130 `export interface SongSelectHandlers`
- L172 `export function mountSongSelectScene(`

### `src/scene/scene-title.ts` — 67줄

- L17 `export interface TitleSceneHandle`
- L31 `export function mountTitleScene(target: HTMLElement, onStart: () => void): TitleSceneHandle`

---

## 2. 단위 테스트 인벤토리

| 파일 | 케이스 수 | describe |
|---|---:|---|
| `src/app/app-features.test.ts` | 3 | 빌드 프로필 |
| `src/core/core-constants.test.ts` | 6 | constants — 원본 보존 / constants — 의도한 차이 / settings 기본값 |
| `src/core/core-gauge.test.ts` | 48 | gauge — 골든 대조 / gauge — 의도한 차이 / tier 사다리와 gaugeMode (§2) / state 산출 — 성적이 정한다 (§3) / [GA-4] cascade 검증 시나리오 6종 (§4) / 결과 산출 (§5) / [GA-5] 판정 단위 총수는 judge가 센다 / §7 결과 산출 골든 대조 — 원본 computeResult |
| `src/core/core-i18n.test.ts` | 5 | core-i18n |
| `src/core/core-judge.test.ts` | 91 | 골든 대조 — 후보 선택 / [JD-1] 후보 순서 (§1) — 골든 미커버, 스펙이 유일한 판정자 / 판정창 (§2) / lane 매칭·mirror (§3) / commitJudgment (§4) / Tap 만료 MISS (§2·§9) / [JD-8] visualOffset (§1) — 골든 미커버 / 파생 노트 표 (§1, J-3) / [JD-2] Normal Hold — lane 익명 수요 (§5) / WideHold — 단일 소유·원자적 이양 (§5·§6) / reconcileHeldCapacity 불변식 (§6) / [JD-6] Hold tail 처리·release grace (§7) / [GA-2][GA-5] Hold head MISS — 2단위 회계 (§8) / 이벤트 처리 (§9) / 무효 chart 런타임 폴백 (§12) / 카운트다운 등록 진입점 (§9) / [JD-7] 중간 시작 시드 (§10) / pause Resume — 비-재시드 재조정 (§10, JD-7) / [JD-1] 같은 tick hold가 tap보다 우선한다 (배열 순서 무관, 스팟체크 #4) / [JD-7 경계] 시드의 tail == anchor 경계 (이벤트 순서, 스팟체크 #5) / 무효 chart 중복 WideHold의 tail 동률 (judge §12) / heldCapacityViolations 자기 검증 (judge §6) / 자동완료 동률 tail의 결정론 순서 |
| `src/core/core-naming.test.ts` | 21 | 함수 대응표 (naming §2) ↔ 구현 / 명칭 대응표 (naming §3) ↔ 구현 / 상태 필드 대응표 (naming §4) ↔ 구현 |
| `src/core/core-overlap.test.ts` | 39 | §1 활성 정의 — Hold가 끝나는 tick은 이미 활성이 아니다 / §2 로컬 capacity — 풀마다 몇 겹부터 못 치는가 / [DM-3] §3 3겹 이상 — 원본이 잡지 못하던 자리 / [JD-5] §4 global 6키 — 로컬을 다 통과해도 손가락이 모자란 자리 / [DM-6] §5 우선순위 — conflict가 세부 분류를 덮는다 / §6 2겹 세부 분류 — 원본 규칙 그대로 / §7 골든 대조 — 원본 overlaps.js / §8 불변식 / [보존] 반개구간 경계 — sweep 쪽과 쌍 분류 쪽 둘 다 |
| `src/core/core-quick-options.test.ts` | 14 | openQuickOptions / moveQuickOptionsRow / stepQuickOption — scrollSpeed / stepQuickOption — gaugeMode / stepQuickOption — boolean 필드(mirror/staticShape/autoplay) / jumpQuickOption / confirmQuickOption / applyQuickOptions |
| `src/core/core-records.test.ts` | 19 | recordKey / deriveScore / deriveAccuracy / deriveRecordSummary / mergeRecord / isNoRecord |
| `src/core/core-settings.test.ts` | 20 | settings 스키마 / conflictingLaneKey / settings 병합 |
| `src/core/core-shape.test.ts` | 50 | §5 easing — 저장 3종 + null / §4 anchor — 체인의 시작값 하나 / §4 평가 — 순회 규칙 / §4 같은 tick 정렬 — 즉시 점프가 먼저 선다 / 즉시 점프 tick / [DM-4] lane 체인 — shape와 같은 알고리즘, 선택자와 좌표계만 다르다 / [SH-5] §5 Arc — 교번 규칙 / 파생 객체 — 캐시도 무효화도 없다 / 골든 대조 — 원본 shape.js / [SH-6 여집합] anchor 동률 — 배열 앞이 이긴다 / resolveArcEasing 도착 동률 |
| `src/core/core-song-select.test.ts` | 48 | buildSongRow / category / sortRows / groupRows / locateCursor / cursorTarget / moveCursorHorizontal / moveCursorVertical — 열 대응 규칙(§7) / folder 헤더 — 아코디언(§4, M4-4) / moveCursorByPage / moveCursorHome / moveCursorEnd (§7) / matchesSearch / filterBySearch (§6) |
| `src/core/core-timing.test.ts` | 37 | timing — 골든 대조 / timing — round trip / [TM-1][TM-2][TM-3][TM-4] 곡 종료 4값 / [TM-7] sub 분할 = gridDivisor / [TM-11] 첫 박자표 앞 구간 외삽 표기 (D-2026-045) / [TM-8] gridDivisor 목록과 기본값 / [TM-6] laneGridDivisor와 공유하지 않는다 / [TM-9] grid line 기술자 / scrollProgressAt / timeline은 입력을 mutate하지 않는다 / measureToTick 실패 처리 / [TM-9] gridLines 실값 / [TM-7] measureToTick 3부 입력 / [TM-3] lastEventTick은 가장 늦게 끝나는 event를 고른다 |
| `src/core/core-validate.test.ts` | 26 | [DM-5] structural — 통과하면 chart다 / [DM-5] domain — 거부하지 않고 보고한다 / [DM-4] lane 데이터는 무구속이다 / [DM-1][DM-2] chart 하나가 계산에 필요한 전부를 소유한다 / [SH-3] 조용히 사라지는 체인 데이터를 보고한다 / [DM-5 경계] domain 경계값 표 |
| `src/edit/edit-cfx-library.test.ts` | 21 | library store 원시 연산 / validateCfxForImport — 구조 검증(재사용) + decode 게이트 / compareReimport / planLibraryRegistration / commitLibraryRegistration |
| `src/edit/edit-cfx-package.test.ts` | 11 | recommendCandidates / suggestCfxFileName / buildCfxPackage / packageAndSaveCfx |
| `src/edit/edit-chart-init.test.ts` | 2 | createInitChart |
| `src/edit/edit-chart-save.test.ts` | 14 | proposeSaveVersion / isSaveVersionValid / saveChartVersion / suggestChartFileName |
| `src/edit/edit-command.test.ts` | 17 | dispatch / undo/redo / resetBaseline / onDispatch / M5-2 Exit — 모든 편집이 command로 들어가고, chart field 편집은 history 밖이다 |
| `src/edit/edit-meta-commands.test.ts` | 6 | edit-meta-commands / tempo / timeSignature |
| `src/edit/edit-notes-commands.test.ts` | 16 | addNotesCommand / deleteNotesCommand / moveNotesCommand / mirrorNotesCommand / setNoteDurationCommand / replaceNotesCommand / pasteNotesAndTextEventsCommand (D-2026-123) / deleteNotesAndTextEventsCommand (D-2026-124) |
| `src/edit/edit-session-transition.test.ts` | 7 | resolveSessionTransition |
| `src/edit/edit-shape-commands.test.ts` | 22 | edit-shape-commands / normalizeShapeEvents / addShapeEventsCommand / deleteShapeEventsCommand / addLaneEventsCommand / deleteLaneEventsCommand / mutateShapeEventsCommand / mutateLaneEventCommand / [JD-updateEasing] updateShapeEasingCommand / updateLaneEasingCommand (D-2026-122) / mirrorEventsCommand |
| `src/edit/edit-text-commands.test.ts` | 4 | addTextEventsCommand / deleteTextEventsCommand / editTextEventCommand |
| `src/edit/edit-workspace.test.ts` | 21 | workspace store 원시 연산 / loadRecoverableWorkspace / createWorkspaceSession — dirty 추적 / createWorkspaceSession — autosave / createWorkspaceSession — flush / createWorkspaceSession — onFileSaveSuccess / createWorkspaceSession — discard / createWorkspaceSession — dispose / M3-3 Exit — 새로고침해도 chart와 asset이 복구된다 |
| `src/env/env-audio.test.ts` | 15 | env-audio 계약 / createHitBuffer / playHitSound |
| `src/env/env-canvas.test.ts` | 7 | resizeCanvas 계약 / watchResize 계약 / fullscreen 계약 |
| `src/env/env-file.test.ts` | 23 | env-file — open / env-file — openMultiple(M5-8, D-2026-062 해소) / env-file — openBinary(M5-8, D-2026-062 해소) / env-file — save / createZipArchive / readZipArchive — createZipArchive의 짝(왕복) |
| `src/env/env-input.test.ts` | 6 | env-input 계약 |
| `src/env/env-storage.test.ts` | 17 | createStorageEnv — 다섯 store 분리 / createStorageEnv — 쓰기 실패 처리 / createIndexedDbBackend |
| `src/env/env-time.test.ts` | 4 | env-time frameCap 계약 |
| `src/format/format-cfx-load.test.ts` | 8 | loadCfxPackage — 정상 .cfx / loadCfxPackage — 손상 거부 |
| `src/format/format-cfx-package.test.ts` | 19 | groupBySongId / validatePackageGroup |
| `src/format/format-chart-open.test.ts` | 4 | openChartJson |
| `src/game/game-credits.test.ts` | 6 | loadCreditsRoleNames |
| `src/game/game-engine.test.ts` | 18 | startEngineSession — lead-in / startEngineSession — 곡 종료 / startEngineSession — pause·Resume (judge.md §10  / startEngineSession — mid-start(M5-6, judge.md §10) |
| `src/game/game-judge-autoplay.test.ts` | 5 | advanceAutoplay |
| `src/game/game-judge-display.test.ts` | 5 | recordFastSlow / applyJudgmentEvents / pruneHitEffects |
| `src/game/game-judge-input.test.ts` | 5 | createJudgeInputHandlers |
| `src/game/game-pause-keys.test.ts` | 4 | attachPauseKeys (D-2026-052 — Esc 전체화면 충돌과 Backspace 대체키) |
| `src/game/game-records.test.ts` | 7 | readRecord / saveRecordIfEligible / resetRecord |
| `src/game/game-session.test.ts` | 20 | createGameSession — 수동 입력 / createGameSession — autoplay / createGameSession — 곡 종료 / createGameSession — 게이지 / createGameSession — pause·Resume / createGameSession — mid-start(M5-6, judge.md §10) / createGameSession — result 필드 (D-2026-054) / createGameSession — 히트음 |
| `src/game/game-settings.test.ts` | 4 | readSettings / writeSettings |
| `src/game/game-song-preview.test.ts` | 7 | createPreviewController |
| `src/game/game-song-select.test.ts` | 7 | loadSongSelectRows / loadPlayableChart |
| `src/game/game-viewstate.test.ts` | 5 | song-select viewState |
| `src/game/game-visibility.test.ts` | 7 | attachAutoPause (scene.md §9 — 탭 백그라운드 auto-pause) |
| `src/render/render-layout.test.ts` | 17 | computePlayfieldRect / judgeLineY / shapePosToField · shapeX / projectLaneLayout / scrollYAt |
| `src/render/render-playfield.test.ts` | 41 | buildFieldSamplePoints / drawShapeBoundary · drawLaneDividers / computeNoteHeadRect / drawJudgeTrack / drawGaugeBar / drawNoteHead / drawPlayfield — 통합 / drawCombo / drawJudgmentText / drawFastSlow / computeHitEffectVisual · drawHitEffect / drawJacketBackground / drawKeyBeams / drawMeasureLines / drawSuddenCover / computeActiveTextEvents / drawTextEvent / drawCounterPercent / drawSongInfoStrip / pause 아이콘 |
| `src/scene/scene-credits.test.ts` | 6 | scene-credits |
| `src/scene/scene-editor-meta.test.ts` | 16 | scene-editor-meta |
| `src/scene/scene-editor-notes.test.ts` | 33 | scene-editor-notes |
| `src/scene/scene-editor-save.test.ts` | 6 | mountEditorSaveModal (M5-8, editor-editing.md §7) |
| `src/scene/scene-editor-shapes.test.ts` | 51 | scene-editor-shapes |
| `src/scene/scene-editor-start.test.ts` | 14 | scene-editor-start |
| `src/scene/scene-editor-test.test.ts` | 6 | scene-editor-test |
| `src/scene/scene-editor-view.test.ts` | 5 | mountEditorScrollbar (M5-6, D-2026-104) |
| `src/scene/scene-editor-workspace.test.ts` | 8 | scene-editor-workspace |
| `src/scene/scene-gameplay.test.ts` | 11 | scene-gameplay |
| `src/scene/scene-loading.test.ts` | 6 | mountLoadingIndicator (scene.md §9, core/constants.md §8) |
| `src/scene/scene-manager.test.ts` | 11 | createSceneManager |
| `src/scene/scene-mode-select.test.ts` | 6 | scene-mode-select |
| `src/scene/scene-result-format.test.ts` | 15 | msToPct (§3 좌표 유도) / judgmentColorVar (§2.3 히스토그램 채색) / timingStats (D-2026-054 §6.4 NaN 제외) / histogramBuckets / computeDelta (§2.2 반올림 후 부호) / fastSlowColorVar (§1.7) / state/rank/gauge 라벨·색 (§1.4~§1.6, §2.4) / 서식 |
| `src/scene/scene-result.test.ts` | 8 | mountResultScene — 데이터 바인딩 / mountResultScene — 키 계약 (§4) |
| `src/scene/scene-settings.test.ts` | 14 | mountSettingsScene — mount/show/hide / nav pill 클릭 / Tab/Shift+Tab 순환 / 필드 위젯 커밋 / key-rebind capture / Backspace/Esc → onBack |
| `src/scene/scene-song-credit.test.ts` | 6 | scene-song-credit |
| `src/scene/scene-song-select.test.ts` | 40 | scene-song-select / quick options overlay(M4-7) |
| `src/scene/scene-title.test.ts` | 6 | scene-title |
| `tests/integration/m3-persistence-chain.test.ts` | 1 | M3 milestone Exit — 저장 → .cfx → 다른 프로필 → 플레이 → 기록 → reimport 후 기록 유지 |
| `tests/property.test.ts` | 4 | 속성 — timing 왕복 / 속성 — 체인 평가 / 속성 — 겹침 검출 |
| `tests/support/layout.test.ts` | 1 | 레이어 배치 |
| `tests/support/support.test.ts` | 14 | 골든 표 로더 / 허용 오차 / 설계 대장 / 미커버 가드 |

---

## 3. 골든·지원 파일

| 파일 | 크기 |
|---|---:|
| `tests/golden/DIVERGENCES.md` | 27.1KB |
| `tests/golden/constants.json` | 5.0KB |
| `tests/golden/gauge.json` | 20.8KB |
| `tests/golden/judge.json` | 347.2KB |
| `tests/golden/overlap.json` | 13.9KB |
| `tests/golden/result.json` | 17.1KB |
| `tests/golden/shape.json` | 20.5KB |
| `tests/golden/timing.json` | 28.4KB |
| `tests/support/coverage.ts` | 3.2KB |
| `tests/support/divergences.ts` | 6.6KB |
| `tests/support/golden.ts` | 2.5KB |

