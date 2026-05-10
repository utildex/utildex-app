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
  healthyWeightRangeKg,
  resolveThresholds,
  type HeightUnit,
  type Sex,
  type Standard,
  type Tier,
  type WeightUnit,
} from './bmi-calculator.kernel';
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
  underweight: {
    text: 'text-blue-600 dark:text-blue-300',
    ring: 'ring-blue-500/30',
    dot: 'bg-blue-500 ring-blue-200',
  },
  normal: {
    text: 'text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-500 ring-emerald-300',
  },
  overweight: {
    text: 'text-yellow-600 dark:text-yellow-300',
    ring: 'ring-yellow-400/30',
    dot: 'bg-yellow-400 ring-yellow-200',
  },
  obese_i: {
    text: 'text-orange-600 dark:text-orange-300',
    ring: 'ring-orange-500/30',
    dot: 'bg-orange-500 ring-orange-200',
  },
  obese_ii: {
    text: 'text-red-600 dark:text-red-300',
    ring: 'ring-red-600/30',
    dot: 'bg-red-600 ring-red-300',
  },
  obese_iii: {
    text: 'text-red-700 dark:text-red-400',
    ring: 'ring-red-700/30',
    dot: 'bg-red-700 ring-red-300',
  },
};

const DEFAULT_PROFILE = {
  sex: 'female' as Sex,
  age: 35,
  standard: 'who' as Standard,
};

