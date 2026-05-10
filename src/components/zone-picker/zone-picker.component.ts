import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Searchable IANA timezone picker.
 * - Type any part of a zone or city ("toky", "new york", "paris", "+05:30") to filter.
 * - Keyboard: Up/Down to navigate, Enter to select, Escape to close.
 * - Click outside closes.
 */
@Component({
  selector: 'app-zone-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full">
      <div class="relative">
        <input
          #inputEl
          type="text"
          role="combobox"
          aria-autocomplete="list"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="listboxId"
          [attr.aria-activedescendant]="
            open() && filtered().length > 0 ? listboxId + '-' + activeIndex() : null
          "
          [placeholder]="placeholder() || 'Search city or zone…'"
          [value]="displayValue()"
          (focus)="onFocus()"
          (input)="onInput($any($event.target).value)"
          (keydown)="onKeydown($event)"
          [disabled]="disabled()"
          class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 pr-8 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
        <span
          class="material-symbols-outlined pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-base text-slate-400"
          aria-hidden="true"
          >{{ open() ? 'expand_less' : 'expand_more' }}</span
        >
      </div>
      @if (open() && filtered().length > 0) {
        <ul
          [id]="listboxId"
          role="listbox"
          class="glass-surface-strong absolute left-0 z-40 mt-1 max-h-64 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          @for (item of filtered(); track item.zone; let i = $index) {
            <li
              [id]="listboxId + '-' + i"
              role="option"
              [attr.aria-selected]="i === activeIndex()"
              (mousedown)="select(item.zone, $event)"
              (mouseenter)="activeIndex.set(i)"
              [class]="rowClass(i)"
            >
              <span class="truncate text-sm font-medium">{{ item.label }}</span>
              <span class="ml-2 flex-shrink-0 font-mono text-[10px] text-slate-400">{{
                item.zone
              }}</span>
            </li>
          }
        </ul>
      } @else if (open() && search().length > 0) {
        <div
          class="absolute left-0 z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
        >
          {{ noResultsLabel() || 'No matches' }}
        </div>
      }
    </div>
  `,
})
export class ZonePickerComponent {
  zones = input<string[]>([]);
  value = input<string>('');
  placeholder = input<string>('');
  noResultsLabel = input<string>('');
  disabled = input<boolean>(false);
  valueChange = output<string>();

  private host = inject(ElementRef<HTMLElement>);

  open = signal(false);
  search = signal('');
  activeIndex = signal(0);

  readonly listboxId = `zp-${Math.random().toString(36).slice(2, 8)}`;

  constructor() {
    // Reset search when the bound value changes externally.
    effect(() => {
      this.value();
      if (!this.open()) this.search.set('');
    });
  }

  displayValue = computed(() => (this.open() ? this.search() : labelize(this.value())));

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const items = this.zones().map((z) => ({ zone: z, label: labelize(z) }));
    if (!q) return items.slice(0, 200);
    const tokens = q.split(/\s+/).filter(Boolean);
    return items
      .filter(({ zone, label }) => {
        const hay = (zone + ' ' + label).toLowerCase().replace(/_/g, ' ');
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, 200);
  });

  onFocus() {
    this.open.set(true);
    this.search.set('');
    this.activeIndex.set(0);
  }

  onInput(value: string) {
    this.search.set(value);
    this.open.set(true);
    this.activeIndex.set(0);
  }

  onKeydown(ev: KeyboardEvent) {
    const list = this.filtered();
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.open.set(true);
      this.activeIndex.update((i) => Math.min(i + 1, Math.max(0, list.length - 1)));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.activeIndex.update((i) => Math.max(0, i - 1));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const pick = list[this.activeIndex()];
      if (pick) this.select(pick.zone);
    } else if (ev.key === 'Escape') {
      this.close();
    } else if (ev.key === 'Tab') {
      this.close();
    }
  }

  select(zone: string, ev?: Event) {
    if (ev) ev.preventDefault();
    this.valueChange.emit(zone);
    this.close();
  }

  private close() {
    this.open.set(false);
    this.search.set('');
  }

  rowClass(i: number): string {
    const base =
      'flex cursor-pointer items-center justify-between px-3 py-1.5 text-slate-700 dark:text-slate-200';
    const active = i === this.activeIndex() ? ' bg-primary/10 dark:bg-primary/20' : '';
    return base + active;
  }

  @HostListener('document:mousedown', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.open()) return;
    const root = this.host.nativeElement as HTMLElement;
    if (!root.contains(ev.target as Node)) this.close();
  }
}

function labelize(zone: string): string {
  if (!zone) return '';
  return zone.replace(/_/g, ' ').replace(/\//g, ' / ');
}
