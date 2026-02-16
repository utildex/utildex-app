
import { Component, inject, signal, computed, input, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

// Initialize PDF.js worker
// We must point to the CDN location that matches the version in importmap
const pdfWorkerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

interface PageThumbnail {
  pageNumber: number;
  dataUrl: string;
  selected: boolean;
  viewport: ReturnType<PDFPageProxy['getViewport']>;
}

@Component({
  selector: 'app-pdf-to-img',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, FileDropDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="pdf-to-img">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div 
        appFileDrop 
        (fileDropped)="handleFileDrop($event)"
        class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700"
      >
         <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <span class="text-[10px] font-bold uppercase text-slate-500 truncate px-1">{{ t.map()['TITLE_SHORT'] }}</span>
            @if (pdfFile()) {
               <button (click)="reset()" class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-sm">close</span></button>
            }
         </div>
         
         <div class="flex-1 flex flex-col items-center justify-center p-2 text-center relative">
            @if (isProcessing()) {
               <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
               <span class="text-[10px] text-slate-400 mt-2">{{ t.map()['PROCESSING'] }}</span>
            } @else if (pdfFile()) {
               <span class="material-symbols-outlined text-3xl text-primary mb-1">image</span>
               <div class="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate w-full">{{ pdfFile()?.name }}</div>
               <div class="text-[9px] text-slate-500">{{ pages().length }} {{ t.map()['PAGES'] }}</div>
            } @else {
               <div (click)="triggerUpload()" class="cursor-pointer group flex flex-col items-center">
                  <span class="material-symbols-outlined text-2xl mb-1 text-slate-400 group-hover:text-primary transition-colors">upload_file</span>
                  <span class="text-[9px] font-bold uppercase leading-tight text-slate-500">{{ t.map()['DROP_EXPLICIT'] }}</span>
               </div>
            }
         </div>

         @if (pdfFile() && !isProcessing()) {
            <div class="p-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-1">
               <select [(ngModel)]="outputFormat" class="text-[10px] border rounded bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white">
                  <option value="png">PNG</option>
                  <option value="jpeg">JPG</option>
                  <option value="webp">WebP</option>
               </select>
               <button (click)="downloadSelected()" class="bg-primary text-white rounded text-[10px] font-bold hover:opacity-90">
                  Download
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
               <span class="material-symbols-outlined text-5xl text-slate-300 mb-4 group-hover:scale-110 transition-transform">image</span>
               <h3 class="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{{ t.map()['SELECT_FILE'] }}</h3>
               <p class="text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
            </div>
         } @else {
            
            <!-- Toolbar -->
            <div class="flex flex-wrap gap-4 justify-between items-center mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
               <div class="flex items-center gap-4">
                  <div class="flex flex-col">
                     <span class="text-sm font-bold text-slate-900 dark:text-white">{{ pdfFile()?.name }}</span>
                     <span class="text-xs text-slate-500">{{ pages().length }} {{ t.map()['PAGES'] }} • {{ selectedCount() }} {{ t.map()['SELECTED'] }}</span>
                  </div>
               </div>

               <div class="flex items-center gap-3">
                  <div class="flex flex-col gap-1">
                     <label class="text-[10px] font-bold uppercase text-slate-500">{{ t.map()['FORMAT_LABEL'] }}</label>
                     <div class="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        <button (click)="outputFormat.set('jpeg')" [class.bg-white]="outputFormat() === 'jpeg'" [class.shadow-sm]="outputFormat() === 'jpeg'" [class.text-primary]="outputFormat() === 'jpeg'" class="px-3 py-1 rounded text-xs font-bold transition-all">JPG</button>
                        <button (click)="outputFormat.set('png')" [class.bg-white]="outputFormat() === 'png'" [class.shadow-sm]="outputFormat() === 'png'" [class.text-primary]="outputFormat() === 'png'" class="px-3 py-1 rounded text-xs font-bold transition-all">PNG</button>
                        <button (click)="outputFormat.set('webp')" [class.bg-white]="outputFormat() === 'webp'" [class.shadow-sm]="outputFormat() === 'webp'" [class.text-primary]="outputFormat() === 'webp'" class="px-3 py-1 rounded text-xs font-bold transition-all">WebP</button>
                     </div>
                  </div>

                  <div class="flex flex-col gap-1">
                     <label class="text-[10px] font-bold uppercase text-slate-500">{{ t.map()['QUALITY_LABEL'] }}</label>
                     <select [(ngModel)]="scale" class="bg-slate-100 dark:bg-slate-700 border-none rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary">
                        <option [ngValue]="1">{{ t.map()['QUAL_SCREEN'] }}</option>
                        <option [ngValue]="2">{{ t.map()['QUAL_HIGH'] }}</option>
                        <option [ngValue]="3">{{ t.map()['QUAL_PRINT'] }}</option>
                     </select>
                  </div>

                  <div class="h-8 w-px bg-slate-200 dark:bg-slate-600 mx-2"></div>

                  <button (click)="downloadSelected()" [disabled]="selectedCount() === 0 || isProcessing()" class="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                     @if (isProcessing()) {
                        <span class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                     }
                     {{ selectedCount() > 1 ? t.map()['BTN_CONVERT'] : t.map()['BTN_CONVERT_SINGLE'] }}
                  </button>
               </div>
            </div>

            <!-- Selection Controls -->
            <div class="flex justify-between mb-4">
               <div class="flex gap-2">
                  <button (click)="toggleAll(true)" class="text-xs font-bold text-primary hover:underline">{{ t.map()['SELECT_ALL'] }}</button>
                  <span class="text-slate-300">|</span>
                  <button (click)="toggleAll(false)" class="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">{{ t.map()['DESELECT_ALL'] }}</button>
               </div>
               <button (click)="reset()" class="text-xs text-red-500 hover:underline">{{ t.map()['BTN_RESET'] }}</button>
            </div>

            <!-- Grid -->
            @if (isLoading()) {
               <div class="flex flex-col items-center justify-center py-20">
                  <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p class="text-slate-500 font-bold animate-pulse">{{ t.map()['PROCESSING'] }}</p>
               </div>
            } @else {
               <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  @for (page of pages(); track page.pageNumber) {
                     <div 
                        (click)="togglePage(page)"
                        class="relative group cursor-pointer transition-all duration-200"
                        [class.scale-95]="!page.selected"
                     >
                        <div class="aspect-[1/1.414] bg-white rounded-lg shadow-md overflow-hidden border-2 transition-colors"
                             [class.border-primary]="page.selected"
                             [class.border-transparent]="!page.selected"
                             [class.ring-4]="page.selected"
                             [class.ring-primary/10]="page.selected"
                        >
                           <img [src]="page.dataUrl" class="w-full h-full object-contain">
                           
                           <!-- Checkbox Overlay -->
                           <div class="absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                                [class.bg-primary]="page.selected"
                                [class.border-primary]="page.selected"
                                [class.bg-white]="!page.selected"
                                [class.border-slate-300]="!page.selected"
                           >
                              @if (page.selected) {
                                 <span class="material-symbols-outlined text-sm text-white">check</span>
                              }
                           </div>
                        </div>
                        <div class="text-center mt-2 text-xs font-bold text-slate-500">Page {{ page.pageNumber }}</div>
                     </div>
                  }
               </div>
            }
         }
      </div>
    </ng-template>
  `
})
export class PdfToImgComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<Record<string, unknown> | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  // State
  pdfFile = signal<File | null>(null);
  pages = signal<PageThumbnail[]>([]);
  
  isLoading = signal(false);
  isProcessing = signal(false);
  
  // Settings
  outputFormat = signal<'png' | 'jpeg' | 'webp'>('png');
  scale = signal<number>(2); // Default to High Quality (2x)

  viewMode = computed(() => 'default');

  selectedCount = computed(() => this.pages().filter(p => p.selected).length);

  // Keep reference to PDF document
  private pdfDoc: PDFDocumentProxy | null = null;

  triggerUpload() {
    this.fileInput()?.nativeElement.click();
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.loadFile(file);
    input.value = '';
  }

  handleFileDrop(files: FileList) {
    const file = files[0];
    if (file) this.loadFile(file);
  }

  async loadFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
       this.toast.show(this.t.get('ERR_INVALID'), 'error');
       return;
    }

    this.pdfFile.set(file);
    this.isLoading.set(true);
    this.pages.set([]);

    try {
       const arrayBuffer = await file.arrayBuffer();
       const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
       this.pdfDoc = await loadingTask.promise;
       
       const numPages = this.pdfDoc.numPages;
       const thumbnails: PageThumbnail[] = [];

       // Render thumbnails (Low Res)
       for (let i = 1; i <= numPages; i++) {
          const page = await this.pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 }); // Thumbnail scale
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
             canvasContext: context!,
             viewport: viewport
          }).promise;

          thumbnails.push({
             pageNumber: i,
             dataUrl: canvas.toDataURL('image/jpeg', 0.8),
             selected: true, // Select all by default
             viewport: page.getViewport({ scale: 1 }) // Store 1x viewport for later calculation
          });
       }

       this.pages.set(thumbnails);

    } catch (e) {
       console.error(e);
       this.toast.show(this.t.get('ERR_INVALID'), 'error');
       this.reset();
    } finally {
       this.isLoading.set(false);
    }
  }

  reset() {
     this.pdfFile.set(null);
     this.pages.set([]);
     this.pdfDoc = null;
  }

  togglePage(page: PageThumbnail) {
     const updated = this.pages().map(p => 
        p.pageNumber === page.pageNumber ? { ...p, selected: !p.selected } : p
     );
     this.pages.set(updated);
  }

  toggleAll(select: boolean) {
     const updated = this.pages().map(p => ({ ...p, selected: select }));
     this.pages.set(updated);
  }

  async downloadSelected() {
     const selected = this.pages().filter(p => p.selected);
     if (selected.length === 0) return;

     this.isProcessing.set(true);

     try {
        const zip = new JSZip();
        const folder = zip.folder('images');
        const format = this.outputFormat();
        const renderScale = this.scale();
        const baseName = this.pdfFile()?.name.replace('.pdf', '') || 'document';

        if (!this.pdfDoc) throw new Error('PDF Document not loaded');

        for (const p of selected) {
           const page = await this.pdfDoc.getPage(p.pageNumber);
           const viewport = page.getViewport({ scale: renderScale });
           
           const canvas = document.createElement('canvas');
           const context = canvas.getContext('2d');
           canvas.height = viewport.height;
           canvas.width = viewport.width;

           await page.render({
              canvasContext: context!,
              viewport: viewport
           }).promise;

           // Convert to blob
           const mime = `image/${format}`;
           const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, 0.9));
           
           if (blob) {
              if (selected.length === 1) {
                 // Single File Download
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `${baseName}-page-${p.pageNumber}.${format}`;
                 document.body.appendChild(a);
                 a.click();
                 document.body.removeChild(a);
                 URL.revokeObjectURL(url);
              } else {
                 // Add to Zip
                 folder?.file(`${baseName}-page-${p.pageNumber}.${format}`, blob);
              }
           }
        }

        if (selected.length > 1) {
           const content = await zip.generateAsync({ type: 'blob' });
           const url = URL.createObjectURL(content);
           const a = document.createElement('a');
           a.href = url;
           a.download = `${baseName}-images.zip`;
           document.body.appendChild(a);
           a.click();
           document.body.removeChild(a);
           URL.revokeObjectURL(url);
        }

        this.toast.show(this.t.get('SUCCESS'), 'success');

     } catch (e) {
        console.error(e);
        this.toast.show('Export failed', 'error');
     } finally {
        this.isProcessing.set(false);
     }
  }
}
