import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { I18nService } from '../../services/i18n.service';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';
import {
  MentalMathFontSize,
  MentalMathDifficulty,
  MentalMathMistakeHandling,
  MentalMathMode,
  MentalMathOperation,
  OperationSettings,
  OperandRange,
  MentalMathQuestion,
  MentalMathSettings,
  calculateChallengePoints,
  createDefaultMentalMathSettings,
  createMentalMathQuestion,
  isCorrectMentalMathAnswer,
} from './mental-math.kernel';

type Screen = 'start' | 'playing' | 'end';
type Feedback = 'correct' | 'wrong' | null;
type SettingsSection = 'mode' | 'operations' | 'scoring';
type RangeBound = 'min' | 'max';

interface OperationView {
  id: MentalMathOperation;
  labelKey: string;
  symbol: string;
}

interface RoundResult {
  score: number;
  correct: number;
  wrong: number;
  avgSpeedMs: number;
  strikes: number;
}

interface DifficultyPreset {
  id: MentalMathDifficulty;
  labelKey: string;
  settings: Partial<MentalMathSettings>;
}

const STORAGE_KEY = 'synedex-mental-math-settings-v1';
const SYNEDEX_ORIGIN = 'https://synedex.org';

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPrecision(value: number): number {
  return Math.floor(clampNumber(value, 1, 12));
}

function normalizeDifficultyLevel(value: unknown): MentalMathDifficulty {
  return value === 'initiate' ||
    value === 'apprentice' ||
    value === 'adept' ||
    value === 'expert' ||
    value === 'master' ||
    value === 'custom'
    ? value
    : 'adept';
}

function sanitizeNumericAnswer(value: string): string {
  let sanitized = '';
  let hasDecimal = false;

  for (const character of value.replace(/,/g, '.')) {
    if (/\d/.test(character)) {
      sanitized += character;
    } else if (character === '-' && sanitized.length === 0) {
      sanitized = '-';
    } else if (character === '.' && !hasDecimal) {
      sanitized += character;
      hasDecimal = true;
    }
  }

  return sanitized;
}

function normalizeOperationSettings(defaults: OperationSettings, raw: unknown): OperationSettings {
  if (!raw || typeof raw !== 'object') {
    return { enabled: defaults.enabled, range: { ...defaults.range } };
  }

  const value = raw as Partial<OperationSettings> & {
    left?: Partial<OperandRange>;
    right?: Partial<OperandRange>;
  };
  const legacyRanges = [value.left, value.right].filter(Boolean) as Partial<OperandRange>[];
  const range =
    value.range ??
    (legacyRanges.length > 0
      ? {
          min: Math.min(...legacyRanges.map((item) => Number(item.min ?? defaults.range.min))),
          max: Math.max(...legacyRanges.map((item) => Number(item.max ?? defaults.range.max))),
        }
      : defaults.range);

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
    range: {
      min: Number.isFinite(Number(range.min)) ? Number(range.min) : defaults.range.min,
      max: Number.isFinite(Number(range.max)) ? Number(range.max) : defaults.range.max,
    },
  };
}

function normalizeSettings(raw: unknown): MentalMathSettings | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const defaults = createDefaultMentalMathSettings();
  const value = raw as Partial<MentalMathSettings>;
  const operations = value.operations ?? defaults.operations;

  return {
    ...defaults,
    ...value,
    mode: value.mode === 'challenge' ? 'challenge' : 'rush',
    rushTotalSeconds: clampNumber(Number(value.rushTotalSeconds), 10, 600),
    challengeQuestionCount: clampNumber(Number(value.challengeQuestionCount), 1, 100),
    challengeSecondsPerQuestion:
      value.challengeSecondsPerQuestion === null
        ? null
        : clampNumber(Number(value.challengeSecondsPerQuestion), 1, 120),
    decimalPrecision: clampPrecision(Number(value.decimalPrecision ?? defaults.decimalPrecision)),
    showVisualKeypad: Boolean(value.showVisualKeypad ?? defaults.showVisualKeypad),
    difficultyLevel: normalizeDifficultyLevel(value.difficultyLevel ?? defaults.difficultyLevel),
    operations: {
      add: normalizeOperationSettings(defaults.operations.add, operations.add),
      subtract: normalizeOperationSettings(defaults.operations.subtract, operations.subtract),
      multiply: normalizeOperationSettings(defaults.operations.multiply, operations.multiply),
      divide: normalizeOperationSettings(defaults.operations.divide, operations.divide),
    },
  };
}

