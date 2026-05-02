import { Component, inject, output, signal, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService, PrimaryColor } from '../../services/theme.service';
import { I18nService } from '../../services/i18n.service';
//import { NetworkService } from '../../services/network.service';
import { ToolService } from '../../services/tool.service';
import { ClipboardService } from '../../services/clipboard.service';
import { StorageManagerService, StorageStats } from '../../services/storage-manager.service';
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import { ToastService } from '../../services/toast.service';
import { OfflineManagerService } from '../../services/offline-manager.service'; // Added
import { VirtualPetsService } from '../../services/virtual-pets.service';
import { TourService } from '../../services/tour.service';
import { TourTargetDirective } from '../../directives/tour-target.directive';
import { APP_CONFIG } from '../../core/app.config';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type Tab = 'general' | 'data';

// Interfaces for structured data viewing
interface ClipboardItem {
  text: string;
  timestamp: number | string;
}

interface UsageStat {
  name: string;
  count: number;
  lastUsed: number | string;
}

interface StorageItem {
  key: string;
  value: string;
}

type ParsedData =
  | { type: 'clipboard'; data: ClipboardItem[] }
  | { type: 'usage'; data: UsageStat[] }
  | { type: 'favorites'; data: string[] }
  | { type: 'dashboard'; data: { count: number } }
  | { type: 'json' | 'simple'; data: string };

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, TourTargetDirective],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-slate-900/22 backdrop-blur-[2px] dark:bg-slate-900/45 dark:backdrop-blur-sm"
        (click)="close.emit()"
      ></div>

      <!-- Modal -->
      <div
        class="glass-surface-strong animate-slide-up relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/80 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:shadow-black/40"
      >
        <!-- Header -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800"
        >
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ t.map()['TITLE'] }}</h2>

            <!-- Network Status Indicator -->
            <!--            
            <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                  [class.bg-green-400]="network.isOnline()" 
                  [class.bg-red-400]="!network.isOnline()"></span>
                <span class="relative inline-flex rounded-full h-2 w-2" 
                  [class.bg-green-500]="network.isOnline()" 
                  [class.bg-red-500]="!network.isOnline()"></span>
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {{ network.isOnline() ? t.map()['STATUS_ONLINE'] : t.map()['STATUS_OFFLINE'] }}
              </span>
            </div>
