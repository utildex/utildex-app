import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { PersistenceService } from '../../services/persistence.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { ALL_UNITS, convertUnits, type UnitType } from './unit-converter.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-unit-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="unit-converter">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <span class="px-2 text-xs font-bold text-slate-500 uppercase">{{
            t.map()['LABEL_TYPE']
          }}</span>
          <select
            [(ngModel)]="currentType"
            (change)="updateUnits()"
            class="text-primary cursor-pointer border-none bg-transparent text-right text-xs font-bold focus:ring-0"
          >
            @for (type of types; track type.id) {
              <option [value]="type.id">{{ t.map()[type.labelKey] }}</option>
            }
          </select>
        </div>
        <div class="flex flex-1 flex-col justify-center gap-3 p-4">
          <div class="flex items-center gap-2">
            <input
              type="number"
              [(ngModel)]="amount"
              class="w-16 rounded border p-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <select
              [(ngModel)]="fromUnit"
              class="flex-1 rounded border p-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              @for (u of availableUnits(); track u.id) {
                <option [value]="u.id">{{ t.map()[u.labelKey] }}</option>
              }
            </select>
          </div>
          <div class="flex justify-center text-slate-400">
            <span class="material-symbols-outlined text-sm">arrow_downward</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-primary w-16 truncate p-1 text-sm font-bold">
              {{ result() | number: '1.0-2' }}
            </div>
            <select
              [(ngModel)]="toUnit"
              class="flex-1 rounded border p-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              @for (u of availableUnits(); track u.id) {
                <option [value]="u.id">{{ t.map()[u.labelKey] }}</option>
              }
            </select>
          </div>
        </div>
      </div>
    }

    <ng-template #mainContent>
      <div class="mx-auto max-w-3xl">
        <div
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-700 dark:bg-slate-800"
        >
          <!-- Type Selector -->
          <div class="mb-8">
            <label class="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_TYPE']
            }}</label>
            <div class="flex overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
              @for (type of types; track type.id) {
                <button
                  (click)="setType(type.id)"
                  class="flex-1 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-all"
                  [class]="
                    currentType() === type.id
                      ? 'text-primary bg-white shadow-sm dark:bg-slate-600'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  "
                >
                  {{ t.map()[type.labelKey] }}
                </button>
              }
            </div>
          </div>

          <!-- Main Input Grid -->
          <div class="grid grid-cols-1 items-end gap-6 md:grid-cols-[1fr,auto,1fr]">
            <!-- From Column -->
            <div class="space-y-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{{
                  t.map()['LABEL_AMOUNT']
                }}</label>
                <input
                  type="number"
                  [(ngModel)]="amount"
                  class="focus:border-primary w-full border-b-2 border-slate-200 bg-transparent py-2 text-2xl font-bold text-slate-900 transition-colors focus:outline-none dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label
                  class="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
                  >{{ t.map()['LABEL_FROM'] }}</label
                >
                <select
                  [(ngModel)]="fromUnit"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  @for (u of availableUnits(); track u.id) {
                    <option [value]="u.id">{{ t.map()[u.labelKey] }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Swap Button -->
            <div class="flex justify-center md:pb-3">
              <button
                (click)="swap()"
                class="hover:text-primary rounded-full bg-slate-100 p-3 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                title="Swap units"
              >
                <span class="material-symbols-outlined">swap_horiz</span>
              </button>
            </div>

            <!-- To Column -->
            <div class="space-y-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{{
                  t.map()['LABEL_TO']
                }}</label>
                <div
                  class="text-primary w-full truncate border-b-2 border-transparent py-2 text-2xl font-bold"
                >
                  {{ result() | number: '1.0-4' }}
                </div>
              </div>

              <div>
                <label
                  class="mb-1 block text-xs font-bold tracking-wider text-slate-500 uppercase"
                  >{{ t.map()['LABEL_TO'] }}</label
                >
                <select
                  [(ngModel)]="toUnit"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  @for (u of availableUnits(); track u.id) {
                    <option [value]="u.id">{{ t.map()[u.labelKey] }}</option>
                  }
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Result Action Bar -->
        <div class="mt-4">
          <app-action-bar
            [content]="resultText()"
            filename="conversion.txt"
            source="Unit Converter"
          ></app-action-bar>
        </div>
      </div>
    </ng-template>
  `,
})
export class UnitConverterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  persistence = inject(PersistenceService);

  currentType = signal<UnitType>('length');
  amount = signal<number>(1);
  fromUnit = signal<string>('meter');
  toUnit = signal<string>('foot');

  // Definitions
  types: { id: UnitType; labelKey: string }[] = [
    { id: 'length', labelKey: 'TYPE_LENGTH' },
    { id: 'weight', labelKey: 'TYPE_WEIGHT' },
    { id: 'temp', labelKey: 'TYPE_TEMP' },
  ];

  allUnits = ALL_UNITS;

  availableUnits = computed(() => {
    return this.allUnits.filter((u) => u.type === this.currentType());
  });

  constructor() {
    this.persistence.storage(this.currentType, 'uc-type');

    effect(() => {
      // Reset units when type changes if current units are invalid
      const units = this.availableUnits();
      const from = this.fromUnit();

      if (!units.find((u) => u.id === from)) {
        this.fromUnit.set(units[0].id);
        this.toUnit.set(units[1]?.id || units[0].id);
      }
    });
  }

  setType(type: UnitType) {
    this.currentType.set(type);
  }

  swap() {
    const temp = this.fromUnit();
    this.fromUnit.set(this.toUnit());
    this.toUnit.set(temp);
  }

  updateUnits() {
    // Triggered by select change, handled by effect mostly, but ensures consistency
  }

  result = computed(() => {
    return convertUnits(this.amount(), this.fromUnit(), this.toUnit(), this.currentType());
  });

  resultText = computed(() => {
    return `${this.amount()} ${this.fromUnit()} = ${this.result()} ${this.toUnit()}`;
  });
}