@Component({
  selector: 'app-bmi-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="bmi-calculator">
      <div
        class="bmi-card mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Top row: height + weight (single line on md+) -->
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start">
          <div>
            <label
              for="bmi-height"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['HEIGHT_LABEL'] }}
            </label>
            <div class="flex items-stretch gap-1.5">
              <input
                id="bmi-height"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.1"
                [ngModel]="heightInput()"
                (ngModelChange)="heightInput.set($event)"
                [attr.aria-describedby]="'bmi-height-converted'"
                class="focus:ring-primary focus:border-primary min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <select
                [ngModel]="heightUnit()"
                (ngModelChange)="setHeightUnit($event)"
                [attr.aria-label]="t.map()['UNIT_TOGGLE_HEIGHT']"
                class="focus:ring-primary focus:border-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="cm">{{ t.map()['UNIT_CM'] }}</option>
                <option value="in">{{ t.map()['UNIT_IN'] }}</option>
              </select>
            </div>
            <p
              id="bmi-height-converted"
              class="mt-0.5 min-h-[0.875rem] text-[10px] text-slate-500 dark:text-slate-400"
              aria-live="polite"
            >
              {{ convertedHeightLabel() }}
            </p>
          </div>

          <div>
            <label
              for="bmi-weight"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['WEIGHT_LABEL'] }}
            </label>
            <div class="flex items-stretch gap-1.5">
              <input
                id="bmi-weight"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.1"
                [ngModel]="weightInput()"
                (ngModelChange)="weightInput.set($event)"
                [attr.aria-describedby]="'bmi-weight-converted'"
                class="focus:ring-primary focus:border-primary min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <select
                [ngModel]="weightUnit()"
                (ngModelChange)="setWeightUnit($event)"
                [attr.aria-label]="t.map()['UNIT_TOGGLE_WEIGHT']"
                class="focus:ring-primary focus:border-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="kg">{{ t.map()['UNIT_KG'] }}</option>
                <option value="lb">{{ t.map()['UNIT_LB'] }}</option>
              </select>
            </div>
            <p
              id="bmi-weight-converted"
              class="mt-0.5 min-h-[0.875rem] text-[10px] text-slate-500 dark:text-slate-400"
              aria-live="polite"
            >
              {{ convertedWeightLabel() }}
            </p>
          </div>
        </div>

        <!-- Centered primary result -->
        <div
          id="bmi-panel-primary"
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

          @if (hasInputs() && healthyRangeLabel()) {
            <p
              class="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"
              [attr.aria-label]="t.map()['SECONDARY_RESULTS_LABEL']"
            >
              <span class="material-symbols-outlined text-xs" aria-hidden="true">favorite</span>
              <span class="font-semibold">{{ t.map()['HEALTHY_RANGE_LABEL'] }}:</span>
              <span class="tabular-nums">{{ healthyRangeLabel() }}</span>
            </p>
          }
        </div>

        <!-- Interpretation: gradient axis + summary -->
        <div
          aria-labelledby="bmi-interpret-heading"
          class="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/40"
        >
          <div class="flex items-center justify-between gap-2">
            <h2
              id="bmi-interpret-heading"
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
              <div class="bmi-gradient relative h-3 w-full overflow-visible rounded-full">
                <div
                  class="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full shadow-md ring-2 ring-white transition-[left] duration-500 dark:ring-slate-900"
                  [class]="primaryTier() ? tierStyleFor(primaryTier()).dot : 'bg-slate-400'"
                  [style.left.%]="gradientPercent()"
                ></div>
              </div>
              <div
                class="mt-1 flex justify-between text-[10px] font-semibold tracking-wider uppercase"
              >
                <span class="text-blue-600 dark:text-blue-300">
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

        <!-- Profile row: 3 inputs horizontal -->
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
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <div class="mb-0.5 flex items-center gap-1">
                <label
                  for="bmi-sex"
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
                id="bmi-sex"
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
                  for="bmi-age"
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
                id="bmi-age"
                type="number"
                inputmode="numeric"
                min="2"
                max="120"
                [ngModel]="age()"
                (ngModelChange)="setAge($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <div class="mb-0.5 flex items-center gap-1">
                <label
                  for="bmi-standard"
                  class="block text-[10px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {{ t.map()['PROFILE_STANDARD'] }}
                </label>
                <span
                  class="material-symbols-outlined cursor-help text-[14px] leading-none text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  tabindex="0"
                  role="img"
                  [attr.aria-label]="t.map()['WHY_STANDARD']"
                  [title]="t.map()['WHY_STANDARD']"
                  >info</span
                >
              </div>
              <select
                id="bmi-standard"
                [ngModel]="standard()"
                (ngModelChange)="setStandard($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="who">{{ t.map()['STANDARD_WHO'] }}</option>
                <option value="asia_pacific">{{ t.map()['STANDARD_ASIA_PACIFIC'] }}</option>
              </select>
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
                source="BMI Calculator"
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
          aria-labelledby="bmi-modal-title"
          (click)="closeMethodology()"
        >
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true"></div>
          <div
            class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-start justify-between gap-3">
              <h2 id="bmi-modal-title" class="text-lg font-bold text-slate-900 dark:text-slate-100">
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
              <p>{{ t.map()['METHOD_LIMITATIONS'] }}</p>

              <h3 class="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                {{ t.map()['REFERENCES_HEADING'] }}
              </h3>
              <ul class="space-y-2 text-xs">
                <li>
                  <a
                    href="https://www.who.int/publications/i/item/WHO-TRS-894"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_WHO_2000'] }}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(03)15268-3/fulltext"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_WHO_ASIA_2004'] }}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.nhlbi.nih.gov/files/docs/guidelines/ob_gdlns.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_NHLBI'] }}
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

      /* Color gradient: blue (underweight) -> green (normal) -> yellow -> orange -> red (obese) */
      .bmi-gradient {
        background: linear-gradient(
          to right,
          rgb(59 130 246) 0%,
          rgb(16 185 129) 20%,
          rgb(132 204 22) 40%,
          rgb(250 204 21) 55%,
          rgb(249 115 22) 75%,
          rgb(220 38 38) 100%
        );
      }

      .profile-defaults-badge {
        animation: bmi-badge-pulse 2s ease-in-out infinite;
      }

      @keyframes bmi-badge-pulse {
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
export class BmiCalculatorComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private persistence = inject(PersistenceService);

  // Clinical state (persisted as last-entered values for convenience)
  heightInput = signal<number | null>(null);
  weightInput = signal<number | null>(null);
  heightUnit = signal<HeightUnit>('cm');
  weightUnit = signal<WeightUnit>('kg');

  methodologyOpen = signal(false);

  // Profile (persisted)
  sex = signal<Sex>(DEFAULT_PROFILE.sex);
  age = signal<number>(DEFAULT_PROFILE.age);
  standard = signal<Standard>(DEFAULT_PROFILE.standard);

  constructor() {
    this.persistence.storage(this.heightInput, 'bmi-height-input', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.weightInput, 'bmi-weight-input', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.heightUnit, 'bmi-height-unit', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.weightUnit, 'bmi-weight-unit', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.sex, 'bmi-sex', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.age, 'bmi-age', { type: 'number', strategy: 'hybrid' });
    this.persistence.storage(this.standard, 'bmi-standard', {
      type: 'string',
      strategy: 'hybrid',
    });
  }

  /* ---------------------- Computed inputs / outputs ---------------------- */

  hasInputs = computed(
    () =>
      this.heightInput() !== null &&
      this.weightInput() !== null &&
      Number(this.heightInput()) > 0 &&
      Number(this.weightInput()) > 0,
  );

  results = computed(() =>
    compute({
      height: Number(this.heightInput() ?? 0),
      heightUnit: this.heightUnit(),
      weight: Number(this.weightInput() ?? 0),
      weightUnit: this.weightUnit(),
    }),
  );

  profile = computed(() => ({
    sex: this.sex(),
    age: this.age(),
    standard: this.standard(),
  }));

  resolved = computed(() => resolveThresholds(this.profile()));

  isUsingDefaultProfile = computed(() => {
    const p = this.profile();
    return (
      p.sex === DEFAULT_PROFILE.sex &&
      p.age === DEFAULT_PROFILE.age &&
      p.standard === DEFAULT_PROFILE.standard
    );
  });

  convertedHeightLabel = computed(() => {
    const r = this.results();
    if (!this.hasInputs() || r.heightMeters === null) return '';
    const target =
      this.heightUnit() === 'cm'
        ? `${(r.heightMeters * 39.3700787).toFixed(1)} ${this.t.map()['UNIT_IN']}`
        : `${(r.heightMeters * 100).toFixed(0)} ${this.t.map()['UNIT_CM']}`;
    return `${this.t.map()['CONVERTED_PREFIX']} ${target}`;
  });

  convertedWeightLabel = computed(() => {
    const r = this.results();
    if (!this.hasInputs() || r.weightKg === null) return '';
    const target =
      this.weightUnit() === 'kg'
        ? `${(r.weightKg / 0.45359237).toFixed(1)} ${this.t.map()['UNIT_LB']}`
        : `${r.weightKg.toFixed(1)} ${this.t.map()['UNIT_KG']}`;
    return `${this.t.map()['CONVERTED_PREFIX']} ${target}`;
  });

  primaryDisplay = computed(() => {
    const v = this.results().bmi;
    if (v === null || !Number.isFinite(v)) return this.t.map()['RESULT_PLACEHOLDER'] ?? '—';
    return v.toFixed(1);
  });

  primaryTier = computed<Tier | null>(() => {
    if (!this.hasInputs()) return null;
    if (this.resolved().adjustments.pediatricBlocked) return null;
    const v = this.results().bmi;
    if (v === null) return null;
    return classify(v, this.resolved().thresholds);
  });

  axisVisible = computed(() => this.hasInputs() && !this.resolved().adjustments.pediatricBlocked);

  /** Position 0..100 of marker on axis. Maps BMI 13..43 across the axis. */
  gradientPercent = computed<number | null>(() => {
    if (!this.axisVisible()) return null;
    const v = this.results().bmi;
    if (v === null) return null;
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    return clamp(((v - 13) / (43 - 13)) * 100);
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

  healthyRangeLabel = computed(() => {
    const r = this.results();
    if (r.heightMeters === null) return '';
    const range = healthyWeightRangeKg(r.heightMeters, this.resolved().thresholds);
    if (!range) return '';
    if (this.weightUnit() === 'lb') {
      const minLb = range.min / 0.45359237;
      const maxLb = range.max / 0.45359237;
      return `${minLb.toFixed(0)}–${maxLb.toFixed(0)} ${this.t.map()['UNIT_LB']}`;
    }
    return `${range.min.toFixed(1)}–${range.max.toFixed(1)} ${this.t.map()['UNIT_KG']}`;
  });

  interpretation = computed<{ summary: string; notes: string[] } | null>(() => {
    if (!this.hasInputs()) return null;
    const adj = this.resolved().adjustments;
    const map = this.t.map();
    const notes: string[] = [];

    if (adj.pediatricBlocked) {
      return { summary: map['NOTE_PEDIATRIC_BLOCKED'], notes: [] };
    }
    if (adj.asiaPacific) notes.push(map['NOTE_ASIA_PACIFIC']);
    if (adj.olderAdultNote) notes.push(map['NOTE_OLDER_ADULT']);
    notes.push(map['NOTE_ATHLETE_CAVEAT']);

    const tier = this.primaryTier();
    let summary = '';
    if (tier) {
      summary = map[`SUMMARY_${tier.toUpperCase()}`] ?? '';
    }

    return { summary, notes };
  });

  exportText = computed(() => {
    const map = this.t.map();
    const r = this.results();
    const fmt = (v: number | null, digits = 1) =>
      v === null || !Number.isFinite(v) ? '—' : v.toFixed(digits);
    const range = r.heightMeters
      ? healthyWeightRangeKg(r.heightMeters, this.resolved().thresholds)
      : null;
    const lines = [
      `${map['HEIGHT_LABEL']}: ${this.heightInput()} ${this.heightUnit()}`,
      `${map['WEIGHT_LABEL']}: ${this.weightInput()} ${this.weightUnit()}`,
      '',
      `${map['PRIMARY_RESULT_LABEL']}: ${fmt(r.bmi)} kg/m²`,
      `${map['INTERPRETATION_HEADING']}: ${this.tierLabel()}`,
      range
        ? `${map['HEALTHY_RANGE_LABEL']}: ${range.min.toFixed(1)}–${range.max.toFixed(1)} kg`
        : '',
      '',
      `${map['PROFILE_HEADING']}: ${this.sex() === 'female' ? map['PROFILE_SEX_FEMALE'] : map['PROFILE_SEX_MALE']} · ${map['PROFILE_AGE']}: ${this.age()} · ${this.standard() === 'who' ? map['STANDARD_WHO'] : map['STANDARD_ASIA_PACIFIC']}`,
      '',
      map['DISCLAIMER'],
      map['PRIVACY_NOTE'],
    ].filter(Boolean);
    return lines.join('\n');
  });

  /* -------------------------- Helpers ------------------------------------ */

  tierStyleFor(tier: Tier | null): TierStyle {
    return TIER_STYLE[tier ?? 'normal'];
  }

  setHeightUnit(value: HeightUnit) {
    this.heightUnit.set(value);
  }

  setWeightUnit(value: WeightUnit) {
    this.weightUnit.set(value);
  }

  setSex(value: Sex) {
    this.sex.set(value);
  }

  setAge(value: number | string) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) this.age.set(n);
  }

  setStandard(value: Standard) {
    this.standard.set(value);
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
