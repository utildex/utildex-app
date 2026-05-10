import { Component, computed, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { PersistenceService } from '../../services/persistence.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import {
  classify,
  compute,
  resolveThresholds,
  waistRiskCutoffCm,
  type LengthUnit,
  type Sex,
  type Tier,
} from './whr-calculator.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface TierStyle {
  text: string;
  ring: string;
  dot: string;
}

const TIER_STYLE: Record<Tier, TierStyle> = {
  low: {
    text: 'text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-500 ring-emerald-300',
  },
  moderate: {
    text: 'text-yellow-600 dark:text-yellow-300',
    ring: 'ring-yellow-400/30',
    dot: 'bg-yellow-400 ring-yellow-200',
  },
  high: {
    text: 'text-red-600 dark:text-red-300',
    ring: 'ring-red-600/30',
    dot: 'bg-red-600 ring-red-300',
  },
};

const DEFAULT_PROFILE = {
  sex: 'female' as Sex,
  age: 35,
};

@Component({
  selector: 'app-whr-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="whr-calculator">
      <div
        class="whr-card mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Top row: waist + hip + shared unit (single line on md+) -->
        <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start">
          <div>
            <label
              for="whr-waist"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['WAIST_LABEL'] }}
            </label>
            <input
              id="whr-waist"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.1"
              [ngModel]="waistInput()"
              (ngModelChange)="waistInput.set($event)"
              class="focus:ring-primary focus:border-primary w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <p class="mt-0.5 min-h-[0.875rem] text-[10px] text-slate-500 dark:text-slate-400">
              {{ t.map()['WAIST_HINT'] }}
            </p>
          </div>

          <div>
            <label
              for="whr-hip"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['HIP_LABEL'] }}
            </label>
            <input
              id="whr-hip"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.1"
              [ngModel]="hipInput()"
              (ngModelChange)="hipInput.set($event)"
              class="focus:ring-primary focus:border-primary w-full min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <p class="mt-0.5 min-h-[0.875rem] text-[10px] text-slate-500 dark:text-slate-400">
              {{ t.map()['HIP_HINT'] }}
            </p>
          </div>

          <div class="md:pt-[22px]">
            <label
              for="whr-unit"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase md:sr-only"
            >
              {{ t.map()['UNIT_TOGGLE'] }}
            </label>
            <select
              id="whr-unit"
              [ngModel]="unit()"
              (ngModelChange)="setUnit($event)"
              [attr.aria-label]="t.map()['UNIT_TOGGLE']"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="cm">{{ t.map()['UNIT_CM'] }}</option>
              <option value="in">{{ t.map()['UNIT_IN'] }}</option>
            </select>
          </div>
        </div>

        <!-- Centered primary result -->
        <div
          id="whr-panel-primary"
          role="region"
          [attr.aria-label]="t.map()['PRIMARY_RESULT_LABEL']"
          class="flex flex-col items-center justify-center gap-1 py-4"
        >
          <p class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {{ t.map()['PRIMARY_RESULT_LABEL'] }}
          </p>
          <span
            class="text-6xl leading-none font-extrabold tabular-nums md:text-7xl"
            [class]="
              primaryTier()
                ? tierStyleFor(primaryTier()).text
                : 'text-slate-300 dark:text-slate-600'
            "
            aria-live="polite"
          >
            {{ primaryDisplay() }}
          </span>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ t.map()['RESULT_HINT'] }}
          </p>

          @if (hasInputs() && tierLabel()) {
            <p class="mt-1 text-sm font-semibold" [class]="tierStyleFor(primaryTier()).text">
              {{ tierLabel() }}
            </p>
          }

          @if (hasInputs() && waistLabel()) {
            <p
              class="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"
              [attr.aria-label]="t.map()['SECONDARY_RESULTS_LABEL']"
            >
              <span class="material-symbols-outlined text-xs" aria-hidden="true">straighten</span>
              <span class="font-semibold">{{ t.map()['WAIST_CIRCUMFERENCE_LABEL'] }}:</span>
              <span class="tabular-nums">{{ waistLabel() }}</span>
            </p>
          }
        </div>

        <!-- Interpretation: gradient axis + summary -->
        <div
          aria-labelledby="whr-interpret-heading"
          class="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/40"
        >
          <div class="flex items-center justify-between gap-2">
            <h2
              id="whr-interpret-heading"
              class="text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['INTERPRETATION_HEADING'] }}
            </h2>
            @if (isUsingDefaultProfile()) {
              <span
                class="profile-defaults-badge inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                role="status"
              >
                <span class="material-symbols-outlined text-xs" aria-hidden="true">info</span>
                {{ t.map()['PROFILE_DEFAULTS_BADGE'] }}
              </span>
            }
          </div>

          @if (axisVisible() && gradientPercent() !== null) {
            <div class="mt-3" role="img" [attr.aria-label]="axisAriaLabel()">
              <div class="whr-gradient relative h-3 w-full overflow-visible rounded-full">
                <div
                  class="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full shadow-md ring-2 ring-white transition-[left] duration-500 dark:ring-slate-900"
                  [class]="primaryTier() ? tierStyleFor(primaryTier()).dot : 'bg-slate-400'"
                  [style.left.%]="gradientPercent()"
                ></div>
              </div>
              <div
                class="mt-1 flex justify-between text-[10px] font-semibold tracking-wider uppercase"
              >
                <span class="text-emerald-600 dark:text-emerald-300">
                  {{ t.map()['AXIS_LEFT_LABEL'] }}
                </span>
                <span class="text-red-600 dark:text-red-300">
                  {{ t.map()['AXIS_RIGHT_LABEL'] }}
                </span>
              </div>
            </div>
          }

          @if (interpretation(); as info) {
            <p class="mt-3 text-sm text-slate-700 dark:text-slate-200">
              {{ info.summary }}
            </p>

            @if (info.notes.length > 0) {
              <div class="mt-2 flex flex-wrap gap-1.5">
                @for (note of info.notes; track note) {
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                  >
                    <span
                      class="material-symbols-outlined text-xs text-amber-500"
                      aria-hidden="true"
                      >info</span
                    >
                    {{ note }}
                  </span>
                }
              </div>
            }
          } @else {
            <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {{ t.map()['ENTER_BOTH_HINT'] }}
            </p>
          }
        </div>

        <!-- Profile row: 2 inputs horizontal -->
        <div>
          <div class="mb-2 flex items-center gap-2">
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['PROFILE_HEADING'] }}
            </h2>
            @if (isUsingDefaultProfile()) {
              <span class="text-[10px] text-amber-700 dark:text-amber-300">
                {{ t.map()['PROFILE_DEFAULTS_HINT_SHORT'] }}
              </span>
            }
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="mb-0.5 flex items-center gap-1">
                <label
                  for="whr-sex"
                  class="block text-[10px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {{ t.map()['PROFILE_SEX'] }}
                </label>
                <span
                  class="material-symbols-outlined cursor-help text-[14px] leading-none text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  tabindex="0"
                  role="img"
                  [attr.aria-label]="t.map()['WHY_SEX']"
                  [title]="t.map()['WHY_SEX']"
                  >info</span
                >
              </div>
              <select
                id="whr-sex"
                [ngModel]="sex()"
                (ngModelChange)="setSex($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="female">{{ t.map()['PROFILE_SEX_FEMALE'] }}</option>
                <option value="male">{{ t.map()['PROFILE_SEX_MALE'] }}</option>
              </select>
            </div>

            <div>
              <div class="mb-0.5 flex items-center gap-1">
                <label
                  for="whr-age"
                  class="block text-[10px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {{ t.map()['PROFILE_AGE'] }}
                </label>
                <span
                  class="material-symbols-outlined cursor-help text-[14px] leading-none text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  tabindex="0"
                  role="img"
                  [attr.aria-label]="t.map()['WHY_AGE']"
                  [title]="t.map()['WHY_AGE']"
                  >info</span
                >
              </div>
              <input
                id="whr-age"
                type="number"
                inputmode="numeric"
                min="2"
                max="120"
                [ngModel]="age()"
                (ngModelChange)="setAge($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        <!-- Footer: methodology btn + privacy + action bar -->
        <div
          class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"
        >
          <button
            type="button"
            (click)="openMethodology()"
            class="text-primary focus:ring-primary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline focus:ring-2 focus:outline-none"
          >
            <span class="material-symbols-outlined text-sm" aria-hidden="true">info</span>
            {{ t.map()['METHODOLOGY_BUTTON'] }}
          </button>
          <span
            class="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"
          >
            <span class="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
            {{ t.map()['PRIVACY_NOTE'] }}
          </span>
          @if (hasInputs()) {
            <div class="ml-auto">
              <app-action-bar
                [content]="exportText()"
                [filename]="t.map()['EXPORT_FILENAME']"
                source="WHR Calculator"
              ></app-action-bar>
            </div>
          }
        </div>

        <p class="text-[10px] text-slate-400">{{ t.map()['DISCLAIMER'] }}</p>
      </div>

      <!-- Methodology modal -->
      @if (methodologyOpen()) {
        <div
          class="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whr-modal-title"
          (click)="closeMethodology()"
        >
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true"></div>
          <div
            class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-start justify-between gap-3">
              <h2 id="whr-modal-title" class="text-lg font-bold text-slate-900 dark:text-slate-100">
                {{ t.map()['METHOD_HEADING'] }}
              </h2>
              <button
                type="button"
                (click)="closeMethodology()"
                [attr.aria-label]="t.map()['MODAL_CLOSE']"
                class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              >
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <div class="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>{{ t.map()['METHOD_BODY'] }}</p>
              <ul
                class="space-y-1 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <li>{{ t.map()['METHOD_FORMULA'] }}</li>
              </ul>
              <p>{{ t.map()['METHOD_THRESHOLDS'] }}</p>
              <p>{{ t.map()['METHOD_LIMITATIONS'] }}</p>

              <h3 class="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                {{ t.map()['REFERENCES_HEADING'] }}
              </h3>
              <ul class="space-y-2 text-xs">
                <li>
                  <a
                    href="https://www.who.int/publications/i/item/9789241501491"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_WHO_2008'] }}
                  </a>
                </li>
                <li class="text-slate-600 dark:text-slate-300">
                  {{ t.map()['REF_WHO_2011'] }}
                </li>
                <li>
                  <a
                    href="https://doi.org/10.1161/CIRCULATIONAHA.111.067264"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_DESPRES_2012'] }}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      }
    </app-tool-layout>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Color gradient: green (low) -> yellow (moderate) -> red (high) */
      .whr-gradient {
        background: linear-gradient(
          to right,
          rgb(16 185 129) 0%,
          rgb(132 204 22) 30%,
          rgb(250 204 21) 55%,
          rgb(249 115 22) 80%,
          rgb(220 38 38) 100%
        );
      }

      .profile-defaults-badge {
        animation: whr-badge-pulse 2s ease-in-out infinite;
      }

      @keyframes whr-badge-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .profile-defaults-badge {
          animation: none;
        }
      }
    `,
  ],
})
export class WhrCalculatorComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private persistence = inject(PersistenceService);

  // Clinical state (persisted)
  waistInput = signal<number | null>(null);
  hipInput = signal<number | null>(null);
  unit = signal<LengthUnit>('cm');

  methodologyOpen = signal(false);

  // Profile (persisted)
  sex = signal<Sex>(DEFAULT_PROFILE.sex);
  age = signal<number>(DEFAULT_PROFILE.age);

  constructor() {
    this.persistence.storage(this.waistInput, 'whr-waist-input', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.hipInput, 'whr-hip-input', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.unit, 'whr-unit', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.sex, 'whr-sex', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.age, 'whr-age', { type: 'number', strategy: 'hybrid' });
  }

  /* ---------------------- Computed inputs / outputs ---------------------- */

  hasInputs = computed(
    () =>
      this.waistInput() !== null &&
      this.hipInput() !== null &&
      Number(this.waistInput()) > 0 &&
      Number(this.hipInput()) > 0,
  );

  results = computed(() =>
    compute({
      waist: Number(this.waistInput() ?? 0),
      hip: Number(this.hipInput() ?? 0),
      unit: this.unit(),
    }),
  );

  profile = computed(() => ({ sex: this.sex(), age: this.age() }));

  resolved = computed(() => resolveThresholds(this.profile()));

  isUsingDefaultProfile = computed(() => {
    const p = this.profile();
    return p.sex === DEFAULT_PROFILE.sex && p.age === DEFAULT_PROFILE.age;
  });

  primaryDisplay = computed(() => {
    const v = this.results().whr;
    if (v === null || !Number.isFinite(v)) return this.t.map()['RESULT_PLACEHOLDER'] ?? '—';
    return v.toFixed(2);
  });

  primaryTier = computed<Tier | null>(() => {
    if (!this.hasInputs()) return null;
    if (this.resolved().adjustments.pediatricBlocked) return null;
    const v = this.results().whr;
    if (v === null) return null;
    return classify(v, this.resolved().thresholds);
  });

  axisVisible = computed(() => this.hasInputs() && !this.resolved().adjustments.pediatricBlocked);

  /** Position 0..100 of marker. Maps WHR 0.65..1.10 across the axis. */
  gradientPercent = computed<number | null>(() => {
    if (!this.axisVisible()) return null;
    const v = this.results().whr;
    if (v === null) return null;
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    return clamp(((v - 0.65) / (1.1 - 0.65)) * 100);
  });

  axisAriaLabel = computed(() => {
    const map = this.t.map();
    return `${map['INTERPRETATION_HEADING']}: ${this.primaryDisplay()}`;
  });

  tierLabel = computed(() => {
    const tier = this.primaryTier();
    if (!tier) return '';
    const map = this.t.map();
    return map[`TIER_${tier.toUpperCase()}`] ?? tier;
  });

  /** Localized waist measurement display, including unit. */
  waistLabel = computed(() => {
    const r = this.results();
    if (r.waistCm === null) return '';
    if (this.unit() === 'in') {
      return `${(r.waistCm / 2.54).toFixed(1)} ${this.t.map()['UNIT_IN']}`;
    }
    return `${r.waistCm.toFixed(1)} ${this.t.map()['UNIT_CM']}`;
  });

  interpretation = computed<{ summary: string; notes: string[] } | null>(() => {
    if (!this.hasInputs()) return null;
    const adj = this.resolved().adjustments;
    const map = this.t.map();
    const notes: string[] = [];

    if (adj.pediatricBlocked) {
      return { summary: map['NOTE_PEDIATRIC_BLOCKED'], notes: [] };
    }

    // Waist circumference action threshold note (WHO).
    const r = this.results();
    if (r.waistCm !== null) {
      const cutoff = waistRiskCutoffCm(this.sex());
      notes.push(r.waistCm >= cutoff ? map['WAIST_RISK_NOTE_HIGH'] : map['WAIST_RISK_NOTE_OK']);
    }

    if (adj.olderAdultNote) notes.push(map['NOTE_OLDER_ADULT']);

    const tier = this.primaryTier();
    let summary = '';
    if (tier) summary = map[`SUMMARY_${tier.toUpperCase()}`] ?? '';

    return { summary, notes };
  });

  exportText = computed(() => {
    const map = this.t.map();
    const r = this.results();
    const fmt = (v: number | null, digits = 2) =>
      v === null || !Number.isFinite(v) ? '—' : v.toFixed(digits);
    const lines = [
      `${map['WAIST_LABEL']}: ${this.waistInput()} ${this.unit()}`,
      `${map['HIP_LABEL']}: ${this.hipInput()} ${this.unit()}`,
      '',
      `${map['PRIMARY_RESULT_LABEL']}: ${fmt(r.whr)}`,
      `${map['INTERPRETATION_HEADING']}: ${this.tierLabel()}`,
      r.waistCm !== null ? `${map['WAIST_CIRCUMFERENCE_LABEL']}: ${r.waistCm.toFixed(1)} cm` : '',
      '',
      `${map['PROFILE_HEADING']}: ${this.sex() === 'female' ? map['PROFILE_SEX_FEMALE'] : map['PROFILE_SEX_MALE']} · ${map['PROFILE_AGE']}: ${this.age()}`,
      '',
      map['DISCLAIMER'],
      map['PRIVACY_NOTE'],
    ].filter(Boolean);
    return lines.join('\n');
  });

  /* -------------------------- Helpers ------------------------------------ */

  tierStyleFor(tier: Tier | null): TierStyle {
    return TIER_STYLE[tier ?? 'low'];
  }

  setUnit(value: LengthUnit) {
    this.unit.set(value);
  }

  setSex(value: Sex) {
    this.sex.set(value);
  }

  setAge(value: number | string) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) this.age.set(n);
  }

  /* -------------------- Modal ------------------------------------------- */

  openMethodology() {
    this.methodologyOpen.set(true);
  }

  closeMethodology() {
    this.methodologyOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.methodologyOpen()) this.closeMethodology();
  }
}
