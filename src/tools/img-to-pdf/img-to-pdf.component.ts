
import { Component, inject, signal, input, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolLayoutComponent } from '../../components/tool-layout/tool-layout.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { FileDropDirective } from '../../directives/file-drop.directive';
import { ToastService } from '../../services/toast.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { PDFDocument, PageSizes } from 'pdf-lib';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-img-to-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, ActionBarComponent, FileDropDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="img-to-pdf">
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
            <div class="flex-1 flex flex-col items-center justify-center p-1 relative text-center">
               @if (images().length > 0) {
                  <div class="font-bold text-xs text-slate-700 dark:text-slate-200 mb-1">{{ images().length }} {{ t.map()['IMAGES_SHORT'] }}</div>
                  <button (click)="convert()" [disabled]="isProcessing()" class="w-full py-1 bg-primary text-white text-[9px] font-bold rounded">
                     {{ isProcessing() ? '...' : 'PDF' }}
                  </button>
                  <button (click)="reset()" class="absolute top-0 right-0 p-0.5 text-slate-400 hover:text-primary bg-white/80 dark:bg-slate-800/80 rounded-full">
                     <span class="material-symbols-outlined text-[10px]">close</span>
                  </button>
               } @else {
                  <div (click)="triggerUpload()" class="flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-primary transition-colors h-full w-full p-1">
                     <span class="material-symbols-outlined text-2xl mb-1">image</span>
                     <span class="text-[8px] font-bold uppercase leading-tight">{{ t.map()['DROP_EXPLICIT'] }}</span>
                  </div>
               }
            </div>
         }
         <!-- 2x1 Wide -->
         @else if (isSize(2, 1)) {
            <div class="h-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-2">
               <span class="text-[10px] font-bold uppercase text-slate-500">{{ t.map()['TITLE'] }}</span>
               @if (images().length > 0) {
                  <button (click)="reset()" class="text-[9px] text-slate-400 hover:text-primary uppercase font-bold">{{ t.map()['BTN_RESET'] }}</button>
               }
            </div>
            <div class="flex flex-1 overflow-hidden">
               <div class="w-1/2 p-2 border-r border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div (click)="triggerUpload()" class="cursor-pointer text-center group w-full h-full flex flex-col items-center justify-center">
                     <span class="material-symbols-outlined text-xl text-slate-400 group-hover:text-primary transition-colors mb-1">add_photo_alternate</span>
                     <div class="text-[9px] font-bold text-slate-500 leading-tight">{{ images().length }} {{ t.map()['IMAGES'] }}</div>
                  </div>
               </div>
               <div class="w-1/2 p-2 flex flex-col justify-center gap-1">
                  <button (click)="convert()" [disabled]="images().length < 1 || isProcessing()" class="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded hover:opacity-90 transition-colors disabled:opacity-50">
                     {{ t.map()['BTN_CONVERT_SHORT'] }}
                  </button>
               </div>
            </div>
         }
         <!-- Standard / Large -->
         @else {
            <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-primary/5 dark:bg-slate-900/50">
               <span class="text-xs font-bold uppercase text-primary px-1">{{ t.map()['TITLE'] }}</span>
               <div class="flex gap-1">
                  <button (click)="triggerUpload()" class="text-slate-400 hover:text-primary" title="Add">
                     <span class="material-symbols-outlined text-sm">add</span>
                  </button>
                  <button (click)="reset()" class="text-slate-400 hover:text-slate-600" title="Reset">
                     <span class="material-symbols-outlined text-sm">refresh</span>
                  </button>
               </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-2">
               @if (images().length === 0) {
                  <div (click)="triggerUpload()" class="h-full flex flex-col items-center justify-center text-slate-400 cursor-pointer min-h-[60px] text-center p-4 group">
                     <span class="material-symbols-outlined text-2xl mb-2 group-hover:scale-110 transition-transform group-hover:text-primary">add_photo_alternate</span>
                     <span class="text-[10px] uppercase font-bold">{{ t.map()['DROP_EXPLICIT'] }}</span>
                  </div>
               } @else {
                  <div class="grid grid-cols-3 gap-1">
                     @for (img of images(); track img.id) {
                        <div class="aspect-square bg-slate-100 dark:bg-slate-700 rounded overflow-hidden relative group">
                           <img [src]="img.previewUrl" class="w-full h-full object-cover">
                           <button (click)="removeImage(img.id)" class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <span class="material-symbols-outlined text-sm">close</span>
                           </button>
                        </div>
                     }
                     <button (click)="triggerUpload()" class="aspect-square bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors">
                        <span class="material-symbols-outlined">add</span>
                     </button>
                  </div>
               }
            </div>

            @if (images().length > 0) {
               <div class="p-2 border-t border-slate-100 dark:border-slate-700">
                  <button (click)="convert()" [disabled]="isProcessing()" class="w-full py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors">
                     {{ isProcessing() ? '...' : t.map()['BTN_CONVERT'] }}
                  </button>
               </div>
            }
         }
      </div>
    }

    <input #fileInput type="file" accept="image/png, image/jpeg, image/webp" multiple class="hidden" (change)="handleFileSelect($event)">

    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 min-h-[400px] flex flex-col">
        
        <!-- Controls -->
        <div class="flex flex-wrap gap-4 justify-between items-center mb-6">
           <div class="flex items-center gap-4">
              <button (click)="triggerUpload()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                 <span class="material-symbols-outlined">add_photo_alternate</span>
                 {{ t.map()['ADD_IMAGES'] }}
              </button>
              
              <div class="flex items-center gap-2">
                 <label class="text-sm font-bold text-slate-500">{{ t.map()['PAGE_SIZE'] }}</label>
                 <select [(ngModel)]="pageSize" class="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-primary">
                    <option value="fit">{{ t.map()['SIZE_FIT'] }}</option>
                    <option value="a4">{{ t.map()['SIZE_A4'] }}</option>
                    <option value="letter">{{ t.map()['SIZE_LETTER'] }}</option>
                 </select>
              </div>
           </div>
           
           @if (images().length > 0) {
              <div class="flex gap-2">
                 <button (click)="reset()" class="px-4 py-2 text-slate-500 hover:text-red-500 transition-colors">
                    {{ t.map()['BTN_RESET'] }}
                 </button>
                 <button (click)="convert()" [disabled]="isProcessing()" class="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-colors shadow-sm flex items-center gap-2">
                    @if (isProcessing()) {
                       <span class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                    } @else {
                       <span class="material-symbols-outlined">picture_as_pdf</span>
                    }
                    {{ t.map()['BTN_CONVERT'] }}
                 </button>
              </div>
           }
        </div>

        <!-- Drop Zone / Grid -->
        <div 
           appFileDrop 
           (fileDropped)="handleFileDrop($event)"
           class="flex-1 border-2 border-dashed rounded-xl transition-all relative min-h-[300px] p-4"
           [class.border-slate-200]="images().length > 0"
           [class.dark:border-slate-700]="images().length > 0"
           [class.border-slate-300]="images().length === 0"
           [class.dark:border-slate-600]="images().length === 0"
        >
           @if (images().length === 0) {
              <div (click)="triggerUpload()" class="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                 <span class="material-symbols-outlined text-5xl text-slate-300 mb-4">image</span>
                 <p class="text-slate-500">{{ t.map()['DROP_LABEL'] }}</p>
              </div>
           } @else {
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                 @for (img of images(); track img.id; let i = $index) {
                    <div class="aspect-[3/4] bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden relative group border border-slate-200 dark:border-slate-600 shadow-sm cursor-grab active:cursor-grabbing">
                       <img [src]="img.previewUrl" class="w-full h-full object-cover">
                       <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <button (click)="removeImage(img.id)" class="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg">
                             <span class="material-symbols-outlined text-lg">delete</span>
                          </button>
                          <div class="flex gap-1">
                             <button (click)="move(i, -1)" *ngIf="i > 0" class="p-1 bg-white/20 text-white rounded hover:bg-white/40"><span class="material-symbols-outlined">arrow_back</span></button>
                             <button (click)="move(i, 1)" *ngIf="i < images().length - 1" class="p-1 bg-white/20 text-white rounded hover:bg-white/40"><span class="material-symbols-outlined">arrow_forward</span></button>
                          </div>
                       </div>
                       <span class="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{{ i + 1 }}</span>
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
                 filename="images.pdf"
                 mimeType="application/pdf"
                 source="Images to PDF"
              ></app-action-bar>
           </div>
        }
      </div>
    </ng-template>
  `
})
export class ImgToPdfComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<any>(null); // Added this
  
  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  images = signal<ImageFile[]>([]);
  pageSize = signal<'fit' | 'a4' | 'letter'>('a4');
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
    const newImgs: ImageFile[] = [];
    for (let i = 0; i < list.length; i++) {
       const file = list[i];
       if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          newImgs.push({ id: crypto.randomUUID(), file, previewUrl: url });
       }
    }
    
    if (newImgs.length === 0) {
       this.toast.show(this.t.get('ERR_INVALID'), 'error');
       return;
    }

    this.images.update(current => [...current, ...newImgs]);
    this.resultUrl.set(null);
  }

  removeImage(id: string) {
     const img = this.images().find(i => i.id === id);
     if (img) URL.revokeObjectURL(img.previewUrl); // Cleanup
     
     this.images.update(current => current.filter(i => i.id !== id));
     this.resultUrl.set(null);
  }

  move(index: number, delta: number) {
     this.images.update(current => {
        const newArr = [...current];
        const item = newArr[index];
        newArr.splice(index, 1);
        newArr.splice(index + delta, 0, item);
        return newArr;
     });
     this.resultUrl.set(null);
  }

  reset() {
     this.images().forEach(i => URL.revokeObjectURL(i.previewUrl));
     this.images.set([]);
     this.resultUrl.set(null);
     this.resultBytes.set(null);
  }

  async convert() {
     if (this.images().length === 0) return;

     this.isProcessing.set(true);

     try {
        const pdfDoc = await PDFDocument.create();
        
        for (const img of this.images()) {
           const buffer = await img.file.arrayBuffer();
           let embeddedImage;
           
           if (img.file.type === 'image/jpeg') {
              embeddedImage = await pdfDoc.embedJpg(buffer);
           } else if (img.file.type === 'image/png') {
              embeddedImage = await pdfDoc.embedPng(buffer);
           } else {
              try {
                 embeddedImage = await pdfDoc.embedPng(buffer);
              } catch {
                 console.warn('Skipping unsupported image', img.file.name);
                 continue;
              }
           }

           const imgDims = embeddedImage.scale(1);
           const sizeMode = this.pageSize();
           
           let pageWidth, pageHeight;
           
           if (sizeMode === 'fit') {
              pageWidth = imgDims.width;
              pageHeight = imgDims.height;
           } else if (sizeMode === 'a4') {
              [pageWidth, pageHeight] = PageSizes.A4;
           } else {
              [pageWidth, pageHeight] = PageSizes.Letter;
           }

           const page = pdfDoc.addPage([pageWidth, pageHeight]);
           
           if (sizeMode === 'fit') {
              page.drawImage(embeddedImage, { x: 0, y: 0, width: imgDims.width, height: imgDims.height });
           } else {
              const margin = 20;
              const maxWidth = pageWidth - (margin * 2);
              const maxHeight = pageHeight - (margin * 2);
              
              const scale = Math.min(maxWidth / imgDims.width, maxHeight / imgDims.height);
              const w = imgDims.width * scale;
              const h = imgDims.height * scale;
              
              page.drawImage(embeddedImage, {
                 x: (pageWidth - w) / 2,
                 y: (pageHeight - h) / 2,
                 width: w,
                 height: h
              });
           }
        }

        const bytes = await pdfDoc.save();
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
        this.toast.show('Conversion failed', 'error');
     } finally {
        this.isProcessing.set(false);
     }
  }

  downloadResult() {
     const url = this.resultUrl();
     if (!url) return;
     const a = document.createElement('a');
     a.href = url;
     a.download = 'converted-images.pdf';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  }
}
