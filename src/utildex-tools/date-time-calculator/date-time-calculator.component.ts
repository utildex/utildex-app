import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { PersistenceService } from '../../services/persistence.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { I18nService } from '../../services/i18n.service';
import {
  computeAdd,
  computeBetween,
  computeBusiness,
  computeDeadline,
  formatDateForDisplay,
  parseDisplayDate,
  placeholderForFormat,
  todayIso,
  type DateFormat,
  type DiffParts,
  type Direction,
  type Mode,
  type Unit,
} from './date-time-calculator.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type DeadlineUnit = Unit | 'business-days';
type DateField = 'date' | 'startDate' | 'endDate';

const MODE_TABS: { id: Mode; key: string; icon: string }[] = [
  { id: 'add', key: 'MODE_ADD', icon: 'add' },
  { id: 'business', key: 'MODE_BUSINESS', icon: 'work' },
  { id: 'between', key: 'MODE_BETWEEN', icon: 'date_range' },
  { id: 'deadline', key: 'MODE_DEADLINE', icon: 'schedule' },
];

const FORMAT_OPTIONS: { id: DateFormat; key: string }[] = [
  { id: 'iso', key: 'DATE_FORMAT_ISO' },
  { id: 'dmy', key: 'DATE_FORMAT_DMY' },
  { id: 'mdy', key: 'DATE_FORMAT_MDY' },
  { id: 'long', key: 'DATE_FORMAT_LONG' },
];

