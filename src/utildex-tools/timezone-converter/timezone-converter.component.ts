import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ZonePickerComponent } from '../../components/zone-picker/zone-picker.component';
import { PersistenceService } from '../../services/persistence.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { I18nService } from '../../services/i18n.service';
import {
  type ConvertedZone,
  convert,
  detectLocalZone,
  listSupportedZones,
  nowInZone,
} from './timezone-converter.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type DateFormat = 'iso' | 'dmy' | 'mdy' | 'long';
type TimeFormat = '24h' | '12h';

const DEFAULT_TARGETS = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Tokyo'];

const DATE_FORMAT_OPTIONS: { id: DateFormat; key: string }[] = [
  { id: 'iso', key: 'DATE_FORMAT_ISO' },
  { id: 'dmy', key: 'DATE_FORMAT_DMY' },
  { id: 'mdy', key: 'DATE_FORMAT_MDY' },
  { id: 'long', key: 'DATE_FORMAT_LONG' },
];

const TIME_FORMAT_OPTIONS: { id: TimeFormat; key: string }[] = [
  { id: '24h', key: 'TIME_FORMAT_24H' },
  { id: '12h', key: 'TIME_FORMAT_12H' },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(iso: string, fmt: DateFormat, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  switch (fmt) {
    case 'iso':
      return iso;
    case 'dmy':
      return `${d}/${m}/${y}`;
    case 'mdy':
      return `${m}/${d}/${y}`;
    case 'long':
      try {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: 'long',
          timeZone: 'UTC',
        }).format(new Date(`${iso}T00:00:00Z`));
      } catch {
        return iso;
      }
  }
}

function formatTime(time: string, fmt: TimeFormat): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  if (fmt === '24h') return time;
  const [hStr, m] = time.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