-->
          </div>

          <button
            (click)="close.emit()"
            class="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Tab Navigation -->
        <div class="flex shrink-0 gap-2 border-b border-slate-100 p-2 dark:border-slate-800">
          <button
            appTourTarget="tour-settings-general"
            (click)="switchTab('general')"
            class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-colors"
            [class.bg-slate-100]="activeTab() === 'general'"
            [class.dark:bg-slate-800]="activeTab() === 'general'"
            [class.text-primary]="activeTab() === 'general'"
            [class.text-slate-500]="activeTab() !== 'general'"
          >
            <span class="material-symbols-outlined text-lg">tune</span>
            {{ t.map()['TAB_GENERAL'] }}
          </button>
          <button
            appTourTarget="tour-settings-data"
            (click)="switchTab('data')"
            class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-colors"
            [class.bg-slate-100]="activeTab() === 'data'"
            [class.dark:bg-slate-800]="activeTab() === 'data'"
            [class.text-primary]="activeTab() === 'data'"
            [class.text-slate-500]="activeTab() !== 'data'"
          >
            <span class="material-symbols-outlined text-lg">database</span>
            {{ t.map()['TAB_DATA'] }}
          </button>
        </div>

        <!-- Content Scrollable Area -->
        <div class="relative flex-1 overflow-y-auto p-6">
          <!-- GENERAL TAB -->
          @if (activeTab() === 'general') {
            <div class="animate-fade-in space-y-8">
              <!-- Offline Settings -->
              <div class="border-t border-slate-100 pt-4 dark:border-slate-800">
                <label class="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
                  {{ t.map()['SECTION_OFFLINE'] }}
                </label>
                <div
                  class="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
                >
                  <div>
                    <p class="text-sm font-medium text-slate-900 dark:text-white">
                      {{ t.map()['SETTING_SMART_DL'] }}
                    </p>
                    <p class="text-xs text-slate-500">{{ t.map()['WARN_MOBILE_DATA'] }}</p>
                  </div>
                  <!-- Toggle -->
                  <button
                    type="button"
                    (click)="offline.smartDownloadEnabled.set(!offline.smartDownloadEnabled())"
                    class="focus:ring-primary relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none dark:bg-slate-700"
                    [class.bg-primary]="offline.smartDownloadEnabled()"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                      [class.translate-x-6]="offline.smartDownloadEnabled()"
                      [class.translate-x-1]="!offline.smartDownloadEnabled()"
                    ></span>
                  </button>
                </div>
              </div>

              <!-- Language -->
              <section>
                <h3 class="mb-3 text-sm font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['SECTION_LANGUAGE'] }}
                </h3>
                <div class="grid grid-cols-2 gap-3">
                  @for (lang of languages; track lang.code) {
                    <button
                      (click)="switchLanguage(lang.code)"
                      class="flex items-center gap-3 rounded-xl border p-3 text-left transition-all"
                      [class]="
                        i18n.currentLang() === lang.code
                          ? 'border-primary bg-primary/5 ring-primary ring-1'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                      "
                    >
                      <img [src]="lang.flagAsset" class="h-4 w-6 rounded object-cover shadow-sm" />
                      <span class="font-medium text-slate-900 dark:text-white">{{
                        lang.label
                      }}</span>
                    </button>
                  }
                </div>
              </section>

              <div class="h-px bg-slate-100 dark:bg-slate-800"></div>

              <!-- Appearance -->
              <section class="space-y-6">
                <h3 class="text-sm font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['SECTION_APPEARANCE'] }}
                </h3>

                <!-- Theme Mode -->
                <div class="flex items-center justify-between">
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{
                    t.map()['LABEL_THEME']
                  }}</span>
                  <div class="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                    <button
                      (click)="theme.isDark.set(false)"
                      class="flex items-center gap-2 rounded-md p-2 transition-all"
                      [class.bg-white]="!theme.isDark()"
                      [class.shadow-sm]="!theme.isDark()"
                      [class.text-slate-900]="!theme.isDark()"
                      [class.text-slate-500]="theme.isDark()"
                    >
                      <span class="material-symbols-outlined text-lg">light_mode</span>
                    </button>
                    <button
                      (click)="theme.isDark.set(true)"
                      class="flex items-center gap-2 rounded-md p-2 transition-all"
                      [class.bg-slate-700]="theme.isDark()"
                      [class.shadow-sm]="theme.isDark()"
                      [class.text-white]="theme.isDark()"
                      [class.text-slate-500]="!theme.isDark()"
                    >
                      <span class="material-symbols-outlined text-lg">dark_mode</span>
                    </button>
                  </div>
                </div>

                <!-- Accent Color -->
                <div>
                  <span class="mb-3 block font-medium text-slate-700 dark:text-slate-300">{{
                    t.map()['LABEL_COLOR']
                  }}</span>
                  <div class="flex gap-3">
                    @for (color of colors; track color) {
                      <button
                        (click)="theme.setColor(color)"
                        class="h-8 w-8 rounded-full shadow-sm ring-2 ring-offset-2 ring-offset-white transition-all dark:ring-offset-slate-900"
                        [class.ring-slate-300]="theme.primaryColor() !== color"
                        [class.dark:ring-slate-700]="theme.primaryColor() !== color"
                        [class.ring-primary]="theme.primaryColor() === color"
                        [style.background-color]="getColorHex(color)"
                      ></button>
                    }
                  </div>
                </div>

                <!-- Font Family -->
                <div>
                  <span class="mb-3 block font-medium text-slate-700 dark:text-slate-300">{{
                    t.map()['LABEL_FONT']
                  }}</span>
                  <div class="flex gap-2">
                    <button
                      (click)="theme.setFont('inter')"
                      [class]="getBtnClass(theme.fontFamily() === 'inter')"
                    >
                      Inter (Sans)
                    </button>
                    <button
                      (click)="theme.setFont('system')"
                      [class]="getBtnClass(theme.fontFamily() === 'system')"
                    >
                      Merriweather (Serif)
                    </button>
                    <button
                      (click)="theme.setFont('roboto')"
                      [class]="getBtnClass(theme.fontFamily() === 'roboto')"
                    >
                      Mono
                    </button>
                  </div>
                </div>

                <!-- Density -->
                <div class="flex items-center justify-between">
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{
                    t.map()['LABEL_DENSITY']
                  }}</span>
                  <button
                    (click)="toggleDensity()"
                    class="focus:ring-primary relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-slate-900"
                    [class.bg-primary]="theme.density() === 'compact'"
                    [class.bg-slate-200]="theme.density() !== 'compact'"
                    [class.dark:bg-slate-700]="theme.density() !== 'compact'"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      [class.translate-x-6]="theme.density() === 'compact'"
                      [class.translate-x-1]="theme.density() !== 'compact'"
                    ></span>
                  </button>
                </div>

                <!-- Virtual Pets -->
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-medium text-slate-700 dark:text-slate-300">{{
                      t.map()['LABEL_PETS']
                    }}</span>
                    <p class="text-xs text-slate-500">{{ t.map()['LABEL_PETS_DESC'] }}</p>
                  </div>
                  <button
                    (click)="petsService.toggle()"
                    class="focus:ring-primary relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-slate-900"
                    [class.bg-primary]="petsService.enabled()"
                    [class.bg-slate-200]="!petsService.enabled()"
                    [class.dark:bg-slate-700]="!petsService.enabled()"
                  >
                    <span
                      class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      [class.translate-x-6]="petsService.enabled()"
                      [class.translate-x-1]="!petsService.enabled()"
                    ></span>
                  </button>
                </div>

                <!-- Virtual Pets extra options removed: "Désactiver sur petits écrans" (controle supprimé par demande utilisateur) -->
              </section>

              <div class="h-px bg-slate-100 dark:bg-slate-800"></div>

              @if (appConfig.appId !== 'synedex') {
              <!-- Tour -->
              <section class="space-y-6">
                <h3 class="text-sm font-bold tracking-wider text-slate-500 uppercase">
                  {{ t.map()['SECTION_TOUR'] }}
                </h3>
                <div class="flex items-center justify-between">
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{
                    t.map()['LABEL_REACTIVATE_TOUR']
                  }}</span>
                  <button
                    (click)="reactivateTour()"
                    class="bg-primary rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600"
                  >
                    {{ t.map()['BTN_START_TOUR'] }}
                  </button>
                </div>
              </section>
              }
            </div>
          }

          <!-- DATA TAB -->
          @if (activeTab() === 'data') {
            <div class="animate-fade-in flex h-full flex-col">
              <!-- Inspection View (Sub-view) -->
              @if (inspectingCategory(); as catId) {
                <div class="flex h-full flex-col">
                  <button
                    (click)="inspectingCategory.set(null)"
                    class="hover:text-primary mb-4 flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors"
                  >
                    <span class="material-symbols-outlined text-lg">arrow_back</span>
                    {{ t.map()['BTN_BACK'] }}
                  </button>

                  <div class="flex-1 space-y-6 overflow-y-auto">
                    @if (inspectionData().length === 0) {
                      <div class="py-8 text-center opacity-50">{{ t.map()['NO_DATA'] }}</div>
                    } @else {
                      @for (item of inspectionData(); track item.key) {
                        <div
                          class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div
                            class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/80"
                          >
                            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">
                              {{ cleanKey(item.key) }}
                            </h4>
                            <span class="font-mono text-[10px] text-slate-400 select-all">{{
                              item.key
                            }}</span>
                          </div>

                          @let parsed = parseData(item.key, item.value);

                          <div class="p-4 text-sm text-slate-600 dark:text-slate-300">
                            <!-- Clipboard History Render -->
                            @if (parsed.type === 'clipboard') {
                              <div
                                class="space-y-0 divide-y divide-slate-100 dark:divide-slate-700/50"
                              >
                                @for (clip of parsed.data; track $index) {
                                  <div class="group py-2 first:pt-0 last:pb-0">
                                    <div class="mb-1 flex items-start justify-between gap-4">
                                      <span
                                        class="flex-1 truncate font-medium text-slate-900 dark:text-white"
                                        >{{ clip.text }}</span
                                      >
                                      <span class="text-[10px] whitespace-nowrap text-slate-400">{{
                                        clip.timestamp | date: 'short'
                                      }}</span>
                                    </div>
                                    <div
                                      class="truncate font-mono text-xs text-slate-400 opacity-80"
                                    >
                                      {{ clip.text }}
                                    </div>
                                  </div>
                                }
                              </div>
                            }
                            <!-- Usage Stats Render -->
                            @else if (parsed.type === 'usage') {
                              <div class="space-y-2">
                                @for (stat of parsed.data; track $index) {
                                  <div class="flex items-center justify-between py-1">
                                    <div class="flex items-center gap-2">
                                      <span class="font-bold text-slate-900 dark:text-white">{{
                                        stat.name
                                      }}</span>
                                    </div>
                                    <div class="flex flex-col items-end text-xs text-slate-500">
                                      <span>{{ stat.count }} {{ t.map()['UNIT_USES'] }}</span>
                                      <span>{{ stat.lastUsed | date: 'shortDate' }}</span>
                                    </div>
                                  </div>
                                }
                              </div>
                            }
                            <!-- Favorites Render -->
                            @else if (parsed.type === 'favorites') {
                              <div class="flex flex-wrap gap-2">
                                @for (fav of parsed.data; track $index) {
                                  <span
                                    class="inline-flex items-center rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  >
                                    <span class="material-symbols-outlined mr-1 text-sm">star</span>
                                    {{ fav }}
                                  </span>
                                }
                              </div>
                            }
                            <!-- Dashboard Render -->
                            @else if (parsed.type === 'dashboard') {
                              <div
                                class="flex flex-col items-center justify-center gap-2 py-4 text-slate-500"
                              >
                                <span class="material-symbols-outlined text-3xl">dashboard</span>
                                <p>{{ parsed.data.count }} {{ t.map()['UNIT_WIDGETS'] }}</p>
                              </div>
                            }
                            <!-- Fallback / Simple -->
                            @else {
                              <div
                                class="rounded border border-slate-100 bg-slate-50 p-2 font-mono text-xs break-all dark:border-slate-800 dark:bg-slate-900/50"
                              >
                                {{ parsed.data }}
                              </div>
                            }
                          </div>
                        </div>
                      }
                    }
                  </div>
                </div>
              }
              <!-- Main Data List -->
              @else {
                <div class="space-y-8">
                  <!-- Backup/Restore Buttons -->
                  <div class="flex gap-3">
                    <button
                      (click)="exportData()"
                      class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <span class="material-symbols-outlined text-lg">download</span>
                      {{ t.map()['BTN_EXPORT'] }}
                    </button>
                    <button
                      (click)="triggerImport()"
                      class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <span class="material-symbols-outlined text-lg">upload</span>
                      {{ t.map()['BTN_IMPORT'] }}
                    </button>
                    <input
                      #importInput
                      type="file"
                      class="hidden"
                      accept=".json"
                      (change)="handleImport($event)"
                    />
                  </div>

                  <!-- Storage Summary -->
                  <div class="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                    <div class="mb-2 flex items-end justify-between">
                      <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{
                        t.map()['STORAGE_USED']
                      }}</span>
                      <span
                        class="text-primary rounded bg-white px-2 py-1 font-mono text-xs shadow-sm dark:bg-slate-900"
                      >
                        {{ formatBytes(stats()?.totalBytes || 0) }}
                      </span>
                    </div>
                    <div
                      class="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                    >
                      <div class="bg-primary h-2 rounded-full" style="width: 5%"></div>
                    </div>
                    <p class="mt-2 text-center text-[10px] text-slate-500">
                      {{ t.map()['STORAGE_DESC'] }}
                    </p>
                  </div>

                  @if (loading()) {
                    <div class="flex justify-center py-4">
                      <div
                        class="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                      ></div>
                    </div>
                  } @else {
                    <!-- Categories List -->
                    <div class="space-y-3">
                      @for (cat of stats()?.categories || []; track cat.id) {
                        <div
                          class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600"
                        >
                          <div class="rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800">
                            <span class="material-symbols-outlined">{{ cat.icon }}</span>
                          </div>
                          <div class="min-w-0 flex-1">
                            <h4 class="text-sm font-bold text-slate-900 dark:text-white">
                              {{ t.map()[cat.labelKey] }}
                            </h4>
                            <p class="truncate text-xs text-slate-500">
                              {{ cat.count }} {{ t.map()['UNIT_ITEMS'] }} •
                              {{ formatBytes(cat.sizeBytes) }}
                            </p>
                          </div>
                          <div class="flex items-center gap-1">
                            <button
                              (click)="inspect(cat.id)"
                              class="hover:text-primary p-2 text-slate-400 transition-colors"
                              [title]="t.map()['BTN_VIEW']"
                              [disabled]="cat.count === 0"
                              [class.opacity-50]="cat.count === 0"
                            >
                              <span class="material-symbols-outlined">visibility</span>
                            </button>

                            <!-- Inline Confirmation Logic -->
                            @if (deleteConfirmId() === cat.id) {
                              <button
                                (click)="confirmDelete(cat.id)"
                                class="animate-fade-in flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-red-600"
                              >
                                {{ t.map()['BTN_CONFIRM_DELETE'] }}
                              </button>
                              <button
                                (click)="deleteConfirmId.set(null)"
                                class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <span class="material-symbols-outlined text-lg">close</span>
                              </button>
                            } @else {
                              <button
                                (click)="requestDelete(cat.id)"
                                class="p-2 text-slate-400 transition-colors hover:text-red-500"
                                [title]="t.map()['BTN_DELETE']"
                                [disabled]="cat.count === 0"
                                [class.opacity-50]="cat.count === 0"
                              >
                                <span class="material-symbols-outlined">delete</span>
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>

                    <!-- Danger Zone -->
                    <div class="border-t border-slate-100 pt-6 dark:border-slate-800">
                      <div
                        class="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/30 dark:bg-red-900/10"
                      >
                        <div class="text-sm font-bold text-red-800 dark:text-red-200">
                          {{ t.map()['DANGER_ZONE'] }}
                        </div>
                        <p class="max-w-xs text-xs text-red-600 opacity-80 dark:text-red-300">
                          {{ t.map()['DANGER_DESC'] }}
                        </p>

                        @if (!resetConfirm()) {
                          <button
                            appTourTarget="tour-settings-reset"
                            (click)="resetConfirm.set(true)"
                            class="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:hover:bg-red-900/20"
                          >
                            {{ t.map()['BTN_RESET_APP'] }}
                          </button>
                        } @else {
                          <div class="animate-fade-in flex gap-2">
                            <button
                              (click)="performFactoryReset()"
                              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-700"
                            >
                              {{ t.map()['BTN_CONFIRM_RESET'] }}
                            </button>
                            <button
                              (click)="resetConfirm.set(false)"
                              class="rounded-lg bg-transparent px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              {{ t.map()['BTN_CANCEL'] }}
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-slide-up {
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class SettingsModalComponent {
  close = output();

  theme = inject(ThemeService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);
  // network = inject(NetworkService);
  storage = inject(StorageManagerService);
  tools = inject(ToolService);
  clipboard = inject(ClipboardService);
  toast = inject(ToastService);
  offline = inject(OfflineManagerService);
  tour = inject(TourService);
  petsService = inject(VirtualPetsService);
  private router = inject(Router);
  appConfig = APP_CONFIG;

  // UI State
  activeTab = signal<Tab>('general');
  inspectingCategory = signal<string | null>(null);
  resetConfirm = signal(false);
  deleteConfirmId = signal<string | null>(null);
  loading = signal(false);

  // File Import Ref
  importInput = viewChild<ElementRef>('importInput');

  // Data State
  stats = signal<StorageStats | null>(null);
  inspectionData = signal<StorageItem[]>([]);

  languages = this.i18n.supportedLanguages;

  colors: PrimaryColor[] = ['blue', 'emerald', 'violet', 'amber', 'rose'];

  constructor() {
    effect(() => {
      if (this.activeTab() === 'data') {
        this.refreshStats();
      }
    });

    effect(() => {
      const cat = this.inspectingCategory();
      if (cat) {
        this.loadInspection(cat);
      } else {
        this.inspectionData.set([]);
      }
    });

    this.tour.actionEvents$.subscribe((action) => {
      if (action === 'open-settings') {
        const step = this.tour.steps[this.tour.currentStepIndex()];
        if (step.id === 'tour-settings-general') {
          this.switchTab('general');
        } else if (step.id === 'tour-settings-data' || step.id === 'tour-settings-reset') {
          this.switchTab('data');
        }
      }
    });
  }

  async refreshStats() {
    this.loading.set(true);
    const s = await this.storage.getStats();
    this.stats.set(s);
    this.loading.set(false);
  }

  async loadInspection(catId: string) {
    const details = await this.storage.getCategoryDetails(catId);
    this.inspectionData.set(details as StorageItem[]);
  }

  switchTab(tab: Tab) {
    this.activeTab.set(tab);
    this.inspectingCategory.set(null);
    this.resetConfirm.set(false);
    this.deleteConfirmId.set(null);
  }

  inspect(catId: string) {
    this.inspectingCategory.set(catId);
  }

  requestDelete(catId: string) {
    this.deleteConfirmId.set(catId);
    setTimeout(() => {
      if (this.deleteConfirmId() === catId) {
        this.deleteConfirmId.set(null);
      }
    }, 3000);
  }

  async confirmDelete(catId: string) {
    this.deleteConfirmId.set(null);

    switch (catId) {
      case 'history':
        this.tools.resetUsage();
        await this.clipboard.clearHistory();
        break;
      case 'favorites':
        this.tools.resetFavorites();
        break;
      case 'dashboard':
        this.tools.resetDashboard();
        break;
      case 'prefs':
        this.theme.reset();
        this.i18n.reset();
        break;
      case 'pets':
        this.petsService.clearPets(); // Clears in-memory dinos immediately
        break;
    }

    await this.storage.clearCategory(catId);
    this.refreshStats();
    if (this.inspectingCategory() === catId) {
      this.inspectingCategory.set(null);
    }
  }

  async performFactoryReset() {
    await this.storage.factoryReset();
    window.location.reload();
  }

  reactivateTour() {
    this.close.emit();
    this.tour.startTour();
  }

  // --- Import / Export ---

  async exportData() {
    try {
      const blob = await this.storage.exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utildex-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      this.toast.show(this.t.get('MSG_BACKUP_READY'), 'success');
    } catch (e) {
      console.error(e);
      this.toast.show(this.t.get('MSG_EXPORT_FAIL'), 'error');
    }
  }

  triggerImport() {
    this.importInput()?.nativeElement.click();
  }

  async handleImport(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await this.storage.importData(content);
        this.toast.show(this.t.get('MSG_IMPORT_SUCCESS'), 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error(err);
        this.toast.show(this.t.get('MSG_IMPORT_FAIL'), 'error');
      }
    };
    reader.readAsText(file);
  }

  // --- Data Parsing Helpers ---

  switchLanguage(langCode: string) {
    const urlTree = this.router.parseUrl(this.router.url);
    const segments = urlTree.root.children['primary']?.segments;

    if (segments && segments.length > 0) {
      const newPath = segments.map((s) => s.path);
      newPath[0] = langCode;

      this.router.navigate(newPath, {
        queryParams: urlTree.queryParams,
        fragment: urlTree.fragment || undefined,
      });
    } else {
      this.router.navigate(['/', langCode]);
    }
  }

  cleanKey(key: string): string {
    const map: Record<string, string> = {
      'utildex-clipboard-history': 'KEY_CLIPBOARD_HISTORY',
      'utildex-usage': 'KEY_USAGE',
      'utildex-favorites': 'KEY_FAVORITES',
      'utildex-dashboard-v2': 'KEY_DASHBOARD_V2',
      'utildex-state-theme': 'KEY_THEME',
      'utildex-state-lang': 'KEY_LANG',
      'utildex-state-color': 'KEY_COLOR',
      'utildex-state-font': 'KEY_FONT',
      'utildex-state-density': 'KEY_DENSITY',
    };

    if (map[key]) {
      return this.t.get(map[key]);
    }

    if (key.startsWith('utildex-state-')) {
      const toolId = key.replace('utildex-state-', '');
      return this.t.get('KEY_STATE_PREFIX') + this.resolveToolName(toolId);
    }

    return key
      .replace('utildex-', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 ' + this.t.get('UNIT_BYTE');
    const k = 1024;
    const sizes = ['UNIT_BYTE', 'UNIT_KILOBYTE', 'UNIT_MEGABYTE', 'UNIT_GIGABYTE'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeKey = sizes[i] || 'UNIT_BYTE';

    const val = bytes / Math.pow(k, i);
    return (
      val.toLocaleString(this.i18n.currentLang(), { maximumFractionDigits: 2 }) +
      ' ' +
      this.t.get(sizeKey)
    );
  }

  resolveToolName(id: string): string {
    const tool = this.tools.tools().find((t) => t.id === id);
    return tool ? this.i18n.resolve(tool.name) : id;
  }

  parseData(key: string, value: string): ParsedData {
    try {
      if (key === 'utildex-clipboard-history') {
        const arr = JSON.parse(value);
        return { type: 'clipboard', data: Array.isArray(arr) ? arr : [] };
      }

      if (key === 'utildex-usage') {
        const obj = JSON.parse(value) as Record<string, { count: number; lastUsed: number }>;
        const stats = Object.entries(obj)
          .map(([id, stat]) => ({
            name: this.resolveToolName(id),
            count: stat.count,
            lastUsed: stat.lastUsed,
          }))
          .sort((a, b) => b.lastUsed - a.lastUsed);
        return { type: 'usage', data: stats };
      }

      if (key === 'utildex-favorites') {
        const arr = JSON.parse(value);
        const names = Array.isArray(arr) ? arr.map((id) => this.resolveToolName(id)) : [];
        return { type: 'favorites', data: names };
      }

      if (key === 'utildex-dashboard-v2') {
        const arr = JSON.parse(value);
        return { type: 'dashboard', data: { count: Array.isArray(arr) ? arr.length : 0 } };
      }

      if (value.startsWith('{') || value.startsWith('[')) {
        return { type: 'json', data: JSON.stringify(JSON.parse(value), null, 2) };
      }
    } catch {}

    return { type: 'simple', data: value };
  }

  getColorHex(name: PrimaryColor): string {
    const map: Record<string, string> = {
      blue: '#3b82f6',
      emerald: '#10b981',
      violet: '#8b5cf6',
      amber: '#f59e0b',
      rose: '#f43f5e',
    };
    return map[name];
  }

  getBtnClass(isActive: boolean): string {
    return isActive
      ? 'px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium'
      : 'px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700';
  }

  toggleDensity() {
    this.theme.setDensity(this.theme.density() === 'compact' ? 'comfortable' : 'compact');
  }
}
