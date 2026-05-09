import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  boardToString,
  generateSudokuForLevel,
  getCandidates,
  gradeSudoku,
  isBoardValid,
  isPlacementValid,
  parseSudoku,
  run,
  SudokuBoard,
  SudokuGrade,
  SudokuGroupName,
  SudokuLevelDefinition,
  SudokuValue,
  SUDOKU_LEVELS,
} from './sudoku.kernel';
import type { RuntimeTestReport } from './sudoku.tests';
import { PersistenceService } from '../../services/persistence.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type SudokuScreen = 'menu' | 'play' | 'data' | 'diagnostics';
type SudokuInputMode = 'cell' | 'number';
type SudokuMistakeChecking = 'off' | 'immediate' | 'manual';
type SudokuMistakeLimit = 'off' | '3';
type SudokuHintBehavior = 'reveal' | 'explain';
type SudokuAutoNotes = 'off' | 'fill' | 'update';

interface SudokuUndoSnapshot {
  board: SudokuBoard;
  notes: string[];
  selectedIndex: number;
  moveCount: number;
}

interface SudokuSessionSnapshotV1 {
  version: 1;
  savedAt: number;
  sessionId?: string;
  startedAt?: number;
  moveCount?: number;
  selectedLevel: number;
  journeyMode: boolean;
  unlockedLevel: number;
  initialBoard: string;
  playerBoard: string;
  notes: string[];
  selectedIndex: number;
  elapsedSeconds: number;
  grade: SudokuGrade | null;
}

type SudokuGameOutcome = 'completed' | 'solved' | 'abandoned';

interface SudokuHistoryEntryV1 {
  id: string;
  version: 1;
  sessionId: string;
  outcome: SudokuGameOutcome;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  selectedLevel: number;
  journeyMode: boolean;
  moveCount: number;
  clueCount: number;
  score: number;
  levelNumber: number;
  levelName: string;
  levelRank: string;
  hardestTechnique: string;
}

interface SudokuLevelStatsV1 {
  started: number;
  completed: number;
  solved: number;
  abandoned: number;
  totalSuccessfulSeconds: number;
  bestSuccessfulSeconds: number | null;
}

interface SudokuAggregateStatsV1 {
  version: 1;
  totalStarted: number;
  totalCompleted: number;
  totalSolved: number;
  totalAbandoned: number;
  totalMoves: number;
  totalSuccessfulSeconds: number;
  bestSuccessfulSeconds: number | null;
  byLevel: Record<string, SudokuLevelStatsV1>;
  lastPlayedAt: number;
  lastOutcomeAt: number;
}

interface SudokuExportPayloadV2 {
  format: 'synedex-sudoku-export';
  version: 2;
  exportedAt: number;
  preferences: {
    selectedLevel: number;
    journeyMode: boolean;
    unlockedLevel: number;
    notesMode: boolean;
  };
  session: SudokuSessionSnapshotV1 | null;
  history: SudokuHistoryEntryV1[];
  stats: SudokuAggregateStatsV1;
}

interface SudokuExportPayloadV1Legacy {
  format: 'synedex-sudoku-export';
  version: 1;
  exportedAt: number;
  preferences: {
    selectedLevel: number;
    journeyMode: boolean;
    unlockedLevel: number;
    notesMode: boolean;
  };
  session: SudokuSessionSnapshotV1 | null;
}

interface NormalizedSudokuImportPayload {
  preferences: {
    selectedLevel: number;
    journeyMode: boolean;
    unlockedLevel: number;
    notesMode: boolean;
  };
  session: SudokuSessionSnapshotV1 | null;
  history: SudokuHistoryEntryV1[];
  stats: SudokuAggregateStatsV1;
}

const MAX_HISTORY_ENTRIES = 500;

