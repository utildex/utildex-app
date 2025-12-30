
import { Component, inject, signal, computed, input, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

// Lazy load libraries
declare const JSZip: any;

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
    providers: [
        provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
    ],
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
        class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 shadow-sm"
      >
         <!-- 1x1 Compact Redesigned -->
         @if (isSize(1, 1)) {
            <div class="flex flex-col h-full relative">
               
               <!-- 1. EMPTY STATE -->
               @if (images().length === 0) {
                  <div (click)="triggerUpload()" class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-colors cursor-pointer p-2 text-center">
                     <span class="material-symbols-outlined text-3xl mb-1">aspect_ratio</span>
                     <span class="text-[9px] font-bold uppercase leading-tight">{{ t.map()['W_DROP'] }}</span>
                  </div>
               }
               
               <!-- 2. LOADED STATE (Main View) -->
               @else if (images().length > 0 && !isDone() && !showSettings()) {
                  <!-- Background Preview -->
                  <div class="absolute inset-0 opacity-10 pointer-events-none">
                     <img [src]="images()[0].originalUrl" class="w-full h-full object-cover">
                  </div>
                  
                  <!-- Header -->
                  <div class="relative z-10 flex justify-between items-center p-2">
                     <span class="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{{ images().length }}</span>
                     <button (click)="reset()" class="text-slate-400 hover:text-red-500"><span class="material-symbols-outlined text-[12px]">close</span></button>
                  </div>

                  <!-- Content -->
                  <div class="relative z-10 flex-1 flex flex-col items-center justify-center gap-2 p-2">
                     <div class="flex flex-col items-center">
                        <span class="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                           {{ mode() === 'percent' ? percentage() + '%' : (targetWidth() || '?') + ' x ' + (targetHeight() || '?') }}
                        </span>
                     </div>
                     <div class="flex gap-1 w-full">
                        <button (click)="processBatch()" [disabled]="isProcessing()" class="flex-1 py-1 bg-primary text-white text-[9px] font-bold rounded shadow-sm hover:opacity-90">
                           {{ isProcessing() ? '...' : t.map()['BTN_RESIZE'] }}
                        </button>
                        <button (click)="showSettings.set(true)" class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600">
                           <span class="material-symbols-outlined text-[14px]">tune</span>
                        </button>
                     </div>
                  </div>
               }

               <!-- 3. SETTINGS OVERLAY -->
               @else if (showSettings() && !isDone()) {
                  <div class="absolute inset-0 bg-white dark:bg-slate-800 z-20 flex flex-col p-2 animate-fade-in">
                     <div class="flex justify-between items-center mb-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                        <span class="text-[9px] font-bold uppercase text-slate-500">{{ t.map()['W_CONF'] }}</span>
                        <button (click)="showSettings.set(false)" class="text-primary hover:text-primary/80"><span class="material-symbols-outlined text-[14px]">check</span></button>
                     </div>
                     
                     <div class="flex-1 overflow-y-auto space-y-2">
                        <!-- Mode -->
                        <div class="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded">
                           <button (click)="mode.set('percent')" class="flex-1 text-[8px] py-1 rounded" [class.bg-white]="mode() === 'percent'" [class.text-primary]="mode() === 'percent'">%</button>
                           <button (click)="mode.set('dimensions')" class="flex-1 text-[8px] py-1 rounded" [class.bg-white]="mode() === 'dimensions'" [class.text-primary]="mode() === 'dimensions'">Px</button>
                        </div>

                        <!-- Inputs -->
                        @if (mode() === 'percent') {
                           <div class="flex items-center gap-1">
                              <input type="range" [(ngModel)]="percentage" min="1" max="100" class="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                              <span class="text-[8px] font-mono w-5 text-right">{{ percentage() }}</span>
                           </div>
                        } @else {
                           <div class="flex gap-1">
                              <input type="number" [ngModel]="targetWidth()" (ngModelChange)="updateDim('w', $event)" placeholder="W" class="w-full text-[9px] border rounded p-1 text-center bg-transparent">
                              <input type="number" [ngModel]="targetHeight()" (ngModelChange)="updateDim('h', $event)" placeholder="H" class="w-full text-[9px] border rounded p-1 text-center bg-transparent">
                           </div>
                           <label class="flex items-center gap-1">
                              <input type="checkbox" [(ngModel)]="lockRatio" class="w-3 h-3 rounded border-slate-300 text-primary">
                              <span class="text-[8px] text-slate-500">{{ t.map()['LABEL_LOCK'] }}</span>
                           </label>
                        }
                     </div>
                  </div>
               }

               <!-- 4. DONE STATE -->
               @else if (isDone()) {
                  <div class="absolute inset-0 bg-green-50 dark:bg-green-900/20 flex flex-col items-center justify-center p-2 animate-fade-in text-center">
                     <span class="material-symbols-outlined text-2xl text-green-500 mb-1">check_circle</span>
                     <button (click)="downloadSmart()" class="w-full py-1.5 bg-green-600 text-white text-[10px] font-bold rounded shadow hover:bg-green-700 mb-1">
                        {{ t.map()['BTN_DOWNLOAD'] }}
                     </button>
                     <button (click)="reset()" class="text-[9px] text-slate-400 hover:underline">{{ t.map()['BTN_RESET'] }}</button>
                  </div>
               }
            </div>
         } 
         
         <!-- 2x2+ Fully Featured Widget -->
         @else {
            <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
               <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm text-primary">aspect_ratio</span>
                  <span class="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">{{ t.map()['TITLE_SHORT'] }}</span>
               </div>
               <div class="flex gap-1">
                  <button (click)="triggerUpload()" class="text-slate-400 hover:text-primary p-1" title="Add Images"><span class="material-symbols-outlined text-sm">add</span></button>
                  @if (images().length > 0) {
                     <button (click)="reset()" class="text-slate-400 hover:text-red-500 p-1" title="Reset"><span class="material-symbols-outlined text-sm">refresh</span></button>
                  }
               </div>
            </div>

            <div class="flex-1 flex overflow-hidden">
               <!-- Left Column: Thumbnails List -->
               <div class="w-1/3 bg-slate-50 dark:bg-slate-900/30 border-r border-slate-100 dark:border-slate-700 flex flex-col">
                  @if (images().length === 0) {
                     <div (click)="triggerUpload()" class="flex-1 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 text-center">
                        <span class="material-symbols-outlined text-2xl mb-1">add_photo_alternate</span>
                        <span class="text-[8px] font-bold uppercase">{{ t.map()['W_DROP'] }}</span>
                     </div>
                  } @else {
                     <div class="flex-1 overflow-y-auto p-1 space-y-1">
                        @for (img of images(); track img.id) {
                           <div 
                              (click)="previewTarget.set(img)"
                              class="relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all"
                              [class.border-primary]="previewTarget()?.id === img.id"
                              [class.border-transparent]="previewTarget()?.id !== img.id"
                           >
                              <img [src]="img.originalUrl" class="w-full h-full object-cover">
                              @if (img.status === 'done') {
                                 <div class="absolute inset-0 bg-green-500/50 flex items-center justify-center text-white"><span class="material-symbols-outlined text-xs">check</span></div>
                              }
                           </div>
                        }
                     </div>
                  }
               </div>

               <!-- Right Column: Preview & Controls -->
               <div class="flex-1 flex flex-col bg-white dark:bg-slate-800">
                  <!-- Preview Area -->
                  <div class="flex-1 relative flex items-center justify-center bg-slate-100 dark:bg-slate-900 overflow-hidden p-2">
                     @if (previewTarget(); as target) {
                        <img [src]="target.status === 'done' && target.resizedUrl ? target.resizedUrl : target.originalUrl" class="max-w-full max-h-full object-contain shadow-sm">
                        <div class="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded backdrop-blur-sm font-mono">
                           {{ target.status === 'done' ? target.resizedWidth : target.originalWidth }} x {{ target.status === 'done' ? target.resizedHeight : target.originalHeight }}
                        </div>
                     } @else {
                        <div class="text-slate-400 text-xs flex flex-col items-center text-center px-4">
                           <span class="material-symbols-outlined mb-1">image</span>
                           {{ t.map()['W_SELECT_HINT'] }}
                        </div>
                     }
                  </div>

                  <!-- Widget Controls (Footer) -->
                  @if (images().length > 0 && !isDone()) {
                     <div class="p-2 border-t border-slate-100 dark:border-slate-700 space-y-2 shrink-0">
                        <!-- Mode & Inputs -->
                        <div class="flex gap-2">
                           <div class="flex bg-slate-100 dark:bg-slate-700 rounded p-0.5 shrink-0">
                              <button (click)="mode.set('percent')" class="px-2 py-0.5 text-[9px] font-bold rounded" [class.bg-white]="mode() === 'percent'" [class.text-primary]="mode() === 'percent'">%</button>
                              <button (click)="mode.set('dimensions')" class="px-2 py-0.5 text-[9px] font-bold rounded" [class.bg-white]="mode() === 'dimensions'" [class.text-primary]="mode() === 'dimensions'">Px</button>
                           </div>
                           
                           @if (mode() === 'percent') {
                              <input type="range" [(ngModel)]="percentage" min="1" max="100" class="flex-1 h-1.5 self-center bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary">
                              <span class="text-[9px] font-mono self-center w-5 text-right">{{ percentage() }}</span>
                           } @else {
                              <input type="number" [ngModel]="targetWidth()" (ngModelChange)="updateDim('w', $event)" placeholder="W" class="flex-1 w-0 text-[9px] border rounded px-1 text-center bg-slate-50 dark:bg-slate-900">
                              <input type="number" [ngModel]="targetHeight()" (ngModelChange)="updateDim('h', $event)" placeholder="H" class="flex-1 w-0 text-[9px] border rounded px-1 text-center bg-slate-50 dark:bg-slate-900">
                              <button (click)="lockRatio.set(!lockRatio())" [class.text-primary]="lockRatio()" class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-[14px]">{{ lockRatio() ? 'link' : 'link_off' }}</span></button>
                           }
                        </div>

                        <!-- Format & Action -->
                        <div class="flex gap-2 items-center">
                           <select [(ngModel)]="targetFormat" class="w-16 text-[9px] border rounded bg-slate-50 dark:bg-slate-900 p-1">
                              <option value="image/jpeg">JPG</option>
                              <option value="image/png">PNG</option>
                              <option value="image/webp">WEBP</option>
                           </select>
                           <button (click)="processBatch()" [disabled]="isProcessing()" class="flex-1 px-2 py-1 bg-primary text-white text-[9px] font-bold rounded hover:opacity-90">
                              {{ isProcessing() ? '...' : t.map()['W_GO'] }}
                           </button>
                        </div>
                     </div>
                  } 
                  
                  <!-- Download Action -->
                  @else if (isDone()) {
                     <div class="p-2 border-t border-slate-100 dark:border-slate-700">
                        <button (click)="downloadSmart()" class="w-full py-1.5 bg-green-600 text-white rounded text-[10px] font-bold shadow hover:bg-green-700 flex items-center justify-center gap-1">
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
    <input #fileInput type="file" accept="image/*" multiple class="hidden" (change)="handleFileSelect($event)">

    <!-- Main Tool Content -->
    <ng-template #mainContent>
      <div class="flex flex-col lg:flex-row gap-8 min-h-[600px]">
         <!-- Sidebar Controls (Full Page) -->
         <div class="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
               <h3 class="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider mb-4 flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg text-primary">tune</span>
                  {{ t.map()['SECTION_RESIZE'] }}
               </h3>

               <!-- Resize Mode Tabs -->
               <div class="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg mb-6">
                  <button (click)="mode.set('percent')" [class]="getModeClass('percent')" class="flex-1 py-2 rounded-md text-xs font-bold transition-all text-center">{{ t.map()['MODE_PERCENT'] }}</button>
                  <button (click)="mode.set('dimensions')" [class]="getModeClass('dimensions')" class="flex-1 py-2 rounded-md text-xs font-bold transition-all text-center">{{ t.map()['MODE_DIMENSIONS'] }}</button>
               </div>

               <!-- Resize Inputs -->
               <div class="space-y-4 mb-6">
                  @if (mode() === 'percent') {
                     <div>
                        <div class="flex justify-between mb-2">
                           <span class="text-xs font-bold text-slate-500">{{ t.map()['MODE_PERCENT'] }}</span>
                           <span class="text-xs font-mono font-bold text-primary">{{ percentage() }}%</span>
                        </div>
                        <input type="range" [(ngModel)]="percentage" min="1" max="100" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary">
                     </div>
                  } @else {
                     <div class="grid grid-cols-2 gap-3">
                        <div>
                           <label class="block text-xs font-bold text-slate-500 mb-1">{{ t.map()['LABEL_WIDTH'] }}</label>
                           <input type="number" [ngModel]="targetWidth()" (ngModelChange)="updateDim('w', $event)" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary text-sm">
                        </div>
                        <div>
                           <label class="block text-xs font-bold text-slate-500 mb-1">{{ t.map()['LABEL_HEIGHT'] }}</label>
                           <input type="number" [ngModel]="targetHeight()" (ngModelChange)="updateDim('h', $event)" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary text-sm">
                        </div>
                     </div>
                     <label class="flex items-center gap-2 cursor-pointer mt-2">
                        <input type="checkbox" [(ngModel)]="lockRatio" class="rounded border-slate-300 text-primary focus:ring-primary">
                        <span class="text-xs font-medium text-slate-600 dark:text-slate-300">{{ t.map()['LABEL_LOCK'] }}</span>
                     </label>
                  }
               </div>

               <div class="h-px bg-slate-100 dark:bg-slate-700 mb-6"></div>

               <!-- Output Options -->
               <div class="space-y-4">
                  <h3 class="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-wider">{{ t.map()['SECTION_OUTPUT'] }}</h3>
                  <div>
                     <label class="block text-xs font-bold text-slate-500 mb-1">{{ t.map()['LABEL_FORMAT'] }}</label>
                     <select [(ngModel)]="targetFormat" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary text-sm">
                        <option value="image/jpeg">JPG</option>
                        <option value="image/png">PNG</option>
                        <option value="image/webp">WEBP</option>
                     </select>
                  </div>
                  
                  @if (targetFormat() !== 'image/png') {
                     <div>
                        <div class="flex justify-between mb-1">
                           <span class="text-xs font-bold text-slate-500">{{ t.map()['LABEL_QUALITY'] }}</span>
                           <span class="text-xs font-mono font-bold text-primary">{{ (quality() * 100).toFixed(0) }}%</span>
                        </div>
                        <input type="range" [(ngModel)]="quality" min="0.1" max="1" step="0.05" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary">
                     </div>
                  }
               </div>

               <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                  <button (click)="processBatch()" [disabled]="images().length === 0 || isProcessing()" class="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                     @if (isProcessing()) {
                        <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        {{ t.map()['MSG_PROCESSING'] }}
                     } @else {
                        {{ t.map()['BTN_RESIZE'] }}
                     }
                  </button>
               </div>
            </div>
         </div>

         <!-- Main Workspace -->
         <div class="flex-1 flex flex-col gap-6">
            
            <!-- Top Bar Actions -->
            <div class="flex flex-wrap items-center justify-between gap-4">
               <div class="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                  <button (click)="activeTab.set('list')" class="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all" [class.bg-white]="activeTab() === 'list'" [class.shadow-sm]="activeTab() === 'list'" [class.text-primary]="activeTab() === 'list'" [class.text-slate-500]="activeTab() !== 'list'" [class.dark:bg-slate-700]="activeTab() === 'list'" [class.dark:text-white]="activeTab() === 'list'">
                     <span class="material-symbols-outlined text-lg">grid_view</span>
                     {{ t.map()['TAB_LIST'] }}
                  </button>
                  <button (click)="activeTab.set('preview')" class="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all" [class.bg-white]="activeTab() === 'preview'" [class.shadow-sm]="activeTab() === 'preview'" [class.text-primary]="activeTab() === 'preview'" [class.text-slate-500]="activeTab() !== 'preview'" [class.dark:bg-slate-700]="activeTab() === 'preview'" [class.dark:text-white]="activeTab() === 'preview'" [disabled]="images().length === 0">
                     <span class="material-symbols-outlined text-lg">visibility</span>
                     {{ t.map()['TAB_PREVIEW'] }}
                  </button>
               </div>

               <div class="flex gap-2">
                  <button (click)="triggerUpload()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                     <span class="material-symbols-outlined">add</span>
                     {{ t.map()['BTN_ADD'] }}
                  </button>
                  @if (images().length > 0) {
                     <button (click)="reset()" class="px-4 py-2 text-slate-500 hover:text-red-500 font-medium transition-colors">
                        {{ t.map()['BTN_RESET'] }}
                     </button>
                  }
                  @if (isDone()) {
                     <button (click)="downloadSmart()" class="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
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
                  class="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[400px] flex flex-col"
               >
                  @if (images().length === 0) {
                     <div (click)="triggerUpload()" class="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors p-10 text-center">
                        <div class="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 text-slate-400">
                           <span class="material-symbols-outlined text-4xl">add_photo_alternate</span>
                        </div>
                        <h3 class="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{{ t.map()['DROP_LABEL'] }}</h3>
                        <p class="text-slate-500">{{ t.map()['DROP_EXPLICIT'] }}</p>
                     </div>
                  } @else {
                     <div class="flex-1 overflow-y-auto p-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                           @for (img of images(); track img.id) {
                              <div class="relative flex gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl group hover:border-primary/50 transition-colors">
                                 <!-- Thumbnail -->
                                 <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0 relative cursor-pointer" (click)="previewTarget.set(img); activeTab.set('preview')">
                                    <img [src]="img.originalUrl" class="w-full h-full object-cover">
                                    @if (img.status === 'done') {
                                       <div class="absolute inset-0 bg-green-500/80 flex items-center justify-center text-white backdrop-blur-[1px] animate-fade-in"><span class="material-symbols-outlined">check</span></div>
                                    }
                                 </div>
                                 
                                 <!-- Info -->
                                 <div class="flex-1 min-w-0 flex flex-col justify-center">
                                    <div class="font-bold text-sm text-slate-800 dark:text-slate-200 truncate mb-1">{{ img.file.name }}</div>
                                    <div class="text-xs text-slate-500 font-mono">{{ img.originalWidth }} x {{ img.originalHeight }}</div>
                                    
                                    @if (img.status === 'done') {
                                       <div class="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
                                          <span>{{ img.resizedWidth }}x{{ img.resizedHeight }}</span>
                                          <span class="text-slate-400 font-normal">({{ formatBytes(img.resizedBlob!.size) }})</span>
                                       </div>
                                    }
                                 </div>

                                 <!-- Actions -->
                                 <div class="flex flex-col gap-1 justify-center">
                                    @if (img.status === 'done') {
                                       <button (click)="downloadSingle(img)" class="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-green-600 rounded-lg transition-colors" title="Download">
                                          <span class="material-symbols-outlined text-lg">download</span>
                                       </button>
                                    }
                                    <button (click)="removeImage(img.id)" class="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
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
               <div class="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                  @if (previewTarget(); as target) {
                     <!-- Nav -->
                     <div class="flex items-center gap-2 p-2 border-b border-slate-100 dark:border-slate-700 overflow-x-auto">
                        @for (img of images(); track img.id) {
                           <button 
                             (click)="previewTarget.set(img)" 
                             class="w-12 h-12 rounded-lg border-2 overflow-hidden shrink-0 transition-all opacity-70 hover:opacity-100"
                             [class.border-primary]="target.id === img.id"
                             [class.border-transparent]="target.id !== img.id"
                             [class.opacity-100]="target.id === img.id"
                           >
                              <img [src]="img.originalUrl" class="w-full h-full object-cover">
                           </button>
                        }
                     </div>

                     <!-- Split View Content -->
                     <div class="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700 overflow-hidden">
                        
                        <!-- Original -->
                        <div class="flex flex-col bg-slate-50 dark:bg-slate-900/50 p-4 relative overflow-hidden">
                           <div class="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold z-10 backdrop-blur-sm">{{ t.map()['STATS_ORIGINAL'] }}</div>
                           <div class="flex-1 flex items-center justify-center">
                              <img [src]="target.originalUrl" class="max-w-full max-h-full object-contain shadow-lg rounded">
                           </div>
                           <div class="mt-4 flex justify-between text-xs text-slate-500 font-mono">
                              <span>{{ t.map()['STATS_DIMENSIONS'] }}: {{ target.originalWidth }}x{{ target.originalHeight }}</span>
                              <span>{{ t.map()['STATS_SIZE'] }}: {{ formatBytes(target.file.size) }}</span>
                           </div>
                        </div>

                        <!-- Result -->
                        <div class="flex flex-col bg-slate-50 dark:bg-slate-900/50 p-4 relative overflow-hidden">
                           <div class="absolute top-4 left-4 bg-primary/90 text-white px-2 py-1 rounded text-xs font-bold z-10 backdrop-blur-sm">{{ t.map()['STATS_RESULT'] }}</div>
                           <div class="flex-1 flex items-center justify-center relative">
                              @if (target.resizedUrl) {
                                 <img [src]="target.resizedUrl" class="max-w-full max-h-full object-contain shadow-lg rounded">
                              } @else {
                                 <div class="text-slate-400 text-sm flex flex-col items-center gap-2">
                                    <span class="material-symbols-outlined text-3xl">hourglass_empty</span>
                                    <span>{{ t.map()['MSG_PROCESSING'] }}</span>
                                 </div>
                              }
                           </div>
                           @if (target.resizedUrl) {
                              <div class="mt-4 flex justify-between text-xs text-green-600 font-mono font-bold">
                                 <span>{{ t.map()['STATS_DIMENSIONS'] }}: {{ target.resizedWidth }}x{{ target.resizedHeight }}</span>
                                 <span>{{ t.map()['STATS_SIZE'] }}: {{ formatBytes(target.resizedBlob!.size) }}</span>
                              </div>
                           }
                        </div>
                     </div>

                  } @else {
                     <div class="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <p>No image selected.</p>
                     </div>
                  }
               </div>
            }
         </div>
      </div>
    </ng-template>
  `
})
export class ImageResizerComponent {
    isWidget = input<boolean>(false);
    widgetConfig = input<any>(null);

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
    isDone = computed(() => this.images().length > 0 && this.images().every(i => i.status === 'done'));

    isSize(w: number, h: number): boolean {
        const cfg = this.widgetConfig();
        return cfg && cfg.cols === w && cfg.rows === h;
    }

    getModeClass(m: string) {
        return this.mode() === m
            ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white';
    }

    triggerUpload() {
        this.fileInput()?.nativeElement.click();
    }

    handleFileSelect(event: any) {
        if (event.target.files) this.addFiles(event.target.files);
        event.target.value = '';
    }

    handleFileDrop(files: FileList) {
        this.addFiles(files);
    }

    addFiles(list: FileList) {
        const newImgs: ResizableImage[] = [];

        Array.from(list).forEach(file => {
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
                        status: 'pending' as const
                    };

                    this.images.update(curr => [...curr, newImg]);

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
            }
        });
    }

    removeImage(id: string) {
        const img = this.images().find(i => i.id === id);
        if (img) {
            URL.revokeObjectURL(img.originalUrl);
            if (img.resizedUrl) URL.revokeObjectURL(img.resizedUrl);
        }
        this.images.update(curr => curr.filter(i => i.id !== id));

        if (this.previewTarget()?.id === id) {
            this.previewTarget.set(this.images()[0] || null);
        }
    }

    reset() {
        this.images().forEach(i => {
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

    // Backwards compat for full tool calling logic
    onDimChange(dim: 'w' | 'h') {
        // This method was bound to inputs via (input) in full tool
        // We can just proxy to updateDim, using the signal values
        const val = dim === 'w' ? this.targetWidth() : this.targetHeight();
        this.updateDim(dim, val);
    }

    calculateDims(img: ResizableImage): { w: number, h: number } {
        if (this.mode() === 'percent') {
            const p = this.percentage() / 100;
            return {
                w: Math.round(img.originalWidth * p),
                h: Math.round(img.originalHeight * p)
            };
        } else {
            // Dimensions Mode
            if (!this.lockRatio()) {
                return {
                    w: this.targetWidth() || img.originalWidth,
                    h: this.targetHeight() || img.originalHeight
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
                    h: Math.round(img.originalHeight * scale)
                };
            }
        }
    }

    async processBatch() {
        if (this.images().length === 0) return;
        this.isProcessing.set(true);

        // Process sequentially to be safe
        for (const img of this.images()) {
            await this.processImage(img);
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

            if (!ctx) { reject('No canvas ctx'); return; }

            const imageObj = new Image();
            imageObj.src = img.originalUrl;

            imageObj.onload = () => {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(imageObj, 0, 0, w, h);

                canvas.toBlob(blob => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);

                        this.images.update(curr => curr.map(i =>
                            i.id === img.id ? {
                                ...i,
                                status: 'done',
                                resizedBlob: blob,
                                resizedUrl: url,
                                resizedWidth: w,
                                resizedHeight: h
                            } : i
                        ));

                        if (this.previewTarget()?.id === img.id) {
                            this.previewTarget.set(this.images().find(i => i.id === img.id)!);
                        }

                        resolve();
                    } else {
                        reject('Blob failed');
                    }
                }, this.targetFormat(), this.quality());
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
        const files = this.images().filter(i => i.status === 'done' && i.resizedBlob);
        if (files.length === 0) return;

        if (files.length === 1) {
            this.downloadSingle(files[0]);
        } else {
            await this.downloadZip();
        }
    }

    async downloadZip() {
        const files = this.images().filter(i => i.status === 'done' && i.resizedBlob);
        if (files.length === 0) return;

        try {
            const module = await import('jszip');
            const JSZip = module.default;
            const zip = new JSZip();

            const ext = this.targetFormat().split('/')[1];

            files.forEach((img, idx) => {
                const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx}`;
                zip.file(`${name}-resized.${ext}`, img.resizedBlob);
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
            this.toast.show('Failed to create ZIP', 'error');
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
