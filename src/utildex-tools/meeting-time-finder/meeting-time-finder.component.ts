import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { PersistenceService } from '../../services/persistence.service';
import { ClipboardService } from '../../services/clipboard.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import {
  type FindOverlapOutput,
  type MeetingWindow,
  type Participant,
  detectLocalZone,
  findOverlap,
  listSupportedZones,
  todayIsoInZone,
} from './meeting-time-finder.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type TimeFormat = '24h' | '12h';

interface ParticipantState extends Participant {
  id: string;
}

const GRANULARITY_OPTIONS: { id: 15 | 30 | 60; key: string }[] = [
  { id: 15, key: 'GRANULARITY_15' },
  { id: 30, key: 'GRANULARITY_30' },
  { id: 60, key: 'GRANULARITY_60' },
];

const TIME_FORMAT_OPTIONS: { id: TimeFormat; key: string }[] = [
  { id: '24h', key: 'TIME_FORMAT_24H' },
  { id: '12h', key: 'TIME_FORMAT_12H' },
];

function formatTime(time: string, fmt: TimeFormat): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  if (fmt === '24h') return time;
  const [hStr, m] = time.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

function zoneLabel(zone: string): string {
  return zone.replace(/_/g, ' ').replace(/\//g, ' / ');
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

@Component({
  selector: 'app-meeting-time-finder',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <app-tool-layout toolId="meeting-time-finder">
      <div
        class="mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5 dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- Top toolbar: date + anchor + granularity + time format -->
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_DATE']
            }}</span>
            <input
              type="date"
              [value]="date()"
              (change)="setDate($any($event.target).value)"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_ANCHOR_ZONE']
            }}</span>
            <select
              [ngModel]="anchorZone()"
              (ngModelChange)="setAnchorZone($event)"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              @for (zone of zones; track zone) {
                <option [value]="zone">{{ zoneLabel(zone) }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['LABEL_GRANULARITY']
            }}</span>
            <select
              [ngModel]="granularity()"
              (ngModelChange)="setGranularity(+$event)"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              @for (opt of granularityOptions; track opt.id) {
                <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['TIME_FORMAT_LABEL']
            }}</span>
            <select
              [ngModel]="timeFormat()"
              (ngModelChange)="setTimeFormat($event)"
              class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              @for (opt of timeFormatOptions; track opt.id) {
                <option [value]="opt.id">{{ t.map()[opt.key] }}</option>
              }
            </select>
          </label>
        </div>

        <p class="text-[10px] text-slate-400 dark:text-slate-500">
          {{ t.map()['LABEL_ANCHOR_HINT'] }}
        </p>

        <!-- Participants -->
        <section class="flex flex-col gap-2">
          <header class="flex items-center justify-between">
            <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {{ t.map()['LABEL_PARTICIPANTS'] }}
            </h2>
            <button
              type="button"
              (click)="addParticipant()"
              class="bg-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 focus:ring-2 focus:ring-offset-1 focus:outline-none active:scale-95"
            >
              <span class="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
              {{ t.map()['LABEL_ADD_PARTICIPANT'] }}
            </button>
          </header>

          <div class="flex flex-col gap-2">
            @for (p of participants(); track p.id) {
              <div
                class="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/40 p-2 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <label class="col-span-12 sm:col-span-3 flex flex-col gap-1">
                  <span class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_NAME']
                  }}</span>
                  <input
                    type="text"
                    [value]="p.label ?? ''"
                    [placeholder]="t.map()['LABEL_NAME_PLACEHOLDER']"
                    (input)="updateParticipant(p.id, { label: $any($event.target).value })"
                    class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label class="col-span-12 sm:col-span-4 flex flex-col gap-1">
                  <span class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_ZONE']
                  }}</span>
                  <select
                    [ngModel]="p.zone"
                    (ngModelChange)="updateParticipant(p.id, { zone: $event })"
                    class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  >
                    @for (zone of zones; track zone) {
                      <option [value]="zone">{{ zoneLabel(zone) }}</option>
                    }
                  </select>
                </label>
                <div class="col-span-8 sm:col-span-3 flex flex-col gap-1">
                  <span class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{{
                    t.map()['LABEL_HOURS']
                  }}</span>
                  <div class="flex items-center gap-1">
                    <input
                      type="time"
                      [value]="p.startTime"
                      (change)="
                        updateParticipant(p.id, { startTime: $any($event.target).value })
                      "
                      class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    <span class="text-xs text-slate-400">→</span>
                    <input
                      type="time"
                      [value]="p.endTime"
                      (change)="updateParticipant(p.id, { endTime: $any($event.target).value })"
                      class="focus:ring-primary focus:border-primary w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <label
                  class="col-span-3 sm:col-span-1 flex flex-col items-center gap-1"
                  [title]="t.map()['LABEL_INCLUDE_WEEKENDS']"
                >
                  <span class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    <span class="material-symbols-outlined text-base" aria-hidden="true">weekend</span>
                  </span>
                  <input
                    type="checkbox"
                    [checked]="!!p.includeWeekends"
                    (change)="
                      updateParticipant(p.id, {
                        includeWeekends: $any($event.target).checked,
                      })
                    "
                    class="text-primary focus:ring-primary mt-1 h-4 w-4 rounded border-slate-300"
                  />
                </label>
                <button
                  type="button"
                  (click)="removeParticipant(p.id)"
                  [attr.aria-label]="t.map()['LABEL_REMOVE']"
                  [title]="t.map()['LABEL_REMOVE']"
                  [disabled]="participants().length <= 1"
                  class="col-span-1 inline-flex h-8 items-center justify-center self-end rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-rose-900/40 dark:hover:text-rose-300"
                >
                  <span class="material-symbols-outlined text-base" aria-hidden="true">close</span>
                </button>
              </div>
            }
          </div>
        </section>

        <!-- Heatmap -->
        @if (result().slots.length > 0) {
          <section class="flex flex-col gap-2">
            <header class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {{ t.map()['HEATMAP_HEADING'] }}
              </h2>
              <div class="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                <span class="inline-flex items-center gap-1">
                  <span class="inline-block h-3 w-3 rounded-sm bg-emerald-500"></span>
                  {{ t.map()['HEATMAP_LEGEND_FULL'] }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="inline-block h-3 w-3 rounded-sm bg-amber-300"></span>
                  {{ t.map()['HEATMAP_LEGEND_PARTIAL'] }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="inline-block h-3 w-3 rounded-sm bg-slate-200 dark:bg-slate-700"></span>
                  {{ t.map()['HEATMAP_LEGEND_NONE'] }}
                </span>
              </div>
            </header>

            <div class="overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-y-1 text-xs">
                <thead>
                  <tr>
                    <th class="sticky left-0 z-10 bg-white px-2 py-1 text-left text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:bg-slate-800">
                      {{ t.map()['LABEL_ANCHOR_ZONE'] }}
                    </th>
                    @for (col of heatmapColumns(); track col.utcIso) {
                      <th
                        class="px-1 py-1 text-center text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400"
                        [class.text-emerald-600]="col.isFullOverlap"
                        [class.dark:text-emerald-400]="col.isFullOverlap"
                      >
                        {{ formatTimeDisplay(col.anchorTime) }}
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of heatmapRows(); track row.id) {
                    <tr>
                      <th
                        class="sticky left-0 z-10 bg-white px-2 py-1 text-left text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <div class="truncate">{{ row.name }}</div>
                        <div class="text-[10px] font-normal text-slate-400">{{ row.zoneShort }}</div>
                      </th>
                      @for (cell of row.cells; track cell.utcIso) {
                        <td
                          [class]="cellClass(cell.isWorking)"
                          [title]="
                            cell.time + ' (' + cell.weekday + ') · UTC ' + cell.offsetLabel
                          "
                        ></td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }

        <!-- Best windows -->
        <section class="flex flex-col gap-2">
          <h2 class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            {{ t.map()['RESULT_HEADING'] }}
          </h2>
          @if (validParticipants().length === 0) {
            <p class="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
              {{ t.map()['RESULT_INVALID'] }}
            </p>
          } @else if (result().fullOverlapWindows.length === 0) {
            <p class="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {{ t.map()['RESULT_NONE'] }}
            </p>
          } @else {
            <ol class="flex flex-col gap-2">
              @for (w of result().fullOverlapWindows; track w.startUtcIso) {
                <li
                  class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-700/40 dark:bg-emerald-900/10"
                >
                  <p class="text-[11px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                    {{ formatDuration(w.durationMinutes) }}
                  </p>
                  <div class="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    @for (slot of w.perParticipant; track slot.zone) {
                      <div class="text-sm">
                        <p class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {{ zoneLabel(slot.zone) }}
                        </p>
                        <p class="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                          {{ formatTimeDisplay(slot.startTime) }} →
                          {{ formatTimeDisplay(slot.endTime) }}
                          @if (slot.startDate !== slot.endDate) {
                            <span class="text-[10px] text-slate-400">
                              ({{ slot.startDate }} → {{ slot.endDate }})
                            </span>
                          } @else {
                            <span class="text-[10px] text-slate-400">({{ slot.startDate }})</span>
                          }
                        </p>
                      </div>
                    }
                  </div>
                </li>
              }
            </ol>
          }

          <!-- Copy bar -->
          <div
            class="mt-1 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700"
          >
            <span class="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{{
              t.map()['COPY_FORMAT']
            }}</span>
            <button
              type="button"
              (click)="copy('best')"
              [disabled]="result().fullOverlapWindows.length === 0"
              class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
            >
              <span class="material-symbols-outlined text-base" aria-hidden="true">star</span>
              {{ t.map()['COPY_BEST'] }}
            </button>
            <button
              type="button"
              (click)="copy('all')"
              [disabled]="result().fullOverlapWindows.length === 0"
              class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
            >
              <span class="material-symbols-outlined text-base" aria-hidden="true">list</span>
              {{ t.map()['COPY_ALL'] }}
            </button>
            <button
              type="button"
              (click)="copy('ics')"
              [disabled]="result().fullOverlapWindows.length === 0"
              class="glass-control focus:ring-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:text-slate-900 focus:ring-2 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-white"
            >
              <span class="material-symbols-outlined text-base" aria-hidden="true">event</span>
              {{ t.map()['COPY_ICS'] }}
            </button>
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
export class MeetingTimeFinderComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  private clipboard = inject(ClipboardService);
  private persistence = inject(PersistenceService);

  readonly granularityOptions = GRANULARITY_OPTIONS;
  readonly timeFormatOptions = TIME_FORMAT_OPTIONS;
  readonly zones = listSupportedZones();
  readonly zoneLabel = zoneLabel;

  // -------------------- State --------------------
  private detected = detectLocalZone();
  date = signal<string>(todayIsoInZone(this.detected));
  anchorZone = signal<string>(this.detected);
  granularity = signal<15 | 30 | 60>(60);
  timeFormat = signal<TimeFormat>('24h');
  participants = signal<ParticipantState[]>(this.defaultParticipants());

  constructor() {
    this.persistence.storage(this.anchorZone, 'mtf-anchor', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.granularity, 'mtf-granularity', {
      type: 'number',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.timeFormat, 'mtf-time-format', {
      type: 'string',
      strategy: 'hybrid',
    });
    this.persistence.storage(this.participants, 'mtf-participants', {
      type: 'object',
      strategy: 'hybrid',
    });
  }

  private defaultParticipants(): ParticipantState[] {
    const local = this.detected;
    const others = ['America/New_York', 'Europe/London', 'Asia/Tokyo'].filter((z) => z !== local);
    return [
      { id: makeId(), zone: local, label: '', startTime: '09:00', endTime: '17:00' },
      ...others.slice(0, 2).map((zone) => ({
        id: makeId(),
        zone,
        label: '',
        startTime: '09:00',
        endTime: '17:00',
      })),
    ];
  }

  // -------------------- Setters --------------------
  setDate(value: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) this.date.set(value);
  }
  setAnchorZone = (z: string) => z && this.anchorZone.set(z);
  setGranularity = (n: number) => {
    if (n === 15 || n === 30 || n === 60) this.granularity.set(n);
  };
  setTimeFormat = (f: TimeFormat) => this.timeFormat.set(f);

  addParticipant() {
    this.participants.update((list) => [
      ...list,
      {
        id: makeId(),
        zone: detectLocalZone(),
        label: '',
        startTime: '09:00',
        endTime: '17:00',
      },
    ]);
  }

  removeParticipant(id: string) {
    if (this.participants().length <= 1) return;
    this.participants.update((list) => list.filter((p) => p.id !== id));
  }

  updateParticipant(id: string, patch: Partial<ParticipantState>) {
    this.participants.update((list) =>
      list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  // -------------------- Computed --------------------
  validParticipants = computed(() =>
    this.participants().filter(
      (p) => !!p.zone && /^\d{2}:\d{2}$/.test(p.startTime) && /^\d{2}:\d{2}$/.test(p.endTime),
    ),
  );

  result = computed<FindOverlapOutput>(() =>
    findOverlap({
      date: this.date(),
      anchorZone: this.anchorZone(),
      participants: this.validParticipants(),
      stepMinutes: this.granularity(),
    }),
  );

  /**
   * Heatmap columns sampled every full hour from the anchor day's slots.
   * For 60-minute granularity that's every slot; for finer steps we still
   * show one column per hour to keep the table readable.
   */
  heatmapColumns = computed(() => {
    const slots = this.result().slots;
    const anchor = this.anchorZone();
    const anchorDate = this.date();
    return slots
      .filter((slot) => {
        const view = slot.perParticipant.find((v) => v.zone === anchor);
        if (!view) return slot.startMinutes % 60 === 0;
        return view.date === anchorDate && view.time.endsWith(':00');
      })
      .map((slot) => {
        const view = slot.perParticipant.find((v) => v.zone === anchor);
        return {
          utcIso: slot.utcIso,
          anchorTime: view?.time ?? '00:00',
          isFullOverlap: slot.isFullOverlap,
        };
      });
  });

  heatmapRows = computed(() => {
    const cols = this.heatmapColumns();
    const slotsByIso = new Map(this.result().slots.map((s) => [s.utcIso, s]));
    return this.validParticipants().map((p, idx) => {
      const fallback = this.t.map()['PARTICIPANT_DEFAULT_NAME'].replace('{n}', String(idx + 1));
      return {
        id: p.id,
        name: p.label?.trim() || fallback,
        zoneShort: zoneLabel(p.zone),
        cells: cols.map((col) => {
          const slot = slotsByIso.get(col.utcIso);
          const view = slot?.perParticipant.find((v) => v.zone === p.zone);
          return {
            utcIso: col.utcIso,
            isWorking: !!view?.isWorking,
            time: view?.time ?? '',
            weekday: view?.weekday ?? '',
            offsetLabel: view?.offsetLabel ?? '',
          };
        }),
      };
    });
  });

  // -------------------- Display helpers --------------------
  formatTimeDisplay(time: string): string {
    return formatTime(time, this.timeFormat());
  }

  cellClass(isWorking: boolean): string {
    return isWorking
      ? 'h-6 w-6 rounded-sm bg-emerald-500/80'
      : 'h-6 w-6 rounded-sm bg-slate-200 dark:bg-slate-700';
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const map = this.t.map();
    if (h === 0) return map['RESULT_DURATION'].replace('{minutes}', String(m));
    if (m === 0) return map['RESULT_DURATION_HOURS'].replace('{hours}', String(h));
    return map['RESULT_DURATION_MIXED']
      .replace('{hours}', String(h))
      .replace('{minutes}', String(m));
  }

  // -------------------- Copy --------------------
  private windowToPlain(w: MeetingWindow): string {
    const dur = this.formatDuration(w.durationMinutes);
    const lines = w.perParticipant.map((slot) => {
      const span =
        slot.startDate === slot.endDate
          ? `${this.formatTimeDisplay(slot.startTime)} → ${this.formatTimeDisplay(slot.endTime)} (${slot.startDate})`
          : `${this.formatTimeDisplay(slot.startTime)} (${slot.startDate}) → ${this.formatTimeDisplay(slot.endTime)} (${slot.endDate})`;
      return `  • ${zoneLabel(slot.zone)}: ${span}`;
    });
    return [`${dur} — UTC ${w.startUtcIso} → ${w.endUtcIso}`, ...lines].join('\n');
  }

  private toIcsDate(iso: string): string {
    // YYYY-MM-DDTHH:MM:SSZ → YYYYMMDDTHHMMSSZ
    return iso.replace(/[-:]/g, '');
  }

  private toIcs(): string {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Utildex//Meeting Time Finder//EN'];
    const stamp = this.toIcsDate(`${new Date().toISOString().slice(0, 19)}Z`);
    for (const w of this.result().fullOverlapWindows) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${w.startUtcIso}-utildex-mtf@local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${this.toIcsDate(w.startUtcIso)}`,
        `DTEND:${this.toIcsDate(w.endUtcIso)}`,
        `SUMMARY:${this.t.map()['TITLE']} (${this.formatDuration(w.durationMinutes)})`,
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  copy(format: 'best' | 'all' | 'ics') {
    const windows = this.result().fullOverlapWindows;
    if (windows.length === 0) return;
    let text = '';
    if (format === 'best') {
      text = this.windowToPlain(windows[0]);
    } else if (format === 'all') {
      text = windows.map((w) => this.windowToPlain(w)).join('\n\n');
    } else {
      text = this.toIcs();
    }
    if (text) this.clipboard.copy(text, 'Meeting Time Finder');
  }
}
