
import { Component, inject, signal, input, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface GeneratedFile {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  size: number;
}

@Component({
  selector: 'app-split-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, FileDropDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="split-pdf">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div 
        appFileDrop 
        (fileDropped)="handleFileDrop($event)"
        class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 group transition-all"
      >
         <!-- 1x1 Compact Layout -->
         @if (isSize(1, 1)) {
            <div class="flex-1 flex flex-col items-center justify-center p-1 text-center relative">
               @if (generatedFiles().length > 0) {
                  <!-- Success State -->
                  <button (click)="downloadAllOrFirst()" class="w-full h-full flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors animate-fade-in">
                     <span class="material-symbols-outlined text-2xl">download</span>
                     <span class="text-[10px] font-bold uppercase leading-tight mt-1">{{ generatedFiles().length > 1 ? 'ZIP' : 'Save' }}</span>
                  </button>
                  <button (click)="reset()" class="absolute top-1 right-1 text-slate-400 hover:text-slate-600 p-1 bg-white/50 dark:bg-black/50 rounded-full z-10">
                     <span class="material-symbols-outlined text-[10px]">close</span>
                  </button>
               } @else if (pdfFile()) {
                  <!-- Ready State -->
                  <div class="flex flex-col items-center w-full h-full justify-between py-2 px-1">
                     <div class="text-[9px] font-bold text-slate-500 truncate w-full text-center">{{ pageCount() }} p.</div>
                     <input 
                       type="text" 
                       [(ngModel)]="pageRange" 
                       class="w-full text-center text-[10px] border rounded bg-slate-50 dark:bg-slate-900 p-0.5 focus:ring-1 focus:ring-primary outline-none" 
                       placeholder="1-2"
                     >
                     <button (click)="splitPdf()" [disabled]="isProcessing()" class="text-red-500 hover:text-red-600 p-1">
                        <span class="material-symbols-outlined text-xl">{{ isProcessing() ? 'hourglass_top' : 'content_cut' }}</span>
                     </button>
                  </div>
               } @else {
                  <!-- Empty State -->
                  <button (click)="triggerUpload()" class="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-red-500 transition-colors gap-1">
                     <span class="material-symbols-outlined text-2xl">picture_as_pdf</span>
                     <span class="text-[9px] font-bold uppercase">{{ t.map()['WIDGET_EMPTY'] }}</span>
                  </button>
               }
            </div>
         } 
         <!-- 2x1 Wide Layout -->
         @else if (isSize(2, 1)) {
            <div class="flex flex-row h-full">
               <!-- Left: Info/Upload -->
               <div class="w-1/2 p-3 border-r border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center text-center bg-slate-50 dark:bg-slate-900/50 relative">
                  @if (generatedFiles().length > 0) {
                     <span class="material-symbols-outlined text-3xl text-green-500 mb-1">check_circle</span>
                     <div class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ generatedFiles().length }} Files</div>
                  } @else if (pdfFile()) {
                     <span class="material-symbols-outlined text-3xl text-red-500 mb-1">description</span>
                     <div class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate w-full">{{ pdfFile()?.name }}</div>
                     <div class="text-[10px] text-slate-500">{{ pageCount() }} {{ t.map()['PAGES_COUNT'] }}</div>
                  } @else {
                     <span class="material-symbols-outlined text-3xl text-slate-300 mb-1">upload_file</span>
                     <div class="text-xs text-slate-500 font-medium">Upload PDF</div>
                     <button (click)="triggerUpload()" class="absolute inset-0 z-10 w-full h-full"></button>
                  }
               </div>
               
               <!-- Right: Controls -->
               <div class="w-1/2 p-3 flex flex-col justify-center gap-2">
                  @if (generatedFiles().length > 0) {
                     <button (click)="downloadAllOrFirst()" class="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold shadow-sm transition-colors">
                        Download {{ generatedFiles().length > 1 ? 'All' : '' }}
                     </button>
                     <button (click)="reset()" class="text-xs text-slate-400 hover:text-slate-600 underline">Reset</button>
                  } @else if (pdfFile()) {
                     <input type="text" [(ngModel)]="pageRange" class="w-full text-xs border rounded px-2 py-1 bg-white dark:bg-slate-900" placeholder="1-5; 6-10">
                     <button (click)="splitPdf()" [disabled]="isProcessing() || !pageRange()" class="w-full py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">content_cut</span> Split
                     </button>
                  } @else {
                     <div class="text-[10px] text-slate-400 text-center italic">Waiting for file...</div>
                  }
               </div>
            </div>
         }
         <!-- 1x2 Tall Layout -->
         @else if (isSize(1, 2)) {
            <div class="flex flex-col h-full">
               <div class="flex-1 flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900/50 relative">
                  @if (generatedFiles().length > 0) {
                     <span class="material-symbols-outlined text-4xl text-green-500 mb-2">task_alt</span>
                     <div class="text-xs font-bold text-center">{{ generatedFiles().length }} Files Ready</div>
                  } @else if (pdfFile()) {
                     <span class="material-symbols-outlined text-4xl text-red-500 mb-2">picture_as_pdf</span>
                     <div class="text-xs font-bold text-center truncate w-full px-2">{{ pdfFile()?.name }}</div>
                  } @else {
                     <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">upload</span>
                     <div class="text-xs text-slate-500 font-bold uppercase">Drop PDF</div>
                     <button (click)="triggerUpload()" class="absolute inset-0 z-10 w-full h-full"></button>
                  }
               </div>
               
               <div class="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                  @if (generatedFiles().length > 0) {
                     <button (click)="downloadAllOrFirst()" class="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold mb-2">Save</button>
                     <button (click)="reset()" class="w-full text-xs text-slate-400">Reset</button>
                  } @else if (pdfFile()) {
                     <div class="flex flex-col gap-2">
                        <input type="text" [(ngModel)]="pageRange" class="w-full text-xs border rounded p-1.5" placeholder="1-5; 6-10">
                        <button (click)="splitPdf()" [disabled]="isProcessing()" class="w-full py-1.5 bg-red-500 text-white rounded text-xs font-bold">Split</button>
                     </div>
                  }
               </div>
            </div>
         }
         <!-- Default / Large Layout -->
         @else {
            <div class="flex flex-col h-full">
               <div class="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 p-2 flex justify-between items-center shrink-0">
                  <div class="flex items-center gap-1 text-red-600 dark:text-red-400">
                     <span class="material-symbols-outlined text-sm">picture_as_pdf</span>
                     <span class="text-xs font-bold uppercase">Split PDF</span>
                  </div>
                  @if (pdfFile() || generatedFiles().length > 0) {
                     <button (click)="reset()" class="text-slate-400 hover:text-red-500 transition-colors" title="Reset">
                        <span class="material-symbols-outlined text-sm">refresh</span>
                     </button>
                  }
               </div>
               
               <div class="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                  @if (generatedFiles().length > 0) {
                     <div class="text-center animate-fade-in space-y-3">
                        <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                           <span class="material-symbols-outlined text-2xl">check</span>
                        </div>
                        <div class="text-sm font-bold text-slate-900 dark:text-white">{{ generatedFiles().length }} files created</div>
                        <button (click)="downloadAllOrFirst()" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 mx-auto">
                           <span class="material-symbols-outlined text-sm">download</span>
                           {{ t.map()['BTN_DOWNLOAD_ALL'] }}
                        </button>
                     </div>
                  } @else if (pdfFile()) {
                     <div class="w-full max-w-[200px] text-center space-y-3">
                        <div class="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200">
                           <span class="material-symbols-outlined text-red-500">description</span>
                           <span class="text-xs font-bold truncate">{{ pdfFile()?.name }}</span>
                        </div>
                        <input type="text" [(ngModel)]="pageRange" class="w-full text-sm border rounded p-2 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 outline-none" [placeholder]="t.map()['RANGE_PLACEHOLDER']">
                        <button (click)="splitPdf()" [disabled]="isProcessing() || !pageRange()" class="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded font-bold shadow-sm transition-colors text-xs uppercase tracking-wide">
                           {{ isProcessing() ? 'Processing...' : 'Split PDF' }}
                        </button>
                     </div>
                  } @else {
                     <div (click)="triggerUpload()" class="cursor-pointer text-center group">
                        <span class="material-symbols-outlined text-4xl text-slate-300 mb-2 group-hover:scale-110 transition-transform group-hover:text-red-400">upload_file</span>
                        <p class="text-xs text-slate-500 font-medium">{{ t.map()['WIDGET_EMPTY'] }}</p>
                     </div>
                  }
               </div>
            </div>
         }
         
         <input #fileInput type="file" accept="application/pdf" class="hidden" (change)="handleFileSelect($event)">
      </div>
    }

    <!-- Main Content (Full Tool) -->
    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 min-h-[400px] flex flex-col">
        
        <!-- Upload Area -->
        @if (!pdfFile()) {
          <div 
            appFileDrop 
            (fileDropped)="handleFileDrop($event)"
            (click)="triggerUpload()"
            class="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center p-12 cursor-pointer hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
          >
             <div class="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-300">upload_file</span>
             </div>
             <h3 class="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{{ t.map()['SELECT_FILE'] }}</h3>
             <p class="text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
          </div>
        } 
        
        <!-- Editor / Results Area -->
        @else {
          <div class="flex-1 animate-fade-in">
             
             <!-- Header Info -->
             <div class="flex items-center justify-between gap-4 mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div class="flex items-center gap-4">
                   <div class="w-10 h-10 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center">
                      <span class="material-symbols-outlined text-xl">picture_as_pdf</span>
                   </div>
                   <div>
                      <h3 class="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{{ pdfFile()?.name }}</h3>
                      <p class="text-xs text-slate-500">{{ pageCount() }} {{ t.map()['PAGES_COUNT'] }}</p>
                   </div>
                </div>
                <button (click)="reset()" class="text-slate-400 hover:text-red-500 transition-colors p-2" title="Reset">
                   <span class="material-symbols-outlined">close</span>
                </button>
             </div>

             <!-- Input Zone (Only if not processed yet) -->
             @if (generatedFiles().length === 0) {
                <div class="max-w-xl mx-auto space-y-6 py-8">
                   <div>
                      <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{{ t.map()['RANGE_LABEL'] }}</label>
                      <input 
                        type="text" 
                        [(ngModel)]="pageRange" 
                        [placeholder]="t.map()['RANGE_PLACEHOLDER']"
                        class="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-slate-900 dark:text-white font-mono"
                      >
                      <p class="text-xs text-slate-500 mt-2 flex items-center gap-1">
                         <span class="material-symbols-outlined text-sm">info</span>
                         {{ t.map()['RANGE_HINT'] }}
                      </p>
                   </div>

                   <button 
                     (click)="splitPdf()" 
                     [disabled]="isProcessing() || !pageRange()"
                     class="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                   >
                     @if (isProcessing()) {
                        <span class="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                        {{ t.map()['PROCESSING'] }}
                     } @else {
                        <span class="material-symbols-outlined">content_cut</span>
                        {{ t.map()['BTN_SPLIT'] }}
                     }
                   </button>
                </div>
             } 
             
             <!-- Results List -->
             @else {
                <div class="space-y-6">
                   <div class="flex items-center justify-between">
                      <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ t.map()['RESULTS_TITLE'] }}</h3>
                      @if (generatedFiles().length > 1) {
                         <button (click)="downloadAllOrFirst()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow hover:bg-green-700 transition-colors flex items-center gap-2">
                            <span class="material-symbols-outlined">archive</span>
                            {{ t.map()['BTN_DOWNLOAD_ALL'] }}
                         </button>
                      }
                   </div>

                   <div class="grid gap-3">
                      @for (file of generatedFiles(); track file.id) {
                         <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm group hover:border-primary/50 transition-colors">
                            <div class="flex items-center gap-3 overflow-hidden">
                               <div class="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-500 rounded flex items-center justify-center shrink-0">
                                  <span class="material-symbols-outlined text-lg">description</span>
                               </div>
                               <div class="min-w-0">
                                  <div class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{{ file.name }}</div>
                                  <div class="text-xs text-slate-500">{{ formatBytes(file.size) }}</div>
                               </div>
                            </div>
                            <button (click)="downloadFile(file)" class="p-2 text-slate-400 hover:text-primary transition-colors" [title]="t.map()['BTN_DOWNLOAD']">
                               <span class="material-symbols-outlined">download</span>
                            </button>
                         </div>
                      }
                   </div>
                   
                   <div class="text-center pt-6">
                      <button (click)="reset()" class="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white underline">{{ t.map()['BTN_START_OVER'] }}</button>
                   </div>
                </div>
             }
          </div>
        }

        <input #fileInput type="file" accept="application/pdf" class="hidden" (change)="handleFileSelect($event)">
      </div>
    </ng-template>
  `
})
export class SplitPdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  // State
  pdfFile = signal<File | null>(null);
  pdfDoc = signal<PDFDocument | null>(null);
  pageCount = signal(0);
  pageRange = signal('');
  isProcessing = signal(false);
  
  // Results
  generatedFiles = signal<GeneratedFile[]>([]);

  // Widget helper
  isSize(w: number, h: number): boolean {
     const cfg = this.widgetConfig();
     return cfg && cfg.cols === w && cfg.rows === h;
  }

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

  async loadFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
       this.toast.show(this.t.get('ERR_INVALID_PDF'), 'error');
       return;
    }

    try {
       const arrayBuffer = await file.arrayBuffer();
       const pdfDoc = await PDFDocument.load(arrayBuffer);
       
       this.pdfFile.set(file);
       this.pdfDoc.set(pdfDoc);
       this.pageCount.set(pdfDoc.getPageCount());
       this.generatedFiles.set([]);
    } catch (e) {
       console.error(e);
       this.toast.show(this.t.get('ERR_INVALID_PDF'), 'error');
    }
  }

  reset() {
    this.pdfFile.set(null);
    this.pdfDoc.set(null);
    this.pageCount.set(0);
    this.pageRange.set('');
    this.generatedFiles.set([]);
  }

  async splitPdf() {
    const doc = this.pdfDoc();
    const rangeStr = this.pageRange();
    
    if (!doc || !rangeStr) return;

    this.isProcessing.set(true);

    try {
       // 1. Split command into groups by semicolon
       const groups = rangeStr.split(';').map(s => s.trim()).filter(s => s.length > 0);
       
       if (groups.length === 0) throw new Error(this.t.get('ERR_INVALID_RANGE'));

       const results: GeneratedFile[] = [];
       const originalName = this.pdfFile()?.name.replace('.pdf', '') || 'document';

       // 2. Process each group
       for (let i = 0; i < groups.length; i++) {
          const groupStr = groups[i];
          const indices = this.parsePageRange(groupStr, this.pageCount());
          
          if (indices.length === 0) continue;

          const newPdf = await PDFDocument.create();
          const copiedPages = await newPdf.copyPages(doc, indices);
          copiedPages.forEach(page => newPdf.addPage(page));
          
          const pdfBytes = await newPdf.save();
           const blob = new Blob(
               [
                   pdfBytes.buffer instanceof ArrayBuffer
                       ? pdfBytes.buffer
                       : pdfBytes.slice().buffer
               ],
               { type: 'application/pdf' }
           );
          const url = URL.createObjectURL(blob);
          
          // Suffix: -1, -2, or custom if we had naming logic. 
          // If 1 group, use -split. If multiple, use -part-X
          const suffix = groups.length === 1 ? 'split' : `part-${i+1}`;
          
          results.push({
             id: crypto.randomUUID(),
             name: `${originalName}-${suffix}.pdf`,
             blob,
             url,
             size: blob.size
          });
       }

       if (results.length === 0) throw new Error(this.t.get('ERR_INVALID_RANGE'));

       this.generatedFiles.set(results);
       this.toast.show(this.t.get('SUCCESS'), 'success');

    } catch (e: any) {
       console.error(e);
       this.toast.show(e.message || 'Error processing PDF', 'error');
    } finally {
       this.isProcessing.set(false);
    }
  }

  downloadFile(file: GeneratedFile) {
     const a = document.createElement('a');
     a.href = file.url;
     a.download = file.name;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  }

  async downloadAllOrFirst() {
     const files = this.generatedFiles();
     if (files.length === 0) return;

     if (files.length === 1) {
        this.downloadFile(files[0]);
     } else {
        // Create ZIP
        const zip = new JSZip();
        files.forEach(f => {
           zip.file(f.name, f.blob);
        });
        
        try {
           const content = await zip.generateAsync({ type: 'blob' });
           const url = URL.createObjectURL(content);
           const a = document.createElement('a');
           a.href = url;
           a.download = `${this.pdfFile()?.name.replace('.pdf','')}-split.zip`;
           document.body.appendChild(a);
           a.click();
           document.body.removeChild(a);
           URL.revokeObjectURL(url);
        } catch (e) {
           console.error('Zip creation failed', e);
           this.toast.show('Failed to create ZIP', 'error');
        }
     }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private parsePageRange(range: string, maxPages: number): number[] {
    const pages = new Set<number>();
    const parts = range.split(',');

    for (const part of parts) {
       const trimmed = part.trim();
       if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map(n => parseInt(n, 10));
          if (!isNaN(start) && !isNaN(end)) {
             const low = Math.max(1, Math.min(start, end));
             const high = Math.min(maxPages, Math.max(start, end));
             for (let i = low; i <= high; i++) pages.add(i - 1);
          }
       } else {
          const num = parseInt(trimmed, 10);
          if (!isNaN(num) && num >= 1 && num <= maxPages) {
             pages.add(num - 1);
          }
       }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }
}
