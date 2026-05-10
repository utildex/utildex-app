import { Component, computed, effect, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { PersistenceService } from '../../services/persistence.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import {
  classifyHomaIr,
  classifyQuicki,
  compute,
  resolveHomaIrThresholds,
  type BMICategory,
  type GlucoseUnit,
  type Method,
  type Population,
  type Sex,
  type MenopausalStatus,
  type Tier,
} from './homa-calculator.kernel';
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
  optimal: {
    text: 'text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500/40',
    dot: 'bg-emerald-500 ring-emerald-300',
  },
  normal: {
    text: 'text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-500 ring-emerald-300',
  },
  mild: {
    text: 'text-yellow-600 dark:text-yellow-300',
    ring: 'ring-yellow-400/30',
    dot: 'bg-yellow-400 ring-yellow-200',
  },
  elevated: {
    text: 'text-orange-600 dark:text-orange-300',
    ring: 'ring-orange-500/30',
    dot: 'bg-orange-500 ring-orange-200',
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
  bmiCategory: 'normal' as BMICategory,
  population: 'western_european' as Population,
  menopausalStatus: 'pre' as MenopausalStatus,
};

@Component({
  selector: 'app-homa-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="homa-calculator">
      <!-- Single unified card -->
      <div
        class="homa-card mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Top row: method dropdown + clinical inputs (single line on md+) -->
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-start">
          <!-- Method dropdown -->
          <div>
            <label
              for="homa-method"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['METHOD_LABEL'] }}
            </label>
            <select
              id="homa-method"
              [ngModel]="method()"
              (ngModelChange)="setMethod($event)"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              @for (m of methods; track m.id) {
                <option [value]="m.id">{{ t.map()[m.labelKey] }}</option>
              }
            </select>
          </div>

          <!-- Clinical inputs -->
          <div>
            <label
              for="homa-glucose"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['GLUCOSE_LABEL'] }}
            </label>
            <div class="flex items-stretch gap-1.5">
              <input
                id="homa-glucose"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.1"
                [ngModel]="glucoseInput()"
                (ngModelChange)="glucoseInput.set($event)"
                [attr.aria-describedby]="'homa-glucose-converted'"
                class="focus:ring-primary focus:border-primary min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <select
                [ngModel]="glucoseUnit()"
                (ngModelChange)="setGlucoseUnit($event)"
                [attr.aria-label]="t.map()['UNIT_TOGGLE_LABEL']"
                class="focus:ring-primary focus:border-primary rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="mg/dL">{{ t.map()['UNIT_MGDL'] }}</option>
                <option value="mmol/L">{{ t.map()['UNIT_MMOL'] }}</option>
              </select>
            </div>
            <p
              id="homa-glucose-converted"
              class="mt-0.5 min-h-[0.875rem] text-[10px] text-slate-500 dark:text-slate-400"
              aria-live="polite"
            >
              {{ convertedGlucoseLabel() }}
            </p>
          </div>

          <div>
            <label
              for="homa-insulin"
              class="mb-1 block text-[11px] font-bold tracking-wider text-slate-500 uppercase"
            >
              {{ t.map()['INSULIN_LABEL'] }}
            </label>
            <div class="flex items-stretch gap-1.5">
              <input
                id="homa-insulin"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.1"
                [ngModel]="insulinInput()"
                (ngModelChange)="insulinInput.set($event)"
                class="focus:ring-primary focus:border-primary min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base font-semibold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <span
                class="flex items-center rounded-lg border border-slate-300 bg-slate-100 px-2 text-[10px] leading-tight font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                {{ t.map()['INSULIN_UNIT'] }}
              </span>
            </div>
          </div>
        </div>

        <!-- Centered primary result -->
        <div
          id="homa-panel-primary"
          role="region"
          [attr.aria-label]="t.map()[currentMethodLabelKey()]"
          class="flex flex-col items-center justify-center gap-1 py-4"
        >
          <p class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {{ t.map()[currentMethodLabelKey()] }}
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
            {{ t.map()[currentMethodHintKey()] }}
          </p>

          <!-- Discreet other indices -->
          @if (hasInputs()) {
            <div
              class="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400"
              [attr.aria-label]="t.map()['SECONDARY_RESULTS_LABEL']"
            >
              @for (m of methods; track m.id) {
                @if (m.id !== method()) {
                  <span class="tabular-nums">
                    <span class="font-semibold">{{ t.map()[m.labelKey] }}:</span>
                    {{ secondaryDisplay(m.id) }}
                  </span>
                }
              }
            </div>
          }

          @if (method() === 'homa-b' && results().homaBError === 'glucose-too-low') {
            <p
              role="alert"
              class="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              {{ t.map()['GLUCOSE_TOO_LOW'] }}
            </p>
          }
        </div>

        <!-- Interpretation: gradient axis + summary -->
        <div
          aria-labelledby="homa-interpret-heading"
          class="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/40"
        >
          <div class="flex items-center justify-between gap-2">
            <h2
              id="homa-interpret-heading"
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
              <div class="homa-gradient relative h-3 w-full overflow-visible rounded-full">
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

            @if (
              method() === 'homa-ir' &&
              previousIrTier() !== null &&
              previousIrTier() !== currentIrTier() &&
              previousIrValue() !== null &&
              currentIrValue() !== null &&
              sameNumber(previousIrValue(), currentIrValue())
            ) {
              <p
                class="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                role="status"
              >
                <span class="material-symbols-outlined text-xs" aria-hidden="true">tune</span>
                {{ t.map()['NOTE_PROFILE_CHANGED'] }}
              </p>
            }
          } @else {
            <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {{ t.map()['ENTER_BOTH_HINT'] }}
            </p>
          }
        </div>

        <!-- Profile row (4 inputs horizontal) -->
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
          <div
            class="grid grid-cols-2 gap-2 sm:grid-cols-4"
            [class.sm:grid-cols-5]="showMenopauseField()"
          >
            <div>
              <div class="mb-0.5 flex items-center gap-1">
                <label
                  for="homa-sex"
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
                id="homa-sex"
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
                  for="homa-age"
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
                id="homa-age"
                type="number"
                inputmode="numeric"
                min="2"
                max="90"
                [ngModel]="age()"
                (ngModelChange)="setAge($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <div class="mb-0.5 flex items-center gap-1">
                <label
                  for="homa-bmi"
                  class="block text-[10px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {{ t.map()['PROFILE_BMI'] }}
                </label>
                <span
                  class="material-symbols-outlined cursor-help text-[14px] leading-none text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  tabindex="0"
                  role="img"
                  [attr.aria-label]="t.map()['WHY_BMI']"
                  [title]="t.map()['WHY_BMI']"
                  >info</span
                >
              </div>
              <select
                id="homa-bmi"
                [ngModel]="bmiCategory()"
                (ngModelChange)="setBmi($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="underweight">{{ t.map()['PROFILE_BMI_UNDER'] }}</option>
                <option value="normal">{{ t.map()['PROFILE_BMI_NORMAL'] }}</option>
                <option value="overweight">{{ t.map()['PROFILE_BMI_OVER'] }}</option>
                <option value="obese">{{ t.map()['PROFILE_BMI_OBESE'] }}</option>
              </select>
            </div>

            <div>
              <div class="mb-0.5 flex items-center gap-1">
                <label
                  for="homa-pop"
                  class="block text-[10px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {{ t.map()['PROFILE_POPULATION'] }}
                </label>
                <span
                  class="material-symbols-outlined cursor-help text-[14px] leading-none text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  tabindex="0"
                  role="img"
                  [attr.aria-label]="t.map()['WHY_POPULATION']"
                  [title]="t.map()['WHY_POPULATION']"
                  >info</span
                >
              </div>
              <select
                id="homa-pop"
                [ngModel]="population()"
                (ngModelChange)="setPopulation($event)"
                class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="western_european">{{ t.map()['POP_WESTERN'] }}</option>
                <option value="east_asian">{{ t.map()['POP_EAST_ASIAN'] }}</option>
                <option value="south_asian">{{ t.map()['POP_SOUTH_ASIAN'] }}</option>
                <option value="hispanic">{{ t.map()['POP_HISPANIC'] }}</option>
                <option value="middle_eastern">{{ t.map()['POP_MIDDLE_EASTERN'] }}</option>
                <option value="sub_saharan">{{ t.map()['POP_SUB_SAHARAN'] }}</option>
                <option value="other">{{ t.map()['POP_OTHER'] }}</option>
              </select>
            </div>

            @if (showMenopauseField()) {
              <div>
                <div class="mb-0.5 flex items-center gap-1">
                  <label
                    for="homa-meno"
                    class="block text-[10px] font-medium text-slate-500 dark:text-slate-400"
                  >
                    {{ t.map()['PROFILE_MENOPAUSE'] }}
                  </label>
                  <span
                    class="material-symbols-outlined cursor-help text-[14px] leading-none text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    tabindex="0"
                    role="img"
                    [attr.aria-label]="t.map()['WHY_MENOPAUSE']"
                    [title]="t.map()['WHY_MENOPAUSE']"
                    >info</span
                  >
                </div>
                <select
                  id="homa-meno"
                  [ngModel]="menopausalStatus()"
                  (ngModelChange)="setMenopause($event)"
                  class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="pre">{{ t.map()['MENO_PRE'] }}</option>
                  <option value="post">{{ t.map()['MENO_POST'] }}</option>
                </select>
              </div>
            }
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
                source="HOMA Calculator"
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
          aria-labelledby="homa-modal-title"
          (click)="closeMethodology()"
        >
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true"></div>
          <div
            class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-start justify-between gap-3">
              <h2
                id="homa-modal-title"
                class="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
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
                <li>{{ t.map()['METHOD_FORMULA_IR'] }}</li>
                <li>{{ t.map()['METHOD_FORMULA_B'] }}</li>
                <li>{{ t.map()['METHOD_FORMULA_S'] }}</li>
                <li>{{ t.map()['METHOD_FORMULA_QUICKI'] }}</li>
              </ul>
              <p>{{ t.map()['METHOD_LIMITATIONS'] }}</p>

              <h3 class="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                {{ t.map()['REFERENCES_HEADING'] }}
              </h3>
              <ul class="space-y-2 text-xs">
                <li>
                  <a
                    href="https://link.springer.com/article/10.1007/BF00280883"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_MATTHEWS_1985'] }}
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.rdm.ox.ac.uk/about/our-clinical-facilities-and-units/DTU/software/homa"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_LEVY_1998'] }}
                  </a>
                </li>
                <li>
                  <a
                    href="https://doi.org/10.1210/jcem.85.7.6661"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-2 hover:underline"
                  >
                    {{ t.map()['REF_KATZ_2000'] }}
                  </a>
                </li>
                <li class="text-slate-600 dark:text-slate-300">
                  {{ t.map()['REF_MATLI_2021'] }}
                </li>
                <li class="text-slate-600 dark:text-slate-300">
                  {{ t.map()['REF_ICHIKAWA_2014'] }}
                </li>
                <li class="text-slate-600 dark:text-slate-300">{{ t.map()['REF_KNHANES'] }}</li>
                <li class="text-slate-600 dark:text-slate-300">{{ t.map()['REF_EPIRCE'] }}</li>
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

      /* Color gradient for the interpretation axis: green -> yellow -> orange -> red */
      .homa-gradient {
        background: linear-gradient(
          to right,
          rgb(16 185 129) 0%,
          rgb(132 204 22) 25%,
          rgb(250 204 21) 50%,
          rgb(249 115 22) 75%,
          rgb(220 38 38) 100%
        );
      }

      .profile-defaults-badge {
        animation: homa-badge-pulse 2s ease-in-out infinite;
      }

      @keyframes homa-badge-pulse {
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
export class HomaCalculatorComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private persistence = inject(PersistenceService);

  // Clinical state (persisted as last-entered values for convenience)
  glucoseInput = signal<number | null>(null);
  insulinInput = signal<number | null>(null);
  glucoseUnit = signal<GlucoseUnit>('mg/dL');

  // Persisted preferences
  method = signal<Method>('homa-ir');
  methodologyOpen = signal(false);

  // Profile (persisted)
  sex = signal<Sex>(DEFAULT_PROFILE.sex);
  age = signal<number>(DEFAULT_PROFILE.age);
  bmiCategory = signal<BMICategory>(DEFAULT_PROFILE.bmiCategory);
  population = signal<Population>(DEFAULT_PROFILE.population);
  menopausalStatus = signal<MenopausalStatus>(DEFAULT_PROFILE.menopausalStatus);

  // Track previous IR value/tier for the "score didn't change" hint.
  previousIrValue = signal<number | null>(null);
  previousIrTier = signal<Tier | null>(null);
  currentIrValue = signal<number | null>(null);
  currentIrTier = signal<Tier | null>(null);

  methods: { id: Method; labelKey: string; hintKey: string }[] = [
    { id: 'homa-ir', labelKey: 'METHOD_HOMA_IR', hintKey: 'METHOD_HOMA_IR_HINT' },
    { id: 'homa-b', labelKey: 'METHOD_HOMA_B', hintKey: 'METHOD_HOMA_B_HINT' },
    { id: 'homa-s', labelKey: 'METHOD_HOMA_S', hintKey: 'METHOD_HOMA_S_HINT' },
    { id: 'quicki', labelKey: 'METHOD_QUICKI', hintKey: 'METHOD_QUICKI_HINT' },
  ];

  constructor() {
    this.persistence.storage(this.glucoseInput, 'homa-glucose-input', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.insulinInput, 'homa-insulin-input', {
      type: 'object',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.glucoseUnit, 'homa-glucose-unit', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.method, 'homa-method', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.sex, 'homa-sex', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.age, 'homa-age', { type: 'number', strategy: 'hybrid' });
    this.persistence.storage(this.bmiCategory, 'homa-bmi', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.population, 'homa-population', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.menopausalStatus, 'homa-meno', {
      type: 'string',
      strategy: 'hybrid',
    });

    // Track IR value transitions to surface the "profile changed" hint.
    effect(() => {
      const ir = this.results().homaIr;
      const tier = this.currentIrTierFromResolved();
      this.previousIrValue.set(this.currentIrValue());
      this.previousIrTier.set(this.currentIrTier());
      this.currentIrValue.set(ir);
      this.currentIrTier.set(tier);
    });
  }

  /* ---------------------- Computed inputs / outputs ---------------------- */

  hasInputs = computed(
    () =>
      this.glucoseInput() !== null &&
      this.insulinInput() !== null &&
      Number(this.glucoseInput()) > 0 &&
      Number(this.insulinInput()) > 0,
  );

  results = computed(() =>
    compute({
      glucose: Number(this.glucoseInput() ?? 0),
      glucoseUnit: this.glucoseUnit(),
      insulin: Number(this.insulinInput() ?? 0),
    }),
  );

  convertedGlucoseLabel = computed(() => {
    const r = this.results();
    if (!this.hasInputs() || r.glucoseMmol === null || r.glucoseMgdl === null) return '';
    const target =
      this.glucoseUnit() === 'mg/dL'
        ? `${r.glucoseMmol.toFixed(2)} ${this.t.map()['UNIT_MMOL']}`
        : `${r.glucoseMgdl.toFixed(0)} ${this.t.map()['UNIT_MGDL']}`;
    return `${this.t.map()['CONVERTED_PREFIX']} ${target}`;
  });

  resolved = computed(() => resolveHomaIrThresholds(this.profile()));

  profile = computed(() => ({
    sex: this.sex(),
    age: this.age(),
    bmiCategory: this.bmiCategory(),
    population: this.population(),
    menopausalStatus: this.menopausalStatus(),
  }));

  isUsingDefaultProfile = computed(() => {
    const p = this.profile();
    return (
      p.sex === DEFAULT_PROFILE.sex &&
      p.age === DEFAULT_PROFILE.age &&
      p.bmiCategory === DEFAULT_PROFILE.bmiCategory &&
      p.population === DEFAULT_PROFILE.population &&
      p.menopausalStatus === DEFAULT_PROFILE.menopausalStatus
    );
  });

  showMenopauseField = computed(() => this.sex() === 'female' && this.age() >= 45);

  currentMethodLabelKey = computed(
    () => this.methods.find((m) => m.id === this.method())?.labelKey ?? 'METHOD_HOMA_IR',
  );

  currentMethodHintKey = computed(
    () => this.methods.find((m) => m.id === this.method())?.hintKey ?? 'METHOD_HOMA_IR_HINT',
  );

  primaryValue = computed<number | null>(() => {
    const r = this.results();
    switch (this.method()) {
      case 'homa-ir':
        return r.homaIr;
      case 'homa-b':
        return r.homaB;
      case 'homa-s':
        return r.homaS;
      case 'quicki':
        return r.quicki;
    }
  });

  primaryDisplay = computed(() => {
    const v = this.primaryValue();
    if (v === null || !Number.isFinite(v)) return this.t.map()['RESULT_PLACEHOLDER'] ?? '—';
    if (this.method() === 'quicki') return v.toFixed(3);
    if (this.method() === 'homa-b' || this.method() === 'homa-s') {
      return `${v.toFixed(0)}%`;
    }
    return v.toFixed(2);
  });

  private currentIrTierFromResolved(): Tier | null {
    const ir = this.results().homaIr;
    if (ir === null || this.profile().age < 18) return null;
    return classifyHomaIr(ir, this.resolved().thresholds);
  }

  primaryTier = computed<Tier | null>(() => {
    if (!this.hasInputs()) return null;
    const adj = this.resolved().adjustments;
    if (adj.pediatricBlocked) return null;
    if (this.method() === 'homa-ir') {
      const ir = this.results().homaIr;
      return ir === null ? null : classifyHomaIr(ir, this.resolved().thresholds);
    }
    if (this.method() === 'quicki') {
      const q = this.results().quicki;
      return q === null ? null : classifyQuicki(q);
    }
    return null;
  });

  axisVisible = computed(() => {
    if (!this.hasInputs()) return false;
    if (this.resolved().adjustments.pediatricBlocked) return false;
    return this.method() === 'homa-ir' || this.method() === 'quicki';
  });

  /** Position 0..100 of the marker on the green→red gradient. */
  gradientPercent = computed<number | null>(() => {
    if (!this.axisVisible()) return null;
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    if (this.method() === 'homa-ir') {
      const v = this.results().homaIr;
      if (v === null) return null;
      const t = this.resolved().thresholds;
      if (v < t.optimalMax) return clamp((v / Math.max(t.optimalMax, 0.001)) * 20);
      if (v <= t.normalMax)
        return clamp(20 + ((v - t.optimalMax) / Math.max(t.normalMax - t.optimalMax, 0.001)) * 20);
      if (v <= t.mildMax)
        return clamp(40 + ((v - t.normalMax) / Math.max(t.mildMax - t.normalMax, 0.001)) * 20);
      if (v <= t.elevatedMax)
        return clamp(60 + ((v - t.mildMax) / Math.max(t.elevatedMax - t.mildMax, 0.001)) * 20);
      return clamp(80 + ((v - t.elevatedMax) / Math.max(t.elevatedMax, 0.001)) * 20);
    }
    if (this.method() === 'quicki') {
      const q = this.results().quicki;
      if (q === null) return null;
      // Higher QUICKI = better. Map so good lands on the green (left) side.
      if (q > 0.45) return clamp(15 - (q - 0.45) * 100);
      if (q >= 0.33) return clamp(15 + ((0.45 - q) / 0.12) * 55);
      return clamp(70 + (0.33 - q) * 200);
    }
    return null;
  });

  axisAriaLabel = computed(() => {
    const map = this.t.map();
    return `${map['INTERPRETATION_HEADING']}: ${this.primaryDisplay()}`;
  });

  primaryTierLabel = computed(() => {
    const tier = this.primaryTier();
    if (!tier) return '';
    const map = this.t.map();
    if (this.method() === 'quicki') {
      if (tier === 'optimal') return map['QUICKI_TIER_OPTIMAL'];
      if (tier === 'normal') return map['QUICKI_TIER_NORMAL'];
      return map['QUICKI_TIER_REDUCED'];
    }
    return map[`TIER_${tier.toUpperCase()}`] ?? tier;
  });

  interpretation = computed<{ summary: string; notes: string[] } | null>(() => {
    if (!this.hasInputs()) return null;
    const adj = this.resolved().adjustments;
    const map = this.t.map();
    const notes: string[] = [];

    if (adj.pediatricBlocked) {
      return { summary: map['NOTE_PEDIATRIC_BLOCKED'], notes: [] };
    }
    if (adj.bmiAdjusted) notes.push(map['NOTE_BMI_ADJUSTED']);
    if (adj.postMenopausalAdjusted) notes.push(map['NOTE_POSTMENO_ADJUSTED']);
    if (adj.populationFallback) notes.push(map['NOTE_POPULATION_FALLBACK']);
    if (adj.youngAdultNote) notes.push(map['NOTE_YOUNG_ADULT']);
    if (adj.olderAdultNote) notes.push(map['NOTE_OLDER_ADULT']);

    let summary = '';
    if (this.method() === 'homa-ir') {
      const tier = this.primaryTier();
      if (tier) {
        summary = map[`IR_SUMMARY_${tier.toUpperCase()}`] ?? '';
      }
    } else if (this.method() === 'quicki') {
      const tier = this.primaryTier();
      if (tier === 'optimal') summary = map['QUICKI_SUMMARY_OPTIMAL'];
      else if (tier === 'normal') summary = map['QUICKI_SUMMARY_NORMAL'];
      else if (tier) summary = map['QUICKI_SUMMARY_REDUCED'];
    } else if (this.method() === 'homa-b') {
      if (this.results().homaBError === 'glucose-too-low') {
        summary = map['GLUCOSE_TOO_LOW'];
      } else {
        summary = map['HOMA_B_NOTE'];
      }
    } else if (this.method() === 'homa-s') {
      summary = map['HOMA_S_NOTE'];
    }

    return { summary, notes };
  });

  profileSummary = computed(() => {
    const map = this.t.map();
    const parts = [
      map[this.sex() === 'female' ? 'PROFILE_SEX_FEMALE' : 'PROFILE_SEX_MALE'],
      `${map['PROFILE_AGE']}: ${this.age()}`,
      this.bmiLabel(),
      this.populationLabel(),
    ];
    if (this.showMenopauseField()) {
      parts.push(this.menopausalStatus() === 'pre' ? map['MENO_PRE'] : map['MENO_POST']);
    }
    return parts.filter(Boolean).join(' · ');
  });

  exportText = computed(() => {
    const map = this.t.map();
    const r = this.results();
    const fmt = (v: number | null, digits = 2, suffix = '') =>
      v === null || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}${suffix}`;
    const lines = [
      `${map['CLINICAL_HEADING']}`,
      `  ${map['GLUCOSE_LABEL']}: ${this.glucoseInput()} ${this.glucoseUnit()}`,
      `  ${map['INSULIN_LABEL']}: ${this.insulinInput()} µU/mL`,
      '',
      `${map['PRIMARY_RESULT_LABEL']}`,
      `  HOMA-IR: ${fmt(r.homaIr)}`,
      `  HOMA-%B: ${fmt(r.homaB, 0, '%')}`,
      `  HOMA-%S: ${fmt(r.homaS, 0, '%')}`,
      `  QUICKI:  ${fmt(r.quicki, 3)}`,
      '',
      `${map['INTERPRETATION_HEADING']}: ${this.primaryTierLabel()}`,
      `${map['INTERPRETATION_BASED_ON']} ${this.profileSummary()}`,
      '',
      map['DISCLAIMER'],
      map['PRIVACY_NOTE'],
    ];
    return lines.join('\n');
  });

  /* -------------------------- Helpers ------------------------------------ */

  tierStyleFor(tier: Tier | null): TierStyle {
    return TIER_STYLE[tier ?? 'normal'];
  }

  sameNumber(a: number | null, b: number | null): boolean {
    if (a === null || b === null) return false;
    return Math.abs(a - b) < 1e-6;
  }

  secondaryDisplay(method: Method): string {
    const r = this.results();
    const placeholder = this.t.map()['RESULT_PLACEHOLDER'] ?? '—';
    if (!this.hasInputs()) return placeholder;
    switch (method) {
      case 'homa-ir':
        return r.homaIr === null ? placeholder : r.homaIr.toFixed(2);
      case 'homa-b':
        return r.homaB === null ? placeholder : `${r.homaB.toFixed(0)}%`;
      case 'homa-s':
        return r.homaS === null ? placeholder : `${r.homaS.toFixed(0)}%`;
      case 'quicki':
        return r.quicki === null ? placeholder : r.quicki.toFixed(3);
    }
  }

  private bmiLabel(): string {
    const map = this.t.map();
    switch (this.bmiCategory()) {
      case 'underweight':
        return map['PROFILE_BMI_UNDER'];
      case 'normal':
        return map['PROFILE_BMI_NORMAL'];
      case 'overweight':
        return map['PROFILE_BMI_OVER'];
      case 'obese':
        return map['PROFILE_BMI_OBESE'];
    }
  }

  private populationLabel(): string {
    const map = this.t.map();
    switch (this.population()) {
      case 'western_european':
        return map['POP_WESTERN'];
      case 'east_asian':
        return map['POP_EAST_ASIAN'];
      case 'south_asian':
        return map['POP_SOUTH_ASIAN'];
      case 'hispanic':
        return map['POP_HISPANIC'];
      case 'middle_eastern':
        return map['POP_MIDDLE_EASTERN'];
      case 'sub_saharan':
        return map['POP_SUB_SAHARAN'];
      case 'other':
        return map['POP_OTHER'];
    }
  }

  /* ----------------------- Event handlers -------------------------------- */

  setMethod(m: Method) {
    this.method.set(m);
  }

  setGlucoseUnit(u: GlucoseUnit) {
    this.glucoseUnit.set(u);
  }

  setSex(value: Sex) {
    this.sex.set(value);
  }

  setAge(value: number | null) {
    if (value === null || !Number.isFinite(value)) return;
    const clamped = Math.max(2, Math.min(90, Math.round(value)));
    this.age.set(clamped);
  }

  setBmi(value: BMICategory) {
    this.bmiCategory.set(value);
  }

  setPopulation(value: Population) {
    this.population.set(value);
  }

  setMenopause(value: MenopausalStatus) {
    this.menopausalStatus.set(value);
  }

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