/** Friendly label for a zone id ("Europe/Paris" -> "Europe / Paris"). */
function zoneLabel(zone: string): string {
  return zone.replace(/_/g, ' ').replace(/\//g, ' / ');
}

@Component({
  selector: 'app-timezone-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ZonePickerComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="timezone-converter">
      <div
        class="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Format toolbar -->
        <div class="flex flex-wrap items-center justify-end gap-3 text-xs">
          <label class="flex items-center gap-2">
            <span class="font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_DATE_FORMAT']
            }}</span>
            <select
              [ngModel]="dateFormat()"
              (ngModelChange)="setDateFormat($event)"
              class="focus:ring-primary focus:border-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              @for (opt of dateFormatOptions; track opt.id) {
                <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
              }
            </select>
          </label>
          <label class="flex items-center gap-2">
            <span class="font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_TIME_FORMAT']
            }}</span>
            <select
              [ngModel]="timeFormat()"
              (ngModelChange)="setTimeFormat($event)"
              class="focus:ring-primary focus:border-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              @for (opt of timeFormatOptions; track opt.id) {
                <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
              }
            </select>
          </label>
        </div>

        <!-- Body: source inputs (left) + result list (right) -->
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[3fr_4fr]">
          <!-- SOURCE -->
          <div
            class="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['RESULT_SOURCE'] }}
            </h2>

            <div class="grid grid-cols-2 gap-2">
              <label class="flex flex-col gap-1">
                <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_DATE']
                }}</span>
                <div class="relative">
                  <input
                    type="text"
                    autocomplete="off"
                    spellcheck="false"
                    inputmode="numeric"
                    [value]="dateDisplay()"
                    [placeholder]="datePlaceholder()"
                    (blur)="commitDate($any($event.target).value)"
                    (keydown.enter)="commitDate($any($event.target).value)"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="date"
                    [value]="date()"
                    (change)="setDate($any($event.target).value)"
                    class="absolute inset-y-0 right-0 w-9 cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 dark:text-slate-500"
                  >
                    <span class="material-symbols-outlined text-base">calendar_month</span>
                  </span>
                </div>
              </label>

              <label class="flex flex-col gap-1">
                <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_TIME']
                }}</span>
                <input
                  type="time"
                  [value]="time()"
                  (change)="setTime($any($event.target).value)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 tabular-nums dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>

            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_SOURCE_ZONE']
              }}</span>
              <app-zone-picker
                [zones]="zones"
                [value]="sourceZone()"
                [placeholder]="t.map()['ZONE_SEARCH_PLACEHOLDER']"
                [noResultsLabel]="t.map()['ZONE_SEARCH_EMPTY']"
                (valueChange)="setSourceZone($event)"
              />
            </label>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                (click)="setNow()"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">schedule</span>
                {{ t.map()['LABEL_NOW'] }}
              </button>
              <button
                type="button"
                (click)="useDetectedZone()"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true"
                  >my_location</span
                >
                {{ t.map()['LABEL_DETECT'] }}
              </button>
            </div>

            <!-- Source preview line -->
            @if (result().source; as src) {
              <div
                class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <p class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['RESULT_SOURCE'] }}
                </p>
                <p class="text-primary text-2xl font-extrabold tabular-nums">
                  {{ formatTimeDisplay(src.time) }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ formatDateDisplay(src.date) }} ·
                  <span class="font-mono">{{ src.abbreviation }}</span>
                  · UTC {{ src.offsetLabel }}
                </p>
                @if (result().utcIso) {
                  <p class="mt-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    {{ result().utcIso }}
                  </p>
                }
              </div>
            }
          </div>

          <!-- TARGETS -->
          <div class="flex flex-col gap-3">
            <div class="flex items-end gap-2">
              <label class="min-w-0 flex-1">
                <span
                  class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
                  >{{ t.map()['LABEL_ADD_ZONE'] }}</span
                >
                <app-zone-picker
                  [zones]="addableZones()"
                  [value]="pendingAdd()"
                  [placeholder]="t.map()['PLACEHOLDER_PICK_ZONE']"
                  [noResultsLabel]="t.map()['ZONE_SEARCH_EMPTY']"
                  (valueChange)="setPendingAdd($event)"
                />
              </label>
              <button
                type="button"
                (click)="addPending()"
                [disabled]="!pendingAdd()"
                class="bg-primary inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 focus:ring-2 focus:ring-offset-1 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">add</span>
                {{ t.map()['LABEL_ADD_ZONE'] }}
              </button>
            </div>

            <div
              class="flex flex-col gap-2"
              role="region"
              [attr.aria-label]="t.map()['RESULT_HEADING']"
            >
              @if (!result().source) {
                <p
                  class="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400"
                >
                  {{ t.map()['RESULT_INVALID'] }}
                </p>
              } @else if (result().targets.length === 0) {
                <p
                  class="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400"
                >
                  {{ t.map()['RESULT_EMPTY'] }}
                </p>
              } @else {
                @for (row of result().targets; track row.zone) {
                  <article
                    class="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {{ zoneLabel(row.zone) }}
                      </p>
                      <p class="text-[10px] text-slate-400 dark:text-slate-500">
                        <span class="font-mono">{{ row.abbreviation }}</span>
                        · UTC {{ row.offsetLabel }} · {{ dayDeltaLabel(row.dayDelta) }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-primary text-xl font-extrabold tabular-nums sm:text-2xl">
                        {{ formatTimeDisplay(row.time) }}
                      </p>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400">
                        {{ formatDateDisplay(row.date) }}
                      </p>
                    </div>
                    <div
                      class="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                    >
                      <button
                        type="button"
                        (click)="promoteToSource(row.zone)"
                        [attr.aria-label]="t.map()['LABEL_SWAP_WITH_SOURCE']"
                        [title]="t.map()['LABEL_SWAP_WITH_SOURCE']"
                        class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <span class="material-symbols-outlined text-base" aria-hidden="true"
                          >swap_horiz</span
                        >
                      </button>
                      <button
                        type="button"
                        (click)="removeTarget(row.zone)"
                        [attr.aria-label]="t.map()['LABEL_REMOVE']"
                        [title]="t.map()['LABEL_REMOVE']"
                        class="rounded-md p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900/40 dark:hover:text-rose-300"
                      >
                        <span class="material-symbols-outlined text-base" aria-hidden="true"
                          >close</span
                        >
                      </button>
                    </div>
                  </article>
                }
              }
            </div>

            <!-- Copy bar -->
            <div
              class="mt-1 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"
            >
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['COPY_FORMAT']
              }}</span>
              <button
                type="button"
                (click)="copy('iso')"
                [disabled]="!result().source"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">tag</span>
                {{ t.map()['COPY_ISO_UTC'] }}
              </button>
              <button
                type="button"
                (click)="copy('local')"
                [disabled]="!result().source"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">schedule</span>
                {{ t.map()['COPY_LOCAL'] }}
              </button>
              <button
                type="button"
                (click)="copy('table')"
                [disabled]="!result().source"
                class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true"
                  >table_view</span
                >
                {{ t.map()['COPY_TABLE'] }}
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
          <span>{{ t.map()['DST_NOTE'] }}</span>
        </p>
      </div>
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
export class TimezoneConverterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private i18n = inject(I18nService);
  private clipboard = inject(ClipboardService);
  private persistence = inject(PersistenceService);

  readonly dateFormatOptions = DATE_FORMAT_OPTIONS;
  readonly timeFormatOptions = TIME_FORMAT_OPTIONS;
  readonly zones = listSupportedZones();
  readonly zoneLabel = zoneLabel;

  // -------------------- State --------------------
  private detected = detectLocalZone();
  private initial = nowInZone(this.detected);

  date = signal<string>(this.initial.date);
  time = signal<string>(this.initial.time);
  sourceZone = signal<string>(this.detected);
  targets = signal<string[]>(DEFAULT_TARGETS.filter((z) => z !== this.detected));
  dateFormat = signal<DateFormat>('iso');
  timeFormat = signal<TimeFormat>('24h');
  pendingAdd = signal<string>('');

  constructor() {
    this.persistence.storage(this.sourceZone, 'tzc-source', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.targets, 'tzc-targets', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.dateFormat, 'tzc-date-format', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.timeFormat, 'tzc-time-format', {
      type: 'string',
      strategy: 'hybrid',
    });
  }

  // -------------------- Setters --------------------
  setDateFormat = (f: DateFormat) => this.dateFormat.set(f);
  setTimeFormat = (f: TimeFormat) => this.timeFormat.set(f);
  setSourceZone = (z: string) => z && this.sourceZone.set(z);
  setPendingAdd = (z: string) => this.pendingAdd.set(z ?? '');

  setDate(value: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) this.date.set(value);
  }
  setTime(value: string) {
    if (/^\d{2}:\d{2}$/.test(value)) this.time.set(value);
  }

  setNow() {
    const now = nowInZone(this.sourceZone());
    this.date.set(now.date);
    this.time.set(now.time);
  }

  useDetectedZone() {
    const z = detectLocalZone();
    this.sourceZone.set(z);
  }

  addPending() {
    const z = this.pendingAdd().trim();
    if (!z) return;
    if (z === this.sourceZone()) return;
    if (this.targets().includes(z)) return;
    this.targets.update((list) => [...list, z]);
    this.pendingAdd.set('');
  }

  removeTarget(zone: string) {
    this.targets.update((list) => list.filter((z) => z !== zone));
  }

  promoteToSource(zone: string) {
    const previousSource = this.sourceZone();
    this.sourceZone.set(zone);
    this.targets.update((list) => {
      const filtered = list.filter((z) => z !== zone);
      if (previousSource && !filtered.includes(previousSource)) {
        filtered.unshift(previousSource);
      }
      return filtered;
    });
  }

  // -------------------- Computed --------------------
  result = computed(() =>
    convert({
      date: this.date(),
      time: this.time(),
      sourceZone: this.sourceZone(),
      targets: this.targets(),
    }),
  );

  addableZones = computed(() => {
    const used = new Set<string>([this.sourceZone(), ...this.targets()]);
    return this.zones.filter((z) => !used.has(z));
  });

  datePlaceholder = computed(() => {
    switch (this.dateFormat()) {
      case 'iso':
        return 'YYYY-MM-DD';
      case 'dmy':
        return 'DD/MM/YYYY';
      case 'mdy':
        return 'MM/DD/YYYY';
      case 'long':
        return 'YYYY-MM-DD';
    }
  });

  dateDisplay = computed(() => formatDate(this.date(), this.dateFormat(), this.locale()));

  // -------------------- Display helpers --------------------
  private locale(): string {
    return this.i18n.currentLang();
  }

  formatDateDisplay(iso: string): string {
    return formatDate(iso, this.dateFormat(), this.locale());
  }

  formatTimeDisplay(time: string): string {
    return formatTime(time, this.timeFormat());
  }

  dayDeltaLabel(delta: number): string {
    const map = this.t.map();
    if (delta === 0) return map['DAY_SAME'];
    if (delta === 1) return map['DAY_NEXT'];
    if (delta === -1) return map['DAY_PREV'];
    const tpl = delta > 0 ? map['DAY_PLUS'] : map['DAY_MINUS'];
    return tpl.replace('{n}', String(Math.abs(delta)));
  }

  commitDate(raw: string) {
    const parsed = this.tryParseDate(raw);
    if (parsed) {
      this.date.set(parsed);
    } else {
      // Force re-render so the input snaps back to the canonical value.
      this.date.set(this.date());
    }
  }

  private tryParseDate(text: string): string | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return this.makeIso(y, m, d);
    }
    const parts = trimmed.split(/[\/\-.]/).map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      let y: number;
      let m: number;
      let d: number;
      const fmt = this.dateFormat();
      if (fmt === 'dmy') {
        [d, m, y] = parts as [number, number, number];
      } else if (fmt === 'mdy') {
        [m, d, y] = parts as [number, number, number];
      } else {
        // iso/long ambiguous: prefer locale.
        const localePrefersDmy = !/^en-US/i.test(this.locale());
        if (localePrefersDmy) [d, m, y] = parts as [number, number, number];
        else [m, d, y] = parts as [number, number, number];
      }
      if (y < 100) y += 2000;
      return this.makeIso(y, m, d);
    }
    if (this.dateFormat() === 'long') {
      const ms = Date.parse(trimmed);
      if (Number.isFinite(ms)) {
        const dt = new Date(ms);
        return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      }
    }
    return null;
  }

  private makeIso(y: number, m: number, d: number): string | null {
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      return null;
    }
    return `${y.toString().padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
  }

  // -------------------- Copy --------------------
  copy(format: 'iso' | 'local' | 'table') {
    const r = this.result();
    if (!r.source) return;
    let text = '';
    if (format === 'iso') {
      text = r.utcIso ?? '';
    } else if (format === 'local') {
      const rows: ConvertedZone[] = [r.source, ...r.targets];
      text = rows
        .map(
          (row) =>
            `${this.formatTimeDisplay(row.time)} ${this.formatDateDisplay(row.date)} (${
              row.abbreviation
            }) — ${zoneLabel(row.zone)}`,
        )
        .join('\n');
    } else {
      const rows: ConvertedZone[] = [r.source, ...r.targets];
      const header = `${this.t.map()['LABEL_SOURCE_ZONE']}\t${this.t.map()['LABEL_DATE']}\t${this.t.map()['LABEL_TIME']}\tUTC`;
      const body = rows
        .map(
          (row) =>
            `${zoneLabel(row.zone)}\t${this.formatDateDisplay(row.date)}\t${this.formatTimeDisplay(
              row.time,
            )}\t${row.offsetLabel}`,
        )
        .join('\n');
      text = `${header}\n${body}`;
    }
    if (text) this.clipboard.copy(text, 'Time Zone Converter');
  }
}
