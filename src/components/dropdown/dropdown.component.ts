import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dropdown relative min-w-[12rem]">
      <button class="dropdown-trigger w-full px-4 py-3 rounded-xl border shadow-sm flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[12rem]" (click)="toggle()">
        <span class="truncate block w-full text-left">{{ typeof selectedLabel === 'function' ? selectedLabel() : selectedLabel }}</span>
        <span class="material-symbols-outlined text-base flex-shrink-0">expand_more</span>
      </button>
      <div *ngIf="open" class="dropdown-menu absolute left-0 mt-2 w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-50 min-w-[12rem]">
        <ul class="py-2">
          <li *ngFor="let option of (typeof options === 'function' ? options() : options)" (click)="select(option.value)" class="px-4 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium">
            {{ option.label }}
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .dropdown { position: relative; }
    .dropdown-menu { min-width: 160px; }
    .dropdown-trigger { transition: box-shadow 0.2s; }
    .dropdown-trigger:focus { box-shadow: 0 0 0 2px var(--color-primary); }
  `]
})
export class DropdownComponent {
  options = input<{ label: string, value: string }[]>();
  value = input<string>('');
  selectedLabel = input<string>('');
  valueChange = output<string>();

  open = false;

  toggle() {
    this.open = !this.open;
  }

  select(val: string) {
    this.valueChange.emit(val);
    this.open = false;
  }
}
