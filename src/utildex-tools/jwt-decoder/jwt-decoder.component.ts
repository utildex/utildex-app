import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { ClipboardService } from '../../services/clipboard.service';
import { DbService } from '../../services/db.service';
import { ToolState } from '../../services/tool-state';
import { decodeJwt, type JwtDecodeErrorCode, type JwtTemporalStatus } from './jwt-decoder.kernel';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-jwt-decoder',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="jwt-decoder">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <div class="glass-surface relative flex h-full flex-col overflow-hidden rounded-xl">
        <div class="glass-subsection flex items-center justify-between border-b px-2 py-1.5">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-base">verified_user</span>
            <span class="text-[10px] font-bold tracking-wide text-slate-500 uppercase">{{
              t.map()['WIDGET_TITLE']
            }}</span>
          </div>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            [class]="statusBadgeClass()"
            >{{ t.map()[statusKey()] }}</span
          >
        </div>

        <div class="flex flex-1 flex-col gap-2 p-2">
          <textarea
            [ngModel]="token()"
            (ngModelChange)="onTokenChange($event)"
            [placeholder]="t.map()['INPUT_PLACEHOLDER']"
            rows="3"
            class="glass-control h-20 min-h-0 w-full resize-none rounded-lg border p-2 font-mono text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
          ></textarea>

          <div class="glass-control flex min-h-0 flex-1 flex-col rounded-lg border">
            <div class="flex items-center justify-between border-b px-1.5 py-1">
              <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto">
                <button
                  (click)="setWidgetTab('header')"
                  class="rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors"
                  [class]="
                    widgetTab() === 'header'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                  "
                >
                  {{ t.map()['HEADER_LABEL'] }}
                </button>
                <button
                  (click)="setWidgetTab('payload')"
                  class="rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors"
                  [class]="
                    widgetTab() === 'payload'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                  "
                >
                  {{ t.map()['PAYLOAD_LABEL'] }}
                </button>
                <button
                  (click)="setWidgetTab('claims')"
                  class="rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors"
                  [class]="
                    widgetTab() === 'claims'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                  "
                >
                  {{ t.map()['CLAIMS_TITLE'] }}
                </button>
                <button
                  (click)="setWidgetTab('signature')"
                  class="rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors"
                  [class]="
                    widgetTab() === 'signature'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                  "
                >
                  {{ t.map()['SIGNATURE_LABEL'] }}
                </button>
              </div>

              <button
                (click)="copyWidgetTabContent()"
                [disabled]="!widgetTabContent()"
                class="bg-primary ml-2 shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {{
                  copiedSection() === widgetTabCopySection()
                    ? t.map()['BTN_COPIED']
                    : t.map()['BTN_COPY']
                }}
              </button>
            </div>

            <div class="min-h-0 flex-1 overflow-auto p-2">
              @if (widgetTab() === 'claims') {
                <div class="space-y-1 text-[10px] text-slate-700 dark:text-slate-200">
                  <div>
                    {{ t.map()['CLAIM_STATUS'] }}:
                    <span class="font-semibold">{{ t.map()[statusKey()] }}</span>
                  </div>
                  <div>
                    {{ t.map()['CLAIM_SUB'] }}:
                    <span class="font-mono">{{ claimText('sub') }}</span>
                  </div>
                  <div>
                    {{ t.map()['CLAIM_ISS'] }}:
                    <span class="font-mono">{{ claimText('iss') }}</span>
                  </div>
                  <div>
                    {{ t.map()['CLAIM_AUD'] }}:
                    <span class="font-mono">{{ claimText('aud') }}</span>
                  </div>
                  <div>
                    {{ t.map()['CLAIM_EXP'] }}:
                    <span class="font-mono">{{ timeText(decoded().expiresAt) }}</span>
                  </div>
                </div>
              } @else {
                <pre
                  class="font-mono text-[10px] break-words whitespace-pre-wrap text-slate-700 dark:text-slate-100"
                  >{{ widgetTabContent() || t.map()['EMPTY_HINT'] }}</pre
                >
              }
            </div>
          </div>
        </div>
      </div>
    }

    <ng-template #mainContent>
      <div class="glass-surface glass-surface-hover relative overflow-hidden rounded-2xl">
        <div
          class="pointer-events-none absolute -top-24 -left-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl"
        ></div>

        <div class="glass-subsection relative z-[1] border-b px-4 py-3 sm:px-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-xl">verified_user</span>
              <h2
                class="text-sm font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200"
              >
                {{ t.map()['TITLE'] }}
              </h2>
            </div>

            <div
              class="glass-control inline-flex items-center gap-3 rounded-xl border px-3 py-2 text-sm"
            >
              <span class="text-[10px] font-bold tracking-wide text-slate-500 uppercase"
                >Pretty</span
              >
              <input
                type="checkbox"
                [ngModel]="pretty()"
                (ngModelChange)="setPretty($event)"
                class="accent-primary h-4 w-4"
              />
              <span class="text-slate-700 dark:text-slate-200">{{ t.map()['PRETTY_PRINT'] }}</span>
            </div>
          </div>
        </div>

        <div class="relative z-[1] grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-6 lg:grid-cols-2">
          <section class="glass-surface rounded-xl lg:col-span-2">
            <div class="glass-subsection flex items-center justify-between border-b px-4 py-2.5">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-base">vpn_key</span>
                <span class="text-xs font-bold tracking-wide text-slate-500 uppercase">{{
                  t.map()['INPUT_LABEL']
                }}</span>
              </div>
              <div class="inline-flex items-center gap-2">
                <button
                  (click)="loadSample()"
                  class="glass-button rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  {{ t.map()['BTN_SAMPLE'] }}
                </button>
                <button
                  (click)="clearAll()"
                  class="glass-button rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  {{ t.map()['BTN_CLEAR'] }}
                </button>
              </div>
            </div>
            <textarea
              [ngModel]="token()"
              (ngModelChange)="onTokenChange($event)"
              [placeholder]="t.map()['INPUT_PLACEHOLDER']"
              rows="5"
              class="h-40 w-full resize-y bg-transparent p-4 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            ></textarea>
          </section>

          <section class="glass-surface rounded-xl">
            <div class="glass-subsection flex items-center justify-between border-b px-4 py-2.5">
              <span class="text-xs font-bold tracking-wide text-slate-500 uppercase">{{
                t.map()['HEADER_LABEL']
              }}</span>
              <button
                (click)="copyText(decoded().headerText, 'header')"
                [disabled]="!decoded().headerText"
                class="bg-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {{ copiedSection() === 'header' ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
              </button>
            </div>
            <pre
              class="h-56 overflow-auto p-4 font-mono text-xs break-words whitespace-pre-wrap text-slate-800 dark:text-slate-100"
              >{{ decoded().headerText || t.map()['EMPTY_HINT'] }}</pre
            >
          </section>

          <section class="glass-surface rounded-xl">
            <div class="glass-subsection flex items-center justify-between border-b px-4 py-2.5">
              <span class="text-xs font-bold tracking-wide text-slate-500 uppercase">{{
                t.map()['PAYLOAD_LABEL']
              }}</span>
              <button
                (click)="copyText(decoded().payloadText, 'payload')"
                [disabled]="!decoded().payloadText"
                class="bg-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {{ copiedSection() === 'payload' ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
              </button>
            </div>
            <pre
              class="h-56 overflow-auto p-4 font-mono text-xs break-words whitespace-pre-wrap text-slate-800 dark:text-slate-100"
              >{{ decoded().payloadText || t.map()['EMPTY_HINT'] }}</pre
            >
          </section>

          <section class="glass-surface rounded-xl lg:col-span-2">
            <div class="glass-subsection flex items-center justify-between border-b px-4 py-2.5">
              <span class="text-xs font-bold tracking-wide text-slate-500 uppercase">{{
                t.map()['SIGNATURE_LABEL']
              }}</span>
              <button
                (click)="copyText(signatureValue(), 'signature')"
                [disabled]="!signatureValue()"
                class="bg-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {{ copiedSection() === 'signature' ? t.map()['BTN_COPIED'] : t.map()['BTN_COPY'] }}
              </button>
            </div>
            <pre
              class="overflow-auto p-4 font-mono text-xs break-words whitespace-pre-wrap text-slate-800 dark:text-slate-100"
              >{{ signatureValue() || t.map()['NO_SIGNATURE'] }}</pre
            >
          </section>
        </div>

        <div class="glass-subsection relative z-[1] border-t px-4 py-3 sm:px-6">
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div class="glass-control rounded-xl border p-3">
              <div class="mb-2 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                {{ t.map()['CLAIMS_TITLE'] }}
              </div>
              <div
                class="grid grid-cols-1 gap-1.5 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-200"
              >
                <div>
                  {{ t.map()['CLAIM_ISS'] }}: <span class="font-mono">{{ claimText('iss') }}</span>
                </div>
                <div>
                  {{ t.map()['CLAIM_SUB'] }}: <span class="font-mono">{{ claimText('sub') }}</span>
                </div>
                <div>
                  {{ t.map()['CLAIM_AUD'] }}: <span class="font-mono">{{ claimText('aud') }}</span>
                </div>
                <div>
                  {{ t.map()['CLAIM_STATUS'] }}:
                  <span class="font-semibold">{{ t.map()[statusKey()] }}</span>
                </div>
              </div>
            </div>

            <div class="glass-control rounded-xl border p-3">
              <div class="mb-2 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                {{ t.map()['TITLE'] }}
              </div>
              <div class="grid grid-cols-1 gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                <div>
                  alg: <span class="font-mono">{{ decoded().algorithm || '—' }}</span>
                </div>
                <div>
                  typ: <span class="font-mono">{{ decoded().tokenType || '—' }}</span>
                </div>
                <div>
                  {{ t.map()['CLAIM_IAT'] }}:
                  <span class="font-mono">{{ timeText(decoded().issuedAt) }}</span>
                </div>
                <div>
                  {{ t.map()['CLAIM_NBF'] }}:
                  <span class="font-mono">{{ timeText(decoded().notBefore) }}</span>
                </div>
                <div>
                  {{ t.map()['CLAIM_EXP'] }}:
                  <span class="font-mono">{{ timeText(decoded().expiresAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          @if (errorKey()) {
            <div
              class="mt-3 rounded-lg border border-rose-300/70 bg-rose-100/70 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/30 dark:text-rose-200"
            >
              {{ t.map()[errorKey()!] }}
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class JwtDecoderComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  clipboard = inject(ClipboardService);
  db = inject(DbService);

  private state = new ToolState(
    'jwt-decoder',
    {
      token: '',
      pretty: true,
    },
    this.db,
  );

  token = this.state.select('token');
  pretty = this.state.select('pretty');
  copiedSection = signal<'header' | 'payload' | 'signature' | null>(null);
  widgetTab = signal<'header' | 'payload' | 'claims' | 'signature'>('claims');

  decoded = computed(() => decodeJwt(this.token(), { pretty: this.pretty() }));

  statusKey = computed(() => this.statusToI18nKey(this.decoded().temporalStatus));

  statusBadgeClass = computed(() => {
    const status = this.decoded().temporalStatus;
    if (status === 'valid')
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
    if (status === 'expired')
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200';
    if (status === 'not-yet-valid')
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
    if (status === 'unbounded')
      return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
  });

  errorKey = computed(() => this.errorToI18nKey(this.decoded().error));

  signatureValue = computed(() => this.decoded().signatureSegment);

  widgetTabContent = computed(() => {
    const tab = this.widgetTab();
    if (tab === 'header') return this.decoded().headerText;
    if (tab === 'payload') return this.decoded().payloadText;
    if (tab === 'signature') return this.signatureValue();
    return this.widgetClaimsSummary();
  });

  widgetTabCopySection = computed<'header' | 'payload' | 'signature'>(() => {
    const tab = this.widgetTab();
    if (tab === 'header' || tab === 'payload' || tab === 'signature') return tab;
    return 'payload';
  });

  onTokenChange(value: string): void {
    this.state.update((s) => ({ ...s, token: value }));
  }

  setPretty(pretty: boolean): void {
    this.state.update((s) => ({ ...s, pretty }));
  }

  setWidgetTab(tab: 'header' | 'payload' | 'claims' | 'signature'): void {
    this.widgetTab.set(tab);
  }

  clearAll(): void {
    this.state.update((s) => ({ ...s, token: '' }));
    this.copiedSection.set(null);
  }

  loadSample(): void {
    const sample =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJpc3MiOiJ1dGlsZGV4LWFwcCJ9.' +
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    this.state.update((s) => ({ ...s, token: sample }));
  }

  async copyText(value: string, section: 'header' | 'payload' | 'signature'): Promise<void> {
    if (!value) return;
    await this.clipboard.copy(value, 'jwt-decoder');
    this.copiedSection.set(section);
    setTimeout(() => this.copiedSection.set(null), 1200);
  }

  async copyWidgetTabContent(): Promise<void> {
    const value = this.widgetTabContent();
    if (!value) return;
    await this.copyText(value, this.widgetTabCopySection());
  }

  claimText(name: string): string {
    const payload = this.decoded().payload;
    if (!payload) return '—';

    const value = payload[name];
    if (value === undefined || value === null) return '—';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  timeText(value: number | null): string {
    if (value === null) return '—';

    const dt = new Date(value * 1000);
    if (Number.isNaN(dt.getTime())) return '—';

    return `${value} (${dt.toLocaleString()})`;
  }

  private statusToI18nKey(status: JwtTemporalStatus): string {
    if (status === 'valid') return 'STATUS_VALID';
    if (status === 'expired') return 'STATUS_EXPIRED';
    if (status === 'not-yet-valid') return 'STATUS_NOT_YET_VALID';
    if (status === 'unbounded') return 'STATUS_UNBOUNDED';
    return 'STATUS_INVALID';
  }

  private errorToI18nKey(error: JwtDecodeErrorCode | null): string | null {
    if (error === 'INVALID_FORMAT') return 'ERROR_INVALID_FORMAT';
    if (error === 'HEADER_DECODE_FAILED') return 'ERROR_HEADER_DECODE_FAILED';
    if (error === 'PAYLOAD_DECODE_FAILED') return 'ERROR_PAYLOAD_DECODE_FAILED';
    if (error === 'HEADER_JSON_INVALID') return 'ERROR_HEADER_JSON_INVALID';
    if (error === 'PAYLOAD_JSON_INVALID') return 'ERROR_PAYLOAD_JSON_INVALID';
    return null;
  }

  private widgetClaimsSummary(): string {
    return [
      `${this.t.map()['CLAIM_STATUS']}: ${this.t.map()[this.statusKey()]}`,
      `${this.t.map()['CLAIM_SUB']}: ${this.claimText('sub')}`,
      `${this.t.map()['CLAIM_ISS']}: ${this.claimText('iss')}`,
      `${this.t.map()['CLAIM_AUD']}: ${this.claimText('aud')}`,
      `${this.t.map()['CLAIM_EXP']}: ${this.timeText(this.decoded().expiresAt)}`,
    ].join('\n');
  }
}