function isBoardString(value: string): boolean {
  return /^[0-9]{81}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function encodeNotes(notes: Array<Set<number>>): string[] {
  return Array.from({ length: 81 }, (_, index) => {
    const ordered = [...(notes[index] ?? new Set<number>())]
      .filter((digit) => digit >= 1 && digit <= 9)
      .sort((a, b) => a - b);
    return ordered.join('');
  });
}

function decodeNotes(encoded: string[] | null | undefined): Array<Set<number>> {
  const notes = createEmptyNotes();
  if (!encoded) {
    return notes;
  }

  for (let index = 0; index < 81; index += 1) {
    const raw = encoded[index] ?? '';
    const set = new Set<number>();
    for (const char of raw) {
      const digit = Number(char);
      if (digit >= 1 && digit <= 9) {
        set.add(digit);
      }
    }
    notes[index] = set;
  }

  return notes;
}

function createSessionId(): string {
  return `sudoku-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.max(min, Math.min(max, n));
}

function createEmptyLevelStats(): SudokuLevelStatsV1 {
  return {
    started: 0,
    completed: 0,
    solved: 0,
    abandoned: 0,
    totalSuccessfulSeconds: 0,
    bestSuccessfulSeconds: null,
  };
}

function createEmptyAggregateStats(): SudokuAggregateStatsV1 {
  return {
    version: 1,
    totalStarted: 0,
    totalCompleted: 0,
    totalSolved: 0,
    totalAbandoned: 0,
    totalMoves: 0,
    totalSuccessfulSeconds: 0,
    bestSuccessfulSeconds: null,
    byLevel: {},
    lastPlayedAt: 0,
    lastOutcomeAt: 0,
  };
}

function normalizeLevelStats(value: SudokuLevelStatsV1 | null | undefined): SudokuLevelStatsV1 {
  return {
    started: Math.max(0, Math.trunc(Number(value?.started ?? 0))),
    completed: Math.max(0, Math.trunc(Number(value?.completed ?? 0))),
    solved: Math.max(0, Math.trunc(Number(value?.solved ?? 0))),
    abandoned: Math.max(0, Math.trunc(Number(value?.abandoned ?? 0))),
    totalSuccessfulSeconds: Math.max(0, Math.trunc(Number(value?.totalSuccessfulSeconds ?? 0))),
    bestSuccessfulSeconds:
      value?.bestSuccessfulSeconds == null
        ? null
        : Math.max(0, Math.trunc(Number(value.bestSuccessfulSeconds))),
  };
}

function normalizeAggregateStats(
  value: SudokuAggregateStatsV1 | null | undefined,
): SudokuAggregateStatsV1 {
  const base = value ?? createEmptyAggregateStats();
  const byLevel: Record<string, SudokuLevelStatsV1> = {};

  for (const [key, stats] of Object.entries(base.byLevel ?? {})) {
    const level = clampInt(Number(key), 1, 20);
    byLevel[String(level)] = normalizeLevelStats(stats as SudokuLevelStatsV1);
  }

  return {
    version: 1,
    totalStarted: Math.max(0, Math.trunc(Number(base.totalStarted ?? 0))),
    totalCompleted: Math.max(0, Math.trunc(Number(base.totalCompleted ?? 0))),
    totalSolved: Math.max(0, Math.trunc(Number(base.totalSolved ?? 0))),
    totalAbandoned: Math.max(0, Math.trunc(Number(base.totalAbandoned ?? 0))),
    totalMoves: Math.max(0, Math.trunc(Number(base.totalMoves ?? 0))),
    totalSuccessfulSeconds: Math.max(0, Math.trunc(Number(base.totalSuccessfulSeconds ?? 0))),
    bestSuccessfulSeconds:
      base.bestSuccessfulSeconds == null
        ? null
        : Math.max(0, Math.trunc(Number(base.bestSuccessfulSeconds))),
    byLevel,
    lastPlayedAt: Math.max(0, Math.trunc(Number(base.lastPlayedAt ?? 0))),
    lastOutcomeAt: Math.max(0, Math.trunc(Number(base.lastOutcomeAt ?? 0))),
  };
}

function normalizeHistoryEntries(
  entries: SudokuHistoryEntryV1[] | null | undefined,
): SudokuHistoryEntryV1[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  const normalized: SudokuHistoryEntryV1[] = [];
  for (const item of entries) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const outcome =
      item.outcome === 'completed' || item.outcome === 'solved' || item.outcome === 'abandoned'
        ? item.outcome
        : null;
    if (!outcome) {
      continue;
    }

    normalized.push({
      id: String(item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      version: 1,
      sessionId: String(item.sessionId ?? 'unknown-session'),
      outcome,
      startedAt: Math.max(0, Math.trunc(Number(item.startedAt ?? 0))),
      endedAt: Math.max(0, Math.trunc(Number(item.endedAt ?? 0))),
      durationSeconds: Math.max(0, Math.trunc(Number(item.durationSeconds ?? 0))),
      selectedLevel: clampInt(Number(item.selectedLevel ?? 1), 1, 20),
      journeyMode: Boolean(item.journeyMode),
      moveCount: Math.max(0, Math.trunc(Number(item.moveCount ?? 0))),
      clueCount: Math.max(0, Math.trunc(Number(item.clueCount ?? 0))),
      score: Math.max(0, Math.trunc(Number(item.score ?? 0))),
      levelNumber: clampInt(Number(item.levelNumber ?? item.selectedLevel ?? 1), 1, 20),
      levelName: String(item.levelName ?? 'Unknown'),
      levelRank: String(item.levelRank ?? 'N/A'),
      hardestTechnique: String(item.hardestTechnique ?? 'unknown'),
    });
  }

  normalized.sort((a, b) => b.endedAt - a.endedAt);
  return normalized.slice(0, MAX_HISTORY_ENTRIES);
}

function normalizeSessionSnapshot(snapshot: unknown): SudokuSessionSnapshotV1 | null {
  if (!isRecord(snapshot)) {
    return null;
  }

  const initialBoard = String(snapshot.initialBoard ?? '');
  const playerBoard = String(snapshot.playerBoard ?? '');
  if (!isBoardString(initialBoard) || !isBoardString(playerBoard) || /^0+$/.test(initialBoard)) {
    return null;
  }

  const notesRaw = Array.isArray(snapshot.notes) ? snapshot.notes : [];
  const notes = Array.from({ length: 81 }, (_, index) => String(notesRaw[index] ?? ''));

  return {
    version: 1,
    savedAt: Math.max(0, Math.trunc(Number(snapshot.savedAt ?? Date.now()))),
    sessionId: snapshot.sessionId ? String(snapshot.sessionId) : undefined,
    startedAt:
      snapshot.startedAt == null ? undefined : Math.max(0, Math.trunc(Number(snapshot.startedAt))),
    moveCount:
      snapshot.moveCount == null ? undefined : Math.max(0, Math.trunc(Number(snapshot.moveCount))),
    selectedLevel: clampInt(Number(snapshot.selectedLevel ?? 1), 1, 20),
    journeyMode: Boolean(snapshot.journeyMode),
    unlockedLevel: clampInt(Number(snapshot.unlockedLevel ?? 1), 1, 20),
    initialBoard,
    playerBoard,
    notes,
    selectedIndex: clampInt(Number(snapshot.selectedIndex ?? 0), 0, 80),
    elapsedSeconds: Math.max(0, Math.trunc(Number(snapshot.elapsedSeconds ?? 0))),
    // Never trust imported grade object shape; it is recomputed as needed.
    grade: null,
  };
}

function areHistoryEntriesEqual(
  left: SudokuHistoryEntryV1[],
  right: SudokuHistoryEntryV1[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (JSON.stringify(left[i]) !== JSON.stringify(right[i])) {
      return false;
    }
  }

  return true;
}

function createEmptyNotes(): Array<Set<number>> {
  return Array.from({ length: 81 }, () => new Set<number>());
}

@Component({
  selector: 'app-sudoku',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  templateUrl: './sudoku.component.html',
  styleUrl: './sudoku.component.css',
})
export class SudokuComponent implements OnDestroy {
  readonly digits = DIGITS;
  readonly levels = SUDOKU_LEVELS;
  readonly levelGroups: Array<{ groupName: SudokuGroupName; levels: SudokuLevelDefinition[] }> =
    (() => {
      const groups: Array<{ groupName: SudokuGroupName; levels: SudokuLevelDefinition[] }> = [];
      for (const level of SUDOKU_LEVELS) {
        let group = groups.find((g) => g.groupName === level.groupName);
        if (!group) {
          group = { groupName: level.groupName, levels: [] };
          groups.push(group);
        }
        group.levels.push(level);
      }
      return groups;
    })();
  readonly boardIndices = Array.from({ length: 81 }, (_, i) => i);
  readonly isDev = isDevMode();
  private persistence = inject(PersistenceService);
  readonly t = inject(ScopedTranslationService);

  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  screen = signal<SudokuScreen>('menu');
  dataPanel = signal<'history' | 'migration'>('history');
  fullHistoryOpen = signal<boolean>(false);
  settingsOpen = signal<boolean>(false);
  menuSettingsOpen = signal<boolean>(false);
  exportChoiceOpen = signal<boolean>(false);
  importChoiceOpen = signal<boolean>(false);
  exportTextOpen = signal<boolean>(false);
  importTextOpen = signal<boolean>(false);
  copyFeedback = signal<boolean>(false);
  pendingConfirm = signal<{
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    onConfirm: () => void;
  } | null>(null);

  selectedLevel = signal<number>(1);
  journeyMode = signal<boolean>(false);
  unlockedLevel = signal<number>(1);
  generationInfo = signal<string>('');
  gameMessage = signal<string>('');
  currentSeed = signal<string>('');

  initialBoard = signal<SudokuBoard>(Array.from({ length: 81 }, () => 0 as SudokuValue));
  playerBoard = signal<SudokuBoard>(Array.from({ length: 81 }, () => 0 as SudokuValue));
  givenMask = signal<boolean[]>(Array.from({ length: 81 }, () => false));
  notes = signal<Array<Set<number>>>(createEmptyNotes());
  selectedIndex = signal<number>(0);

  grade = signal<SudokuGrade | null>(null);
  error = signal<string>('');
  testReport = signal<RuntimeTestReport | null>(null);

  sessionSnapshot = signal<SudokuSessionSnapshotV1 | null>(null);
  exportJson = signal<string>('');
  importJson = signal<string>('');
  gameHistory = signal<SudokuHistoryEntryV1[]>([]);
  aggregateStats = signal<SudokuAggregateStatsV1>(createEmptyAggregateStats());
  activeSessionId = signal<string>('');
  activeStartedAt = signal<number>(0);
  moveCount = signal<number>(0);
  mistakeCount = signal<number>(0);

  notesMode = signal<boolean>(false);
  inputMode = signal<SudokuInputMode>('cell');
  selectedDigit = signal<number | null>(null);
  mistakeChecking = signal<SudokuMistakeChecking>('manual');
  mistakeLimit = signal<SudokuMistakeLimit>('off');
  hintBehavior = signal<SudokuHintBehavior>('reveal');
  autoNotes = signal<SudokuAutoNotes>('off');
  autoAdvance = signal<boolean>(false);
  clearNotesOnEntry = signal<boolean>(true);
  keyboardShortcuts = signal<boolean>(true);
  highlightUnits = signal<boolean>(true);
  highlightSameNumbers = signal<boolean>(true);
  highlightConflicts = signal<boolean>(true);
  showCandidates = signal<boolean>(true);
  allowCheckBoard = signal<boolean>(true);
  timerEnabled = signal<boolean>(true);
  timerPaused = signal<boolean>(false);
  showProgress = signal<boolean>(true);
  showRemainingDigits = signal<boolean>(true);
  undoRedoEnabled = signal<boolean>(true);
  undoStack = signal<SudokuUndoSnapshot[]>([]);
  redoStack = signal<SudokuUndoSnapshot[]>([]);
  elapsedSeconds = signal<number>(0);
  elapsedLabel = computed(() => {
    const total = this.elapsedSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  canAccessSelectedLevel = computed(
    () => !this.journeyMode() || this.selectedLevel() <= this.unlockedLevel(),
  );

  filledCount = computed(() => this.playerBoard().filter((v) => v !== 0).length);
  progressPercent = computed(() => Math.round((this.filledCount() / 81) * 100));
  progressSummary = computed(() =>
    this.tr('STATUS_PROGRESS', { filled: this.filledCount(), percent: this.progressPercent() }),
  );
  mistakeSummary = computed(() => {
    const mistakes = this.mistakeCount();
    if (this.mistakeLimit() === '3') {
      return this.tr('STATUS_MISTAKES', { mistakes, limit: 3 });
    }
    return this.tr('STATUS_MISTAKES_UNLIMITED', { mistakes });
  });
  hasSavedSession = computed(() => this.canRestoreSession(this.sessionSnapshot()));
  recentHistory = computed(() => this.gameHistory().slice(0, this.fullHistoryOpen() ? 50 : 4));
  menuProgressSummary = computed(() => {
    const stats = this.aggregateStats();
    return this.tr('MENU_PROGRESS_SUMMARY', {
      unlocked: this.unlockedLevel(),
      completed: stats.totalCompleted,
      best: this.bestSuccessDurationLabel(),
    });
  });
  resumeSummary = computed(() => {
    const snapshot = this.sessionSnapshot();
    if (!this.canRestoreSession(snapshot)) {
      return '';
    }
    return this.tr('RESUME_SUMMARY', {
      level: snapshot.selectedLevel,
      time: this.formatDuration(snapshot.elapsedSeconds),
      moves: Math.max(0, Math.trunc(snapshot.moveCount ?? 0)),
    });
  });
  selectedLevelName = computed(() => {
    const level = this.levels.find((item) => item.level === this.selectedLevel()) ?? this.levels[0];
    return this.levelLabel(level);
  });
  seedLabel = computed(() => this.currentSeed() || this.tr('VALUE_UNKNOWN'));
  successRateLabel = computed(() => {
    const stats = this.aggregateStats();
    if (stats.totalStarted <= 0) {
      return '0.0%';
    }
    const success = stats.totalCompleted + stats.totalSolved;
    return `${((success / stats.totalStarted) * 100).toFixed(1)}%`;
  });
  averageSuccessDurationLabel = computed(() => {
    const stats = this.aggregateStats();
    const success = stats.totalCompleted + stats.totalSolved;
    if (success <= 0) {
      return this.tr('VALUE_NONE');
    }
    return this.formatDuration(Math.round(stats.totalSuccessfulSeconds / success));
  });

  bestSuccessDurationLabel(): string {
    const best = this.aggregateStats().bestSuccessfulSeconds;
    return best == null ? this.tr('VALUE_NONE') : this.formatDuration(best);
  }

  private timerId: number | null = null;

  constructor() {
    this.persistence.storage(this.selectedLevel, 'sudoku-pref-selected-level', {
      type: 'number',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.journeyMode, 'sudoku-pref-journey-mode', {
      type: 'boolean',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.unlockedLevel, 'sudoku-pref-unlocked-level', {
      type: 'number',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.notesMode, 'sudoku-pref-notes-mode', {
      type: 'boolean',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.sessionSnapshot, 'sudoku-session-v1', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.gameHistory, 'sudoku-history-v1', {
      type: 'object',
      strategy: 'idb',
    });
    this.persistence.storage(this.aggregateStats, 'sudoku-stats-v1', {
      type: 'object',
      strategy: 'hybrid',
    });

    effect(
      () => {
        const current = this.gameHistory();
        const normalized = normalizeHistoryEntries(current);
        if (!areHistoryEntriesEqual(current, normalized)) {
          this.gameHistory.set(normalized);
        }
      },
      { allowSignalWrites: true },
    );

    effect(
      () => {
        const current = this.aggregateStats();
        const normalized = normalizeAggregateStats(current);
        if (JSON.stringify(current) !== JSON.stringify(normalized)) {
          this.aggregateStats.set(normalized);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  tr(key: string, values: Record<string, string | number> = {}): string {
    const template = this.t.map()[key] ?? key;
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template,
    );
  }

  levelGroupLabel(groupName: string): string {
    return this.tr(`LEVEL_GROUP_${groupName.toUpperCase()}`);
  }

  levelLabel(level: { level: number; groupName: string; rank: string }): string {
    return this.tr('LEVEL_OPTION', {
      level: level.level,
      group: this.levelGroupLabel(level.groupName),
      rank: level.rank,
    });
  }

  boardCellLabel(index: number): string {
    const value = this.cellValue(index);
    return this.tr(value === 0 ? 'ARIA_CELL_EMPTY' : 'ARIA_CELL_VALUE', {
      row: Math.floor(index / 9) + 1,
      col: (index % 9) + 1,
      value,
    });
  }

  digitLabel(digit: number): string {
    return this.tr('ARIA_DIGIT', { digit });
  }

  onSelectedLevelChange(value: number) {
    const level = Math.trunc(Number(value));
    if (!Number.isFinite(level)) {
      return;
    }

    this.selectedLevel.set(Math.max(1, Math.min(20, level)));
    this.error.set('');
    this.gameMessage.set('');
  }

  onJourneyModeChange(value: boolean) {
    this.journeyMode.set(Boolean(value));
    this.error.set('');
    this.gameMessage.set('');
  }

  startNewGame() {
    this.recordSavedSnapshotAsAbandoned();

    const generated = this.generateLevelPuzzle(false);
    if (!generated) {
      return;
    }

    this.beginNewSession();
    this.screen.set('play');
    this.startTimer(true);
    this.error.set('');
    this.gameMessage.set('');
    this.saveSessionSnapshot();
  }

  startSampleGame() {
    this.recordSavedSnapshotAsAbandoned();

    this.setPuzzleFromString(SAMPLE_PUZZLE);
    this.currentSeed.set(this.tr('VALUE_SAMPLE'));
    this.gradeCurrentPuzzle(this.initialBoard());
    this.beginNewSession();
    this.generationInfo.set(this.tr('MESSAGE_SAMPLE_LOADED'));
    this.error.set('');
    this.gameMessage.set('');
    this.screen.set('play');
    this.startTimer(true);
    this.saveSessionSnapshot();
  }

  resumeSavedGame() {
    const snapshot = this.sessionSnapshot();
    if (!this.restoreSessionSnapshot(snapshot)) {
      this.error.set(this.tr('ERROR_NO_SAVED_SESSION'));
      this.sessionSnapshot.set(null);
      return;
    }

    this.error.set('');
    this.gameMessage.set(this.tr('MESSAGE_RESUMED'));
    this.screen.set('play');
    this.startTimer(false);
  }

  openTestMode() {
    if (!this.isDev) {
      return;
    }
    this.stopTimer();
    this.screen.set('diagnostics');
    this.error.set('');
    this.gameMessage.set('');
  }

  openDataPanel(panel: 'history' | 'migration' = 'history') {
    this.stopTimer();
    this.dataPanel.set(panel);
    this.screen.set('data');
    this.error.set('');
    this.gameMessage.set('');
  }

  prepareExportJson() {
    const payload: SudokuExportPayloadV2 = {
      format: 'synedex-sudoku-export',
      version: 2,
      exportedAt: Date.now(),
      preferences: {
        selectedLevel: this.selectedLevel(),
        journeyMode: this.journeyMode(),
        unlockedLevel: this.unlockedLevel(),
        notesMode: this.notesMode(),
      },
      session: this.buildSessionSnapshot(),
      history: this.gameHistory(),
      stats: this.aggregateStats(),
    };

    this.exportJson.set(JSON.stringify(payload, null, 2));
  }

  downloadExportFile() {
    if (!this.exportJson()) {
      this.prepareExportJson();
    }

    const json = this.exportJson();
    if (!json) {
      this.error.set(this.tr('ERROR_EXPORT_FAILED'));
      return;
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `synedex-sudoku-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.gameMessage.set(this.tr('MESSAGE_EXPORT_DOWNLOADED'));
    this.error.set('');
  }

  clearExportJson() {
    this.exportJson.set('');
  }

  clearImportJson() {
    this.importJson.set('');
  }

  importFromJsonText() {
    const raw = this.importJson().trim();
    if (!raw) {
      this.error.set(this.tr('ERROR_IMPORT_EMPTY'));
      this.gameMessage.set('');
      return;
    }

    this.importFromRawJson(raw);
  }

  async onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      this.importJson.set(raw);
      this.importFromRawJson(raw);
    } catch {
      this.error.set(this.tr('ERROR_IMPORT_FILE_READ'));
      this.gameMessage.set('');
    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  clearHistoryAndStats() {
    this.requestConfirm({
      title: this.tr('CONFIRM_TITLE'),
      message: this.tr('CONFIRM_CLEAR_HISTORY'),
      confirmLabel: this.tr('ACTION_CLEAR_HISTORY'),
      danger: true,
      onConfirm: () => {
        this.gameHistory.set([]);
        this.aggregateStats.set(createEmptyAggregateStats());
        this.gameMessage.set(this.tr('MESSAGE_HISTORY_CLEARED'));
        this.error.set('');
      },
    });
  }

  requestConfirm(payload: {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  }) {
    this.pendingConfirm.set({
      title: payload.title,
      message: payload.message,
      confirmLabel: payload.confirmLabel,
      danger: !!payload.danger,
      onConfirm: payload.onConfirm,
    });
  }

  acceptConfirm() {
    const pending = this.pendingConfirm();
    this.pendingConfirm.set(null);
    pending?.onConfirm();
  }

  cancelConfirm() {
    this.pendingConfirm.set(null);
  }

  openMenuSettings() {
    this.menuSettingsOpen.set(true);
  }

  closeMenuSettings() {
    this.menuSettingsOpen.set(false);
  }

  setMode(mode: 'quick' | 'journey') {
    this.onJourneyModeChange(mode === 'journey');
  }

  openExportChoice() {
    this.menuSettingsOpen.set(false);
    this.exportChoiceOpen.set(true);
  }

  openImportChoice() {
    this.menuSettingsOpen.set(false);
    this.importChoiceOpen.set(true);
  }

  exportAsText() {
    this.exportChoiceOpen.set(false);
    this.prepareExportJson();
    this.copyFeedback.set(false);
    this.exportTextOpen.set(true);
  }

  exportAsFile() {
    this.exportChoiceOpen.set(false);
    this.downloadExportFile();
  }

  importAsText() {
    this.importChoiceOpen.set(false);
    this.importTextOpen.set(true);
  }

  importAsFile() {
    this.importChoiceOpen.set(false);
    this.triggerImportFilePicker();
  }

  private triggerImportFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', (event) => {
      this.onImportFileChange(event);
    });
    input.click();
  }

  submitImportText() {
    this.importFromJsonText();
    if (!this.error()) {
      this.importTextOpen.set(false);
    }
  }

  async copyExportToClipboard() {
    const text = this.exportJson();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copyFeedback.set(true);
      window.setTimeout(() => this.copyFeedback.set(false), 1500);
    } catch {
      // ignore; user can manually copy
    }
  }

  openFullHistory() {
    this.openDataPanel('history');
  }

  backToMenu() {
    this.stopTimer();
    this.screen.set('menu');
    this.error.set('');
    this.gameMessage.set('');
  }

  isSelected(index: number): boolean {
    return this.selectedIndex() === index;
  }

  isGiven(index: number): boolean {
    return this.givenMask()[index] ?? false;
  }

  cellValue(index: number): number {
    return this.playerBoard()[index] ?? 0;
  }

  isRightBoxEdge(index: number): boolean {
    const col = index % 9;
    return col === 2 || col === 5;
  }

  isBottomBoxEdge(index: number): boolean {
    const row = Math.floor(index / 9);
    return row === 2 || row === 5;
  }

  isRelatedToSelected(index: number): boolean {
    const selected = this.selectedIndex();
    if (index === selected) {
      return false;
    }

    const rowA = Math.floor(index / 9);
    const colA = index % 9;
    const rowB = Math.floor(selected / 9);
    const colB = selected % 9;

    if (rowA === rowB || colA === colB) {
      return true;
    }

    const boxA = Math.floor(rowA / 3) * 3 + Math.floor(colA / 3);
    const boxB = Math.floor(rowB / 3) * 3 + Math.floor(colB / 3);
    return boxA === boxB;
  }

  isConflict(index: number): boolean {
    const board = this.playerBoard();
    const value = board[index];
    if (value === 0) {
      return false;
    }

    const copy = [...board] as SudokuBoard;
    copy[index] = 0;
    return !isPlacementValid(copy, index, value);
  }

  hasNote(index: number, digit: number): boolean {
    return this.notes()[index]?.has(digit) ?? false;
  }

  selectCell(index: number) {
    this.selectedIndex.set(index);
    this.error.set('');
    this.gameMessage.set('');
    if (this.inputMode() === 'number' && this.selectedDigit() !== null) {
      this.applyDigit(this.selectedDigit()!);
    }
    this.saveSessionSnapshot();
  }

  chooseDigit(digit: number) {
    if (this.inputMode() === 'number') {
      this.selectedDigit.set(digit);
      return;
    }
    this.applyDigit(digit);
  }

  applyDigit(digit: number) {
    const index = this.selectedIndex();
    if (this.isGiven(index)) {
      return;
    }

    if (this.notesMode()) {
      const board = this.playerBoard();
      if (board[index] !== 0) {
        return;
      }

      this.pushUndoSnapshot();
      const notes = [...this.notes()];
      const next = new Set(notes[index]);
      if (next.has(digit)) {
        next.delete(digit);
      } else {
        next.add(digit);
      }
      notes[index] = next;
      this.notes.set(notes);
      this.saveSessionSnapshot();
      return;
    }

    const board = [...this.playerBoard()] as SudokuBoard;
    const previousValue = board[index];
    if (previousValue === digit) {
      return;
    }

    this.pushUndoSnapshot();
    board[index] = digit as SudokuValue;
    this.playerBoard.set(board);

    this.moveCount.update((value) => value + 1);

    if (this.clearNotesOnEntry()) {
      const notes = [...this.notes()];
      notes[index] = new Set<number>();
      this.notes.set(notes);
    }

    this.error.set('');
    this.gameMessage.set('');
    this.afterPlayerEntry(index);
    this.saveSessionSnapshot();
    this.maybeMarkCompletion();
  }

  clearSelectedCell() {
    const index = this.selectedIndex();
    if (this.isGiven(index)) {
      return;
    }

    const board = [...this.playerBoard()] as SudokuBoard;
    const hadValue = board[index] !== 0;
    if (!hadValue && !(this.notes()[index]?.size ?? 0)) {
      return;
    }

    this.pushUndoSnapshot();
    board[index] = 0;
    this.playerBoard.set(board);

    if (hadValue) {
      this.moveCount.update((value) => value + 1);
    }

    const notes = [...this.notes()];
    notes[index] = new Set<number>();
    this.notes.set(notes);

    this.error.set('');
    this.gameMessage.set('');
    this.saveSessionSnapshot();
  }

  resetBoard() {
    this.playerBoard.set([...this.initialBoard()] as SudokuBoard);
    this.notes.set(createEmptyNotes());
    this.mistakeCount.set(0);
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.error.set('');
    this.gameMessage.set(this.tr('MESSAGE_BOARD_RESET'));
    this.startTimer(true);
    this.saveSessionSnapshot();
  }

  checkBoard() {
    if (!this.allowCheckBoard()) {
      this.error.set(this.tr('ERROR_CHECK_DISABLED'));
      this.gameMessage.set('');
      return;
    }

    const board = this.playerBoard();
    if (!isBoardValid(board)) {
      this.error.set(this.tr('ERROR_BOARD_CONFLICTS'));
      this.gameMessage.set('');
      return;
    }

    if (board.some((v) => v === 0)) {
      this.gameMessage.set(this.tr('MESSAGE_NO_CONFLICTS'));
      this.error.set('');
      return;
    }

    this.stopTimer();
    this.gameMessage.set(this.tr('MESSAGE_PUZZLE_COMPLETE', { time: this.elapsedLabel() }));
    this.error.set('');
    this.promoteJourneyProgress();
    this.recordCurrentSessionOutcome('completed');
  }

  generateLevelPuzzleAndRestartTimer() {
    this.recordCurrentSessionOutcome('abandoned');

    const generated = this.generateLevelPuzzle(true);
    if (generated) {
      this.beginNewSession();
      this.mistakeCount.set(0);
      this.undoStack.set([]);
      this.redoStack.set([]);
      this.startTimer(true);
      this.gameMessage.set('');
      this.error.set('');
      this.saveSessionSnapshot();
    }
  }

  solvePuzzle() {
    const result = run({ puzzle: boardToString(this.playerBoard()) });
    if (!result.ok || !result.solvedPuzzle) {
      this.error.set(result.error ?? this.tr('ERROR_SOLVE_FAILED'));
      this.gameMessage.set('');
      return;
    }

    const solved = parseSudoku(result.solvedPuzzle);
    if (!solved) {
      this.error.set(this.tr('ERROR_SOLVER_INVALID'));
      return;
    }

    this.pushUndoSnapshot();
    this.playerBoard.set(solved);
    this.notes.set(createEmptyNotes());
    this.stopTimer();
    this.error.set('');
    this.gameMessage.set(this.tr('MESSAGE_PUZZLE_SOLVED', { time: this.elapsedLabel() }));
    this.promoteJourneyProgress();
    this.recordCurrentSessionOutcome('solved');
  }

  gradePuzzle() {
    if (!isBoardValid(this.playerBoard())) {
      this.error.set(this.tr('ERROR_GRADE_INVALID'));
      this.grade.set(null);
      return;
    }

    this.error.set('');
    this.gameMessage.set(this.tr('MESSAGE_BOARD_GRADED'));
    this.gradeCurrentPuzzle(this.playerBoard());
  }

  runTests() {
    if (!this.isDev) {
      return;
    }
    void import('./sudoku.tests').then((m) => this.testReport.set(m.runSudokuSelfTests()));
  }

  toggleNotesMode() {
    this.notesMode.update((value) => !value);
  }

  undoMove() {
    if (!this.undoRedoEnabled()) {
      return;
    }
    const stack = this.undoStack();
    const previous = stack.at(-1);
    if (!previous) {
      return;
    }
    this.redoStack.update((items) => [...items, this.createUndoSnapshot()]);
    this.undoStack.set(stack.slice(0, -1));
    this.restoreUndoSnapshot(previous);
  }

  redoMove() {
    if (!this.undoRedoEnabled()) {
      return;
    }
    const stack = this.redoStack();
    const next = stack.at(-1);
    if (!next) {
      return;
    }
    this.undoStack.update((items) => [...items, this.createUndoSnapshot()].slice(-100));
    this.redoStack.set(stack.slice(0, -1));
    this.restoreUndoSnapshot(next);
  }

  useHint() {
    const target =
      this.cellValue(this.selectedIndex()) === 0 ? this.selectedIndex() : this.nextEmptyIndex();
    if (target < 0) {
      this.gameMessage.set(this.tr('MESSAGE_NO_HINT_NEEDED'));
      this.error.set('');
      return;
    }

    const result = run({ puzzle: boardToString(this.playerBoard()) });
    if (!result.ok || !result.solvedPuzzle) {
      this.error.set(this.tr('ERROR_SOLVE_FAILED'));
      this.gameMessage.set('');
      return;
    }

    const digit = Number(result.solvedPuzzle[target]);
    this.selectedIndex.set(target);
    if (this.hintBehavior() === 'explain') {
      this.gameMessage.set(
        this.tr('MESSAGE_HINT_EXPLAIN', {
          row: Math.floor(target / 9) + 1,
          col: (target % 9) + 1,
          digit,
        }),
      );
      this.error.set('');
      return;
    }

    this.pushUndoSnapshot();
    const board = [...this.playerBoard()] as SudokuBoard;
    board[target] = digit as SudokuValue;
    this.playerBoard.set(board);
    this.gameMessage.set(this.tr('MESSAGE_HINT_REVEALED'));
    this.error.set('');
    this.afterPlayerEntry(target);
    this.saveSessionSnapshot();
    this.maybeMarkCompletion();
  }

  onAutoNotesChange(value: SudokuAutoNotes) {
    this.autoNotes.set(value);
    if (value !== 'off') {
      this.refreshAutoNotes();
    }
  }

  onTimerEnabledChange(value: boolean) {
    this.timerEnabled.set(Boolean(value));
    if (this.timerEnabled()) {
      this.startTimer(false);
    } else {
      this.stopTimer();
    }
  }

  exportPuzzle() {
    const payload = {
      puzzle: boardToString(this.initialBoard()),
      current: boardToString(this.playerBoard()),
      seed: this.seedLabel(),
      level: this.selectedLevelName(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `synedex-sudoku-puzzle-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.gameMessage.set(this.tr('MESSAGE_PUZZLE_EXPORTED'));
  }

  remainingCount(digit: number): number {
    return 9 - this.playerBoard().filter((value) => value === digit).length;
  }

  isSameAsSelected(index: number): boolean {
    const selectedValue = this.cellValue(this.selectedIndex());
    return (
      selectedValue !== 0 &&
      index !== this.selectedIndex() &&
      this.cellValue(index) === selectedValue
    );
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.screen() !== 'play' || !this.keyboardShortcuts()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return;
    }

    if (event.key >= '1' && event.key <= '9') {
      this.chooseDigit(Number(event.key));
      event.preventDefault();
      return;
    }

    if (event.key.toLowerCase() === 'n') {
      this.toggleNotesMode();
      event.preventDefault();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      this.undoMove();
      event.preventDefault();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      this.redoMove();
      event.preventDefault();
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      this.clearSelectedCell();
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowUp') {
      this.moveSelection(-1, 0);
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown') {
      this.moveSelection(1, 0);
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowLeft') {
      this.moveSelection(0, -1);
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowRight') {
      this.moveSelection(0, 1);
      event.preventDefault();
      return;
    }
  }

  toggleTimerPaused() {
    if (!this.timerEnabled()) {
      return;
    }
    if (this.timerPaused()) {
      this.timerPaused.set(false);
      this.startTimer(false);
    } else {
      this.timerPaused.set(true);
      this.stopTimer();
    }
  }

  resetTimer() {
    if (!this.timerEnabled()) {
      return;
    }
    this.elapsedSeconds.set(0);
    if (!this.timerPaused()) {
      this.startTimer(false);
    }
  }

  private startTimer(reset = false) {
    if (reset) {
      this.elapsedSeconds.set(0);
      this.timerPaused.set(false);
    }

    this.stopTimer();
    if (!this.timerEnabled() || this.timerPaused()) {
      return;
    }
    this.timerId = window.setInterval(() => {
      this.elapsedSeconds.update((value) => {
        const next = value + 1;
        if (next % 5 === 0) {
          this.saveSessionSnapshot();
        }
        return next;
      });
    }, 1000);
  }

  private stopTimer() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private moveSelection(rowDelta: number, colDelta: number) {
    const current = this.selectedIndex();
    const row = Math.floor(current / 9);
    const col = current % 9;
    const nextRow = Math.max(0, Math.min(8, row + rowDelta));
    const nextCol = Math.max(0, Math.min(8, col + colDelta));
    this.selectedIndex.set(nextRow * 9 + nextCol);
  }

  private advanceSelection() {
    const board = this.playerBoard();
    for (let step = 1; step <= 81; step += 1) {
      const next = (this.selectedIndex() + step) % 81;
      if (board[next] === 0 && !this.isGiven(next)) {
        this.selectedIndex.set(next);
        return;
      }
    }
  }

  private createUndoSnapshot(): SudokuUndoSnapshot {
    return {
      board: [...this.playerBoard()] as SudokuBoard,
      notes: encodeNotes(this.notes()),
      selectedIndex: this.selectedIndex(),
      moveCount: this.moveCount(),
    };
  }

  private pushUndoSnapshot() {
    if (!this.undoRedoEnabled()) {
      return;
    }
    this.undoStack.update((items) => [...items, this.createUndoSnapshot()].slice(-100));
    this.redoStack.set([]);
  }

  private restoreUndoSnapshot(snapshot: SudokuUndoSnapshot) {
    this.playerBoard.set([...snapshot.board] as SudokuBoard);
    this.notes.set(decodeNotes(snapshot.notes));
    this.selectedIndex.set(snapshot.selectedIndex);
    this.moveCount.set(snapshot.moveCount);
    this.error.set('');
    this.gameMessage.set('');
    this.saveSessionSnapshot();
  }

  private afterPlayerEntry(index: number) {
    if (this.autoNotes() === 'update') {
      this.refreshAutoNotes();
    }
    if (this.mistakeChecking() === 'immediate') {
      this.registerMistakeIfNeeded(index);
    }
    if (this.autoAdvance()) {
      this.advanceSelection();
    }
  }

  private registerMistakeIfNeeded(index: number) {
    if (!this.isConflict(index)) {
      return;
    }
    this.mistakeCount.update((value) => value + 1);
    const limit = this.mistakeLimit() === '3' ? 3 : Number.POSITIVE_INFINITY;
    this.error.set(
      this.mistakeCount() >= limit
        ? this.tr('ERROR_MISTAKE_LIMIT')
        : this.tr('ERROR_BOARD_CONFLICTS'),
    );
  }

  private nextEmptyIndex(): number {
    return this.playerBoard().findIndex((value, index) => value === 0 && !this.isGiven(index));
  }

  private refreshAutoNotes() {
    const board = this.playerBoard();
    const notes = createEmptyNotes();
    for (let index = 0; index < 81; index += 1) {
      if (board[index] === 0) {
        notes[index] = new Set(getCandidates(board, index));
      }
    }
    this.notes.set(notes);
  }

  private gradeCurrentPuzzle(board: SudokuBoard) {
    this.grade.set(gradeSudoku(board));
  }

  private setPuzzleFromString(puzzle: string) {
    const parsed = parseSudoku(puzzle);
    if (!parsed) {
      this.error.set(this.tr('ERROR_LOAD_PUZZLE'));
      return;
    }

    const givens = parsed.map((value) => value !== 0);
    this.initialBoard.set([...parsed] as SudokuBoard);
    this.playerBoard.set([...parsed] as SudokuBoard);
    this.givenMask.set(givens);
    this.notes.set(createEmptyNotes());
    if (this.autoNotes() !== 'off') {
      this.refreshAutoNotes();
    }

    const firstEmpty = parsed.findIndex((v) => v === 0);
    this.selectedIndex.set(firstEmpty >= 0 ? firstEmpty : 0);
    this.saveSessionSnapshot();
  }

  private maybeMarkCompletion() {
    const board = this.playerBoard();
    if (board.some((value) => value === 0)) {
      return;
    }

    if (!isBoardValid(board)) {
      this.error.set(this.tr('ERROR_COMPLETE_CONFLICTS'));
      return;
    }

    this.stopTimer();
    this.gameMessage.set(this.tr('MESSAGE_PUZZLE_COMPLETE', { time: this.elapsedLabel() }));
    this.promoteJourneyProgress();
    this.recordCurrentSessionOutcome('completed');
  }

  private promoteJourneyProgress() {
    if (!this.journeyMode()) {
      return;
    }

    const selected = this.selectedLevel();
    const unlocked = this.unlockedLevel();
    if (selected >= unlocked) {
      this.unlockedLevel.set(Math.min(20, selected + 1));
    }
  }

  private generateLevelPuzzle(updateGrade: boolean): boolean {
    if (!this.canAccessSelectedLevel()) {
      this.error.set(this.tr('ERROR_LEVEL_LOCKED'));
      return false;
    }

    try {
      const generated = generateSudokuForLevel(this.selectedLevel(), { maxAttempts: 10 });
      this.setPuzzleFromString(generated.puzzleString);
      this.currentSeed.set(String(generated.seed));
      if (updateGrade) {
        this.grade.set(generated.grade);
      }
      this.error.set('');
      this.generationInfo.set(
        this.tr('MESSAGE_GENERATED', {
          level: generated.level.level,
          group: this.levelGroupLabel(generated.level.groupName),
          rank: generated.level.rank,
          clues: generated.grade.clueCount,
          score: generated.grade.score,
          seed: generated.seed,
        }),
      );
      this.saveSessionSnapshot();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : this.tr('ERROR_GENERATE_FAILED');
      this.error.set(message);
      return false;
    }
  }

  private buildSessionSnapshot(): SudokuSessionSnapshotV1 | null {
    const initial = boardToString(this.initialBoard());
    const player = boardToString(this.playerBoard());
    if (!isBoardString(initial) || /^0+$/.test(initial) || !isBoardString(player)) {
      return null;
    }

    return {
      version: 1,
      savedAt: Date.now(),
      sessionId: this.activeSessionId() || undefined,
      startedAt: this.activeStartedAt() > 0 ? this.activeStartedAt() : undefined,
      moveCount: Math.max(0, Math.trunc(this.moveCount())),
      selectedLevel: this.selectedLevel(),
      journeyMode: this.journeyMode(),
      unlockedLevel: this.unlockedLevel(),
      initialBoard: initial,
      playerBoard: player,
      notes: encodeNotes(this.notes()),
      selectedIndex: Math.max(0, Math.min(80, this.selectedIndex())),
      elapsedSeconds: Math.max(0, Math.trunc(this.elapsedSeconds())),
      grade: this.grade(),
    };
  }

  private saveSessionSnapshot() {
    this.sessionSnapshot.set(this.buildSessionSnapshot());
  }

  private importFromRawJson(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.error.set(this.tr('ERROR_INVALID_JSON'));
      this.gameMessage.set('');
      return;
    }

    const normalized = this.normalizeImportPayload(parsed);
    if (!normalized) {
      this.error.set(this.tr('ERROR_IMPORT_UNSUPPORTED'));
      this.gameMessage.set('');
      return;
    }

    this.stopTimer();
    this.selectedLevel.set(normalized.preferences.selectedLevel);
    this.journeyMode.set(normalized.preferences.journeyMode);
    this.unlockedLevel.set(normalized.preferences.unlockedLevel);
    this.notesMode.set(normalized.preferences.notesMode);

    this.gameHistory.set(normalized.history);
    this.aggregateStats.set(normalized.stats);
    this.sessionSnapshot.set(normalized.session);
    this.activeSessionId.set('');
    this.activeStartedAt.set(0);
    this.moveCount.set(0);
    this.screen.set('menu');

    if (normalized.session) {
      this.gameMessage.set(this.tr('MESSAGE_IMPORT_SESSION'));
    } else {
      this.gameMessage.set(this.tr('MESSAGE_IMPORT_DATA'));
    }
    this.error.set('');
  }

  private normalizeImportPayload(value: unknown): NormalizedSudokuImportPayload | null {
    if (!isRecord(value)) {
      return null;
    }
    if (value.format !== 'synedex-sudoku-export') {
      return null;
    }

    const version = Number(value.version);
    const prefs = isRecord(value.preferences) ? value.preferences : null;
    if (!prefs) {
      return null;
    }

    const normalizedPreferences = {
      selectedLevel: clampInt(Number(prefs.selectedLevel ?? 1), 1, 20),
      journeyMode: Boolean(prefs.journeyMode),
      unlockedLevel: clampInt(Number(prefs.unlockedLevel ?? 1), 1, 20),
      notesMode: Boolean(prefs.notesMode),
    };

    if (version === 1) {
      const legacy = value as unknown as SudokuExportPayloadV1Legacy;
      return {
        preferences: normalizedPreferences,
        session: normalizeSessionSnapshot(legacy.session),
        history: [],
        stats: createEmptyAggregateStats(),
      };
    }

    if (version !== 2) {
      return null;
    }

    const next = value as unknown as SudokuExportPayloadV2;
    return {
      preferences: normalizedPreferences,
      session: normalizeSessionSnapshot(next.session),
      history: normalizeHistoryEntries(next.history),
      stats: normalizeAggregateStats(next.stats),
    };
  }

  private canRestoreSession(
    snapshot: SudokuSessionSnapshotV1 | null,
  ): snapshot is SudokuSessionSnapshotV1 {
    return (
      !!snapshot &&
      snapshot.version === 1 &&
      isBoardString(snapshot.initialBoard) &&
      isBoardString(snapshot.playerBoard) &&
      !/^0+$/.test(snapshot.initialBoard)
    );
  }

  private restoreSessionSnapshot(snapshot: SudokuSessionSnapshotV1 | null): boolean {
    if (!this.canRestoreSession(snapshot)) {
      return false;
    }

    const initial = parseSudoku(snapshot.initialBoard);
    const player = parseSudoku(snapshot.playerBoard);
    if (!initial || !player) {
      return false;
    }

    this.selectedLevel.set(Math.max(1, Math.min(20, Math.trunc(snapshot.selectedLevel))));
    this.journeyMode.set(Boolean(snapshot.journeyMode));
    this.unlockedLevel.set(Math.max(1, Math.min(20, Math.trunc(snapshot.unlockedLevel))));

    this.initialBoard.set(initial);
    this.playerBoard.set(player);
    this.givenMask.set(initial.map((value) => value !== 0));
    this.notes.set(decodeNotes(snapshot.notes));
    this.selectedIndex.set(Math.max(0, Math.min(80, Math.trunc(snapshot.selectedIndex))));
    this.elapsedSeconds.set(Math.max(0, Math.trunc(snapshot.elapsedSeconds)));
    this.grade.set(snapshot.grade ?? gradeSudoku(initial));
    this.activeSessionId.set(snapshot.sessionId || createSessionId());
    this.activeStartedAt.set(
      snapshot.startedAt && snapshot.startedAt > 0
        ? Math.trunc(snapshot.startedAt)
        : Date.now() - Math.max(0, Math.trunc(snapshot.elapsedSeconds)) * 1000,
    );
    this.moveCount.set(Math.max(0, Math.trunc(snapshot.moveCount ?? 0)));

    this.saveSessionSnapshot();
    return true;
  }

  private beginNewSession() {
    this.activeSessionId.set(createSessionId());
    this.activeStartedAt.set(Date.now());
    this.moveCount.set(0);
    this.mistakeCount.set(0);
    this.selectedDigit.set(null);
    this.undoStack.set([]);
    this.redoStack.set([]);

    const level = clampInt(this.selectedLevel(), 1, 20);
    this.aggregateStats.update((current) => {
      const next = normalizeAggregateStats(current);
      next.totalStarted += 1;
      next.lastPlayedAt = Date.now();

      const key = String(level);
      const levelStats = normalizeLevelStats(next.byLevel[key] ?? createEmptyLevelStats());
      levelStats.started += 1;
      next.byLevel[key] = levelStats;
      return next;
    });
  }

  private recordSavedSnapshotAsAbandoned() {
    const snapshot = this.sessionSnapshot();
    if (!this.canRestoreSession(snapshot)) {
      return;
    }

    const initial = parseSudoku(snapshot.initialBoard);
    if (!initial) {
      this.sessionSnapshot.set(null);
      return;
    }

    const puzzleGrade = gradeSudoku(initial);
    const endedAt = Date.now();
    const startedAt =
      snapshot.startedAt && snapshot.startedAt > 0
        ? Math.trunc(snapshot.startedAt)
        : endedAt - Math.max(0, Math.trunc(snapshot.elapsedSeconds)) * 1000;
    const durationSeconds =
      snapshot.elapsedSeconds && snapshot.elapsedSeconds > 0
        ? Math.trunc(snapshot.elapsedSeconds)
        : Math.max(0, Math.round((endedAt - startedAt) / 1000));

    const entry: SudokuHistoryEntryV1 = {
      id: `${snapshot.sessionId || createSessionId()}-${endedAt}`,
      version: 1,
      sessionId: snapshot.sessionId || createSessionId(),
      outcome: 'abandoned',
      startedAt,
      endedAt,
      durationSeconds,
      selectedLevel: clampInt(snapshot.selectedLevel, 1, 20),
      journeyMode: Boolean(snapshot.journeyMode),
      moveCount: Math.max(0, Math.trunc(snapshot.moveCount ?? 0)),
      clueCount: puzzleGrade.clueCount,
      score: puzzleGrade.score,
      levelNumber: puzzleGrade.levelNumber,
      levelName: puzzleGrade.levelName,
      levelRank: puzzleGrade.levelRank,
      hardestTechnique: puzzleGrade.hardestTechnique,
    };

    this.pushHistoryEntry(entry);
    this.sessionSnapshot.set(null);
    this.activeSessionId.set('');
    this.activeStartedAt.set(0);
    this.moveCount.set(0);
  }

  private recordCurrentSessionOutcome(outcome: SudokuGameOutcome) {
    const hasActiveSession =
      Boolean(this.activeSessionId()) || this.canRestoreSession(this.sessionSnapshot());
    if (!hasActiveSession) {
      return;
    }

    const initial = this.initialBoard();
    const initialAsString = boardToString(initial);
    if (!isBoardString(initialAsString) || /^0+$/.test(initialAsString)) {
      return;
    }

    const puzzleGrade = gradeSudoku(initial);
    const now = Date.now();
    const startedAt =
      this.activeStartedAt() > 0
        ? this.activeStartedAt()
        : now - Math.max(0, Math.trunc(this.elapsedSeconds())) * 1000;
    const durationSeconds = Math.max(
      Math.trunc(this.elapsedSeconds()),
      Math.max(0, Math.round((now - startedAt) / 1000)),
    );

    const sessionId = this.activeSessionId() || createSessionId();
    const entry: SudokuHistoryEntryV1 = {
      id: `${sessionId}-${now}`,
      version: 1,
      sessionId,
      outcome,
      startedAt,
      endedAt: now,
      durationSeconds,
      selectedLevel: clampInt(this.selectedLevel(), 1, 20),
      journeyMode: this.journeyMode(),
      moveCount: Math.max(0, Math.trunc(this.moveCount())),
      clueCount: puzzleGrade.clueCount,
      score: puzzleGrade.score,
      levelNumber: puzzleGrade.levelNumber,
      levelName: puzzleGrade.levelName,
      levelRank: puzzleGrade.levelRank,
      hardestTechnique: puzzleGrade.hardestTechnique,
    };

    this.pushHistoryEntry(entry);
    this.sessionSnapshot.set(null);
    this.activeSessionId.set('');
    this.activeStartedAt.set(0);
    this.moveCount.set(0);
  }

  private pushHistoryEntry(entry: SudokuHistoryEntryV1) {
    this.gameHistory.update((current) => normalizeHistoryEntries([entry, ...current]));
    this.applyStatsForHistoryEntry(entry);
  }

  private applyStatsForHistoryEntry(entry: SudokuHistoryEntryV1) {
    this.aggregateStats.update((current) => {
      const next = normalizeAggregateStats(current);
      const levelKey = String(clampInt(entry.levelNumber, 1, 20));
      const levelStats = normalizeLevelStats(next.byLevel[levelKey] ?? createEmptyLevelStats());

      next.totalMoves += entry.moveCount;
      next.lastOutcomeAt = entry.endedAt;

      if (entry.outcome === 'completed') {
        next.totalCompleted += 1;
        next.totalSuccessfulSeconds += entry.durationSeconds;
        next.bestSuccessfulSeconds =
          next.bestSuccessfulSeconds == null
            ? entry.durationSeconds
            : Math.min(next.bestSuccessfulSeconds, entry.durationSeconds);

        levelStats.completed += 1;
        levelStats.totalSuccessfulSeconds += entry.durationSeconds;
        levelStats.bestSuccessfulSeconds =
          levelStats.bestSuccessfulSeconds == null
            ? entry.durationSeconds
            : Math.min(levelStats.bestSuccessfulSeconds, entry.durationSeconds);
      } else if (entry.outcome === 'solved') {
        next.totalSolved += 1;
        next.totalSuccessfulSeconds += entry.durationSeconds;
        next.bestSuccessfulSeconds =
          next.bestSuccessfulSeconds == null
            ? entry.durationSeconds
            : Math.min(next.bestSuccessfulSeconds, entry.durationSeconds);

        levelStats.solved += 1;
        levelStats.totalSuccessfulSeconds += entry.durationSeconds;
        levelStats.bestSuccessfulSeconds =
          levelStats.bestSuccessfulSeconds == null
            ? entry.durationSeconds
            : Math.min(levelStats.bestSuccessfulSeconds, entry.durationSeconds);
      } else {
        next.totalAbandoned += 1;
        levelStats.abandoned += 1;
      }

      next.byLevel[levelKey] = levelStats;
      return next;
    });
  }

  outcomeLabel(outcome: SudokuGameOutcome): string {
    if (outcome === 'completed') {
      return this.tr('OUTCOME_COMPLETED');
    }
    if (outcome === 'solved') {
      return this.tr('OUTCOME_SOLVED');
    }
    return this.tr('OUTCOME_ABANDONED');
  }

  formatDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.trunc(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  formatTimestamp(timestamp: number): string {
    if (!timestamp) {
      return this.tr('VALUE_UNKNOWN');
    }
    return new Date(timestamp).toLocaleString();
  }
}
