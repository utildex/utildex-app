import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ZonePickerComponent } from '../../components/zone-picker/zone-picker.component';
import { PersistenceService } from '../../services/persistence.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import {
  type CronField,
  convert,
  detectLocalZone,
  listSupportedZones,
} from './cron-explainer.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface ExampleEntry {
  key: string;
  expression: string;
}

const EXAMPLES: ExampleEntry[] = [
  { key: 'EXAMPLE_HOURLY', expression: '0 * * * *' },
  { key: 'EXAMPLE_BUSINESS', expression: '0 9 * * 1-5' },
  { key: 'EXAMPLE_MIDNIGHT', expression: '@daily' },
  { key: 'EXAMPLE_QUARTER', expression: '*/15 * * * *' },
  { key: 'EXAMPLE_FIRST_OF_MONTH', expression: '0 0 1 * *' },
  { key: 'EXAMPLE_QUARTZ_SECONDS', expression: '*/30 * * * * *' },
];

interface FieldRow {
  labelKey: string;
  field: CronField | null;
}

@Component({
  selector: 'app-cron-explainer',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ZonePickerComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="cron-explainer">
      <div
        class="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Input row -->
        <div class="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <label class="flex flex-col gap-1 lg:col-span-2">
            <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_EXPRESSION']
            }}</span>
            <input
              type="text"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              [value]="expression()"
              [placeholder]="t.map()['LABEL_EXPRESSION_PLACEHOLDER']"
              (input)="setExpression($any($event.target).value)"
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

        <!-- Examples -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{{
            t.map()['EXAMPLES_LABEL']
          }}</span>
          @for (ex of examples; track ex.expression) {
            <button
              type="button"
              (click)="setExpression(ex.expression)"
              [title]="ex.expression"
              class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {{ t.map()[ex.key] }}
            </button>
          }
        </div>

        <!-- Validity / description -->
        @if (!result().valid) {
          <div
            class="flex flex-col gap-1 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          >
            <p class="font-semibold">{{ t.map()['RESULT_INVALID'] }}</p>
            <p class="font-mono text-xs">{{ result().error }}</p>
          </div>
        } @else {
          <section class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                <span class="material-symbols-outlined text-sm" aria-hidden="true">check</span>
                {{ t.map()['RESULT_VALID'] }}
              </span>
              <span class="font-mono text-[11px] text-slate-500">
                {{ t.map()['RESULT_NORMALIZED'] }}:
                <span class="text-slate-700 dark:text-slate-300">{{ result().normalized }}</span>
              </span>
              <button
                type="button"
                (click)="copyValue(result().normalized ?? '')"
                [attr.aria-label]="t.map()['COPY_VALUE']"
                [title]="t.map()['COPY_VALUE']"
                class="glass-control focus:ring-primary inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:text-slate-900 focus:ring-2 focus:outline-none dark:text-slate-300 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true"
                  >content_copy</span
                >
              </button>
            </div>

            <div
              class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <p class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['RESULT_DESCRIPTION'] }}
              </p>
              <p class="text-base font-semibold text-slate-800 dark:text-slate-100">
                {{ result().description }}
              </p>
            </div>

            <!-- Fields breakdown -->
            <section
              class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <h3 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['RESULT_FIELDS'] }}
              </h3>
              <ul class="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
                @for (row of fieldRows(); track row.labelKey) {
                  @if (row.field) {
                    <li class="flex items-center justify-between gap-2 py-1.5">
                      <p
                        class="min-w-[7rem] text-[10px] font-semibold text-slate-500 dark:text-slate-400"
                      >
                        {{ t.map()[row.labelKey] }}
                      </p>
                      <p
                        class="flex-1 truncate font-mono text-sm text-slate-800 tabular-nums dark:text-slate-200"
                      >
                        {{ row.field.raw }}
                        <span class="ml-2 text-[10px] font-normal text-slate-400">
                          {{
                            row.field.isWildcard
                              ? t.map()['ANY']
                              : row.field.values.length + ' • ' + previewValues(row.field)
                          }}
                        </span>
                      </p>
                    </li>
                  }
                }
              </ul>
            </section>

            <!-- Next runs -->
            <section
              class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <div class="flex items-center justify-between">
                <h3 class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['RESULT_NEXT_RUNS'] }}
                </h3>
                <label class="flex items-center gap-2">
                  <span class="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    {{ t.map()['LABEL_COUNT'] }}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    [value]="count()"
                    (input)="setCount(+$any($event.target).value)"
                    class="focus:ring-primary focus:border-primary w-16 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-sm text-slate-900 tabular-nums dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>
              <ol class="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
                @for (run of result().nextRuns; track run.instantMs) {
                  <li class="flex items-center justify-between gap-2 py-1.5">
                    <p class="font-mono text-sm text-slate-800 tabular-nums dark:text-slate-200">
                      {{ run.localLabel }}
                    </p>
                    <p class="text-xs text-slate-500 italic dark:text-slate-400">
                      {{ run.relative }}
                    </p>
                  </li>
                } @empty {
                  <li class="py-2 text-xs text-slate-500 dark:text-slate-400">—</li>
                }
              </ol>
            </section>
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
export class CronExplainerComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private clipboard = inject(ClipboardService);
  private persistence = inject(PersistenceService);

  readonly zones = listSupportedZones();
  readonly examples = EXAMPLES;

  expression = signal<string>('0 9 * * 1-5');
  zone = signal<string>(detectLocalZone());
  count = signal<number>(5);

  // `Date.now()` is captured per render so relative labels stay reasonably fresh.
  private nowTick = signal<number>(Date.now());

  result = computed(() =>
    convert({
      expression: this.expression(),
      zone: this.zone(),
      count: this.boundedCount(),
      fromMs: this.nowTick(),
    }),
  );

  fieldRows = computed<FieldRow[]>(() => {
    const p = this.result().parts;
    if (!p) return [];
    return [
      { labelKey: 'FIELD_SECONDS', field: p.seconds },
      { labelKey: 'FIELD_MINUTES', field: p.minutes },
      { labelKey: 'FIELD_HOURS', field: p.hours },
      { labelKey: 'FIELD_DOM', field: p.dayOfMonth },
      { labelKey: 'FIELD_MONTH', field: p.month },
      { labelKey: 'FIELD_DOW', field: p.dayOfWeek },
      { labelKey: 'FIELD_YEAR', field: p.year },
    ];
  });

  constructor() {
    this.persistence.storage(this.expression, 'cron-expr', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.zone, 'cron-zone', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.count, 'cron-count', { type: 'number', strategy: 'hybrid' });
  }

  setExpression(value: string): void {
    this.expression.set(value);
    this.nowTick.set(Date.now());
  }

  setZone(value: string): void {
    if (value) this.zone.set(value);
  }

  setCount(value: number): void {
    if (Number.isFinite(value)) this.count.set(value);
  }

  copyValue(value: string): void {
    if (!value) return;
    this.clipboard.copy(value, 'cron-explainer');
  }

  previewValues(field: CronField): string {
    const vs = field.values;
    if (vs.length <= 6) return vs.join(', ');
    return `${vs.slice(0, 5).join(', ')}\u2026`;
  }

  private boundedCount(): number {
    const c = this.count();
    if (!Number.isFinite(c)) return 5;
    return Math.min(25, Math.max(1, Math.round(c)));
  }
}
