
import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { PersistenceService } from '../../services/persistence.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type UnitType = 'length' | 'weight' | 'temp';

interface UnitDef {
  id: string;
  labelKey: string;
  factor: number; 
}

@Component({
  selector: 'app-unit-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="unit-converter">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700">
         <div class="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-2 flex justify-between items-center">
            <span class="text-xs font-bold uppercase text-slate-500 px-2">{{ t.map()['LABEL_TYPE'] }}</span>
            <select [(ngModel)]="currentType" (change)="updateUnits()" class="text-xs bg-transparent border-none focus:ring-0 text-primary font-bold text-right cursor-pointer">
              @for (type of types; track type.id) {
                <option [value]="type.id">{{ t.map()[type.labelKey] }}</option>
              }
            </select>
         </div>
         <div class="flex-1 p-4 flex flex-col gap-3 justify-center">
            <div class="flex items-center gap-2">
               <input type="number" [(ngModel)]="amount" class="w-16 p-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white">
               <select [(ngModel)]="fromUnit" class="flex-1 text-sm border rounded p-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                 @for (u of availableUnits(); track u.id) { <option [value]="u.id">{{ t.map()[u.labelKey] }}</option> }
               </select>
            </div>
            <div class="flex justify-center text-slate-400">
              <span class="material-symbols-outlined text-sm">arrow_downward</span>
            </div>
            <div class="flex items-center gap-2">
               <div class="w-16 p-1 text-sm font-bold text-primary truncate">{{ result() | number:'1.0-2' }}</div>
               <select [(ngModel)]="toUnit" class="flex-1 text-sm border rounded p-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                 @for (u of availableUnits(); track u.id) { <option [value]="u.id">{{ t.map()[u.labelKey] }}</option> }
               </select>
            </div>
         </div>
      </div>
    }

    <ng-template #mainContent>
      <div class="max-w-3xl mx-auto">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
          
          <!-- Type Selector -->
          <div class="mb-8">
             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ t.map()['LABEL_TYPE'] }}</label>
             <div class="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-x-auto">
               @for (type of types; track type.id) {
                 <button 
                   (click)="setType(type.id)"
                   class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                   [class]="currentType() === type.id 
                     ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' 
                     : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
                 >
                   {{ t.map()[type.labelKey] }}
                 </button>
               }
             </div>
          </div>

          <!-- Main Input Grid -->
          <div class="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-6 items-end">
             
             <!-- From Column -->
             <div class="space-y-4">
               <div>
                 <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t.map()['LABEL_AMOUNT'] }}</label>
                 <input 
                   type="number" 
                   [(ngModel)]="amount" 
                   class="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:outline-none py-2 text-slate-900 dark:text-white transition-colors"
                 >
               </div>
               
               <div>
                 <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{{ t.map()['LABEL_FROM'] }}</label>
                 <select 
                    [(ngModel)]="fromUnit"
                    class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:ring-primary focus:border-primary"
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
                 class="p-3 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-primary transition-colors"
                 title="Swap units"
               >
                 <span class="material-symbols-outlined">swap_horiz</span>
               </button>
             </div>

             <!-- To Column -->
             <div class="space-y-4">
               <div>
                 <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t.map()['LABEL_TO'] }}</label>
                 <div class="w-full text-2xl font-bold border-b-2 border-transparent py-2 text-primary truncate">
                   {{ result() | number:'1.0-4' }}
                 </div>
               </div>
               
               <div>
                 <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{{ t.map()['LABEL_TO'] }}</label>
                 <select 
                    [(ngModel)]="toUnit"
                    class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:ring-primary focus:border-primary"
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
  `
})
export class UnitConverterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown>>(null);

  t = inject(ScopedTranslationService);
  persistence = inject(PersistenceService);

  currentType = signal<UnitType>('length');
  amount = signal<number>(1);
  fromUnit = signal<string>('meter');
  toUnit = signal<string>('foot');

  // Definitions
  types: { id: UnitType, labelKey: string }[] = [
    { id: 'length', labelKey: 'TYPE_LENGTH' },
    { id: 'weight', labelKey: 'TYPE_WEIGHT' },
    { id: 'temp', labelKey: 'TYPE_TEMP' }
  ];

  // Flat list of units with their types and factors (relative to base unit)
  allUnits: (UnitDef & { type: UnitType })[] = [
    { id: 'meter', type: 'length', labelKey: 'UNIT_METER', factor: 1 },
    { id: 'kilometer', type: 'length', labelKey: 'UNIT_KILOMETER', factor: 1000 },
    { id: 'centimeter', type: 'length', labelKey: 'UNIT_CENTIMETER', factor: 0.01 },
    { id: 'foot', type: 'length', labelKey: 'UNIT_FOOT', factor: 0.3048 },
    { id: 'inch', type: 'length', labelKey: 'UNIT_INCH', factor: 0.0254 },
    { id: 'mile', type: 'length', labelKey: 'UNIT_MILE', factor: 1609.34 },
    
    { id: 'gram', type: 'weight', labelKey: 'UNIT_GRAM', factor: 1 },
    { id: 'kilogram', type: 'weight', labelKey: 'UNIT_KILOGRAM', factor: 1000 },
    { id: 'pound', type: 'weight', labelKey: 'UNIT_POUND', factor: 453.592 },
    { id: 'ounce', type: 'weight', labelKey: 'UNIT_OUNCE', factor: 28.3495 },

    { id: 'celsius', type: 'temp', labelKey: 'UNIT_CELSIUS', factor: 1 },
    { id: 'fahrenheit', type: 'temp', labelKey: 'UNIT_FAHRENHEIT', factor: 1 },
    { id: 'kelvin', type: 'temp', labelKey: 'UNIT_KELVIN', factor: 1 },
  ];

  availableUnits = computed(() => {
    return this.allUnits.filter(u => u.type === this.currentType());
  });

  constructor() {
    this.persistence.storage(this.currentType, 'uc-type');
    
    effect(() => {
       // Reset units when type changes if current units are invalid
       const units = this.availableUnits();
       const from = this.fromUnit();
       
       if (!units.find(u => u.id === from)) {
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
    const val = this.amount();
    const fromId = this.fromUnit();
    const toId = this.toUnit();
    const type = this.currentType();

    if (type === 'temp') {
      return this.convertTemp(val, fromId, toId);
    }

    const fromDef = this.allUnits.find(u => u.id === fromId);
    const toDef = this.allUnits.find(u => u.id === toId);

    if (!fromDef || !toDef) return 0;

    // Convert to base, then to target
    const base = val * fromDef.factor;
    return base / toDef.factor;
  });

  resultText = computed(() => {
     return `${this.amount()} ${this.fromUnit()} = ${this.result()} ${this.toUnit()}`;
  });

  private convertTemp(val: number, from: string, to: string): number {
    let celsius = val;
    // To Celsius
    if (from === 'fahrenheit') celsius = (val - 32) * 5/9;
    if (from === 'kelvin') celsius = val - 273.15;

    // From Celsius
    if (to === 'celsius') return celsius;
    if (to === 'fahrenheit') return (celsius * 9/5) + 32;
    if (to === 'kelvin') return celsius + 273.15;
    
    return celsius;
  }
}