@Component({
  selector: 'app-mental-math',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  templateUrl: './mental-math.component.html',
  styleUrl: './mental-math.component.css',
})
export class MentalMathComponent implements OnDestroy {
  readonly t = inject(ScopedTranslationService);
  private readonly i18n = inject(I18nService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);
  answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');

  readonly operations: OperationView[] = [
    { id: 'add', labelKey: 'ADD', symbol: '+' },
    { id: 'subtract', labelKey: 'SUBTRACT', symbol: '-' },
    { id: 'multiply', labelKey: 'MULTIPLY', symbol: 'x' },
    { id: 'divide', labelKey: 'DIVIDE', symbol: '/' },
  ];
  readonly rushOptions = [30, 60, 120];
  readonly challengeQuestionOptions = [5, 10, 20];
  readonly challengeTimeOptions: Array<number | null> = [5, 10, 15, null];
  readonly precisionQuickOptions = [1, 2, 3];
  readonly difficultyPresets: DifficultyPreset[] = [
    {
      id: 'initiate',
      labelKey: 'LEVEL_INITIATE',
      settings: {
        difficultyLevel: 'initiate',
        challengeSecondsPerQuestion: 20,
        operations: {
          add: { enabled: true, range: { min: 1, max: 10 } },
          subtract: { enabled: true, range: { min: 1, max: 10 } },
          multiply: { enabled: false, range: { min: 1, max: 10 } },
          divide: { enabled: false, range: { min: 1, max: 10 } },
        },
        allowDecimals: false,
      },
    },
    {
      id: 'apprentice',
      labelKey: 'LEVEL_APPRENTICE',
      settings: {
        difficultyLevel: 'apprentice',
        challengeSecondsPerQuestion: 15,
        operations: {
          add: { enabled: true, range: { min: 1, max: 20 } },
          subtract: { enabled: true, range: { min: 1, max: 20 } },
          multiply: { enabled: true, range: { min: 1, max: 10 } },
          divide: { enabled: false, range: { min: 1, max: 10 } },
        },
        allowDecimals: false,
      },
    },
    {
      id: 'adept',
      labelKey: 'LEVEL_ADEPT',
      settings: {
        difficultyLevel: 'adept',
        challengeSecondsPerQuestion: 15,
        operations: {
          add: { enabled: true, range: { min: 1, max: 50 } },
          subtract: { enabled: true, range: { min: 1, max: 50 } },
          multiply: { enabled: true, range: { min: 1, max: 12 } },
          divide: { enabled: true, range: { min: 1, max: 12 } },
        },
        allowDecimals: false,
      },
    },
    {
      id: 'expert',
      labelKey: 'LEVEL_EXPERT',
      settings: {
        difficultyLevel: 'expert',
        challengeSecondsPerQuestion: 10,
        operations: {
          add: { enabled: true, range: { min: -50, max: 100 } },
          subtract: { enabled: true, range: { min: -50, max: 100 } },
          multiply: { enabled: true, range: { min: -12, max: 12 } },
          divide: { enabled: true, range: { min: -12, max: 12 } },
        },
        allowDecimals: false,
      },
    },
    {
      id: 'master',
      labelKey: 'LEVEL_MASTER',
      settings: {
        difficultyLevel: 'master',
        challengeSecondsPerQuestion: 5,
        operations: {
          add: { enabled: true, range: { min: -100, max: 100 } },
          subtract: { enabled: true, range: { min: -100, max: 100 } },
          multiply: { enabled: true, range: { min: -20, max: 20 } },
          divide: { enabled: true, range: { min: -20, max: 20 } },
        },
        allowDecimals: true,
        decimalPrecision: 1,
      },
    },
    {
      id: 'custom',
      labelKey: 'LEVEL_CUSTOM',
      settings: {
        difficultyLevel: 'custom',
      },
    },
  ];
  readonly keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  settings = signal<MentalMathSettings>(this.loadSettings());
  screen = signal<Screen>('start');
  settingsOpen = signal(false);
  openSections = signal<Record<SettingsSection, boolean>>({
    mode: true,
    operations: false,
    scoring: false,
  });

