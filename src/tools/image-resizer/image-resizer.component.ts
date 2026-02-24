import { Component, inject, signal, computed, input, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface ResizableImage {
  id: string;
  file: File;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  // Computed preview state
  resizedUrl?: string;
  resizedBlob?: Blob;
  resizedWidth?: number;
  resizedHeight?: number;
  status: 'pending' | 'processing' | 'done' | 'error';
}

type ResizeMode = 'percent' | 'dimensions';

@Component({
  selector: 'app-image-resizer',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, FileDropDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="image-resizer">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- WIDGET MODE -->
      <div
        appFileDrop
        (fileDropped)="handleFileDrop($event)"
        class="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <!-- 1x1 Compact Redesigned -->
        @if (viewMode() === 'compact') {
          <div class="relative flex h-full flex-col">
            <!-- 1. EMPTY STATE -->
            @if (images().length === 0) {
              <div
                (click)="triggerUpload()"
                class="hover:text-primary absolute inset-0 flex cursor-pointer flex-col items-center justify-center p-2 text-center text-slate-400 transition-colors"
              >
                <span class="material-symbols-outlined mb-1 text-3xl">aspect_ratio</span>
                <span class="text-[9px] leading-tight font-bold uppercase">{{
                  t.map()['W_DROP']
                }}</span>
              </div>
            }

            <!-- 2. LOADED STATE (Main View) -->
            @else if (images().length > 0 && !isDone() && !showSettings()) {
              <!-- Background Preview -->
              <div class="pointer-events-none absolute inset-0 opacity-10">
                <img [src]="images()[0].originalUrl" class="h-full w-full object-cover" />
              </div>

              <!-- Header -->
              <div class="relative z-10 flex items-center justify-between p-2">
                <span
                  class="text-primary bg-primary/10 rounded px-1.5 py-0.5 text-[9px] font-bold"
                  >{{ images().length }}</span
                >
                <button (click)="reset()" class="text-slate-400 hover:text-red-500">
                  <span class="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>

              <!-- Content -->
              <div class="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 p-2">
                <div class="flex flex-col items-center">
                  <span class="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {{
                      mode() === 'percent'
                        ? percentage() + '%'
                        : (targetWidth() || '?') + ' x ' + (targetHeight() || '?')
                    }}
                  </span>
                </div>
                <div class="flex w-full gap-1">
                  <button
                    (click)="processBatch()"
                    [disabled]="isProcessing()"
                    class="bg-primary flex-1 rounded py-1 text-[9px] font-bold text-white shadow-sm hover:opacity-90"
                  >
                    {{ isProcessing() ? '...' : t.map()['BTN_RESIZE'] }}
                  </button>
                  <button
                    (click)="showSettings.set(true)"
                    class="rounded bg-slate-100 px-2 py-1 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    <span class="material-symbols-outlined text-[14px]">tune</span>
                  </button>
                </div>
              </div>
            }

            <!-- 3. SETTINGS OVERLAY -->
            @else if (showSettings() && !isDone()) {
              <div
                class="animate-fade-in absolute inset-0 z-20 flex flex-col bg-white p-2 dark:bg-slate-800"
              >
                <div
                  class="mb-2 flex items-center justify-between border-b border-slate-100 pb-1 dark:border-slate-700"
                >
                  <span class="text-[9px] font-bold text-slate-500 uppercase">{{
                    t.map()['W_CONF']
                  }}</span>
                  <button
                    (click)="showSettings.set(false)"
                    class="text-primary hover:text-primary/80"
                  >
                    <span class="material-symbols-outlined text-[14px]">check</span>
                  </button>
                </div>

                <div class="flex-1 space-y-2 overflow-y-auto">
                  <!-- Mode -->
                  <div class="flex rounded bg-slate-100 p-0.5 dark:bg-slate-700">
                    <button
                      (click)="mode.set('percent')"
                      class="flex-1 rounded py-1 text-[8px]"
                      [class.bg-white]="mode() === 'percent'"
                      [class.text-primary]="mode() === 'percent'"
                    >
                      %
                    </button>
                    <button
                      (click)="mode.set('dimensions')"
                      class="flex-1 rounded py-1 text-[8px]"
                      [class.bg-white]="mode() === 'dimensions'"
                      [class.text-primary]="mode() === 'dimensions'"
                    >
                      Px
                    </button>
                  </div>

                  <!-- Inputs -->
                  @if (mode() === 'percent') {
                    <div class="flex items-center gap-1">
                      <input
                        type="range"
                        [(ngModel)]="percentage"
                        min="1"
                        max="100"
                        class="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200"
                      />
                      <span class="w-5 text-right font-mono text-[8px]">{{ percentage() }}</span>
                    </div>
                  } @else {
                    <div class="flex gap-1">
                      <input
                        type="number"
                        [ngModel]="targetWidth()"
                        (ngModelChange)="updateDim('w', $event)"
                        placeholder="W"
                        class="w-full rounded border bg-transparent p-1 text-center text-[9px]"
                      />
                      <input
                        type="number"
                        [ngModel]="targetHeight()"
                        (ngModelChange)="updateDim('h', $event)"
                        placeholder="H"
                        class="w-full rounded border bg-transparent p-1 text-center text-[9px]"
                      />
                    </div>
                    <label class="flex items-center gap-1">
                      <input
                        type="checkbox"
                        [(ngModel)]="lockRatio"
                        class="text-primary h-3 w-3 rounded border-slate-300"
                      />
                      <span class="text-[8px] text-slate-500">{{ t.map()['LABEL_LOCK'] }}</span>
                    </label>
                  }
                </div>
              </div>
            }

            <!-- 4. DONE STATE -->
            @else if (isDone()) {
              <div
                class="animate-fade-in absolute inset-0 flex flex-col items-center justify-center bg-green-50 p-2 text-center dark:bg-green-900/20"
              >
                <span class="material-symbols-outlined mb-1 text-2xl text-green-500"
                  >check_circle</span
                >
                <button
                  (click)="downloadSmart()"
                  class="mb-1 w-full rounded bg-green-600 py-1.5 text-[10px] font-bold text-white shadow hover:bg-green-700"
                >
                  {{ t.map()['BTN_DOWNLOAD'] }}
                </button>
                <button (click)="reset()" class="text-[9px] text-slate-400 hover:underline">
                  {{ t.map()['BTN_RESET'] }}
                </button>
              </div>
            }
          </div>
        }

        <!-- 2x2+ Fully Featured Widget -->
        @else {
          <div
            class="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-primary text-sm">aspect_ratio</span>
              <span class="text-xs font-bold text-slate-700 uppercase dark:text-slate-200">{{
                t.map()['TITLE_SHORT']
              }}</span>
            </div>
            <div class="flex gap-1">
              <button
                (click)="triggerUpload()"
                class="hover:text-primary p-1 text-slate-400"
                title="Add Images"
              >
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
              @if (images().length > 0) {
                <button
                  (click)="reset()"
                  class="p-1 text-slate-400 hover:text-red-500"
                  title="Reset"
                >
                  <span class="material-symbols-outlined text-sm">refresh</span>
                </button>
              }
            </div>
          </div>

          <div class="flex flex-1 overflow-hidden">
            <!-- Left Column: Thumbnails List -->
            <div
              class="flex w-1/3 flex-col border-r border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30"
            >
              @if (images().length === 0) {
                <div
                  (click)="triggerUpload()"
                  class="flex flex-1 cursor-pointer flex-col items-center justify-center p-2 text-center text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span class="material-symbols-outlined mb-1 text-2xl">add_photo_alternate</span>
                  <span class="text-[8px] font-bold uppercase">{{ t.map()['W_DROP'] }}</span>
                </div>
              } @else {
                <div class="flex-1 space-y-1 overflow-y-auto p-1">
                  @for (img of images(); track img.id) {
                    <div
                      (click)="previewTarget.set(img)"
                      class="relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all"
                      [class.border-primary]="previewTarget()?.id === img.id"
                      [class.border-transparent]="previewTarget()?.id !== img.id"
                    >
                      <img [src]="img.originalUrl" class="h-full w-full object-cover" />
                      @if (img.status === 'done') {
                        <div
                          class="absolute inset-0 flex items-center justify-center bg-green-500/50 text-white"
                        >
                          <span class="material-symbols-outlined text-xs">check</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Right Column: Preview & Controls -->
            <div class="flex flex-1 flex-col bg-white dark:bg-slate-800">
              <!-- Preview Area -->
              <div
                class="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-100 p-2 dark:bg-slate-900"
              >
                @if (previewTarget(); as target) {
                  <img
                    [src]="
                      target.status === 'done' && target.resizedUrl
                        ? target.resizedUrl
                        : target.originalUrl
                    "
                    class="max-h-full max-w-full object-contain shadow-sm"
                  />
                  <div
                    class="absolute right-1 bottom-1 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[8px] text-white backdrop-blur-sm"
                  >
                    {{ target.status === 'done' ? target.resizedWidth : target.originalWidth }} x
                    {{ target.status === 'done' ? target.resizedHeight : target.originalHeight }}
                  </div>
                } @else {
                  <div class="flex flex-col items-center px-4 text-center text-xs text-slate-400">
                    <span class="material-symbols-outlined mb-1">image</span>
                    {{ t.map()['W_SELECT_HINT'] }}
                  </div>
                }
              </div>

              <!-- Widget Controls (Footer) -->
              @if (images().length > 0 && !isDone()) {
                <div class="shrink-0 space-y-2 border-t border-slate-100 p-2 dark:border-slate-700">
                  <!-- Mode & Inputs -->
                  <div class="flex gap-2">
                    <div class="flex shrink-0 rounded bg-slate-100 p-0.5 dark:bg-slate-700">
                      <button
                        (click)="mode.set('percent')"
                        class="rounded px-2 py-0.5 text-[9px] font-bold"
                        [class.bg-white]="mode() === 'percent'"
                        [class.text-primary]="mode() === 'percent'"
                      >
                        %
                      </button>
                      <button
                        (click)="mode.set('dimensions')"
                        class="rounded px-2 py-0.5 text-[9px] font-bold"
                        [class.bg-white]="mode() === 'dimensions'"
                        [class.text-primary]="mode() === 'dimensions'"
                      >
                        Px
                      </button>
                    </div>

                    @if (mode() === 'percent') {
                      <input
                        type="range"
                        [(ngModel)]="percentage"
                        min="1"
                        max="100"
                        class="accent-primary h-1.5 flex-1 cursor-pointer appearance-none self-center rounded-lg bg-slate-200"
                      />
                      <span class="w-5 self-center text-right font-mono text-[9px]">{{
                        percentage()
                      }}</span>
                    } @else {
                      <input
                        type="number"
                        [ngModel]="targetWidth()"
                        (ngModelChange)="updateDim('w', $event)"
                        placeholder="W"
                        class="w-0 flex-1 rounded border bg-slate-50 px-1 text-center text-[9px] dark:bg-slate-900"
                      />
                      <input
                        type="number"
                        [ngModel]="targetHeight()"
                        (ngModelChange)="updateDim('h', $event)"
                        placeholder="H"
                        class="w-0 flex-1 rounded border bg-slate-50 px-1 text-center text-[9px] dark:bg-slate-900"
                      />
                      <button
                        (click)="lockRatio.set(!lockRatio())"
                        [class.text-primary]="lockRatio()"
                        class="hover:text-primary text-slate-400"
                      >
                        <span class="material-symbols-outlined text-[14px]">{{
                          lockRatio() ? 'link' : 'link_off'
                        }}</span>
                      </button>
                    }
                  </div>

                  <!-- Format & Action -->
                  <div class="flex items-center gap-2">
                    <select
                      [(ngModel)]="targetFormat"
                      class="w-16 rounded border bg-slate-50 p-1 text-[9px] dark:bg-slate-900"
                    >
                      <option value="image/jpeg">JPG</option>
                      <option value="image/png">PNG</option>
                      <option value="image/webp">WEBP</option>
                    </select>
                    <button
                      (click)="processBatch()"
                      [disabled]="isProcessing()"
                      class="bg-primary flex-1 rounded px-2 py-1 text-[9px] font-bold text-white hover:opacity-90"
                    >
                      {{ isProcessing() ? '...' : t.map()['W_GO'] }}
                    </button>
                  </div>
                </div>
              }

              <!-- Download Action -->
              @else if (isDone()) {
                <div class="border-t border-slate-100 p-2 dark:border-slate-700">
                  <button
                    (click)="downloadSmart()"
                    class="flex w-full items-center justify-center gap-1 rounded bg-green-600 py-1.5 text-[10px] font-bold text-white shadow hover:bg-green-700"
                  >
                    <span class="material-symbols-outlined text-sm">download</span>
                    {{ images().length > 1 ? 'Download ZIP' : t.map()['BTN_DOWNLOAD'] }}
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- Hidden File Input -->
    <input
      #fileInput
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      (change)="handleFileSelect($event)"
    />

    <!-- Main Tool Content -->
    <ng-template #mainContent>
      <div class="flex min-h-[600px] flex-col gap-8 lg:flex-row">
        <!-- Sidebar Controls (Full Page) -->
        <div class="flex w-full flex-shrink-0 flex-col gap-6 lg:w-80">
          <div
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h3
              class="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-white"
            >
              <span class="material-symbols-outlined text-primary text-lg">tune</span>
              {{ t.map()['SECTION_RESIZE'] }}
            </h3>

            <!-- Resize Mode Tabs -->
            <div class="mb-6 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
              <button
                (click)="mode.set('percent')"
                [class]="getModeClass('percent')"
                class="flex-1 rounded-md py-2 text-center text-xs font-bold transition-all"
              >
                {{ t.map()['MODE_PERCENT'] }}
              </button>
              <button
                (click)="mode.set('dimensions')"
                [class]="getModeClass('dimensions')"
                class="flex-1 rounded-md py-2 text-center text-xs font-bold transition-all"
              >
                {{ t.map()['MODE_DIMENSIONS'] }}
              </button>
            </div>

            <!-- Resize Inputs -->
            <div class="mb-6 space-y-4">
              @if (mode() === 'percent') {
                <div>
                  <div class="mb-2 flex justify-between">
                    <span class="text-xs font-bold text-slate-500">{{
                      t.map()['MODE_PERCENT']
                    }}</span>
                    <span class="text-primary font-mono text-xs font-bold"
                      >{{ percentage() }}%</span
                    >
                  </div>
                  <input
                    type="range"
                    [(ngModel)]="percentage"
                    min="1"
                    max="100"
                    class="accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-600"
                  />
                </div>
              } @else {
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-bold text-slate-500">{{
                      t.map()['LABEL_WIDTH']
                    }}</label>
                    <input
                      type="number"
                      [ngModel]="targetWidth()"
                      (ngModelChange)="updateDim('w', $event)"
                      class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-bold text-slate-500">{{
                      t.map()['LABEL_HEIGHT']
                    }}</label>
                    <input
                      type="number"
                      [ngModel]="targetHeight()"
                      (ngModelChange)="updateDim('h', $event)"
                      class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                </div>
                <label class="mt-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    [(ngModel)]="lockRatio"
                    class="text-primary focus:ring-primary rounded border-slate-300"
                  />
                  <span class="text-xs font-medium text-slate-600 dark:text-slate-300">{{
                    t.map()['LABEL_LOCK']
                  }}</span>
                </label>
              }
            </div>

            <div class="mb-6 h-px bg-slate-100 dark:bg-slate-700"></div>

            <!-- Output Options -->
            <div class="space-y-4">
              <h3 class="text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-white">
                {{ t.map()['SECTION_OUTPUT'] }}
              </h3>
              <div>
                <label class="mb-1 block text-xs font-bold text-slate-500">{{
                  t.map()['LABEL_FORMAT']
                }}</label>
                <select
                  [(ngModel)]="targetFormat"
                  class="focus:ring-primary focus:border-primary w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WEBP</option>
                </select>
              </div>

              @if (targetFormat() !== 'image/png') {
                <div>
                  <div class="mb-1 flex justify-between">
                    <span class="text-xs font-bold text-slate-500">{{
                      t.map()['LABEL_QUALITY']
                    }}</span>
                    <span class="text-primary font-mono text-xs font-bold"
                      >{{ (quality() * 100).toFixed(0) }}%</span
                    >
                  </div>
                  <input
                    type="range"
                    [(ngModel)]="quality"
                    min="0.1"
                    max="1"
                    step="0.05"
                    class="accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-600"
                  />
                </div>
              }
            </div>

            <div class="mt-8 border-t border-slate-100 pt-6 dark:border-slate-700">
              <button
                (click)="processBatch()"
                [disabled]="images().length === 0 || isProcessing()"
                class="bg-primary shadow-primary/20 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                @if (isProcessing()) {
                  <span
                    class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  ></span>
                  {{ t.map()['MSG_PROCESSING'] }}
                } @else {
                  {{ t.map()['BTN_RESIZE'] }}
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Main Workspace -->
        <div class="flex flex-1 flex-col gap-6">
          <!-- Top Bar Actions -->
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
              <button
                (click)="activeTab.set('list')"
                class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all"
                [class.bg-white]="activeTab() === 'list'"
                [class.shadow-sm]="activeTab() === 'list'"
                [class.text-primary]="activeTab() === 'list'"
                [class.text-slate-500]="activeTab() !== 'list'"
                [class.dark:bg-slate-700]="activeTab() === 'list'"
                [class.dark:text-white]="activeTab() === 'list'"
              >
                <span class="material-symbols-outlined text-lg">grid_view</span>
                {{ t.map()['TAB_LIST'] }}
              </button>
              <button
                (click)="activeTab.set('preview')"
                class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all"
                [class.bg-white]="activeTab() === 'preview'"
                [class.shadow-sm]="activeTab() === 'preview'"
                [class.text-primary]="activeTab() === 'preview'"
                [class.text-slate-500]="activeTab() !== 'preview'"
                [class.dark:bg-slate-700]="activeTab() === 'preview'"
                [class.dark:text-white]="activeTab() === 'preview'"
                [disabled]="images().length === 0"
              >
                <span class="material-symbols-outlined text-lg">visibility</span>
                {{ t.map()['TAB_PREVIEW'] }}
              </button>
            </div>

            <div class="flex gap-2">
              <button
                (click)="triggerUpload()"
                class="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                <span class="material-symbols-outlined">add</span>
                {{ t.map()['BTN_ADD'] }}
              </button>
              @if (images().length > 0) {
                <button
                  (click)="reset()"
                  class="px-4 py-2 font-medium text-slate-500 transition-colors hover:text-red-500"
                >
                  {{ t.map()['BTN_RESET'] }}
                </button>
              }
              @if (isDone()) {
                <button
                  (click)="downloadSmart()"
                  class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-green-700"
                >
                  <span class="material-symbols-outlined">download</span>
                  {{ images().length > 1 ? t.map()['BTN_DOWNLOAD_ALL'] : t.map()['BTN_DOWNLOAD'] }}
                </button>
              }
            </div>
          </div>

          <!-- List View -->
          @if (activeTab() === 'list') {
            <div
              appFileDrop
              (fileDropped)="handleFileDrop($event)"
              class="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              @if (images().length === 0) {
                <div
                  (click)="triggerUpload()"
                  class="flex flex-1 cursor-pointer flex-col items-center justify-center p-10 text-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div
                    class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700"
                  >
                    <span class="material-symbols-outlined text-4xl">add_photo_alternate</span>
                  </div>
                  <h3 class="mb-2 text-xl font-bold text-slate-700 dark:text-slate-200">
                    {{ t.map()['DROP_LABEL'] }}
                  </h3>
                  <p class="text-slate-500">{{ t.map()['DROP_EXPLICIT'] }}</p>
                </div>
              } @else {
                <div class="flex-1 overflow-y-auto p-4">
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    @for (img of images(); track img.id) {
                      <div
                        class="group hover:border-primary/50 relative flex gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors dark:border-slate-700 dark:bg-slate-900"
                      >
                        <!-- Thumbnail -->
                        <div
                          class="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
                          (click)="previewTarget.set(img); activeTab.set('preview')"
                        >
                          <img [src]="img.originalUrl" class="h-full w-full object-cover" />
                          @if (img.status === 'done') {
                            <div
                              class="animate-fade-in absolute inset-0 flex items-center justify-center bg-green-500/80 text-white backdrop-blur-[1px]"
                            >
                              <span class="material-symbols-outlined">check</span>
                            </div>
                          }
                        </div>

                        <!-- Info -->
                        <div class="flex min-w-0 flex-1 flex-col justify-center">
                          <div
                            class="mb-1 truncate text-sm font-bold text-slate-800 dark:text-slate-200"
                          >
                            {{ img.file.name }}
                          </div>
                          <div class="font-mono text-xs text-slate-500">
                            {{ img.originalWidth }} x {{ img.originalHeight }}
                          </div>

                          @if (img.status === 'done') {
                            <div
                              class="mt-2 flex items-center gap-1 text-xs font-bold text-green-600"
                            >
                              <span>{{ img.resizedWidth }}x{{ img.resizedHeight }}</span>
                              <span class="font-normal text-slate-400"
                                >({{ formatBytes(img.resizedBlob!.size) }})</span
                              >
                            </div>
                          }
                        </div>

                        <!-- Actions -->
                        <div class="flex flex-col justify-center gap-1">
                          @if (img.status === 'done') {
                            <button
                              (click)="downloadSingle(img)"
                              class="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:text-green-600 dark:bg-slate-800"
                              title="Download"
                            >
                              <span class="material-symbols-outlined text-lg">download</span>
                            </button>
                          }
                          <button
                            (click)="removeImage(img.id)"
                            class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                          >
                            <span class="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Preview Tab (Split View) -->
          @if (activeTab() === 'preview') {
            <div
              class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              @if (previewTarget(); as target) {
                <!-- Nav -->
                <div
                  class="flex items-center gap-2 overflow-x-auto border-b border-slate-100 p-2 dark:border-slate-700"
                >
                  @for (img of images(); track img.id) {
                    <button
                      (click)="previewTarget.set(img)"
                      class="h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 opacity-70 transition-all hover:opacity-100"
                      [class.border-primary]="target.id === img.id"
                      [class.border-transparent]="target.id !== img.id"
                      [class.opacity-100]="target.id === img.id"
                    >
                      <img [src]="img.originalUrl" class="h-full w-full object-cover" />
                    </button>
                  }
                </div>

                <!-- Split View Content -->
                <div
                  class="grid flex-1 grid-cols-1 divide-y divide-slate-200 overflow-hidden md:grid-cols-2 md:divide-x md:divide-y-0 dark:divide-slate-700"
                >
                  <!-- Original -->
                  <div
                    class="relative flex flex-col overflow-hidden bg-slate-50 p-4 dark:bg-slate-900/50"
                  >
                    <div
                      class="absolute top-4 left-4 z-10 rounded bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
                    >
                      {{ t.map()['STATS_ORIGINAL'] }}
                    </div>
                    <div class="flex flex-1 items-center justify-center">
                      <img
                        [src]="target.originalUrl"
                        class="max-h-full max-w-full rounded object-contain shadow-lg"
                      />
                    </div>
                    <div class="mt-4 flex justify-between font-mono text-xs text-slate-500">
                      <span
                        >{{ t.map()['STATS_DIMENSIONS'] }}: {{ target.originalWidth }}x{{
                          target.originalHeight
                        }}</span
                      >
                      <span>{{ t.map()['STATS_SIZE'] }}: {{ formatBytes(target.file.size) }}</span>
                    </div>
                  </div>

                  <!-- Result -->
                  <div
                    class="relative flex flex-col overflow-hidden bg-slate-50 p-4 dark:bg-slate-900/50"
                  >
                    <div
                      class="bg-primary/90 absolute top-4 left-4 z-10 rounded px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
                    >
                      {{ t.map()['STATS_RESULT'] }}
                    </div>
                    <div class="relative flex flex-1 items-center justify-center">
                      @if (target.resizedUrl) {
                        <img
                          [src]="target.resizedUrl"
                          class="max-h-full max-w-full rounded object-contain shadow-lg"
                        />
                      } @else {
                        <div class="flex flex-col items-center gap-2 text-sm text-slate-400">
                          <span class="material-symbols-outlined text-3xl">hourglass_empty</span>
                          <span>{{ t.map()['MSG_PROCESSING'] }}</span>
                        </div>
                      }
                    </div>
                    @if (target.resizedUrl) {
                      <div
                        class="mt-4 flex justify-between font-mono text-xs font-bold text-green-600"
                      >
                        <span
                          >{{ t.map()['STATS_DIMENSIONS'] }}: {{ target.resizedWidth }}x{{
                            target.resizedHeight
                          }}</span
                        >
                        <span
                          >{{ t.map()['STATS_SIZE'] }}:
                          {{ formatBytes(target.resizedBlob!.size) }}</span
                        >
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="flex flex-1 flex-col items-center justify-center text-slate-400">
                  <p>No image selected.</p>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class ImageResizerComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  // State
  images = signal<ResizableImage[]>([]);
  activeTab = signal<'list' | 'preview'>('list');
  previewTarget = signal<ResizableImage | null>(null);

  // Widget Specific
  showSettings = signal(false);

  // Settings
  mode = signal<ResizeMode>('percent');
  percentage = signal(75);
  targetWidth = signal<number | null>(800);
  targetHeight = signal<number | null>(600);
  lockRatio = signal(true);

  targetFormat = signal<string>('image/jpeg');
  quality = signal<number>(0.8);

  isProcessing = signal(false);
  isDone = computed(
    () => this.images().length > 0 && this.images().every((i) => i.status === 'done'),
  );

  viewMode = computed(() => {
    const config = this.widgetConfig();
    // 1x1 -> compact
    if (config?.cols === 1 && config?.rows === 1) return 'compact';
    // Default
    return 'default';
  });

  getModeClass(m: string) {
    return this.mode() === m
      ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white';
  }

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
    input.value = '';
  }

  handleFileDrop(files: FileList) {
    this.addFiles(files);
  }

  addFiles(list: FileList) {
    Array.from(list).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const newImg = {
            id: crypto.randomUUID(),
            file,
            originalUrl: url,
            originalWidth: img.width,
            originalHeight: img.height,
            status: 'pending' as const,
          };

          this.images.update((curr) => [...curr, newImg]);

          // Auto-select first image for widget/preview if needed
          if (!this.previewTarget()) {
            this.previewTarget.set(newImg);
            // Also set default dimensions based on first image if empty
            if (this.images().length === 1 && this.mode() === 'dimensions') {
              this.targetWidth.set(newImg.originalWidth);
              this.targetHeight.set(newImg.originalHeight);
            }
          }
        };
        img.onerror = () => {
          // Clean up URL and surface failure for debugging
          console.error('Failed to load image file:', file.name);
          URL.revokeObjectURL(url);
        };
      }
    });
  }

  removeImage(id: string) {
    const img = this.images().find((i) => i.id === id);
    if (img) {
      URL.revokeObjectURL(img.originalUrl);
      if (img.resizedUrl) URL.revokeObjectURL(img.resizedUrl);
    }
    this.images.update((curr) => curr.filter((i) => i.id !== id));

    if (this.previewTarget()?.id === id) {
      this.previewTarget.set(this.images()[0] || null);
    }
  }

  reset() {
    this.images().forEach((i) => {
      URL.revokeObjectURL(i.originalUrl);
      if (i.resizedUrl) URL.revokeObjectURL(i.resizedUrl);
    });
    this.images.set([]);
    this.isProcessing.set(false);
    this.showSettings.set(false);
    this.previewTarget.set(null);
  }

  // --- Logic ---

  // Triggered by (ngModelChange) from inputs
  updateDim(dim: 'w' | 'h', val: number | null) {
    if (dim === 'w') this.targetWidth.set(val);
    if (dim === 'h') this.targetHeight.set(val);

    if (!this.lockRatio() || !val) return;

    // Use previewTarget OR first image as ratio reference
    const refImg = this.previewTarget() || this.images()[0];
    if (!refImg) return;

    const ratio = refImg.originalWidth / refImg.originalHeight;

    if (dim === 'w') {
      const newH = Math.round(val / ratio);
      // Only update if different to avoid loop (though signal prevents it mostly)
      if (newH !== this.targetHeight()) this.targetHeight.set(newH);
    } else if (dim === 'h') {
      const newW = Math.round(val * ratio);
      if (newW !== this.targetWidth()) this.targetWidth.set(newW);
    }
  }

  calculateDims(img: ResizableImage): { w: number; h: number } {
    if (this.mode() === 'percent') {
      const p = this.percentage() / 100;
      return {
        w: Math.round(img.originalWidth * p),
        h: Math.round(img.originalHeight * p),
      };
    } else {
      // Dimensions Mode
      if (!this.lockRatio()) {
        return {
          w: this.targetWidth() || img.originalWidth,
          h: this.targetHeight() || img.originalHeight,
        };
      } else {
        // FIT Mode logic
        // If targetWidth is set, prioritize it. If only height set, prioritize it.
        // If both set, fit within box.

        const tW = this.targetWidth();
        const tH = this.targetHeight();

        if (!tW && !tH) return { w: img.originalWidth, h: img.originalHeight };

        const ratio = img.originalWidth / img.originalHeight;

        if (tW && !tH) {
          return { w: tW, h: Math.round(tW / ratio) };
        }
        if (!tW && tH) {
          return { w: Math.round(tH * ratio), h: tH };
        }

        // Both set: Fit inside box
        const scaleW = tW! / img.originalWidth;
        const scaleH = tH! / img.originalHeight;
        const scale = Math.min(scaleW, scaleH);

        return {
          w: Math.round(img.originalWidth * scale),
          h: Math.round(img.originalHeight * scale),
        };
      }
    }
  }

  async processBatch() {
    const images = this.images();
    if (images.length === 0) return;
    this.isProcessing.set(true);
    // Process images in batches with limited concurrency for better performance
    const concurrency = 4;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      await Promise.all(batch.map((img) => this.processImage(img)));
    }

    this.isProcessing.set(false);

    if (this.isWidget()) {
      this.showSettings.set(false);
    } else if (this.images().length === 1) {
      this.activeTab.set('preview');
    }

    if (!this.isWidget()) {
      this.toast.show(this.t.get('MSG_SUCCESS'), 'success');
    }
  }

  private processImage(img: ResizableImage): Promise<void> {
    return new Promise((resolve, reject) => {
      const { w, h } = this.calculateDims(img);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject('Failed to get 2D canvas context');
        return;
      }

      const imageObj = new Image();
      imageObj.src = img.originalUrl;

      imageObj.onload = () => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imageObj, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);

              this.images.update((curr) =>
                curr.map((i) =>
                  i.id === img.id
                    ? {
                        ...i,
                        status: 'done',
                        resizedBlob: blob,
                        resizedUrl: url,
                        resizedWidth: w,
                        resizedHeight: h,
                      }
                    : i,
                ),
              );

              if (this.previewTarget()?.id === img.id) {
                this.previewTarget.set(this.images().find((i) => i.id === img.id)!);
              }

              resolve();
            } else {
              reject(
                `Failed to create blob from canvas (format: ${this.targetFormat()}, size: ${w}x${h})`,
              );
            }
          },
          this.targetFormat(),
          this.quality(),
        );
      };
    });
  }

  downloadSingle(img: ResizableImage) {
    if (!img.resizedUrl) return;
    const ext = this.targetFormat().split('/')[1];
    const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || 'image';
    const a = document.createElement('a');
    a.href = img.resizedUrl;
    a.download = `${name}-resized.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async downloadSmart() {
    const files = this.images().filter((i) => i.status === 'done' && i.resizedBlob);
    if (files.length === 0) return;

    if (files.length === 1) {
      this.downloadSingle(files[0]);
    } else {
      await this.downloadZip();
    }
  }

  async downloadZip() {
    const files = this.images().filter((i) => i.status === 'done' && i.resizedBlob);
    if (files.length === 0) return;

    try {
      const module = await import('jszip');
      const JSZip = module.default;
      const zip = new JSZip();

      const ext = this.targetFormat().split('/')[1];

      files.forEach((img, idx) => {
        const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx}`;
        if (img.resizedBlob) {
          zip.file(`${name}-resized.${ext}`, img.resizedBlob);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resized-images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error && e.message ? e.message : String(e);
      this.toast.show(`Failed to create ZIP: ${errorMessage}`, 'error');
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
