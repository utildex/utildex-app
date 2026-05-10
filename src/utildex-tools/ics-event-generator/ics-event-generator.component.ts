import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ZonePickerComponent } from '../../components/zone-picker/zone-picker.component';
import { PersistenceService } from '../../services/persistence.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { convert, detectLocalZone, listSupportedZones } from './ics-event-generator.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type Status = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';

const REMINDER_OPTIONS: { minutes: number; key: string }[] = [
  { minutes: 5, key: 'REMINDER_5' },
  { minutes: 15, key: 'REMINDER_15' },
  { minutes: 30, key: 'REMINDER_30' },
  { minutes: 60, key: 'REMINDER_60' },
  { minutes: 1440, key: 'REMINDER_1440' },
];

const RECURRENCE_OPTIONS: { id: Recurrence; key: string }[] = [
  { id: 'none', key: 'RECUR_NONE' },
  { id: 'daily', key: 'RECUR_DAILY' },
  { id: 'weekly', key: 'RECUR_WEEKLY' },
  { id: 'monthly', key: 'RECUR_MONTHLY' },
  { id: 'yearly', key: 'RECUR_YEARLY' },
];

const STATUS_OPTIONS: { id: Status; key: string }[] = [
  { id: 'CONFIRMED', key: 'STATUS_CONFIRMED' },
  { id: 'TENTATIVE', key: 'STATUS_TENTATIVE' },
  { id: 'CANCELLED', key: 'STATUS_CANCELLED' },
];

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultStartTime(): string {
  const next = new Date();
  next.setMinutes(next.getMinutes() + 60 - (next.getMinutes() % 60), 0, 0);
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
}

function addHourToTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const total = (h + 1) * 60 + m;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