@Component({
  selector: 'app-date-time-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="date-time-calculator">
      <div
        class="dtc-card mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Header row: tabs + format selector -->
        <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div
            class="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex"
            role="tablist"
            [attr.aria-label]="t.map()['TITLE']"
          >
            @for (tab of tabs; track tab.id) {
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === tab.id"
                (click)="setMode(tab.id)"
                [class]="
                  mode() === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
                "
                class="focus:ring-primary inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus:ring-2 focus:outline-none"
              >
                <span class="material-symbols-outlined text-sm" aria-hidden="true">{{
                  tab.icon
                }}</span>
                <span class="truncate">{{ t.map()[tab.key] }}</span>
              </button>
            }
          </div>

          <label class="flex items-center gap-2 text-xs">
            <span class="font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['DATE_FORMAT_LABEL'] }}
            </span>
            <select
              [ngModel]="format()"
              (ngModelChange)="setFormat($event)"
              class="focus:ring-primary focus:border-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              @for (opt of formatOptions; track opt.id) {
                <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
              }
            </select>
          </label>
        </div>

        <!-- Body: inputs (left) + result (right) on desktop, stacked on mobile -->
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[3fr_2fr]">
          <!-- Inputs panel -->
          <div
            class="rounded-xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <div class="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
              @switch (mode()) {
                @case ('add') {
                  <div class="md:col-span-6">
                    <ng-container
                      *ngTemplateOutlet="
                        dateField;
                        context: { id: 'dtc-add-date', field: 'date', labelKey: 'LABEL_DATE' }
                      "
                    ></ng-container>
                  </div>
                  <div class="md:col-span-3">
                    <ng-container *ngTemplateOutlet="amountField"></ng-container>
                  </div>
                  <div class="md:col-span-3">
                    <ng-container
                      *ngTemplateOutlet="unitField; context: { id: 'dtc-add-unit', withBiz: false }"
                    ></ng-container>
                  </div>
                  <div class="md:col-span-12">
                    <ng-container *ngTemplateOutlet="dirField"></ng-container>
                  </div>
                }
                @case ('business') {
                  <div class="md:col-span-6">
                    <ng-container
                      *ngTemplateOutlet="
                        dateField;
                        context: { id: 'dtc-bus-date', field: 'date', labelKey: 'LABEL_DATE' }
                      "
                    ></ng-container>
                  </div>
                  <div class="md:col-span-3">
                    <ng-container *ngTemplateOutlet="amountField"></ng-container>
                  </div>
                  <div class="md:col-span-3">
                    <ng-container *ngTemplateOutlet="dirField"></ng-container>
                  </div>
                }
                @case ('between') {
                  <div class="md:col-span-6">
                    <ng-container
                      *ngTemplateOutlet="
                        dateField;
                        context: {
                          id: 'dtc-bt-start',
                          field: 'startDate',
                          labelKey: 'LABEL_START',
                        }
                      "
                    ></ng-container>
                  </div>
                  <div class="md:col-span-6">
                    <ng-container
                      *ngTemplateOutlet="
                        dateField;
                        context: { id: 'dtc-bt-end', field: 'endDate', labelKey: 'LABEL_END' }
                      "
                    ></ng-container>
                  </div>
                }
                @case ('deadline') {
                  <div class="md:col-span-6">
                    <ng-container
                      *ngTemplateOutlet="
                        dateField;
                        context: {
                          id: 'dtc-dl-start',
                          field: 'startDate',
                          labelKey: 'LABEL_START',
                        }
                      "
                    ></ng-container>
                  </div>
                  <div class="md:col-span-3">
                    <ng-container *ngTemplateOutlet="amountField"></ng-container>
                  </div>
                  <div class="md:col-span-3">
                    <ng-container
                      *ngTemplateOutlet="unitField; context: { id: 'dtc-dl-unit', withBiz: true }"
                    ></ng-container>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Result panel -->
          <div
            class="flex flex-col rounded-xl bg-slate-50 p-3 lg:p-4 dark:bg-slate-900/50"
            role="region"
            [attr.aria-label]="t.map()['RESULT_HEADING']"
          >
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['RESULT_HEADING'] }}
            </h2>

            @if (!ready()) {
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {{ invalidMessage() }}
              </p>
            } @else if (mode() === 'between') {
              <div class="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {{ t.map()['RESULT_TOTAL_DAYS'] }}
                  </p>
                  <p class="text-primary text-3xl font-extrabold tabular-nums lg:text-4xl">
                    {{ diff()?.totalDays }}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {{ t.map()['RESULT_TOTAL_WEEKS'] }}
                  </p>
                  <p
                    class="text-3xl font-bold text-slate-700 tabular-nums lg:text-4xl dark:text-slate-200"
                  >
                    {{ diff()?.totalWeeks }}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {{ t.map()['RESULT_BUSINESS_LABEL'] }}
                  </p>
                  <p class="text-2xl font-bold text-slate-700 tabular-nums dark:text-slate-200">
                    {{ businessDiff() }}
                  </p>
                </div>
                <div>
                  <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {{ t.map()['RESULT_DIFF_LABEL'] }}
                  </p>
                  <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {{ diff()?.years }}y · {{ diff()?.months }}m · {{ diff()?.days }}d
                  </p>
                </div>
              </div>
            } @else {
              <p class="mt-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['RESULT_DATE_LABEL'] }}
              </p>
              <p class="text-primary text-3xl font-extrabold tabular-nums lg:text-5xl">
                {{ formattedResult() }}
              </p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ resultWeekday() }}
                @if (format() !== 'iso') {
                  · <span class="font-mono">{{ resultIso() }}</span>
                }
              </p>
            }

            <!-- Copy bar -->
            <div
              class="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"
            >
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['COPY_FORMAT'] }}
              </span>
              <button
                type="button"
                (click)="copy('plain')"
                [disabled]="!ready()"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true"
                  >content_copy</span
                >
                {{ t.map()['COPY_PLAIN'] }}
              </button>
              <button
                type="button"
                (click)="copy('iso')"
                [disabled]="!ready()"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">tag</span>
                {{ t.map()['COPY_ISO'] }}
              </button>
              <button
                type="button"
                (click)="copy('phrase')"
                [disabled]="!ready()"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">notes</span>
                {{ t.map()['COPY_PHRASE'] }}
              </button>
            </div>
          </div>
        </div>

        <p
          class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500"
        >
          <span class="inline-flex items-center gap-1">
            <span class="material-symbols-outlined text-xs" aria-hidden="true">lock</span>
            {{ t.map()['PRIVACY_NOTE'] }}
          </span>
          <span>·</span>
          <span>{{ t.map()['TZ_NOTE'] }}</span>
        </p>
      </div>

      <!-- Reusable input templates -->
      <ng-template #dateField let-id="id" let-field="field" let-labelKey="labelKey">
        <label
          [attr.for]="id"
          class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
        >
          {{ t.map()[labelKey] }}
        </label>
        <div class="flex items-stretch gap-1.5">
          <div class="relative min-w-0 flex-1">
            <input
              [id]="id"
              type="text"
              autocomplete="off"
              spellcheck="false"
              inputmode="numeric"
              [value]="displayValue(field)"
              [placeholder]="placeholder()"
              (blur)="commitDate(field, $any($event.target).value)"
              (keydown.enter)="commitDate(field, $any($event.target).value)"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <input
              type="date"
              [value]="iso(field)"
              (change)="setIso(field, $any($event.target).value)"
              [attr.aria-label]="t.map()['DATE_PICKER_OPEN']"
              class="absolute inset-y-0 right-0 w-9 cursor-pointer opacity-0"
            />
            <span
              aria-hidden="true"
              class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 dark:text-slate-500"
            >
              <span class="material-symbols-outlined text-base">calendar_month</span>
            </span>
          </div>
          <button
            type="button"
            (click)="setIso(field, today)"
            class="glass-control focus:ring-primary rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 focus:ring-2 focus:outline-none dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
          >
            {{ t.map()['LABEL_TODAY'] }}
          </button>
        </div>
      </ng-template>

      <ng-template #amountField>
        <label
          for="dtc-amount"
          class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
        >
          {{ t.map()['LABEL_AMOUNT'] }}
        </label>
        <input
          id="dtc-amount"
          type="number"
          inputmode="numeric"
          step="1"
          [ngModel]="amount()"
          (ngModelChange)="setAmount($event)"
          class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
      </ng-template>

      <ng-template #unitField let-id="id" let-withBiz="withBiz">
        <label
          [attr.for]="id"
          class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
        >
          {{ t.map()['LABEL_UNIT'] }}
        </label>
        <select
          [id]="id"
          [ngModel]="withBiz ? deadlineUnit() : unit()"
          (ngModelChange)="withBiz ? setDeadlineUnit($event) : setUnit($event)"
          class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="days">{{ t.map()['UNIT_DAYS'] }}</option>
          <option value="weeks">{{ t.map()['UNIT_WEEKS'] }}</option>
          <option value="months">{{ t.map()['UNIT_MONTHS'] }}</option>
          @if (withBiz) {
            <option value="business-days">{{ t.map()['UNIT_BUSINESS_DAYS'] }}</option>
          }
        </select>
      </ng-template>

      <ng-template #dirField>
        <label
          for="dtc-dir"
          class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
        >
          {{ t.map()['LABEL_DIRECTION'] }}
        </label>
        <select
          id="dtc-dir"
          [ngModel]="direction()"
          (ngModelChange)="setDirection($event)"
          class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="add">{{ t.map()['DIR_ADD'] }}</option>
          <option value="subtract">{{ t.map()['DIR_SUB'] }}</option>
        </select>
      </ng-template>
    </app-tool-layout>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class DateTimeCalculatorComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private i18n = inject(I18nService);
  private clipboard = inject(ClipboardService);
  private persistence = inject(PersistenceService);

  readonly tabs = MODE_TABS;
  readonly formatOptions = FORMAT_OPTIONS;
  readonly today = todayIso();

  // -------------------- Persisted state --------------------
  mode = signal<Mode>('add');
  format = signal<DateFormat>('iso');
  date = signal<string>(this.today);
  startDate = signal<string>(this.today);
  endDate = signal<string>(this.today);
  amount = signal<number>(7);
  unit = signal<Unit>('days');
  deadlineUnit = signal<DeadlineUnit>('business-days');
  direction = signal<Direction>('add');

  constructor() {
    this.persistence.storage(this.mode, 'dtc-mode', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.format, 'dtc-format', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.date, 'dtc-date', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.startDate, 'dtc-start', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.endDate, 'dtc-end', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.amount, 'dtc-amount', { type: 'number', strategy: 'hybrid' });
    this.persistence.storage(this.unit, 'dtc-unit', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.deadlineUnit, 'dtc-dl-unit', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.direction, 'dtc-dir', { type: 'string', strategy: 'hybrid' });
  }

  // -------------------- Setters --------------------
  setMode = (m: Mode) => this.mode.set(m);
  setFormat = (f: DateFormat) => this.format.set(f);
  setUnit = (u: Unit) => this.unit.set(u);
  setDeadlineUnit = (u: DeadlineUnit) => this.deadlineUnit.set(u);
  setDirection = (d: Direction) => this.direction.set(d);
  setAmount = (v: number | string) => {
    const n = typeof v === 'string' ? Number(v) : v;
    this.amount.set(Number.isFinite(n) ? n : 0);
  };

  iso(field: DateField): string {
    return this[field]();
  }

  /** Display value for the chosen format. */
  displayValue(field: DateField): string {
    return formatDateForDisplay(this.iso(field), this.format(), this.locale());
  }

  placeholder = computed(() => placeholderForFormat(this.format()));

  /** Commit a typed date if it parses; otherwise, leave the underlying ISO unchanged. */
  commitDate(field: DateField, raw: string) {
    const parsed = parseDisplayDate(raw, this.format(), this.locale());
    if (parsed) {
      this[field].set(parsed);
    } else {
      // Force a re-render so the input snaps back to the current ISO display.
      this[field].set(this[field]());
    }
  }

  setIso(field: DateField, iso: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) this[field].set(iso);
  }

  // -------------------- Computed result --------------------
  private locale(): string {
    return this.i18n.currentLang();
  }

  private result = computed(() => {
    switch (this.mode()) {
      case 'add':
        return computeAdd({
          date: this.date(),
          amount: this.amount(),
          unit: this.unit(),
          direction: this.direction(),
        });
      case 'business':
        return computeBusiness({
          date: this.date(),
          amount: this.amount(),
          direction: this.direction(),
        });
      case 'between':
        return computeBetween({ start: this.startDate(), end: this.endDate() });
      case 'deadline':
        return computeDeadline({
          start: this.startDate(),
          amount: this.amount(),
          unit: this.deadlineUnit(),
        });
    }
  });

  ready = computed(() => {
    const r = this.result();
    if (this.mode() === 'between') return !!r.diff;
    return !!r.iso;
  });

  resultIso = computed(() => this.result().iso ?? '');
  formattedResult = computed(() =>
    this.resultIso() ? formatDateForDisplay(this.resultIso(), this.format(), this.locale()) : '',
  );
  diff = computed<DiffParts | undefined>(() => this.result().diff);
  businessDiff = computed(() => this.result().businessDiff ?? 0);

  resultWeekday = computed(() => {
    const d = this.result().date;
    if (!d) return '';
    const keys = [
      'WEEKDAY_SUN',
      'WEEKDAY_MON',
      'WEEKDAY_TUE',
      'WEEKDAY_WED',
      'WEEKDAY_THU',
      'WEEKDAY_FRI',
      'WEEKDAY_SAT',
    ];
    return this.t.map()[keys[d.getUTCDay()]] ?? '';
  });

  invalidMessage = computed(() =>
    this.mode() === 'between'
      ? this.t.map()['RESULT_INVALID_RANGE']
      : this.t.map()['RESULT_INVALID'],
  );

  // -------------------- Copy formats --------------------
  private unitLabel(u: Unit | DeadlineUnit): string {
    const map = this.t.map();
    switch (u) {
      case 'days':
        return map['UNIT_DAYS'];
      case 'weeks':
        return map['UNIT_WEEKS'];
      case 'months':
        return map['UNIT_MONTHS'];
      case 'business-days':
        return map['UNIT_BUSINESS_DAYS'];
    }
  }

  private fillTemplate(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  }

  /** A date as the user wants to see it (for use in copy strings). */
  private fmt(iso: string): string {
    return formatDateForDisplay(iso, this.format(), this.locale());
  }

  private buildPhrase(): string {
    const map = this.t.map();
    const result = this.formattedResult();
    switch (this.mode()) {
      case 'add': {
        const key = this.direction() === 'add' ? 'PHRASE_ADD' : 'PHRASE_SUB';
        return `${result} ${this.fillTemplate(map[key], {
          amount: Math.abs(this.amount()),
          unit: this.unitLabel(this.unit()),
          start: this.fmt(this.date()),
        })}`;
      }
      case 'business': {
        const key = this.direction() === 'add' ? 'PHRASE_BUSINESS_ADD' : 'PHRASE_BUSINESS_SUB';
        return `${result} ${this.fillTemplate(map[key], {
          amount: Math.abs(this.amount()),
          start: this.fmt(this.date()),
        })}`;
      }
      case 'deadline': {
        return `${result} — ${this.fillTemplate(map['PHRASE_DEADLINE'], {
          amount: Math.abs(this.amount()),
          unit: this.unitLabel(this.deadlineUnit()),
          start: this.fmt(this.startDate()),
        })}`;
      }
      case 'between': {
        const d = this.diff();
        if (!d) return '';
        return this.fillTemplate(map['PHRASE_BETWEEN'], {
          start: this.fmt(this.startDate()),
          end: this.fmt(this.endDate()),
          years: d.years,
          months: d.months,
          days: d.days,
          totalDays: d.totalDays,
        });
      }
    }
  }

  private buildPlain(): string {
    const map = this.t.map();
    if (this.mode() === 'between') {
      const d = this.diff();
      if (!d) return '';
      return [
        `${map['LABEL_START']}: ${this.fmt(this.startDate())}`,
        `${map['LABEL_END']}: ${this.fmt(this.endDate())}`,
        `${map['RESULT_TOTAL_DAYS']}: ${d.totalDays}`,
        `${map['RESULT_TOTAL_WEEKS']}: ${d.totalWeeks}`,
        `${map['RESULT_BUSINESS_LABEL']}: ${this.businessDiff()}`,
        `${map['RESULT_DIFF_LABEL']}: ${d.years}y ${d.months}m ${d.days}d`,
      ].join('\n');
    }
    return `${map['RESULT_DATE_LABEL']}: ${this.formattedResult()} (${this.resultWeekday()})`;
  }

  copy(format: 'plain' | 'iso' | 'phrase') {
    if (!this.ready()) return;
    let text = '';
    if (format === 'iso') {
      text = this.mode() === 'between' ? `${this.startDate()}/${this.endDate()}` : this.resultIso();
    } else if (format === 'phrase') {
      text = this.buildPhrase();
    } else {
      text = this.buildPlain();
    }
    if (text) this.clipboard.copy(text, 'Date & Time Calculator');
  }
}
