
import { Component, inject, signal, computed, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ToolService } from '../../services/tool.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

// Type definitions for the library we lazy load
declare const QRCode: any;

type QrType = 'url' | 'text' | 'wifi';
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

@Component({
  selector: 'app-qr-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  styles: [`
    /* 3D Flip Logic */
    .perspective-1000 { perspective: 1000px; }
    .transform-style-3d { transform-style: preserve-3d; }
    .backface-hidden { backface-visibility: hidden; }
    .rotate-y-180 { transform: rotateY(180deg); }
  `],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="qr-studio">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
         
         <!-- 1x1 Flipper Layout -->
         @if (isSize(1, 1)) {
            <div class="relative w-full h-full perspective-1000 group">
               <!-- Flipper Container -->
               <div class="relative w-full h-full transition-transform duration-500 transform-style-3d" [class.rotate-y-180]="isFlipped()">
                  
                  <!-- Front: Configuration -->
                  <div class="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 flex flex-col">
                     <!-- Header -->
                     <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <div class="flex items-center gap-1 overflow-hidden">
                           <span class="material-symbols-outlined text-xs text-primary">qr_code_2</span>
                           <span class="text-[9px] font-bold uppercase text-slate-500 truncate">{{ t.map()['W_TITLE'] }}</span>
                        </div>
                     </div>
                     
                     <!-- Compact Form -->
                     <div class="flex-1 p-2 flex flex-col justify-between gap-1 overflow-y-auto">
                        <!-- Content -->
                        <div class="space-y-1">
                           <select [(ngModel)]="currentType" class="w-full text-[10px] p-1 border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-1 focus:ring-primary outline-none">
                              <option value="url">{{ t.map()['W_TYPE_URL'] }}</option>
                              <option value="wifi">{{ t.map()['W_TYPE_WIFI'] }}</option>
                              <option value="text">{{ t.map()['W_TYPE_TEXT'] }}</option>
                           </select>

                           @if (currentType() === 'wifi') {
                              <input type="text" [(ngModel)]="wifiSsid" [placeholder]="t.map()['W_PH_SSID']" class="w-full text-[10px] p-1 border rounded dark:bg-slate-900 dark:border-slate-600 focus:ring-1 focus:ring-primary outline-none">
                              <input type="password" [(ngModel)]="wifiPass" [placeholder]="t.map()['W_PH_PASS']" class="w-full text-[10px] p-1 border rounded dark:bg-slate-900 dark:border-slate-600 focus:ring-1 focus:ring-primary outline-none">
                           } @else {
                              <input type="text" [ngModel]="currentType() === 'url' ? urlValue() : textValue()" (ngModelChange)="currentType() === 'url' ? urlValue.set($event) : textValue.set($event)" [placeholder]="t.map()['W_PH_DATA']" class="w-full text-[10px] p-1 border rounded dark:bg-slate-900 dark:border-slate-600 focus:ring-1 focus:ring-primary outline-none">
                           }
                        </div>

                        <!-- Appearance -->
                        <div class="flex items-center gap-1">
                           <input type="color" [(ngModel)]="colorDark" class="w-5 h-5 rounded cursor-pointer border-0 p-0" title="Foreground">
                           <input type="color" [(ngModel)]="colorLight" class="w-5 h-5 rounded cursor-pointer border-0 p-0" title="Background">
                           <!-- Updated to use full words via i18n -->
                           <select [(ngModel)]="errorLevel" class="flex-1 text-[9px] p-0.5 border rounded bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white">
                              <option value="L">{{ t.map()['W_ECC_L'] }}</option>
                              <option value="M">{{ t.map()['W_ECC_M'] }}</option>
                              <option value="Q">{{ t.map()['W_ECC_Q'] }}</option>
                              <option value="H">{{ t.map()['W_ECC_H'] }}</option>
                           </select>
                        </div>

                        <button (click)="generateAndFlip()" class="w-full py-1 bg-primary text-white text-[9px] font-bold rounded shadow-sm hover:opacity-90 mt-auto">
                           {{ t.map()['W_BTN_SHOW'] }}
                        </button>
                     </div>
                  </div>

                  <!-- Back: QR Result -->
                  <div class="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-800 flex flex-col">
                     <div class="flex-1 relative flex items-center justify-center p-3 bg-white rounded-xl overflow-hidden">
                        @if (qrDataUrl()) {
                           <img [src]="qrDataUrl()" class="w-full h-full object-contain mix-blend-multiply">
                        } @else {
                           <span class="text-xs text-slate-400">{{ t.map()['W_NO_DATA'] }}</span>
                        }
                        
                        <!-- Flip Back Button -->
                        <button (click)="isFlipped.set(false)" class="absolute top-1 right-1 p-1 bg-white/90 shadow rounded-full text-slate-400 hover:text-primary z-10 border border-slate-100">
                           <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                     </div>
                     @if (currentType() === 'wifi' && wifiSsid()) {
                        <div class="h-5 bg-slate-100 dark:bg-slate-900 flex items-center justify-center border-t border-slate-200 dark:border-slate-700 shrink-0">
                           <span class="text-[9px] font-bold truncate px-2 max-w-full">{{ wifiSsid() }}</span>
                        </div>
                     }
                  </div>

               </div>
            </div>
         } 
         
         <!-- 2x1 Wide Layout -->
         @else if (isSize(2, 1)) {
            <!-- Header -->
            <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
               <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm text-primary">qr_code_2</span>
                  <span class="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{{ t.map()['W_TITLE'] }}</span>
               </div>
               <button (click)="saveToWidget()" class="text-[10px] font-bold text-primary hover:text-blue-600 uppercase">{{ t.map()['W_BTN_SAVE'] }}</button>
            </div>

            <div class="flex flex-1 overflow-hidden">
               <!-- Left: Config -->
               <div class="w-1/2 p-2 border-r border-slate-100 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-800 flex flex-col gap-2">
                  <!-- Type Tabs (Icon based) -->
                  <div class="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg shrink-0">
                     <button (click)="setType('url')" [class.bg-white]="currentType() === 'url'" [class.shadow-sm]="currentType() === 'url'" [class.text-primary]="currentType() === 'url'" class="flex-1 py-1 rounded text-center transition-all" [title]="t.map()['W_TYPE_URL']">
                        <span class="material-symbols-outlined text-sm">link</span>
                     </button>
                     <button (click)="setType('wifi')" [class.bg-white]="currentType() === 'wifi'" [class.shadow-sm]="currentType() === 'wifi'" [class.text-primary]="currentType() === 'wifi'" class="flex-1 py-1 rounded text-center transition-all" [title]="t.map()['W_TYPE_WIFI']">
                        <span class="material-symbols-outlined text-sm">wifi</span>
                     </button>
                     <button (click)="setType('text')" [class.bg-white]="currentType() === 'text'" [class.shadow-sm]="currentType() === 'text'" [class.text-primary]="currentType() === 'text'" class="flex-1 py-1 rounded text-center transition-all" [title]="t.map()['W_TYPE_TEXT']">
                        <span class="material-symbols-outlined text-sm">notes</span>
                     </button>
                  </div>

                  <!-- Inputs -->
                  @if (currentType() === 'url') {
                     <input type="text" [(ngModel)]="urlValue" (input)="autoGenerate()" placeholder="https://" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-1 focus:ring-primary outline-none">
                  } @else if (currentType() === 'wifi') {
                     <input type="text" [(ngModel)]="wifiSsid" (input)="autoGenerate()" [placeholder]="t.map()['W_PH_SSID']" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-1 focus:ring-primary outline-none">
                     <input type="password" [(ngModel)]="wifiPass" (input)="autoGenerate()" [placeholder]="t.map()['W_PH_PASS']" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-1 focus:ring-primary outline-none">
                  } @else {
                     <textarea [(ngModel)]="textValue" (input)="autoGenerate()" rows="2" [placeholder]="t.map()['W_PH_DATA']" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white resize-none focus:ring-1 focus:ring-primary outline-none"></textarea>
                  }

                  <!-- Extra Controls -->
                  <div class="flex items-center gap-1 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                     <input type="color" [(ngModel)]="colorDark" (change)="generate()" class="w-5 h-5 rounded cursor-pointer border-0 p-0">
                     <input type="color" [(ngModel)]="colorLight" (change)="generate()" class="w-5 h-5 rounded cursor-pointer border-0 p-0">
                     <select [(ngModel)]="errorLevel" (change)="generate()" class="flex-1 text-[9px] p-0.5 border rounded bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white">
                        <option value="L">ECL: L</option>
                        <option value="M">ECL: M</option>
                        <option value="Q">ECL: Q</option>
                        <option value="H">ECL: H</option>
                     </select>
                  </div>
               </div>

               <!-- Right: Preview -->
               <div class="w-1/2 p-2 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                  <div class="relative bg-white p-2 rounded-lg shadow-sm border border-slate-200 h-full flex items-center justify-center w-full">
                     @if (qrDataUrl()) {
                        <img [src]="qrDataUrl()" class="max-w-full max-h-full object-contain">
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
            <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
               <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm text-primary">qr_code_2</span>
                  <span class="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{{ t.map()['TITLE'] }}</span>
               </div>
               <button (click)="saveToWidget()" class="text-[10px] font-bold text-primary hover:text-blue-600 uppercase">{{ t.map()['W_BTN_SAVE'] }}</button>
            </div>

            <!-- Content Split -->
            <div class="flex flex-1 overflow-hidden">
               
               <!-- Left: Controls -->
               <div class="w-1/2 p-3 flex flex-col gap-2 border-r border-slate-100 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-800">
                  <div class="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg shrink-0">
                     <button (click)="setType('url')" [class.bg-white]="currentType() === 'url'" [class.shadow-sm]="currentType() === 'url'" [class.text-primary]="currentType() === 'url'" class="flex-1 py-1 rounded text-[9px] font-bold transition-all text-center dark:text-slate-400 dark:hover:text-white" [class.dark:bg-slate-600]="currentType() === 'url'" [class.dark:text-white]="currentType() === 'url'">{{ t.map()['W_TYPE_URL'] }}</button>
                     <button (click)="setType('wifi')" [class.bg-white]="currentType() === 'wifi'" [class.shadow-sm]="currentType() === 'wifi'" [class.text-primary]="currentType() === 'wifi'" class="flex-1 py-1 rounded text-[9px] font-bold transition-all text-center dark:text-slate-400 dark:hover:text-white" [class.dark:bg-slate-600]="currentType() === 'wifi'" [class.dark:text-white]="currentType() === 'wifi'">{{ t.map()['W_TYPE_WIFI'] }}</button>
                     <button (click)="setType('text')" [class.bg-white]="currentType() === 'text'" [class.shadow-sm]="currentType() === 'text'" [class.text-primary]="currentType() === 'text'" class="flex-1 py-1 rounded text-[9px] font-bold transition-all text-center dark:text-slate-400 dark:hover:text-white" [class.dark:bg-slate-600]="currentType() === 'text'" [class.dark:text-white]="currentType() === 'text'">{{ t.map()['W_TYPE_TEXT'] }}</button>
                  </div>

                  @if (currentType() === 'url') {
                     <input type="text" [(ngModel)]="urlValue" (input)="autoGenerate()" placeholder="https://" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-1 focus:ring-primary outline-none">
                  } @else if (currentType() === 'wifi') {
                     <input type="text" [(ngModel)]="wifiSsid" (input)="autoGenerate()" [placeholder]="t.map()['W_PH_SSID']" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-1 focus:ring-primary outline-none">
                     <input type="password" [(ngModel)]="wifiPass" (input)="autoGenerate()" [placeholder]="t.map()['W_PH_PASS']" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-1 focus:ring-primary outline-none">
                  } @else {
                     <textarea [(ngModel)]="textValue" (input)="autoGenerate()" rows="3" [placeholder]="t.map()['W_PH_DATA']" class="w-full text-xs p-1.5 border rounded dark:bg-slate-900 dark:border-slate-600 dark:text-white resize-none focus:ring-1 focus:ring-primary outline-none"></textarea>
                  }

                  <!-- Extra controls -->
                  <div class="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                     <span class="text-[10px] font-bold text-slate-400 uppercase">{{ t.map()['W_COLOR'] }}</span>
                     <input type="color" [(ngModel)]="colorDark" (change)="generate()" class="w-5 h-5 rounded cursor-pointer border-0 p-0">
                     <input type="color" [(ngModel)]="colorLight" (change)="generate()" class="w-5 h-5 rounded cursor-pointer border-0 p-0">
                  </div>
                  <!-- Error Correction Level -->
                  <select [(ngModel)]="errorLevel" (change)="generate()" class="w-full text-[10px] p-1 border rounded bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white">
                     <option value="L">{{ t.map()['Correction_L'] }}</option>
                     <option value="M">{{ t.map()['Correction_M'] }}</option>
                     <option value="Q">{{ t.map()['Correction_Q'] }}</option>
                     <option value="H">{{ t.map()['Correction_H'] }}</option>
                  </select>
               </div>

               <!-- Right: Preview -->
               <div class="w-1/2 p-2 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                  <div class="relative bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                     @if (qrDataUrl()) {
                        <img [src]="qrDataUrl()" class="max-w-full max-h-full object-contain" [style.max-height.px]="140">
                     } @else {
                        <div class="w-20 h-20 flex items-center justify-center text-slate-300">
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
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Configuration Panel -->
        <div class="lg:col-span-1 space-y-6">
           <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              
              <!-- Type Selector -->
              <div class="mb-6">
                 <label class="block text-xs font-bold text-slate-500 uppercase mb-2">{{ t.map()['TYPE_LABEL'] }}</label>
                 <div class="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button (click)="setType('url')" [class]="getTypeClass('url')" class="flex-1 py-1.5 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-1">
                       <span class="material-symbols-outlined text-sm">link</span>
                    </button>
                    <button (click)="setType('text')" [class]="getTypeClass('text')" class="flex-1 py-1.5 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-1">
                       <span class="material-symbols-outlined text-sm">description</span>
                    </button>
                    <button (click)="setType('wifi')" [class]="getTypeClass('wifi')" class="flex-1 py-1.5 rounded-md text-sm font-medium transition-all flex justify-center items-center gap-1">
                       <span class="material-symbols-outlined text-sm">wifi</span>
                    </button>
                 </div>
              </div>

              <!-- Inputs Based on Type -->
              <div class="space-y-4">
                 @if (currentType() === 'url') {
                    <div>
                       <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{{ t.map()['INPUT_URL'] }}</label>
                       <input 
                         type="url" 
                         [(ngModel)]="urlValue" 
                         (ngModelChange)="generate()"
                         placeholder="https://example.com"
                         class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                       >
                    </div>
                 } 
                 @else if (currentType() === 'text') {
                    <div>
                       <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{{ t.map()['INPUT_TEXT'] }}</label>
                       <textarea 
                         [(ngModel)]="textValue" 
                         (ngModelChange)="generate()"
                         rows="3"
                         class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary text-slate-900 dark:text-white resize-none"
                       ></textarea>
                    </div>
                 }
                 @else if (currentType() === 'wifi') {
                    <div>
                       <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{{ t.map()['WIFI_SSID'] }}</label>
                       <input 
                         type="text" 
                         [(ngModel)]="wifiSsid" 
                         (ngModelChange)="generate()"
                         class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                       >
                    </div>
                    <div>
                       <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{{ t.map()['WIFI_PASS'] }}</label>
                       <div class="relative">
                          <input 
                            [type]="showWifiPass() ? 'text' : 'password'" 
                            [(ngModel)]="wifiPass" 
                            (ngModelChange)="generate()"
                            class="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                          >
                          <button (click)="showWifiPass.set(!showWifiPass())" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                             <span class="material-symbols-outlined text-sm">{{ showWifiPass() ? 'visibility_off' : 'visibility' }}</span>
                          </button>
                       </div>
                    </div>
                    <div class="flex items-center gap-2">
                       <input type="checkbox" [(ngModel)]="wifiHidden" (change)="generate()" id="wifi_hidden" class="rounded border-slate-300 text-primary focus:ring-primary">
                       <label for="wifi_hidden" class="text-sm text-slate-600 dark:text-slate-400">{{ t.map()['WIFI_HIDDEN'] }}</label>
                    </div>
                 }
              </div>

              <div class="h-px bg-slate-100 dark:bg-slate-700 my-6"></div>

              <!-- Appearance -->
              <div class="space-y-4">
                 <div class="grid grid-cols-2 gap-4">
                    <div>
                       <label class="block text-xs font-bold text-slate-500 uppercase mb-1">{{ t.map()['COLOR_FG'] }}</label>
                       <div class="flex items-center gap-2">
                          <input type="color" [(ngModel)]="colorDark" (change)="generate()" class="h-8 w-8 rounded cursor-pointer border-0 p-0">
                          <span class="text-xs font-mono text-slate-500">{{ colorDark() }}</span>
                       </div>
                    </div>
                    <div>
                       <label class="block text-xs font-bold text-slate-500 uppercase mb-1">{{ t.map()['COLOR_BG'] }}</label>
                       <div class="flex items-center gap-2">
                          <input type="color" [(ngModel)]="colorLight" (change)="generate()" class="h-8 w-8 rounded cursor-pointer border-0 p-0">
                          <span class="text-xs font-mono text-slate-500">{{ colorLight() }}</span>
                       </div>
                    </div>
                 </div>

                 <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Error Correction</label>
                    <select [(ngModel)]="errorLevel" (change)="generate()" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200">
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
           <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center min-h-[400px]">
              
              <div class="relative group bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                 @if (qrDataUrl()) {
                    <img [src]="qrDataUrl()" class="max-w-full h-auto max-h-[300px] object-contain transition-opacity duration-300" [class.opacity-50]="isGenerating()">
                 } @else {
                    <div class="w-64 h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                       <span class="material-symbols-outlined text-4xl text-slate-300">qr_code_2</span>
                    </div>
                 }
              </div>

              <div class="mt-8 flex gap-4">
                 <button 
                   (click)="download()" 
                   [disabled]="!qrDataUrl()" 
                   class="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <span class="material-symbols-outlined">download</span>
                    {{ t.map()['BTN_DOWNLOAD'] }}
                 </button>
              </div>

              <div class="mt-8 flex items-start gap-2 max-w-md text-left bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                 <span class="material-symbols-outlined text-blue-500 text-lg mt-0.5">verified_user</span>
                 <p class="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                    {{ t.map()['PRIVACY_NOTE'] }}
                 </p>
              </div>

           </div>
        </div>
      </div>
    </ng-template>
  `
})
export class QrStudioComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null);
  
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

  constructor() {
     // Lazy load library
     this.loadLib();

     effect(() => {
        // If in widget mode and we have config, load it
        if (this.isWidget()) {
           const cfg = this.widgetConfig();
           if (cfg?.qrData) {
              this.restoreState(cfg.qrData);
              // For 1x1, if we have data, start flipped
              if (this.isSize(1, 1)) {
                 this.isFlipped.set(true);
              }
           }
        }
     });
  }

  isSize(w: number, h: number): boolean {
     const cfg = this.widgetConfig();
     // If no specific size provided, treat as 1x1 default for widgets
     if (!cfg) return w === 1 && h === 1;
     return cfg.cols === w && cfg.rows === h;
  }

  async loadLib() {
     if (typeof window !== 'undefined' && !(window as any).QRCode) {
        try {
           const module = await import('qrcode');
           (window as any).QRCode = module.default || module;
           this.generate();
        } catch (e) {
           console.error('Failed to load QRCode lib', e);
        }
     } else {
        this.generate();
     }
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
     if (typeof window === 'undefined' || !(window as any).QRCode) return;
     
     this.isGenerating.set(true);
     
     // Construct Content
     let content = '';
     const type = this.currentType();

     if (type === 'url') content = this.urlValue();
     else if (type === 'text') content = this.textValue();
     else if (type === 'wifi') {
        const ssid = this.escapeWifi(this.wifiSsid());
        const pass = this.escapeWifi(this.wifiPass());
        const t = pass ? 'WPA' : 'nopass';
        const h = this.wifiHidden() ? 'true' : 'false';
        content = `WIFI:S:${ssid};T:${t};P:${pass};H:${h};;`;
     }

     if (!content) {
        this.isGenerating.set(false);
        return;
     }

     try {
        const url = await (window as any).QRCode.toDataURL(content, {
           errorCorrectionLevel: this.errorLevel(),
           margin: 1,
           color: {
              dark: this.colorDark(),
              light: this.colorLight()
           },
           width: 1024 // High res
        });
        this.qrDataUrl.set(url);
     } catch (e) {
        console.error(e);
     } finally {
        this.isGenerating.set(false);
     }
  }

  escapeWifi(str: string): string {
     return str.replace(/([\\;,:])/g, '\\$1');
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
              level: this.errorLevel()
           }
        });
     }
  }

  restoreState(data: any) {
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