@Component({
  selector: 'app-ics-event-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ZonePickerComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="ics-event-generator">
      <div
        class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-4 lg:p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex min-w-0 flex-col gap-3">
          <!-- Basics -->
          <section class="flex flex-col gap-2">
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['SECTION_BASICS'] }}
            </h2>
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_TITLE']
              }}</span>
              <input
                type="text"
                [value]="title()"
                [placeholder]="t.map()['LABEL_TITLE_PLACEHOLDER']"
                (input)="title.set($any($event.target).value)"
                class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                t.map()['LABEL_DESCRIPTION']
              }}</span>
              <textarea
                rows="2"
                [value]="description()"
                (input)="description.set($any($event.target).value)"
                class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              ></textarea>
            </label>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_LOCATION']
                }}</span>
                <input
                  type="text"
                  [value]="location()"
                  (input)="location.set($any($event.target).value)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_URL']
                }}</span>
                <input
                  type="url"
                  [value]="url()"
                  (input)="url.set($any($event.target).value)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>
          </section>

          <!-- When -->
          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['SECTION_WHEN'] }}
              </h2>
              <label
                class="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  [checked]="allDay()"
                  (change)="allDay.set($any($event.target).checked)"
                  class="accent-primary h-4 w-4"
                />
                {{ t.map()['LABEL_ALL_DAY'] }}
              </label>
            </div>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_START_DATE']
                }}</span>
                <input
                  type="date"
                  [value]="startDate()"
                  (change)="startDate.set($any($event.target).value)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>
              @if (!allDay()) {
                <label class="flex flex-col gap-1">
                  <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_START_TIME']
                  }}</span>
                  <input
                    type="time"
                    [value]="startTime()"
                    (change)="startTime.set($any($event.target).value)"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 tabular-nums dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              }
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_END_DATE']
                }}</span>
                <input
                  type="date"
                  [value]="endDate()"
                  (change)="endDate.set($any($event.target).value)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>
              @if (!allDay()) {
                <label class="flex flex-col gap-1">
                  <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_END_TIME']
                  }}</span>
                  <input
                    type="time"
                    [value]="endTime()"
                    (change)="endTime.set($any($event.target).value)"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 tabular-nums dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              }
            </div>
            @if (!allDay()) {
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_ZONE']
                }}</span>
                <app-zone-picker
                  [zones]="zones"
                  [value]="zone()"
                  [placeholder]="t.map()['ZONE_SEARCH_PLACEHOLDER']"
                  [noResultsLabel]="t.map()['ZONE_SEARCH_EMPTY']"
                  (valueChange)="zone.set($event)"
                />
              </label>
            }
          </section>

          <!-- Recurrence -->
          <section class="flex flex-col gap-2">
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['SECTION_RECURRENCE'] }}
            </h2>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_RECURRENCE']
                }}</span>
                <select
                  [ngModel]="recurrence()"
                  (ngModelChange)="recurrence.set($event)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  @for (opt of recurrenceOptions; track opt.id) {
                    <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
                  }
                </select>
              </label>
              @if (recurrence() !== 'none') {
                <label class="flex flex-col gap-1">
                  <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_INTERVAL']
                  }}</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    [value]="recurrenceInterval()"
                    (input)="recurrenceInterval.set(+$any($event.target).value)"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 tabular-nums dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label class="flex flex-col gap-1">
                  <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_COUNT']
                  }}</span>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    [value]="recurrenceCount()"
                    (input)="recurrenceCount.set(+$any($event.target).value)"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 tabular-nums dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label class="flex flex-col gap-1">
                  <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_UNTIL']
                  }}</span>
                  <input
                    type="date"
                    [value]="recurrenceUntil()"
                    (change)="recurrenceUntil.set($any($event.target).value)"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              }
            </div>
          </section>

          <!-- Reminders -->
          <section class="flex flex-col gap-2">
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['SECTION_REMINDERS'] }}
            </h2>
            <div class="flex flex-wrap gap-2">
              @for (opt of reminderOptions; track opt.minutes) {
                <button
                  type="button"
                  (click)="toggleReminder(opt.minutes)"
                  [class]="reminderButtonClass(opt.minutes)"
                >
                  {{ t.map()[opt.key] }}
                </button>
              }
            </div>
          </section>

          <!-- Optional details -->
          <section class="flex flex-col gap-2">
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['SECTION_OPTIONAL'] }}
            </h2>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_ORGANIZER_NAME']
                }}</span>
                <input
                  type="text"
                  [value]="organizerName()"
                  (input)="organizerName.set($any($event.target).value)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_ORGANIZER_EMAIL']
                }}</span>
                <input
                  type="email"
                  [value]="organizerEmail()"
                  (input)="organizerEmail.set($any($event.target).value)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{{
                  t.map()['LABEL_STATUS']
                }}</span>
                <select
                  [ngModel]="status()"
                  (ngModelChange)="status.set($event)"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  @for (opt of statusOptions; track opt.id) {
                    <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
                  }
                </select>
              </label>
            </div>
          </section>

          <p
            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500"
          >
            <span class="inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-xs" aria-hidden="true">lock</span>
              {{ t.map()['PRIVACY_NOTE'] }}
            </span>
            <span>·</span>
            <span>{{ t.map()['DST_NOTE'] }}</span>
          </p>
        </div>

        <!-- Output / preview column -->
        <aside class="flex min-w-0 flex-col gap-2 lg:sticky lg:top-3 lg:self-start">
          @if (!result().valid) {
            <div
              class="flex flex-col gap-1 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
            >
              <p class="font-semibold">{{ t.map()['RESULT_INVALID'] }}</p>
              <p class="font-mono text-xs break-words">{{ result().error }}</p>
            </div>
          } @else if (result().summary; as s) {
            <header class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['SECTION_OUTPUT'] }}
              </h2>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  (click)="copyIcs()"
                  class="glass-control focus:ring-primary inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 dark:text-slate-200 dark:hover:text-white"
                >
                  <span class="material-symbols-outlined text-sm" aria-hidden="true"
                    >content_copy</span
                  >
                  {{ t.map()['COPY_ICS'] }}
                </button>
                <button
                  type="button"
                  (click)="downloadIcs()"
                  class="bg-primary inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition-all hover:opacity-90 focus:ring-2 focus:ring-offset-1 focus:outline-none active:scale-95"
                >
                  <span class="material-symbols-outlined text-sm" aria-hidden="true">download</span>
                  {{ t.map()['DOWNLOAD_ICS'] }}
                </button>
              </div>
            </header>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ t.map()['RESULT_DURATION'] }}:
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                formatDuration(s.durationMinutes)
              }}</span>
              · {{ t.map()['RESULT_RRULE'] }}:
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                s.rruleHuman ?? t.map()['RESULT_NO_RRULE']
              }}</span>
            </p>
            <pre
              class="max-h-[60vh] min-h-[12rem] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-snug whitespace-pre text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >{{ result().ics }}</pre
            >
          }
        </aside>
      </div>
    </app-tool-layout>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class IcsEventGeneratorComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private clipboard = inject(ClipboardService);
  private persistence = inject(PersistenceService);

  readonly zones = listSupportedZones();
  readonly reminderOptions = REMINDER_OPTIONS;
  readonly recurrenceOptions = RECURRENCE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  title = signal<string>('Team meeting');
  description = signal<string>('');
  location = signal<string>('');
  url = signal<string>('');
  organizerName = signal<string>('');
  organizerEmail = signal<string>('');
  status = signal<Status>('CONFIRMED');

  allDay = signal<boolean>(false);
  startDate = signal<string>(todayLocalDate());
  startTime = signal<string>(defaultStartTime());
  endDate = signal<string>(todayLocalDate());
  endTime = signal<string>(addHourToTime(defaultStartTime()));
  zone = signal<string>(detectLocalZone());

  recurrence = signal<Recurrence>('none');
  recurrenceInterval = signal<number>(1);
  recurrenceCount = signal<number>(0);
  recurrenceUntil = signal<string>('');

  reminders = signal<number[]>([15]);

  result = computed(() =>
    convert({
      title: this.title(),
      description: this.description(),
      location: this.location(),
      url: this.url(),
      organizerName: this.organizerName(),
      organizerEmail: this.organizerEmail(),
      startDate: this.startDate(),
      startTime: this.startTime(),
      endDate: this.endDate(),
      endTime: this.endTime(),
      allDay: this.allDay(),
      zone: this.zone(),
      recurrence: this.recurrence() === 'none' ? undefined : this.recurrence(),
      recurrenceInterval: this.recurrenceInterval(),
      recurrenceCount: this.recurrenceCount() > 0 ? this.recurrenceCount() : undefined,
      recurrenceUntil: this.recurrenceUntil() || undefined,
      remindersMinutes: this.reminders(),
      status: this.status(),
    }),
  );

  constructor() {
    this.persistence.storage(this.title, 'ics-title', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.zone, 'ics-zone', { type: 'string', strategy: 'hybrid' });
    this.persistence.storage(this.organizerName, 'ics-org-name', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.organizerEmail, 'ics-org-email', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.reminders, 'ics-reminders', {
      type: 'object',
      strategy: 'hybrid',
    });
  }

  toggleReminder(minutes: number): void {
    const set = new Set(this.reminders());
    if (set.has(minutes)) set.delete(minutes);
    else set.add(minutes);
    this.reminders.set(Array.from(set).sort((a, b) => a - b));
  }

  reminderButtonClass(minutes: number): string {
    const active = this.reminders().includes(minutes);
    return active
      ? 'inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm'
      : 'inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white';
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} ${this.t.map()['MINUTES_LABEL']}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0
      ? `${h} ${this.t.map()['HOURS_LABEL']}`
      : `${h} ${this.t.map()['HOURS_LABEL']} ${m} ${this.t.map()['MINUTES_LABEL']}`;
  }

  copyIcs(): void {
    const ics = this.result().ics;
    if (!ics) return;
    this.clipboard.copy(ics, 'ics-event-generator');
  }

  downloadIcs(): void {
    const r = this.result();
    if (!r.ics || !r.filename) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const blob = new Blob([r.ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
