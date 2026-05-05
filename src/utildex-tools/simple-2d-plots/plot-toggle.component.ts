import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-plot-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="inline-flex h-8 items-center gap-2.5"
      [attr.aria-pressed]="checked()"
      (click)="checkedChange.emit(!checked())"
    >
      <span
        class="relative h-[22px] w-10 rounded-full transition-colors"
        [ngClass]="checked() ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'"
      >
        <span
          class="absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform"
          [ngClass]="checked() ? 'translate-x-5' : 'translate-x-0'"
        ></span>
      </span>
      <span class="text-xs font-medium whitespace-nowrap text-slate-500 dark:text-slate-400">{{
        label()
      }}</span>
    </button>
  `,
})
export class PlotToggleComponent {
  readonly checked = input<boolean>(false);
  readonly label = input<string>('');
  readonly checkedChange = output<boolean>();
}
