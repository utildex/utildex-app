import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ToolService } from '../../services/tool.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { generateQrCode, buildQrContent, QrType, ErrorCorrectionLevel } from './processor';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface QrStateData {
  type?: QrType;
  url?: string;
  text?: string;
  ssid?: string;
  pass?: string;
  hidden?: boolean;
  fg?: string;
  bg?: string;
  level?: ErrorCorrectionLevel;
}

@Component({
  selector: 'app-qr-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  styles: [
    `
      /* 3D Flip Logic */
      .perspective-1000 {
        perspective: 1000px;
      }
      .transform-style-3d {
        transform-style: preserve-3d;
      }
      .backface-hidden {
        backface-visibility: hidden;
      }
      .rotate-y-180 {
        transform: rotateY(180deg);
      }
    `,
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="qr-studio">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div
        class="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- 1x1 Flipper Layout -->
        @if (viewMode() === 'compact') {
          <div class="perspective-1000 group relative h-full w-full">
            <!-- Flipper Container -->
            <div
              class="transform-style-3d relative h-full w-full transition-transform duration-500"
              [class.rotate-y-180]="isFlipped()"
            >
              <!-- Front: Configuration -->
              <div
                class="absolute inset-0 flex flex-col bg-white backface-hidden dark:bg-slate-800"
              >
                <!-- Header -->
                <div
                  class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <div class="flex items-center gap-1 overflow-hidden">
                    <span class="material-symbols-outlined text-primary text-xs">qr_code_2</span>
                    <span class="truncate text-[9px] font-bold text-slate-500 uppercase">{{
                      t.map()['W_TITLE']
                    }}</span>
                  </div>
                </div>

                <!-- Compact Form -->
                <div class="flex flex-1 flex-col justify-between gap-1 overflow-y-auto p-2">
                  <!-- Content -->
                  <div class="space-y-1">
                    <select
                      [(ngModel)]="currentType"
                      class="focus:ring-primary w-full rounded border bg-slate-50 p-1 text-[10px] outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="url">{{ t.map()['W_TYPE_URL'] }}</option>
                      <option value="wifi">{{ t.map()['W_TYPE_WIFI'] }}</option>
                      <option value="text">{{ t.map()['W_TYPE_TEXT'] }}</option>
                    </select>

                    @if (currentType() === 'wifi') {
                      <input
                        type="text"
                        [(ngModel)]="wifiSsid"
                        [placeholder]="t.map()['W_PH_SSID']"
                        class="focus:ring-primary w-full rounded border p-1 text-[10px] outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900"
                      />
                      <input
                        type="password"
                        [(ngModel)]="wifiPass"
                        [placeholder]="t.map()['W_PH_PASS']"
                        class="focus:ring-primary w-full rounded border p-1 text-[10px] outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900"
                      />
                    } @else {
                      <input
                        type="text"
                        [ngModel]="currentType() === 'url' ? urlValue() : textValue()"
                        (ngModelChange)="
                          currentType() === 'url' ? urlValue.set($event) : textValue.set($event)
                        "
                        [placeholder]="t.map()['W_PH_DATA']"
                        class="focus:ring-primary w-full rounded border p-1 text-[10px] outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900"
                      />
                    }
                  </div>

                  <!-- Appearance -->
                  <div class="flex items-center gap-1">
                    <input
                      type="color"
                      [(ngModel)]="colorDark"
                      class="h-5 w-5 cursor-pointer rounded border-0 p-0"
                      title="Foreground"
                    />
                    <input
                      type="color"
                      [(ngModel)]="colorLight"
                      class="h-5 w-5 cursor-pointer rounded border-0 p-0"
                      title="Background"
                    />
                    <!-- Updated to use full words via i18n -->
                    <select
                      [(ngModel)]="errorLevel"
                      class="flex-1 rounded border bg-white p-0.5 text-[9px] dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="L">{{ t.map()['W_ECC_L'] }}</option>
                      <option value="M">{{ t.map()['W_ECC_M'] }}</option>
                      <option value="Q">{{ t.map()['W_ECC_Q'] }}</option>
                      <option value="H">{{ t.map()['W_ECC_H'] }}</option>
                    </select>
                  </div>

                  <button
                    (click)="generateAndFlip()"
                    class="bg-primary mt-auto w-full rounded py-1 text-[9px] font-bold text-white shadow-sm hover:opacity-90"
                  >
                    {{ t.map()['W_BTN_SHOW'] }}
                  </button>
                </div>
              </div>

              <!-- Back: QR Result -->
              <div
                class="absolute inset-0 flex rotate-y-180 flex-col bg-white backface-hidden dark:bg-slate-800"
              >
                <div
                  class="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-white p-3"
                >
                  @if (qrDataUrl()) {
                    <img
                      [src]="qrDataUrl()"
                      class="h-full w-full object-contain mix-blend-multiply"
                    />
                  } @else {
                    <span class="text-xs text-slate-400">{{ t.map()['W_NO_DATA'] }}</span>
                  }

                  <!-- Flip Back Button -->
                  <button
                    (click)="isFlipped.set(false)"
                    class="hover:text-primary absolute top-1 right-1 z-10 rounded-full border border-slate-100 bg-white/90 p-1 text-slate-400 shadow"
                  >
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
                @if (currentType() === 'wifi' && wifiSsid()) {
                  <div
                    class="flex h-5 shrink-0 items-center justify-center border-t border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span class="max-w-full truncate px-2 text-[9px] font-bold">{{
                      wifiSsid()
                    }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- 2x1 Wide Layout -->
        @else if (viewMode() === 'wide') {
          <!-- Header -->
          <div
            class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-primary text-sm">qr_code_2</span>
              <span class="text-xs font-bold text-slate-600 uppercase dark:text-slate-300">{{
                t.map()['W_TITLE']
              }}</span>
            </div>
            <button
              (click)="saveToWidget()"
              class="text-primary text-[10px] font-bold uppercase hover:text-blue-600"
            >
              {{ t.map()['W_BTN_SAVE'] }}
            </button>
          </div>

          <div class="flex flex-1 overflow-hidden">
            <!-- Left: Config -->
            <div
              class="flex w-1/2 flex-col gap-2 overflow-y-auto border-r border-slate-100 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <!-- Type Tabs (Icon based) -->
              <div class="flex shrink-0 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700">
                <button
                  (click)="setType('url')"
                  [class.bg-white]="currentType() === 'url'"
                  [class.shadow-sm]="currentType() === 'url'"
                  [class.text-primary]="currentType() === 'url'"
                  class="flex-1 rounded py-1 text-center transition-all"
                  [title]="t.map()['W_TYPE_URL']"
                >
                  <span class="material-symbols-outlined text-sm">link</span>
                </button>
                <button
                  (click)="setType('wifi')"
                  [class.bg-white]="currentType() === 'wifi'"
                  [class.shadow-sm]="currentType() === 'wifi'"
                  [class.text-primary]="currentType() === 'wifi'"
                  class="flex-1 rounded py-1 text-center transition-all"
                  [title]="t.map()['W_TYPE_WIFI']"
                >
                  <span class="material-symbols-outlined text-sm">wifi</span>
                </button>
                <button
                  (click)="setType('text')"
                  [class.bg-white]="currentType() === 'text'"
                  [class.shadow-sm]="currentType() === 'text'"
                  [class.text-primary]="currentType() === 'text'"
                  class="flex-1 rounded py-1 text-center transition-all"
                  [title]="t.map()['W_TYPE_TEXT']"
                >
                  <span class="material-symbols-outlined text-sm">notes</span>
                </button>
              </div>

              <!-- Inputs -->
              @if (currentType() === 'url') {
                <input
                  type="text"
                  [(ngModel)]="urlValue"
                  (input)="autoGenerate()"
                  placeholder="https://"
                  class="focus:ring-primary w-full rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              } @else if (currentType() === 'wifi') {
                <input
                  type="text"
                  [(ngModel)]="wifiSsid"
                  (input)="autoGenerate()"
                  [placeholder]="t.map()['W_PH_SSID']"
                  class="focus:ring-primary w-full rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="password"
                  [(ngModel)]="wifiPass"
                  (input)="autoGenerate()"
                  [placeholder]="t.map()['W_PH_PASS']"
                  class="focus:ring-primary w-full rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              } @else {
                <textarea
                  [(ngModel)]="textValue"
                  (input)="autoGenerate()"
                  rows="2"
                  [placeholder]="t.map()['W_PH_DATA']"
                  class="focus:ring-primary w-full resize-none rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                ></textarea>
              }

              <!-- Extra Controls -->
              <div
                class="mt-auto flex items-center gap-1 border-t border-slate-100 pt-2 dark:border-slate-700"
              >
                <input
                  type="color"
                  [(ngModel)]="colorDark"
                  (change)="generate()"
                  class="h-5 w-5 cursor-pointer rounded border-0 p-0"
                />
                <input
                  type="color"
                  [(ngModel)]="colorLight"
                  (change)="generate()"
                  class="h-5 w-5 cursor-pointer rounded border-0 p-0"
                />
                <select
                  [(ngModel)]="errorLevel"
                  (change)="generate()"
                  class="flex-1 rounded border bg-white p-0.5 text-[9px] dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                >
                  <option value="L">ECL: L</option>
                  <option value="M">ECL: M</option>
                  <option value="Q">ECL: Q</option>
                  <option value="H">ECL: H</option>
                </select>
              </div>
            </div>

            <!-- Right: Preview -->
            <div
              class="flex w-1/2 items-center justify-center bg-slate-50 p-2 dark:bg-slate-900/50"
            >
              <div
                class="relative flex h-full w-full items-center justify-center rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
              >
                @if (qrDataUrl()) {
                  <img [src]="qrDataUrl()" class="max-h-full max-w-full object-contain" />
                } @else {
                  <span class="text-xs text-slate-300">QR</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- 2x2 and Larger Layouts -->
        @else {
          <!-- Header -->
          <div
            class="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-primary text-sm">qr_code_2</span>
              <span class="text-xs font-bold text-slate-600 uppercase dark:text-slate-300">{{
                t.map()['TITLE']
              }}</span>
            </div>
            <button
              (click)="saveToWidget()"
              class="text-primary text-[10px] font-bold uppercase hover:text-blue-600"
            >
              {{ t.map()['W_BTN_SAVE'] }}
            </button>
          </div>

          <!-- Content Split -->
          <div class="flex flex-1 overflow-hidden">
            <!-- Left: Controls -->
            <div
              class="flex w-1/2 flex-col gap-2 overflow-y-auto border-r border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <div class="flex shrink-0 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700">
                <button
                  (click)="setType('url')"
                  [class.bg-white]="currentType() === 'url'"
                  [class.shadow-sm]="currentType() === 'url'"
                  [class.text-primary]="currentType() === 'url'"
                  class="flex-1 rounded py-1 text-center text-[9px] font-bold transition-all dark:text-slate-400 dark:hover:text-white"
                  [class.dark:bg-slate-600]="currentType() === 'url'"
                  [class.dark:text-white]="currentType() === 'url'"
                >
                  {{ t.map()['W_TYPE_URL'] }}
                </button>
                <button
                  (click)="setType('wifi')"
                  [class.bg-white]="currentType() === 'wifi'"
                  [class.shadow-sm]="currentType() === 'wifi'"
                  [class.text-primary]="currentType() === 'wifi'"
                  class="flex-1 rounded py-1 text-center text-[9px] font-bold transition-all dark:text-slate-400 dark:hover:text-white"
                  [class.dark:bg-slate-600]="currentType() === 'wifi'"
                  [class.dark:text-white]="currentType() === 'wifi'"
                >
                  {{ t.map()['W_TYPE_WIFI'] }}
                </button>
                <button
                  (click)="setType('text')"
                  [class.bg-white]="currentType() === 'text'"
                  [class.shadow-sm]="currentType() === 'text'"
                  [class.text-primary]="currentType() === 'text'"
                  class="flex-1 rounded py-1 text-center text-[9px] font-bold transition-all dark:text-slate-400 dark:hover:text-white"
                  [class.dark:bg-slate-600]="currentType() === 'text'"
                  [class.dark:text-white]="currentType() === 'text'"
                >
                  {{ t.map()['W_TYPE_TEXT'] }}
                </button>
              </div>

              @if (currentType() === 'url') {
                <input
                  type="text"
                  [(ngModel)]="urlValue"
                  (input)="autoGenerate()"
                  placeholder="https://"
                  class="focus:ring-primary w-full rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              } @else if (currentType() === 'wifi') {
                <input
                  type="text"
                  [(ngModel)]="wifiSsid"
                  (input)="autoGenerate()"
                  [placeholder]="t.map()['W_PH_SSID']"
                  class="focus:ring-primary w-full rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="password"
                  [(ngModel)]="wifiPass"
                  (input)="autoGenerate()"
                  [placeholder]="t.map()['W_PH_PASS']"
                  class="focus:ring-primary w-full rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              } @else {
                <textarea
                  [(ngModel)]="textValue"
                  (input)="autoGenerate()"
                  rows="3"
                  [placeholder]="t.map()['W_PH_DATA']"
                  class="focus:ring-primary w-full resize-none rounded border p-1.5 text-xs outline-none focus:ring-1 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                ></textarea>
              }

              <!-- Extra controls -->
              <div
                class="mt-auto flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-700"
              >
                <span class="text-[10px] font-bold text-slate-400 uppercase">{{
                  t.map()['W_COLOR']
                }}</span>
                <input
                  type="color"
                  [(ngModel)]="colorDark"
                  (change)="generate()"
                  class="h-5 w-5 cursor-pointer rounded border-0 p-0"
                />
                <input
                  type="color"
                  [(ngModel)]="colorLight"
                  (change)="generate()"
                  class="h-5 w-5 cursor-pointer rounded border-0 p-0"
                />
              </div>
              <!-- Error Correction Level -->
              <select
                [(ngModel)]="errorLevel"
                (change)="generate()"
                class="w-full rounded border bg-white p-1 text-[10px] dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="L">{{ t.map()['Correction_L'] }}</option>
                <option value="M">{{ t.map()['Correction_M'] }}</option>
                <option value="Q">{{ t.map()['Correction_Q'] }}</option>
                <option value="H">{{ t.map()['Correction_H'] }}</option>
              </select>
            </div>

            <!-- Right: Preview -->
            <div
              class="flex w-1/2 items-center justify-center bg-slate-50 p-2 dark:bg-slate-900/50"
            >
              <div class="relative rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                @if (qrDataUrl()) {
                  <img
                    [src]="qrDataUrl()"
                    class="max-h-full max-w-full object-contain"
                    [style.max-height.px]="140"
                  />
                } @else {
                  <div class="flex h-20 w-20 items-center justify-center text-slate-300">
                    <span class="material-symbols-outlined text-3xl">qr_code_2</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }

    <ng-template #mainContent>
      <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <!-- Configuration Panel -->
        <div class="space-y-6 lg:col-span-1">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <!-- Type Selector -->
            <div class="mb-6">
              <label class="mb-2 block text-xs font-bold text-slate-500 uppercase">{{
                t.map()['TYPE_LABEL']
              }}</label>
              <div class="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
                <button
                  (click)="setType('url')"
                  [class]="getTypeClass('url')"
                  class="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium transition-all"
                >
                  <span class="material-symbols-outlined text-sm">link</span>
                </button>
                <button
                  (click)="setType('text')"
                  [class]="getTypeClass('text')"
                  class="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium transition-all"
                >
                  <span class="material-symbols-outlined text-sm">description</span>
                </button>
                <button
                  (click)="setType('wifi')"
                  [class]="getTypeClass('wifi')"
                  class="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-sm font-medium transition-all"
                >
                  <span class="material-symbols-outlined text-sm">wifi</span>
                </button>
              </div>
            </div>

            <!-- Inputs Based on Type -->
            <div class="space-y-4">
              @if (currentType() === 'url') {
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >{{ t.map()['INPUT_URL'] }}</label
                  >
                  <input
                    type="url"
                    [(ngModel)]="urlValue"
                    (ngModelChange)="generate()"
                    placeholder="https://example.com"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              } @else if (currentType() === 'text') {
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >{{ t.map()['INPUT_TEXT'] }}</label
                  >
                  <textarea
                    [(ngModel)]="textValue"
                    (ngModelChange)="generate()"
                    rows="3"
                    class="focus:ring-primary focus:border-primary w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  ></textarea>
                </div>
              } @else if (currentType() === 'wifi') {
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >{{ t.map()['WIFI_SSID'] }}</label
                  >
                  <input
                    type="text"
                    [(ngModel)]="wifiSsid"
                    (ngModelChange)="generate()"
                    class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
                    >{{ t.map()['WIFI_PASS'] }}</label
                  >
                  <div class="relative">
                    <input
                      [type]="showWifiPass() ? 'text' : 'password'"
                      [(ngModel)]="wifiPass"
                      (ngModelChange)="generate()"
                      class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pr-10 pl-3 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      (click)="showWifiPass.set(!showWifiPass())"
                      class="hover:text-primary absolute top-1/2 right-2 -translate-y-1/2 text-slate-400"
                    >
                      <span class="material-symbols-outlined text-sm">{{
                        showWifiPass() ? 'visibility_off' : 'visibility'
                      }}</span>
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    [(ngModel)]="wifiHidden"
                    (change)="generate()"
                    id="wifi_hidden"
                    class="text-primary focus:ring-primary rounded border-slate-300"
                  />
                  <label for="wifi_hidden" class="text-sm text-slate-600 dark:text-slate-400">{{
                    t.map()['WIFI_HIDDEN']
                  }}</label>
                </div>
              }
            </div>

            <div class="my-6 h-px bg-slate-100 dark:bg-slate-700"></div>

            <!-- Appearance -->
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-xs font-bold text-slate-500 uppercase">{{
                    t.map()['COLOR_FG']
                  }}</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      [(ngModel)]="colorDark"
                      (change)="generate()"
                      class="h-8 w-8 cursor-pointer rounded border-0 p-0"
                    />
                    <span class="font-mono text-xs text-slate-500">{{ colorDark() }}</span>
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-bold text-slate-500 uppercase">{{
                    t.map()['COLOR_BG']
                  }}</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      [(ngModel)]="colorLight"
                      (change)="generate()"
                      class="h-8 w-8 cursor-pointer rounded border-0 p-0"
                    />
                    <span class="font-mono text-xs text-slate-500">{{ colorLight() }}</span>
                  </div>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-bold text-slate-500 uppercase"
                  >Error Correction</label
                >
                <select
                  [(ngModel)]="errorLevel"
                  (change)="generate()"
                  class="w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="L">{{ t.map()['Correction_L'] }}</option>
                  <option value="M">{{ t.map()['Correction_M'] }}</option>
                  <option value="Q">{{ t.map()['Correction_Q'] }}</option>
                  <option value="H">{{ t.map()['Correction_H'] }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="lg:col-span-2">
          <div
            class="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="group relative rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              @if (qrDataUrl()) {
                <img
                  [src]="qrDataUrl()"
                  class="h-auto max-h-[300px] max-w-full object-contain transition-opacity duration-300"
                  [class.opacity-50]="isGenerating()"
                />
              } @else {
                <div class="flex h-64 w-64 items-center justify-center rounded-lg bg-slate-50">
                  <span class="material-symbols-outlined text-4xl text-slate-300">qr_code_2</span>
                </div>
              }
            </div>

            <div class="mt-8 flex gap-4">
              <button
                (click)="download()"
                [disabled]="!qrDataUrl()"
                class="bg-primary flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white shadow-lg transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span class="material-symbols-outlined">download</span>
                {{ t.map()['BTN_DOWNLOAD'] }}
              </button>
            </div>

            <div
              class="mt-8 flex max-w-md items-start gap-2 rounded-lg bg-blue-50 p-3 text-left dark:bg-blue-900/20"
            >
              <span class="material-symbols-outlined mt-0.5 text-lg text-blue-500"
                >verified_user</span
              >
              <p class="text-xs leading-relaxed text-blue-700 dark:text-blue-200">
                {{ t.map()['PRIVACY_NOTE'] }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class QrStudioComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{
    cols?: number;
    rows?: number;
    instanceId?: string;
    qrData?: QrStateData;
  } | null>(null);

  t = inject(ScopedTranslationService);
  toolService = inject(ToolService);

  // State
  currentType = signal<QrType>('url');

  // Data Inputs
  urlValue = signal('https://utildex.com');
  textValue = signal('Hello World');
  wifiSsid = signal('');
  wifiPass = signal('');
  wifiHidden = signal(false);
  showWifiPass = signal(false);

  // Appearance
  colorDark = signal('#000000');
  colorLight = signal('#ffffff');
  errorLevel = signal<ErrorCorrectionLevel>('M');

  // Output
  qrDataUrl = signal<string>('');
  isGenerating = signal(false);

  // Widget Specific State
  isFlipped = signal(false);

  // Widget specific computed check
  hasData = computed(() => {
    if (!this.isWidget()) return false;
    const cfg = this.widgetConfig();
    return !!cfg?.qrData;
  });

  viewMode = computed(() => {
    const config = this.widgetConfig();
    const w = config?.cols ?? 1;
    const h = config?.rows ?? 1;

    if (w === 1 && h === 1) return 'compact';
    if (w === 2 && h === 1) return 'wide';
    return 'default';
  });

  constructor() {
    this.generate();

    effect(() => {
      if (this.isWidget()) {
        const cfg = this.widgetConfig();
        if (cfg?.qrData) {
          this.restoreState(cfg.qrData);
          if (this.viewMode() === 'compact') {
            this.isFlipped.set(true);
          }
        }
      }
    });
  }

  setType(type: QrType) {
    this.currentType.set(type);
    this.generate();
  }

  getTypeClass(type: QrType) {
    return this.currentType() === type
      ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white';
  }

  autoGenerate() {
    this.generate();
  }

  generateAndFlip() {
    this.generate();
    this.saveToWidget();
    this.isFlipped.set(true);
  }

  async generate() {
    this.isGenerating.set(true);

    const content = buildQrContent(this.currentType(), {
      url: this.urlValue(),
      text: this.textValue(),
      wifi: {
        ssid: this.wifiSsid(),
        password: this.wifiPass(),
        hidden: this.wifiHidden(),
      },
    });

    if (!content) {
      this.isGenerating.set(false);
      return;
    }

    try {
      const url = await generateQrCode(content, {
        errorCorrectionLevel: this.errorLevel(),
        foreground: this.colorDark(),
        background: this.colorLight(),
        width: 1024,
      });
      this.qrDataUrl.set(url);
    } catch (e) {
      console.error(e);
    } finally {
      this.isGenerating.set(false);
    }
  }

  download() {
    const url = this.qrDataUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode-${this.currentType()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --- Widget Specific ---

  saveToWidget() {
    const cfg = this.widgetConfig();
    if (cfg && cfg.instanceId) {
      this.toolService.updateWidgetData(cfg.instanceId, {
        qrData: {
          type: this.currentType(),
          url: this.urlValue(),
          text: this.textValue(),
          ssid: this.wifiSsid(),
          pass: this.wifiPass(),
          hidden: this.wifiHidden(),
          fg: this.colorDark(),
          bg: this.colorLight(),
          level: this.errorLevel(),
        },
      });
    }
  }

  restoreState(data: QrStateData) {
    this.currentType.set(data.type || 'url');
    this.urlValue.set(data.url || '');
    this.textValue.set(data.text || '');
    this.wifiSsid.set(data.ssid || '');
    this.wifiPass.set(data.pass || '');
    this.wifiHidden.set(!!data.hidden);
    this.colorDark.set(data.fg || '#000000');
    this.colorLight.set(data.bg || '#ffffff');
    this.errorLevel.set(data.level || 'M');
    this.generate();
  }

  openConfig() {
    this.isFlipped.set(false);
  }

  clearWidgetData() {
    const cfg = this.widgetConfig();
    if (cfg && cfg.instanceId) {
      this.toolService.updateWidgetData(cfg.instanceId, { qrData: null });
      this.qrDataUrl.set('');
      this.isFlipped.set(false);
    }
  }
}
