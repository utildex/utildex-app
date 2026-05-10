import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ZonePickerComponent } from '../../components/zone-picker/zone-picker.component';
import { PersistenceService } from '../../services/persistence.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import {
  type EpochUnit,
  type FormattedTimestamp,
  type ParseUnit,
  convert,
  detectLocalZone,
  listSupportedZones,
} from './timestamp-converter.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type Mode = 'parse' | 'compose';

const UNIT_OPTIONS: { id: ParseUnit; key: string }[] = [
  { id: 'auto', key: 'UNIT_AUTO' },
  { id: 's', key: 'UNIT_S' },
  { id: 'ms', key: 'UNIT_MS' },
  { id: 'us', key: 'UNIT_US' },
  { id: 'ns', key: 'UNIT_NS' },
];

const UNIT_KEY: Record<EpochUnit, string> = {
  s: 'UNIT_S',
  ms: 'UNIT_MS',
  us: 'UNIT_US',
  ns: 'UNIT_NS',
};

interface CopyRow {
  label: string;
  value: string;
  mono?: boolean;
}

@Component({
  selector: 'app-timestamp-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ZonePickerComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="timestamp-converter">
      <div
        class="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Mode toggle -->
        <div
          class="inline-flex w-full max-w-md self-start rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'parse'"
            (click)="setMode('parse')"
            [class]="modeButtonClass(mode() === 'parse')"
          >
            {{ t.map()['MODE_PARSE'] }}
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'compose'"
            (click)="setMode('compose')"
            [class]="modeButtonClass(mode() === 'compose')"
          >
            {{ t.map()['MODE_COMPOSE'] }}
          </button>
        </div>

        <!-- INPUT -->
        @if (mode() === 'parse') {
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label class="sm:col-span-2 flex flex-col gap-1">
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_TIMESTAMP']
              }}</span>
              <input
                type="text"
                inputmode="numeric"
                spellcheck="false"
                autocomplete="off"
                [value]="raw()"
                [placeholder]="t.map()['LABEL_TIMESTAMP_PLACEHOLDER']"
                (input)="setRaw($any($event.target).value)"
                class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_UNIT']
              }}</span>
              <select
                [ngModel]="unit()"
                (ngModelChange)="setUnit($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                @for (opt of unitOptions; track opt.id) {
                  <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
                }
              </select>
            </label>
          </div>
          @if (unit() === 'auto' && result().detectedUnit) {
            <p class="text-[10px] text-slate-400 dark:text-slate-500">
              {{ detectedHint() }}
            </p>
          }
        } @else {
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_DATE']
              }}</span>
              <input
                type="date"
                [value]="composeDate()"
                (change)="setComposeDate($any($event.target).value)"
                class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_TIME']
              }}</span>
              <input
                type="time"
                step="1"
                [value]="composeTime()"
                (change)="setComposeTime($any($event.target).value)"
                class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-sm tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_ZONE']
              }}</span>
              <app-zone-picker
                [zones]="zones"
                [value]="zone()"
                [placeholder]="t.map()['ZONE_SEARCH_PLACEHOLDER']"
                [noResultsLabel]="t.map()['ZONE_SEARCH_EMPTY']"
                (valueChange)="setZone($event)"
              />
            </label>
          </div>
        }

        <!-- Quick actions -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            (click)="setNow()"
            class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 dark:text-slate-200 dark:hover:text-white"
          >
            <span class="material-symbols-outlined text-base" aria-hidden="true">schedule</span>
            {{ t.map()['LABEL_NOW'] }}
          </button>
          @if (mode() === 'parse') {
            <label class="flex flex-col gap-1 sm:min-w-[16rem] flex-1">
              <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_ZONE']
              }}</span>
              <app-zone-picker
                [zones]="zones"
                [value]="zone()"
                [placeholder]="t.map()['ZONE_SEARCH_PLACEHOLDER']"
                [noResultsLabel]="t.map()['ZONE_SEARCH_EMPTY']"
                (valueChange)="setZone($event)"
              />
            </label>
          }
          <button
            type="button"
            (click)="useLocalZone()"
            class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 dark:text-slate-200 dark:hover:text-white self-end"
          >
            <span class="material-symbols-outlined text-base" aria-hidden="true">my_location</span>
            {{ t.map()['LABEL_USE_LOCAL'] }}
          </button>
        </div>

        <!-- RESULT -->
        @if (!result().valid) {
          <p
            class="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          >
            {{ mode() === 'parse' ? t.map()['RESULT_INVALID'] : t.map()['RESULT_INVALID_DATE'] }}
          </p>
        } @else if (result().formatted; as f) {
          <section class="flex flex-col gap-3">
            <header class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['RESULT_HEADING'] }}
              </h2>
              <button
                type="button"
                (click)="copyAll(f)"
                class="bg-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 focus:ring-2 focus:ring-offset-1 focus:outline-none active:scale-95"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true"
                  >content_copy</span
                >
                {{ t.map()['COPY_ALL'] }}
              </button>
            </header>

            <!-- Hero rows: UTC, selected zone, local, ISO -->
            <div class="grid grid-cols-1 gap-2 lg:grid-cols-3">
              <div
                class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['RESULT_UTC'] }}
                </p>
                <p class="text-primary text-xl font-extrabold tabular-nums">
                  {{ f.utcTime }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ f.utcDate }}</p>
              </div>
              <div
                class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['RESULT_ZONE'] }}
                  <span class="ml-1 font-mono normal-case text-slate-400">{{ f.zone }}</span>
                </p>
                <p class="text-xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
                  {{ f.zoneTime }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ f.zoneDate }} · {{ f.weekday }} · UTC {{ f.offsetLabel }}
                </p>
              </div>
              <div
                class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['RESULT_LOCAL'] }}
                </p>
                <p class="text-xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
                  {{ f.localTime }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ f.localDate }} ·
                  <span class="italic">{{ f.relative }}</span>
                </p>
              </div>
            </div>

            <!-- ISO + epoch values -->
            <div class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/40">
              <div
                class="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700"
              >
                <div class="min-w-0">
                  <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {{ t.map()['RESULT_ISO'] }}
                  </p>
                  <p class="truncate font-mono text-sm text-slate-800 dark:text-slate-200">
                    {{ f.utcIso }}
                  </p>
                </div>
                <button
                  type="button"
                  (click)="copyValue(f.utcIso)"
                  [attr.aria-label]="t.map()['COPY_VALUE']"
                  [title]="t.map()['COPY_VALUE']"
                  class="glass-control focus:ring-primary inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:text-slate-900 focus:ring-2 focus:outline-none dark:text-slate-300 dark:hover:text-white"
                >
                  <span class="material-symbols-outlined text-base" aria-hidden="true"
                    >content_copy</span
                  >
                </button>
              </div>

              <p class="pt-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['RESULT_EPOCH'] }}
              </p>
              <ul class="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
                @for (row of epochRows(f); track row.label) {
                  <li class="flex items-center justify-between gap-2 py-1.5">
                    <div class="min-w-0">
                      <p class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {{ row.label }}
                      </p>
                      <p
                        class="truncate font-mono text-sm tabular-nums text-slate-800 dark:text-slate-200"
                      >
                        {{ row.value }}
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="copyValue(row.value)"
                      [attr.aria-label]="t.map()['COPY_VALUE']"
                      [title]="t.map()['COPY_VALUE']"
                      class="glass-control focus:ring-primary inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:text-slate-900 focus:ring-2 focus:outline-none dark:text-slate-300 dark:hover:text-white"
                    >
                      <span class="material-symbols-outlined text-base" aria-hidden="true"
                        >content_copy</span
                      >
                    </button>
                  </li>
                }
              </ul>
            </div>
          </section>
        }

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
export class TimestampConverterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private clipboard = inject(ClipboardService);
  private persistence = inject(PersistenceService);

  readonly unitOptions = UNIT_OPTIONS;
  readonly zones = listSupportedZones();

  private detected = detectLocalZone();

  // Mode + shared
  mode = signal<Mode>('parse');
  zone = signal<string>(this.detected);

  // Parse mode
  raw = signal<string>(String(Date.now()));
  unit = signal<ParseUnit>('auto');

  // Compose mode
  composeDate = signal<string>('');
  composeTime = signal<string>('');

  constructor() {
    this.persistence.storage(this.mode, 'tsc-mode', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.zone, 'tsc-zone', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.unit, 'tsc-unit', { type: 'string', strategy: 'hybrid' });

    // Seed compose fields from "now" once if empty.
    effect(() => {
      if (!this.composeDate() || !this.composeTime()) {
        const now = new Date();
        const z = this.zone();
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: z,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        const parts = fmt.formatToParts(now);
        const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
        let hour = get('hour');
        if (hour === '24') hour = '00';
        if (!this.composeDate()) {
          this.composeDate.set(`${get('year')}-${get('month')}-${get('day')}`);
        }
        if (!this.composeTime()) {
          this.composeTime.set(`${hour}:${get('minute')}:${get('second')}`);
        }
      }
    });
  }

  // -------- Setters --------
  setMode = (m: Mode) => this.mode.set(m);
  setRaw = (v: string) => this.raw.set(v);
  setUnit = (u: ParseUnit) => this.unit.set(u);
  setZone = (z: string) => z && this.zone.set(z);
  setComposeDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && this.composeDate.set(v);
  setComposeTime = (v: string) => {
    if (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) {
      // Normalize to HH:MM:SS
      this.composeTime.set(v.length === 5 ? `${v}:00` : v);
    }
  };

  setNow() {
    const now = Date.now();
    if (this.mode() === 'parse') {
      this.raw.set(String(now));
      if (this.unit() !== 'auto') this.unit.set('ms');
    } else {
      const z = this.zone();
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: z,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = fmt.formatToParts(new Date(now));
      const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
      let hour = get('hour');
      if (hour === '24') hour = '00';
      this.composeDate.set(`${get('year')}-${get('month')}-${get('day')}`);
      this.composeTime.set(`${hour}:${get('minute')}:${get('second')}`);
    }
  }

  useLocalZone = () => this.zone.set(detectLocalZone());

  modeButtonClass(active: boolean): string {
    const base =
      'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none';
    return active
      ? `${base} bg-primary text-white shadow-sm`
      : `${base} text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white`;
  }

  // -------- Computed --------
  result = computed(() => {
    if (this.mode() === 'parse') {
      return convert({
        mode: 'parse',
        raw: this.raw(),
        unit: this.unit(),
        zone: this.zone(),
      });
    }
    return convert({
      mode: 'compose',
      date: this.composeDate(),
      time: this.composeTime(),
      zone: this.zone(),
    });
  });

  detectedHint(): string {
    const detected = this.result().detectedUnit;
    if (!detected) return '';
    return this.t.map()['DETECTED_AS'].replace('{unit}', this.t.map()[UNIT_KEY[detected]]);
  }

  epochRows(f: FormattedTimestamp): CopyRow[] {
    const m = this.t.map();
    return [
      { label: m['RESULT_SECONDS'], value: String(f.epochSeconds) },
      { label: m['RESULT_MILLISECONDS'], value: String(f.epochMilliseconds) },
      { label: m['RESULT_MICROSECONDS'], value: f.epochMicroseconds },
      { label: m['RESULT_NANOSECONDS'], value: f.epochNanoseconds },
    ];
  }

  // -------- Copy --------
  copyValue(value: string) {
    if (value) this.clipboard.copy(value, 'Unix Timestamp Converter');
  }

  copyAll(f: FormattedTimestamp) {
    const m = this.t.map();
    const lines = [
      `${m['RESULT_ISO']}: ${f.utcIso}`,
      `${m['RESULT_UTC']}: ${f.utcDate} ${f.utcTime}`,
      `${m['RESULT_ZONE']} (${f.zone}): ${f.zoneDate} ${f.zoneTime} (UTC ${f.offsetLabel})`,
      `${m['RESULT_LOCAL']}: ${f.localDate} ${f.localTime}`,
      `${m['RESULT_RELATIVE']}: ${f.relative}`,
      '',
      `${m['RESULT_SECONDS']}: ${f.epochSeconds}`,
      `${m['RESULT_MILLISECONDS']}: ${f.epochMilliseconds}`,
      `${m['RESULT_MICROSECONDS']}: ${f.epochMicroseconds}`,
      `${m['RESULT_NANOSECONDS']}: ${f.epochNanoseconds}`,
    ];
    this.clipboard.copy(lines.join('\n'), 'Unix Timestamp Converter');
  }
}