  currentQuestion = signal<MentalMathQuestion | null>(null);
  answer = signal('');
  feedback = signal<Feedback>(null);
  score = signal(0);
  correct = signal(0);
  wrong = signal(0);
  strikes = signal(0);
  completedQuestions = signal(0);
  totalResponseMs = signal(0);
  remainingMs = signal(0);
  roundResult = signal<RoundResult | null>(null);
  shareCopied = signal(false);
  retryFeedback = signal(false);
  forceVisualKeypad = signal(false);

  private timerId: number | null = null;
  private feedbackTimerId: number | null = null;
  private retryTimerId: number | null = null;
  private keypadMediaQuery: MediaQueryList | null = null;
  private readonly keypadMediaListener = (event: MediaQueryListEvent) => {
    this.forceVisualKeypad.set(event.matches);
  };
  private gameEndsAt = 0;
  private questionStartedAt = 0;
  private questionEndsAt: number | null = null;

  activeModeDescription = computed(() =>
    this.settings().mode === 'rush' ? this.tr('MODE_RUSH_DESC') : this.tr('MODE_CHALLENGE_DESC'),
  );
  timerLabel = computed(() => {
    const settings = this.settings();
    if (settings.mode === 'challenge' && settings.challengeSecondsPerQuestion === null) {
      return this.tr('INFINITY');
    }
    return this.formatClock(this.remainingMs());
  });
  questionCounterLabel = computed(() => {
    const settings = this.settings();
    if (settings.mode !== 'challenge') {
      return '';
    }
    return `${this.completedQuestions() + 1}/${settings.challengeQuestionCount}`;
  });
  operationDisplay = computed(() => {
    const question = this.currentQuestion();
    if (!question) {
      return '';
    }
    return question.prompt.replace(' x ', ' × ').replace(' / ', ' ÷ ');
  });
  operationSizeClass = computed(() => `mental-operation--${this.settings().operationFontSize}`);
  gameSummary = computed(() => this.buildSummary());
  showVisualKeypad = computed(() => this.settings().showVisualKeypad || this.forceVisualKeypad());

