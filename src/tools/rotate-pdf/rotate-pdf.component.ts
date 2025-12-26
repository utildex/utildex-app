
import { Component, inject, signal, input, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { PDFDocument, degrees } from 'pdf-lib';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

type RotationMode = 'all' | 'odd' | 'even' | 'specific';

@Component({
  selector: 'app-rotate-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="rotate-pdf">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div 
        appFileDrop 
        (fileDropped)="handleFileDrop($event)"
        class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700"
      >
         <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-primary/5 dark:bg-slate-900/50">
            <span class="text-xs font-bold uppercase text-primary px-1">Rotate</span>
            @if (pdfFile()) {
               <button (click)="reset()" class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-sm">close</span></button>
            }
         </div>
         
         <div class="flex-1 flex flex-col items-center justify-center p-2 relative">
            @if (pdfFile()) {
               <span class="material-symbols-outlined text-4xl text-primary mb-1 transition-transform duration-300" [style.transform]="'rotate('+totalRotation()+'deg)'">picture_as_pdf</span>
               <div class="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate w-full text-center">{{ pdfFile()?.name }}</div>
               
               <div class="flex gap-2 mt-2">
                  <button (click)="addRotation(-90)" class="p-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200"><span class="material-symbols-outlined text-sm">rotate_left</span></button>
                  <button (click)="addRotation(90)" class="p-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200"><span class="material-symbols-outlined text-sm">rotate_right</span></button>
               </div>
            } @else {
               <button (click)="triggerUpload()" class="flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-colors w-full h-full">
                  <span class="material-symbols-outlined text-3xl mb-1">rotate_right</span>
                  <span class="text-[9px] uppercase font-bold">{{ t.map()['UPLOAD_PDF'] }}</span>
               </button>
            }
         </div>

         @if (pdfFile()) {
            <div class="p-2 border-t border-slate-100 dark:border-slate-700">
               <button (click)="save()" [disabled]="isProcessing()" class="w-full py-1.5 bg-primary text-white text-xs font-bold rounded hover:opacity-90 transition-colors">
                  {{ isProcessing() ? '...' : 'Save' }}
               </button>
            </div>
         }
      </div>
    }

    <input #fileInput type="file" accept="application/pdf" class="hidden" (change)="handleFileSelect($event)">

    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 min-h-[400px] flex flex-col">
         
         @if (!pdfFile()) {
            <div 
               appFileDrop 
               (fileDropped)="handleFileDrop($event)"
               (click)="triggerUpload()"
               class="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center p-12 cursor-pointer hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
            >
               <span class="material-symbols-outlined text-5xl text-slate-300 mb-4 group-hover:scale-110 transition-transform">rotate_right</span>
               <h3 class="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{{ t.map()['DROP_LABEL'] }}</h3>
            </div>
         } @else {
            <div class="flex-1 flex flex-col items-center justify-center">
               <div class="mb-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-4 w-full max-w-lg">
                  <div class="w-24 h-32 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-transform duration-500"
                       [style.transform]="'rotate('+totalRotation()+'deg)'">
                     <span class="material-symbols-outlined text-4xl text-primary">picture_as_pdf</span>
                  </div>
                  <div class="text-center">
                     <div class="font-bold text-slate-900 dark:text-white">{{ pdfFile()?.name }}</div>
                     <div class="text-sm text-slate-500">{{ totalRotation() }}°</div>
                  </div>

                  <!-- Configuration -->
                  <div class="w-full pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                     <div class="flex flex-col gap-2">
                        <label class="text-xs font-bold text-slate-500 uppercase">{{ t.map()['LABEL_MODE'] }}</label>
                        <select [(ngModel)]="mode" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-primary focus:border-primary">
                           <option value="all">{{ t.map()['MODE_ALL'] }}</option>
                           <option value="odd">{{ t.map()['MODE_ODD'] }}</option>
                           <option value="even">{{ t.map()['MODE_EVEN'] }}</option>
                           <option value="specific">{{ t.map()['MODE_SPECIFIC'] }}</option>
                        </select>
                     </div>

                     @if (mode() === 'specific') {
                        <div class="animate-fade-in">
                           <input 
                              type="text" 
                              [(ngModel)]="specificRange" 
                              class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm font-mono focus:ring-primary"
                              [placeholder]="t.map()['PLACEHOLDER_RANGE']"
                           >
                        </div>
                     }
                  </div>
               </div>

               <div class="flex gap-4 mb-8">
                  <button (click)="addRotation(-90)" class="flex flex-col items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-24">
                     <span class="material-symbols-outlined text-3xl">rotate_left</span>
                     <span class="text-xs font-bold">{{ t.map()['BTN_ROTATE_LEFT'] }}</span>
                  </button>
                  <button (click)="addRotation(180)" class="flex flex-col items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-24">
                     <span class="material-symbols-outlined text-3xl">sync</span>
                     <span class="text-xs font-bold">{{ t.map()['BTN_ROTATE_180'] }}</span>
                  </button>
                  <button (click)="addRotation(90)" class="flex flex-col items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-24">
                     <span class="material-symbols-outlined text-3xl">rotate_right</span>
                     <span class="text-xs font-bold">{{ t.map()['BTN_ROTATE_RIGHT'] }}</span>
                  </button>
               </div>

               <div class="flex gap-4">
                  <button (click)="reset()" class="px-6 py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold transition-colors">
                     {{ t.map()['BTN_RESET'] }}
                  </button>
                  <button (click)="save()" [disabled]="isProcessing()" class="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-colors shadow-lg flex items-center gap-2">
                     @if (isProcessing()) {
                        <span class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                     }
                     {{ t.map()['BTN_SAVE'] }}
                  </button>
               </div>
            </div>
         }

         <!-- Result -->
         @if (resultUrl()) {
            <div class="mt-8">
               <app-action-bar 
                  [content]="resultBytes() || ''" 
                  filename="rotated.pdf"
                  mimeType="application/pdf"
                  source="Rotate PDF"
               ></app-action-bar>
            </div>
         }
      </div>
    </ng-template>
  `
})
export class RotatePdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null); // Fixed missing input
  
  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  pdfFile = signal<File | null>(null);
  
  // Rotation configuration
  totalRotation = signal(0);
  mode = signal<RotationMode>('all');
  specificRange = signal('');

  isProcessing = signal(false);
  
  resultUrl = signal<string | null>(null);
  resultBytes = signal<Uint8Array | null>(null);

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) this.loadFile(file);
    event.target.value = '';
  }

  handleFileDrop(files: FileList) {
    const file = files[0];
    if (file) this.loadFile(file);
  }

  loadFile(file: File) {
     if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        this.toast.show('Invalid file', 'error');
        return;
     }
     this.pdfFile.set(file);
     this.totalRotation.set(0);
     this.mode.set('all');
     this.specificRange.set('');
     this.resultUrl.set(null);
  }

  addRotation(deg: number) {
     this.totalRotation.update(curr => (curr + deg) % 360);
  }

  reset() {
     this.pdfFile.set(null);
     this.totalRotation.set(0);
     this.resultUrl.set(null);
     this.resultBytes.set(null);
  }

  async save() {
     if (!this.pdfFile()) return;
     this.isProcessing.set(true);

     try {
        const buffer = await this.pdfFile()!.arrayBuffer();
        const doc = await PDFDocument.load(buffer);
        const pages = doc.getPages();
        const angle = this.totalRotation();
        const pageCount = doc.getPageCount();

        // Determine which pages to rotate
        const indicesToRotate = new Set<number>();
        const m = this.mode();

        if (m === 'all') {
           for (let i = 0; i < pageCount; i++) indicesToRotate.add(i);
        } else if (m === 'odd') {
           for (let i = 0; i < pageCount; i += 2) indicesToRotate.add(i); // 0-indexed: 0=page 1 (odd)
        } else if (m === 'even') {
           for (let i = 1; i < pageCount; i += 2) indicesToRotate.add(i); // 0-indexed: 1=page 2 (even)
        } else if (m === 'specific') {
           const parsed = this.parseRange(this.specificRange(), pageCount);
           parsed.forEach(i => indicesToRotate.add(i));
        }

        // Apply rotation
        pages.forEach((page, idx) => {
           if (indicesToRotate.has(idx)) {
              const current = page.getRotation().angle;
              page.setRotation(degrees(current + angle));
           }
        });

        const bytes = await doc.save();
        this.resultBytes.set(bytes);
        const safeBytes = new Uint8Array(bytes);
        const blob = new Blob([safeBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.resultUrl.set(url);
        
        if (this.isWidget()) {
           this.downloadResult();
        } else {
           this.toast.show(this.t.get('SUCCESS'), 'success');
        }

     } catch (e) {
        console.error(e);
        this.toast.show('Error processing PDF', 'error');
     } finally {
        this.isProcessing.set(false);
     }
  }

  downloadResult() {
     const url = this.resultUrl();
     if (!url) return;
     const a = document.createElement('a');
     a.href = url;
     a.download = 'rotated-document.pdf';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  }

  private parseRange(rangeStr: string, max: number): number[] {
     const pages = new Set<number>();
     if (!rangeStr) return [];
     
     const parts = rangeStr.split(',');
     for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
           const [start, end] = trimmed.split('-').map(n => parseInt(n, 10));
           if (!isNaN(start) && !isNaN(end)) {
              const low = Math.max(1, Math.min(start, end));
              const high = Math.min(max, Math.max(start, end));
              for (let i = low; i <= high; i++) pages.add(i - 1);
           }
        } else {
           const num = parseInt(trimmed, 10);
           if (!isNaN(num) && num >= 1 && num <= max) {
              pages.add(num - 1);
           }
        }
     }
     return Array.from(pages);
  }
}
