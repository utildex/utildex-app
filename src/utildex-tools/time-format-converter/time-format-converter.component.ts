import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ZonePickerComponent } from '../../components/zone-picker/zone-picker.component';
import { PersistenceService } from '../../services/persistence.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import {
  type DetectedFormat,
  type FormattedTime,
  convert,
  detectLocalZone,
  listSupportedZones,
} from './time-format-converter.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface OutputRow {
  group: string;
  label: string;
  value: string;
}

const FORMAT_KEY: Record<DetectedFormat, string> = {
  iso8601: 'FORMAT_ISO8601',
  rfc3339: 'FORMAT_RFC3339',
  rfc2822: 'FORMAT_RFC2822',
  'unix-s': 'FORMAT_UNIX_S',
  'unix-ms': 'FORMAT_UNIX_MS',
  'sql-datetime': 'FORMAT_SQL_DATETIME',
  'sql-date': 'FORMAT_SQL_DATE',
  'http-date': 'FORMAT_HTTP_DATE',
  locale: 'FORMAT_LOCALE',
  unknown: 'FORMAT_UNKNOWN',
};

const EXAMPLES = [
  '2026-05-10T12:34:56Z',
  '2026-05-10T14:34:56+02:00',
  'Sun, 10 May 2026 12:34:56 GMT',
  '2026-05-10 12:34:56',
  '1746880496',
  '1746880496789',
];

@Component({
  selector: 'app-time-format-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ZonePickerComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="time-format-converter">
      <div
        class="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Input row -->
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <label class="lg:col-span-2 flex flex-col gap-1">
            <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_INPUT']
            }}</span>
            <input
              type="text"
              spellcheck="false"
              autocomplete="off"
              [value]="raw()"
              [placeholder]="t.map()['LABEL_INPUT_PLACEHOLDER']"
              (input)="setRaw($any($event.target).value)"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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

        <!-- Quick actions + examples -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            (click)="setNow()"
            class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 dark:text-slate-200 dark:hover:text-white"
          >
            <span class="material-symbols-outlined text-base" aria-hidden="true">schedule</span>
            {{ t.map()['LABEL_NOW'] }}
          </button>
          <span class="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{{
            t.map()['EXAMPLES_LABEL']
          }}</span>
          @for (ex of examples; track ex) {
            <button
              type="button"
              (click)="setRaw(ex)"
              class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {{ ex }}
            </button>
          }
        </div>

        <!-- Detected / invalid -->
        @if (!result().valid) {
          <p
            class="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          >
            {{ t.map()['RESULT_INVALID'] }}
          </p>
        } @else if (result().formatted; as f) {
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['RESULT_DETECTED'] }}:
              <span
                class="ml-1 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] normal-case text-primary"
              >
                {{ detectedLabel() }}
              </span>
              <span class="ml-2 font-mono normal-case text-slate-400">{{ f.zone }} · UTC {{ f.offsetLabel }}</span>
            </p>
            <button
              type="button"
              (click)="copyAll(f)"
              class="bg-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 focus:ring-2 focus:ring-offset-1 focus:outline-none active:scale-95"
            >
              <span class="material-symbols-outlined text-base" aria-hidden="true">content_copy</span>
              {{ t.map()['COPY_ALL'] }}
            </button>
          </div>

          <!-- Output rows grouped -->
          @for (group of grouped(); track group.title) {
            <section
              class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <h3 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {{ group.title }}
              </h3>
              <ul class="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
                @for (row of group.rows; track row.label) {
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
            </section>
          }
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
export class TimeFormatConverterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private clipboard = inject(ClipboardService);
  private persistence = inject(PersistenceService);

  readonly zones = listSupportedZones();
  readonly examples = EXAMPLES;

  private detected = detectLocalZone();

  raw = signal<string>('2026-05-10T12:34:56Z');
  zone = signal<string>(this.detected);

  result = computed(() => convert({ raw: this.raw(), zone: this.zone() }));

  detectedLabel = computed(() => {
    const fmt = this.result().detectedFormat;
    return this.t.map()[FORMAT_KEY[fmt]] ?? fmt;
  });

  grouped = computed<{ title: string; rows: OutputRow[] }[]>(() => {
    const f = this.result().formatted;
    if (!f) return [];
    const m = this.t.map();
    return [
      {
        title: m['GROUP_INTERNET'],
        rows: [
          { group: 'internet', label: m['ROW_ISO_UTC'], value: f.iso8601Utc },
          { group: 'internet', label: m['ROW_ISO_LOCAL'], value: f.iso8601Local },
          { group: 'internet', label: m['ROW_RFC2822'], value: f.rfc2822 },
          { group: 'internet', label: m['ROW_HTTP'], value: f.httpDate },
        ],
      },
      {
        title: m['GROUP_EPOCH'],
        rows: [
          { group: 'epoch', label: m['ROW_UNIX_S'], value: String(f.unixSeconds) },
          { group: 'epoch', label: m['ROW_UNIX_MS'], value: String(f.unixMilliseconds) },
        ],
      },
      {
        title: m['GROUP_SQL'],
        rows: [
          { group: 'sql', label: m['ROW_SQL_UTC'], value: f.sqlDateTimeUtc },
          { group: 'sql', label: m['ROW_SQL_LOCAL'], value: f.sqlDateTimeLocal },
          { group: 'sql', label: m['ROW_SQL_DATE'], value: f.sqlDate },
        ],
      },
      {
        title: m['GROUP_LOCALE'],
        rows: [
          { group: 'locale', label: m['ROW_LOCALE_SHORT'], value: f.localeShort },
          { group: 'locale', label: m['ROW_LOCALE_LONG'], value: f.localeLong },
        ],
      },
    ];
  });

  constructor() {
    this.persistence.storage(this.raw, 'tfc-input', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.zone, 'tfc-zone', { type: 'string', strategy: 'hybrid' });
  }

  setRaw(value: string): void {
    this.raw.set(value);
  }

  setZone(value: string): void {
    if (value) this.zone.set(value);
  }

  setNow(): void {
    this.raw.set(new Date().toISOString());
  }

  copyValue(value: string): void {
    this.clipboard.copy(value, 'time-format-converter');
  }

  copyAll(f: FormattedTime): void {
    const m = this.t.map();
    const lines = [
      `${m['ROW_ISO_UTC']}: ${f.iso8601Utc}`,
      `${m['ROW_ISO_LOCAL']}: ${f.iso8601Local}`,
      `${m['ROW_RFC2822']}: ${f.rfc2822}`,
      `${m['ROW_HTTP']}: ${f.httpDate}`,
      `${m['ROW_UNIX_S']}: ${f.unixSeconds}`,
      `${m['ROW_UNIX_MS']}: ${f.unixMilliseconds}`,
      `${m['ROW_SQL_UTC']}: ${f.sqlDateTimeUtc}`,
      `${m['ROW_SQL_LOCAL']}: ${f.sqlDateTimeLocal}`,
      `${m['ROW_SQL_DATE']}: ${f.sqlDate}`,
      `${m['ROW_LOCALE_SHORT']}: ${f.localeShort}`,
      `${m['ROW_LOCALE_LONG']}: ${f.localeLong}`,
    ];
    this.clipboard.copy(lines.join('\n'), 'time-format-converter');
  }
}