  constructor() {
    if (this.isBrowser) {
      this.keypadMediaQuery = window.matchMedia('(pointer: coarse), (max-width: 64rem)');
      this.forceVisualKeypad.set(this.keypadMediaQuery.matches);
      this.keypadMediaQuery.addEventListener('change', this.keypadMediaListener);
    }

    effect(() => {
      const settings = this.settings();
      if (this.isBrowser) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.clearFeedbackTimer();
    this.clearRetryTimer();
    this.keypadMediaQuery?.removeEventListener('change', this.keypadMediaListener);
  }

  tr(key: string, params: Record<string, string | number> = {}): string {
    let value = this.t.map()[key] || key;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{${paramKey}}`, String(paramValue));
    }
    return value;
  }

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  isSectionOpen(section: SettingsSection): boolean {
    return this.openSections()[section];
  }

  toggleSection(section: SettingsSection): void {
    this.openSections.update((current) => ({ ...current, [section]: !current[section] }));
  }

  setMode(mode: MentalMathMode): void {
    this.updateSettings({ mode });
  }

  setRushTotalSeconds(seconds: number): void {
    this.updateSettings({ rushTotalSeconds: seconds });
  }

  setCustomRushSeconds(value: string): void {
    this.updateSettings({ rushTotalSeconds: clampNumber(toNumber(value, 60), 10, 600) });
  }

  setChallengeQuestionCount(count: number): void {
    this.updateSettings({ challengeQuestionCount: count });
  }

  setChallengeSecondsPerQuestion(seconds: number | null): void {
    this.updateSettings({ challengeSecondsPerQuestion: seconds, difficultyLevel: 'custom' });
  }

  modeDescription(mode: MentalMathMode): string {
    return mode === 'rush' ? this.tr('MODE_RUSH_DESC') : this.tr('MODE_CHALLENGE_DESC');
  }

  toggleOperation(operation: MentalMathOperation): void {
    const settings = this.settings();
    const enabledCount = this.operations.filter(
      (item) => settings.operations[item.id].enabled,
    ).length;
    const current = settings.operations[operation];
    if (current.enabled && enabledCount === 1) {
      return;
    }

    this.updateSettings({
      difficultyLevel: 'custom',
      operations: {
        ...settings.operations,
        [operation]: { ...current, enabled: !current.enabled },
      },
    });
  }

  updateOperationRange(operation: MentalMathOperation, bound: RangeBound, value: string): void {
    const settings = this.settings();
    const current = settings.operations[operation];
    const nextValue = toNumber(value, current.range[bound]);
    this.updateSettings({
      difficultyLevel: 'custom',
      operations: {
        ...settings.operations,
        [operation]: {
          ...current,
          range: { ...current.range, [bound]: nextValue },
        },
      },
    });
  }

  setAllowDecimals(value: boolean): void {
    this.updateSettings({ allowDecimals: value, difficultyLevel: 'custom' });
  }

  setDecimalPrecision(value: string | number): void {
    this.updateSettings({
      decimalPrecision: clampPrecision(Number(value)),
      difficultyLevel: 'custom',
    });
  }

  setMistakeHandling(value: MentalMathMistakeHandling): void {
    this.updateSettings({ mistakeHandling: value });
  }

  setSpeedBonus(value: boolean): void {
    this.updateSettings({ speedBonus: value });
  }

  setFontSize(value: MentalMathFontSize): void {
    this.updateSettings({ operationFontSize: value });
  }

  setShowVisualKeypad(value: boolean): void {
    this.updateSettings({ showVisualKeypad: value });
  }

  applyDifficultyPreset(preset: DifficultyPreset): void {
    if (preset.id === 'custom') {
      this.updateSettings({ difficultyLevel: 'custom' });
      this.openSections.set({ mode: false, operations: true, scoring: false });
      this.settingsOpen.set(true);
      return;
    }

    this.updateSettings({
      ...preset.settings,
      operations: {
        ...this.settings().operations,
        ...preset.settings.operations,
      },
    });
  }

  startGame(): void {
    this.clearFeedbackTimer();
    this.score.set(0);
    this.correct.set(0);
    this.wrong.set(0);
    this.strikes.set(0);
    this.completedQuestions.set(0);
    this.totalResponseMs.set(0);
    this.roundResult.set(null);
    this.feedback.set(null);
    this.retryFeedback.set(false);
    this.answer.set('');
    this.screen.set('playing');

    const settings = this.settings();
    const now = Date.now();
    this.gameEndsAt = now + settings.rushTotalSeconds * 1000;
    this.prepareNextQuestion(now);
    this.startTimer();
    this.focusAnswerInput();
  }

  restartGame(): void {
    this.screen.set('start');
    this.startGame();
  }

  backToStart(): void {
    this.stopTimer();
    this.clearFeedbackTimer();
    this.clearRetryTimer();
    this.feedback.set(null);
    this.retryFeedback.set(false);
    this.currentQuestion.set(null);
    this.answer.set('');
    this.remainingMs.set(0);
    this.screen.set('start');
  }

  pressKey(value: string): void {
    if (this.screen() !== 'playing' || this.feedback()) {
      return;
    }

    if (value === '.' && this.answer().includes('.')) {
      return;
    }
    if (value === '-' && this.answer().length > 0) {
      return;
    }

    this.setAnswerValue(`${this.answer()}${value}`);
    this.focusAnswerInput();
  }

  setTypedAnswer(input: HTMLInputElement): void {
    if (this.feedback()) {
      input.value = this.answer();
      return;
    }

    const next = sanitizeNumericAnswer(input.value);
    input.value = next;

    this.setAnswerValue(next);
  }

  backspace(): void {
    if (this.feedback()) {
      return;
    }
    if (this.answer()) {
      this.answer.update((current) => current.slice(0, -1));
    }
  }

  clearAnswer(): void {
    if (this.feedback()) {
      return;
    }
    if (this.answer()) {
      this.answer.set('');
    }
  }

  skipQuestion(): void {
    if (this.feedback() || this.screen() !== 'playing') {
      return;
    }

    this.resolveQuestion(false);
  }

  submitAnswer(): void {
    if (this.feedback() || this.screen() !== 'playing') {
      return;
    }

    const question = this.currentQuestion();
    if (!question || this.answer().trim() === '') {
      return;
    }

    const isCorrect = isCorrectMentalMathAnswer(this.answer(), question);
    if (isCorrect) {
      this.resolveQuestion(true);
      return;
    }

    this.markRetryAttempt();
  }

  shareResult(): void {
    const result = this.roundResult();
    if (!result) {
      return;
    }

    void this.shareText(this.buildShareResultText(result));
  }

  copyResult(): void {
    const result = this.roundResult();
    if (!result) {
      return;
    }

    void this.copyText(this.buildShareResultText(result));
  }

  averageSpeedLabel(): string {
    const result = this.roundResult();
    const sourceMs = result ? result.avgSpeedMs : this.averageResponseMs();
    return this.formatSpeed(sourceMs);
  }

  private formatSpeed(sourceMs: number): string {
    if (sourceMs <= 0) {
      return '-';
    }
    return `${(sourceMs / 1000).toFixed(1)}s`;
  }

  timeOptionLabel(value: number | null): string {
    if (value === null) {
      return this.tr('INFINITY');
    }
    return this.tr('SECONDS_SHORT', { value });
  }

  operationName(operation: OperationView): string {
    return this.tr(operation.labelKey);
  }

  private updateSettings(patch: Partial<MentalMathSettings>): void {
    this.settings.update((current) => ({ ...current, ...patch }));
  }

  private setAnswerValue(value: string): void {
    const sanitized = sanitizeNumericAnswer(value);
    this.retryFeedback.set(false);
    this.answer.set(sanitized);

    const question = this.currentQuestion();
    if (!question || !this.isCompleteNumericAnswer(sanitized)) {
      return;
    }

    if (isCorrectMentalMathAnswer(sanitized, question)) {
      this.resolveQuestion(true);
    }
  }

  private isCompleteNumericAnswer(value: string): boolean {
    return /^-?(?:\d+|\d+\.\d+|\.\d+)$/.test(value);
  }

  private loadSettings(): MentalMathSettings {
    if (!this.isBrowser) {
      return createDefaultMentalMathSettings();
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return createDefaultMentalMathSettings();
      }
      return normalizeSettings(JSON.parse(stored)) ?? createDefaultMentalMathSettings();
    } catch (error) {
      console.warn('Failed to load mental math settings', error);
      return createDefaultMentalMathSettings();
    }
  }

  private prepareNextQuestion(now = Date.now()): void {
    const settings = this.settings();
    const question = createMentalMathQuestion(settings);
    this.currentQuestion.set(question);
    this.answer.set('');
    this.feedback.set(null);
    this.retryFeedback.set(false);
    this.questionStartedAt = now;
    this.questionEndsAt =
      settings.mode === 'challenge' && settings.challengeSecondsPerQuestion !== null
        ? now + settings.challengeSecondsPerQuestion * 1000
        : null;
    this.updateRemaining(now);
    this.focusAnswerInput();
  }

  private resolveQuestion(isCorrect: boolean): void {
    const settings = this.settings();
    const responseMs = Math.max(0, Date.now() - this.questionStartedAt);
    this.totalResponseMs.update((current) => current + responseMs);
    this.completedQuestions.update((current) => current + 1);

    if (isCorrect) {
      this.correct.update((current) => current + 1);
      this.score.update((current) =>
        settings.mode === 'rush'
          ? current + 1
          : current +
            calculateChallengePoints(
              true,
              responseMs,
              settings.challengeSecondsPerQuestion === null
                ? null
                : settings.challengeSecondsPerQuestion * 1000,
              settings.speedBonus,
            ),
      );
      this.feedback.set('correct');
    } else {
      this.wrong.update((current) => current + 1);
      if (settings.mistakeHandling === 'minusOne') {
        this.score.update((current) => current - 1);
      }
      if (settings.mistakeHandling === 'threeStrikes') {
        this.strikes.update((current) => current + 1);
      }
      this.feedback.set('wrong');
    }

    this.clearFeedbackTimer();
    this.feedbackTimerId = window.setTimeout(() => this.afterFeedback(), 400);
  }

  private afterFeedback(): void {
    this.feedbackTimerId = null;
    const settings = this.settings();
    const endedByStrikes = settings.mistakeHandling === 'threeStrikes' && this.strikes() >= 3;
    const endedByChallenge =
      settings.mode === 'challenge' && this.completedQuestions() >= settings.challengeQuestionCount;

    if (endedByStrikes || endedByChallenge || this.screen() !== 'playing') {
      this.endGame();
      return;
    }

    this.prepareNextQuestion();
  }

  private startTimer(): void {
    this.stopTimer();
    if (!this.isBrowser) {
      return;
    }
    this.timerId = window.setInterval(() => this.tick(), 100);
    this.tick();
  }

  private stopTimer(): void {
    if (this.timerId !== null && this.isBrowser) {
      window.clearInterval(this.timerId);
    }
    this.timerId = null;
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimerId !== null && this.isBrowser) {
      window.clearTimeout(this.feedbackTimerId);
    }
    this.feedbackTimerId = null;
  }

  private clearRetryTimer(): void {
    if (this.retryTimerId !== null && this.isBrowser) {
      window.clearTimeout(this.retryTimerId);
    }
    this.retryTimerId = null;
  }

  private markRetryAttempt(): void {
    this.clearRetryTimer();
    this.retryFeedback.set(true);
    if (!this.isBrowser) {
      return;
    }
    this.retryTimerId = window.setTimeout(() => {
      this.retryFeedback.set(false);
      this.retryTimerId = null;
    }, 320);
  }

  private tick(): void {
    if (this.screen() !== 'playing') {
      return;
    }

    const now = Date.now();
    this.updateRemaining(now);

    const settings = this.settings();
    if (settings.mode === 'rush' && now >= this.gameEndsAt) {
      this.endGame();
      return;
    }

    if (
      settings.mode === 'challenge' &&
      this.questionEndsAt !== null &&
      now >= this.questionEndsAt
    ) {
      if (!this.feedback()) {
        this.resolveQuestion(false);
      }
    }
  }

  private updateRemaining(now: number): void {
    const settings = this.settings();
    if (settings.mode === 'rush') {
      this.remainingMs.set(Math.max(0, this.gameEndsAt - now));
      return;
    }

    if (this.questionEndsAt === null) {
      this.remainingMs.set(0);
      return;
    }

    this.remainingMs.set(Math.max(0, this.questionEndsAt - now));
  }

  private endGame(): void {
    this.stopTimer();
    this.clearFeedbackTimer();
    this.clearRetryTimer();
    this.feedback.set(null);
    this.retryFeedback.set(false);
    this.roundResult.set({
      score: this.score(),
      correct: this.correct(),
      wrong: this.wrong(),
      avgSpeedMs: this.averageResponseMs(),
      strikes: this.strikes(),
    });
    this.screen.set('end');
  }

  private averageResponseMs(): number {
    const answered = this.correct() + this.wrong();
    return answered > 0 ? this.totalResponseMs() / answered : 0;
  }

  private formatClock(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private buildSummary(): string {
    const settings = this.settings();
    const ops = this.operations
      .filter((operation) => settings.operations[operation.id].enabled)
      .map((operation) => operation.symbol.replace('x', '×').replace('/', '÷'))
      .join(', ');

    if (settings.mode === 'rush') {
      return this.tr('SUMMARY_RUSH', { time: settings.rushTotalSeconds, ops });
    }

    const time =
      settings.challengeSecondsPerQuestion === null
        ? this.tr('SUMMARY_NO_LIMIT')
        : this.tr('SUMMARY_TIME_LIMIT', { value: settings.challengeSecondsPerQuestion });
    return this.tr('SUMMARY_CHALLENGE', {
      questions: settings.challengeQuestionCount,
      time,
    });
  }

  private buildShareResultText(result: RoundResult): string {
    return this.tr('SHARE_TEXT', {
      score: result.score,
      correct: result.correct,
      wrong: result.wrong,
      speed: this.formatSpeed(result.avgSpeedMs),
      url: this.buildShareUrl(),
    });
  }

  private buildShareUrl(): string {
    return `${SYNEDEX_ORIGIN}/${this.i18n.currentLang()}/games/mental-math`;
  }

  private async shareText(text: string): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    try {
      const browserNavigator = window.navigator;
      if (typeof browserNavigator.share === 'function') {
        await browserNavigator.share({ text });
      } else if (browserNavigator.clipboard) {
        await this.copyText(text);
      }
    } catch (error) {
      console.warn('Unable to share mental math result', error);
    }
  }

  private async copyText(text: string): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    try {
      const browserNavigator = window.navigator;
      if (!browserNavigator.clipboard) {
        return;
      }
      await browserNavigator.clipboard.writeText(text);
      this.shareCopied.set(true);
      window.setTimeout(() => this.shareCopied.set(false), 1200);
    } catch (error) {
      console.warn('Unable to copy mental math result', error);
    }
  }

  private focusAnswerInput(): void {
    if (!this.isBrowser) {
      return;
    }

    window.setTimeout(() => this.answerInput()?.nativeElement.focus({ preventScroll: true }), 0);
  }
}
