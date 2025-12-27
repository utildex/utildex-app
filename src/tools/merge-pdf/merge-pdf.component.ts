
import { Component, inject, signal, input, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { PDFDocument } from 'pdf-lib';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface PdfFile {
  id: string;
  file: File;
  pageCount?: number;
}

@Component({
  selector: 'app-merge-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="merge-pdf">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div 
        appFileDrop 
        (fileDropped)="handleFileDrop($event)"
        class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700"
      >
         <!-- 1x1 Compact -->
         @if (isSize(1, 1)) {
            <div class="h-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-center">
               <span class="text-[9px] font-bold uppercase text-slate-500 truncate px-1">{{ t.map()['TITLE_SHORT'] }}</span>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center p-1 relative">
               @if (files().length > 0) {
                  <div class="flex flex-col items-center justify-center h-full w-full gap-1">
                     <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ files().length }} PDF</span>
                     <button (click)="merge()" [disabled]="isProcessing()" class="w-full py-1 bg-primary text-white text-[9px] font-bold rounded">
                        {{ isProcessing() ? '...' : t.map()['BTN_MERGE_SHORT'] }}
                     </button>
                  </div>
                  <button (click)="reset()" class="absolute top-0 right-0 p-0.5 text-slate-400 hover:text-primary bg-white/80 dark:bg-slate-800/80 rounded-full">
                     <span class="material-symbols-outlined text-[10px]">close</span>
                  </button>
               } @else {
                  <div (click)="triggerUpload()" class="flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-primary transition-colors h-full w-full p-1 text-center">
                     <span class="material-symbols-outlined text-2xl mb-1">join_full</span>
                     <span class="text-[8px] font-bold uppercase leading-tight">{{ t.map()['DROP_EXPLICIT'] }}</span>
                  </div>
               }
            </div>
         }
         <!-- 2x1 Wide -->
         @else if (isSize(2, 1)) {
            <div class="h-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-2">
               <span class="text-[10px] font-bold uppercase text-slate-500">{{ t.map()['TITLE'] }}</span>
               @if (files().length > 0) {
                  <button (click)="reset()" class="text-[9px] text-slate-400 hover:text-primary uppercase font-bold">{{ t.map()['BTN_RESET'] }}</button>
               }
            </div>
            <div class="flex flex-1 overflow-hidden">
               <div class="w-1/2 p-2 border-r border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center relative hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div (click)="triggerUpload()" class="cursor-pointer text-center group w-full h-full flex flex-col items-center justify-center">
                     @if (files().length > 0) {
                        <span class="material-symbols-outlined text-xl text-green-500 mb-1">check_circle</span>
                        <div class="text-[9px] font-bold text-slate-500 leading-tight">{{ files().length }} {{ t.map()['FILES'] }}</div>
                     } @else {
                        <span class="material-symbols-outlined text-xl text-slate-400 group-hover:text-primary transition-colors mb-1">upload_file</span>
                        <div class="text-[9px] font-bold text-slate-500 leading-tight">{{ t.map()['UPLOAD_PDF'] }}</div>
                     }
                  </div>
                  <button (click)="triggerUpload()" class="absolute inset-0 z-10 w-full h-full"></button>
               </div>
               <div class="w-1/2 p-2 flex flex-col justify-center gap-1">
                  <button (click)="merge()" [disabled]="files().length < 1 || isProcessing()" class="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded hover:opacity-90 transition-colors disabled:opacity-50">
                     {{ t.map()['BTN_MERGE'] }}
                  </button>
               </div>
            </div>
         }
         <!-- Standard / Large -->
         @else {
            <div class="flex flex-col h-full">
               <div class="bg-primary/5 border-b border-primary/10 p-2 flex justify-between items-center shrink-0">
                  <div class="flex items-center gap-1 text-primary">
                     <span class="material-symbols-outlined text-sm">join_full</span>
                     <span class="text-xs font-bold uppercase">{{ t.map()['TITLE'] }}</span>
                  </div>
                  <div class="flex gap-1">
                     <button (click)="triggerUpload()" class="text-slate-400 hover:text-primary transition-colors" title="Add">
                        <span class="material-symbols-outlined text-sm">add</span>
                     </button>
                     <button (click)="reset()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="Reset">
                        <span class="material-symbols-outlined text-sm">refresh</span>
                     </button>
                  </div>
               </div>
               
               <div class="flex-1 overflow-y-auto p-2 space-y-1">
                  @if (files().length === 0) {
                     <div (click)="triggerUpload()" class="h-full flex flex-col items-center justify-center text-slate-400 cursor-pointer min-h-[60px] text-center p-4 group">
                        <span class="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform group-hover:text-primary">upload_file</span>
                        <span class="text-[10px] uppercase font-bold">{{ t.map()['DROP_EXPLICIT'] }}</span>
                     </div>
                  } @else {
                     @for (file of files(); track file.id; let i = $index) {
                        <div class="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-700/50 rounded text-xs group">
                           <span class="text-slate-400 font-mono w-4">{{ i + 1 }}</span>
                           <span class="truncate flex-1 text-slate-700 dark:text-slate-200">{{ file.file.name }}</span>
                           <button (click)="removeFile(i)" class="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span class="material-symbols-outlined text-sm">close</span>
                           </button>
                        </div>
                     }
                  }
               </div>

               @if (files().length > 0) {
                  <div class="p-2 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                     <button (click)="merge()" [disabled]="isProcessing()" class="w-full py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors">
                        {{ isProcessing() ? '...' : t.map()['BTN_MERGE'] }}
                     </button>
                  </div>
               }
            </div>
         }
      </div>
    }

    <!-- Hidden Input -->
    <input #fileInput type="file" accept="application/pdf" multiple class="hidden" (change)="handleFileSelect($event)">

    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 min-h-[400px] flex flex-col">
        <!-- Controls -->
        <div class="flex flex-wrap gap-4 justify-between items-center mb-6">
           <div class="flex gap-3">
              <button (click)="triggerUpload()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                 <span class="material-symbols-outlined">add</span>
                 {{ t.map()['ADD_FILES'] }}
              </button>
              @if (files().length > 0) {
                 <button (click)="reset()" class="px-4 py-2 text-slate-500 hover:text-red-500 transition-colors">
                    {{ t.map()['BTN_RESET'] }}
                 </button>
              }
           </div>
           
           @if (files().length > 1) {
              <button (click)="merge()" [disabled]="isProcessing()" class="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2">
                 @if (isProcessing()) {
                    <span class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                 } @else {
                    <span class="material-symbols-outlined">join_full</span>
                 }
                 {{ t.map()['BTN_MERGE'] }}
              </button>
           }
        </div>

        <!-- Drop Zone / List -->
        <div 
           appFileDrop 
           (fileDropped)="handleFileDrop($event)"
           class="flex-1 border-2 border-dashed rounded-xl transition-all relative min-h-[200px]"
           [class.border-slate-200]="files().length > 0"
           [class.dark:border-slate-700]="files().length > 0"
           [class.border-slate-300]="files().length === 0"
           [class.dark:border-slate-600]="files().length === 0"
        >
           @if (files().length === 0) {
              <div (click)="triggerUpload()" class="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                 <span class="material-symbols-outlined text-4xl text-slate-300 mb-4">upload_file</span>
                 <p class="text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
              </div>
           } @else {
              <div class="p-4 space-y-2">
                 @for (file of files(); track file.id; let i = $index) {
                    <div class="flex items-center gap-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm group hover:border-primary/50 transition-all">
                       <div class="flex flex-col items-center justify-center gap-1 w-8">
                          @if (i > 0) {
                             <button (click)="move(i, -1)" class="text-slate-300 hover:text-primary"><span class="material-symbols-outlined text-sm">keyboard_arrow_up</span></button>
                          }
                          @if (i < files().length - 1) {
                             <button (click)="move(i, 1)" class="text-slate-300 hover:text-primary"><span class="material-symbols-outlined text-sm">keyboard_arrow_down</span></button>
                          }
                       </div>
                       
                       <div class="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                          <span class="material-symbols-outlined">picture_as_pdf</span>
                       </div>
                       
                       <div class="flex-1 min-w-0">
                          <div class="font-bold text-slate-900 dark:text-white truncate">{{ file.file.name }}</div>
                          <div class="text-xs text-slate-500">{{ formatBytes(file.file.size) }}</div>
                       </div>

                       <button (click)="removeFile(i)" class="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-700">
                          <span class="material-symbols-outlined">delete</span>
                       </button>
                    </div>
                 }
              </div>
           }
        </div>

        <!-- Result -->
        @if (resultUrl()) {
           <div class="mt-8">
              <app-action-bar 
                 [content]="resultBytes() || ''" 
                 filename="merged.pdf"
                 mimeType="application/pdf"
                 source="Merge PDF"
              ></app-action-bar>
           </div>
        }
      </div>
    </ng-template>
  `
})
export class MergePdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null);
  
  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  files = signal<PdfFile[]>([]);
  isProcessing = signal(false);
  
  resultUrl = signal<string | null>(null);
  resultBytes = signal<Uint8Array | null>(null);

  isSize(w: number, h: number): boolean {
     const cfg = this.widgetConfig();
     return cfg && cfg.cols === w && cfg.rows === h;
  }

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: any) {
    const files = event.target.files;
    if (files) this.addFiles(files);
    event.target.value = '';
  }

  handleFileDrop(files: FileList) {
    this.addFiles(files);
  }

  addFiles(list: FileList) {
    const newFiles: PdfFile[] = [];
    for (let i = 0; i < list.length; i++) {
       const file = list[i];
       if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          newFiles.push({ id: crypto.randomUUID(), file });
       }
    }
    
    if (newFiles.length === 0) {
       this.toast.show(this.t.get('ERR_INVALID'), 'error');
       return;
    }

    this.files.update(current => [...current, ...newFiles]);
    this.resultUrl.set(null); 
  }

  removeFile(index: number) {
     this.files.update(current => current.filter((_, i) => i !== index));
     this.resultUrl.set(null);
  }

  move(index: number, delta: number) {
     this.files.update(current => {
        const newArr = [...current];
        const item = newArr[index];
        newArr.splice(index, 1);
        newArr.splice(index + delta, 0, item);
        return newArr;
     });
     this.resultUrl.set(null);
  }

  reset() {
     this.files.set([]);
     this.resultUrl.set(null);
     this.resultBytes.set(null);
  }

  async merge() {
     if (this.files().length < 2 && !this.isWidget()) {
        // Just passthrough single file in widget mode
     }

     this.isProcessing.set(true);

     try {
        const mergedPdf = await PDFDocument.create();
        
        for (const pdf of this.files()) {
           const buffer = await pdf.file.arrayBuffer();
           const doc = await PDFDocument.load(buffer);
           const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
           copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const bytes = await mergedPdf.save();
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
        this.toast.show('Merge failed', 'error');
     } finally {
        this.isProcessing.set(false);
     }
  }

  downloadResult() {
     const url = this.resultUrl();
     if (!url) return;
     const a = document.createElement('a');
     a.href = url;
     a.download = 'merged-document.pdf';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
