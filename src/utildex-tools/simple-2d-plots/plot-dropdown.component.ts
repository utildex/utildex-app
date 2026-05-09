import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, input, output, signal } from '@angular/core';

export interface PlotDropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-plot-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <button
        type="button"
        class="glass-control inline-flex h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
      >
        <span class="truncate">{{ selectedLabel() }}</span>
        <span class="material-symbols-outlined text-base text-slate-400">expand_more</span>
      </button>

      @if (open()) {
        <div
          class="glass-surface absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
        >
          @for (option of options(); track option.value) {
            <button
              type="button"
              class="hover:bg-primary/15 w-full rounded-md px-2 py-2 text-left text-sm text-slate-800 dark:text-slate-100"
              [class.text-primary]="option.value === value()"
              (click)="select(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class PlotDropdownComponent {
  readonly value = input.required<string>();
  readonly options = input.required<PlotDropdownOption[]>();
  readonly valueChange = output<string>();

  readonly open = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  selectedLabel(): string {
    const selected = this.options().find((option) => option.value === this.value());
    return selected?.label ?? this.options()[0]?.label ?? '';
  }

  toggle(): void {
    this.open.update((current) => !current);
  }

  select(next: string): void {
    this.valueChange.emit(next);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
