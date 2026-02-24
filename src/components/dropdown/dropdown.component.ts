import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dropdown relative min-w-[12rem]">
      <button
        class="dropdown-trigger focus:ring-primary flex w-full min-w-[12rem] items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:ring-2 focus:outline-none dark:bg-slate-800 dark:text-slate-200"
        (click)="toggle()"
      >
        <span class="block w-full truncate text-left">{{
          typeof selectedLabel === 'function' ? selectedLabel() : selectedLabel
        }}</span>
        <span class="material-symbols-outlined flex-shrink-0 text-base">expand_more</span>
      </button>
      <div
        *ngIf="open"
        class="dropdown-menu absolute left-0 z-50 mt-2 w-full min-w-[12rem] rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <ul class="py-2">
          <li
            *ngFor="let option of typeof options === 'function' ? options() : options"
            (click)="select(option.value)"
            class="cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {{ option.label }}
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
      .dropdown {
        position: relative;
      }
      .dropdown-menu {
        min-width: 160px;
      }
      .dropdown-trigger {
        transition: box-shadow 0.2s;
      }
      .dropdown-trigger:focus {
        box-shadow: 0 0 0 2px var(--color-primary);
      }
    `,
  ],
})
export class DropdownComponent {
  options = input<{ label: string; value: string }[]>();
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
