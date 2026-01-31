
import { Component, inject, signal, computed, input, ElementRef, viewChild } from '@angular/core';
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

type ImageStatus = 'pending' | 'converting' | 'done' | 'error';

interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
  status: ImageStatus;
  resultBlob?: Blob;
  resultUrl?: string;
  resultSize?: number;
}

@Component({
  selector: 'app-image-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolLayoutComponent, FileDropDirective],
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!isWidget()) {
      <app-tool-layout toolId="image-converter">
        <ng-container *ngTemplateOutlet="mainContent"></ng-container>
      </app-tool-layout>
    } @else {
      <!-- Widget Mode -->
      <div 
        appFileDrop 
        (fileDropped)="handleFileDrop($event)"
        class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700"
      >
         <!-- 1x1 -->
         @if (isSize(1, 1)) {
            <div class="h-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-center">
               <span class="text-[9px] font-bold uppercase text-slate-500 truncate px-1">{{ t.map()['TITLE_SHORT'] }}</span>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center p-1 relative text-center">
               @if (isDone()) {
                  <button (click)="downloadZip()" class="w-full h-full flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                     <span class="material-symbols-outlined text-xl">download</span>
                     <span class="text-[9px] font-bold uppercase">ZIP</span>
                  </button>
                  <button (click)="reset()" class="absolute top-0 right-0 p-0.5 text-slate-400 hover:text-slate-600 z-10"><span class="material-symbols-outlined text-[10px]">close</span></button>
               } @else if (images().length > 0) {
                  <div class="text-[10px] font-bold mb-1">{{ images().length }} {{ t.map()['FILES'] }}</div>
                  <button (click)="convertAll()" [disabled]="isProcessing()" class="w-full py-1 bg-primary text-white text-[9px] font-bold rounded">
                     {{ isProcessing() ? '...' : t.map()['BTN_CONVERT_SHORT'] }}
                  </button>
               } @else {
                  <div (click)="triggerUpload()" class="cursor-pointer flex flex-col items-center justify-center h-full w-full">
                     <span class="material-symbols-outlined text-2xl text-slate-400">photo_library</span>
                  </div>
               }
            </div>
         } 
         <!-- Standard -->
         @else {
            <div class="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-700 bg-primary/5 dark:bg-slate-900/50">
               <span class="text-xs font-bold uppercase text-primary px-1">{{ t.map()['TITLE'] }}</span>
               <button (click)="reset()" *ngIf="images().length" class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-sm">refresh</span></button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-2">
               @if (images().length === 0) {
                  <div (click)="triggerUpload()" class="h-full flex flex-col items-center justify-center text-slate-400 cursor-pointer p-4 group">
                     <span class="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform group-hover:text-primary">add_photo_alternate</span>
                     <span class="text-[10px] uppercase font-bold">{{ t.map()['DROP_EXPLICIT'] }}</span>
                  </div>
               } @else {
                  <div class="grid grid-cols-3 gap-1">
                     @for (img of images(); track img.id) {
                        <div class="aspect-square bg-slate-100 dark:bg-slate-700 rounded overflow-hidden relative">
                           <img [src]="img.previewUrl" class="w-full h-full object-cover">
                           @if (img.status === 'done') {
                              <div class="absolute inset-0 bg-green-500/50 flex items-center justify-center text-white"><span class="material-symbols-outlined text-sm">check</span></div>
                           }
                        </div>
                     }
                  </div>
               }
            </div>

            @if (images().length > 0) {
               <div class="p-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-1">
                  <select [(ngModel)]="targetFormat" class="text-[10px] border rounded bg-slate-50 dark:bg-slate-900 dark:text-white">
                     <option value="image/jpeg">JPG</option>
                     <option value="image/png">PNG</option>
                     <option value="image/webp">WebP</option>
                  </select>
                  @if (isDone()) {
                     <button (click)="downloadZip()" class="bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700">ZIP</button>
                  } @else {
                     <button (click)="convertAll()" [disabled]="isProcessing()" class="bg-primary text-white rounded text-[10px] font-bold hover:opacity-90">
                        {{ isProcessing() ? '...' : t.map()['BTN_CONVERT'] }}
                     </button>
                  }
               </div>
            }
         }
      </div>
    }

    <input #fileInput type="file" accept="image/*,.heic" multiple class="hidden" (change)="handleFileSelect($event)">

    <ng-template #mainContent>
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8 min-h-[500px] flex flex-col">
         
         <!-- Toolbar -->
         <div class="flex flex-wrap gap-4 justify-between items-center mb-6">
            <div class="flex gap-4 items-center">
               <button (click)="triggerUpload()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                  <span class="material-symbols-outlined">add_photo_alternate</span>
                  {{ t.map()['BTN_ADD'] }}
               </button>
               
               @if (images().length > 0) {
                  <div class="h-8 w-px bg-slate-200 dark:bg-slate-600"></div>
                  
                  <div class="flex items-center gap-2">
                     <span class="text-xs font-bold text-slate-500 uppercase">{{ t.map()['FMT_LABEL'] }}</span>
                     <select [(ngModel)]="targetFormat" class="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-primary">
                        <option value="image/jpeg">JPG</option>
                        <option value="image/png">PNG</option>
                        <option value="image/webp">WebP</option>
                     </select>
                  </div>

                  @if (targetFormat() !== 'image/png') {
                     <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-slate-500 uppercase">{{ t.map()['QUAL_LABEL'] }}</span>
                        <input type="range" [(ngModel)]="quality" min="0.1" max="1" step="0.1" class="w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                        <span class="text-xs font-mono w-8">{{ (quality() * 100).toFixed(0) }}%</span>
                     </div>
                  }
               }
            </div>

            @if (images().length > 0) {
               <div class="flex gap-2">
                  <button (click)="reset()" class="px-4 py-2 text-slate-500 hover:text-red-500 transition-colors">
                     {{ t.map()['BTN_RESET'] }}
                  </button>
                  
                  @if (isDone()) {
                     <button (click)="downloadZip()" class="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
                        <span class="material-symbols-outlined">archive</span>
                        {{ t.map()['BTN_DOWNLOAD_ZIP'] }}
                     </button>
                  } @else {
                     <button (click)="convertAll()" [disabled]="isProcessing()" class="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-colors shadow-sm flex items-center gap-2">
                        @if (isProcessing()) {
                           <span class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                        } @else {
                           <span class="material-symbols-outlined">transform</span>
                        }
                        {{ t.map()['BTN_CONVERT'] }}
                     </button>
                  }
               </div>
            }
         </div>

         <!-- Grid -->
         <div 
            appFileDrop 
            (fileDropped)="handleFileDrop($event)"
            class="flex-1 border-2 border-dashed rounded-xl transition-all relative min-h-[300px] p-4 bg-slate-50/50 dark:bg-slate-900/20"
            [class.border-slate-200]="images().length > 0"
            [class.dark:border-slate-700]="images().length > 0"
            [class.border-slate-300]="images().length === 0"
            [class.dark:border-slate-600]="images().length === 0"
         >
            @if (images().length === 0) {
               <div (click)="triggerUpload()" class="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span class="material-symbols-outlined text-6xl text-slate-300 mb-4">photo_library</span>
                  <p class="text-slate-500 font-medium">{{ t.map()['DROP_LABEL'] }}</p>
               </div>
            } @else {
               <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  @for (img of images(); track img.id) {
                     <div class="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative group flex flex-col">
                        <div class="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-700">
                           <img [src]="img.previewUrl" class="w-full h-full object-cover">
                           
                           <!-- Overlay Status -->
                           <div class="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity" 
                                [class.opacity-0]="img.status === 'pending' && !isProcessing()" 
                                [class.group-hover:opacity-100]="img.status === 'pending'">
                              
                              @if (img.status === 'pending') {
                                 <button (click)="removeImage(img.id)" class="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                    <span class="material-symbols-outlined">delete</span>
                                 </button>
                              } @else if (img.status === 'converting') {
                                 <span class="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                              } @else if (img.status === 'done') {
                                 <div class="flex flex-col items-center">
                                    <span class="material-symbols-outlined text-4xl text-green-400 drop-shadow-md mb-2">check_circle</span>
                                    <button (click)="downloadSingle(img)" class="px-3 py-1 bg-white text-slate-900 rounded-full text-xs font-bold hover:bg-slate-100">Download</button>
                                 </div>
                              } @else if (img.status === 'error') {
                                 <span class="material-symbols-outlined text-4xl text-red-500">error</span>
                              }
                           </div>
                        </div>
                        
                        <div class="p-2 text-center border-t border-slate-100 dark:border-slate-700">
                           <div class="text-xs font-bold truncate text-slate-700 dark:text-slate-200">{{ img.file.name }}</div>
                           <div class="text-[10px] text-slate-500 flex justify-between px-1">
                              <span>{{ formatBytes(img.file.size) }}</span>
                              @if (img.resultSize) {
                                 <span class="text-green-600 font-bold">{{ formatBytes(img.resultSize) }}</span>
                              }
                           </div>
                        </div>
                     </div>
                  }
               </div>
            }
         </div>
      </div>
    </ng-template>
  `
})
export class ImageConverterComponent {
  isWidget = input<boolean>(false);
  widgetConfig = input<{ cols?: number; rows?: number } | null>(null);

  t = inject(ScopedTranslationService);
  toast = inject(ToastService);
  fileInput = viewChild<ElementRef>('fileInput');

  images = signal<QueuedImage[]>([]);
  targetFormat = signal<string>('image/jpeg');
  quality = signal<number>(0.8);
  isProcessing = signal(false);

  isDone = computed(() => this.images().length > 0 && this.images().every(i => i.status === 'done' || i.status === 'error'));

  isSize(w: number, h: number): boolean {
     const cfg = this.widgetConfig();
     return cfg && cfg.cols === w && cfg.rows === h;
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
    const newImgs: QueuedImage[] = [];
    for (let i = 0; i < list.length; i++) {
       const file = list[i];
       // Basic support check
       if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')) {
          newImgs.push({
             id: crypto.randomUUID(),
             file,
             previewUrl: URL.createObjectURL(file),
             status: 'pending'
          });
       }
    }
    
    if (newImgs.length > 0) {
       this.images.update(curr => [...curr, ...newImgs]);
    }
  }

  removeImage(id: string) {
     const img = this.images().find(i => i.id === id);
     if (img) {
        URL.revokeObjectURL(img.previewUrl);
        if (img.resultUrl) URL.revokeObjectURL(img.resultUrl);
     }
     this.images.update(curr => curr.filter(i => i.id !== id));
  }

  reset() {
     this.images().forEach(i => {
        URL.revokeObjectURL(i.previewUrl);
        if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
     });
     this.images.set([]);
     this.isProcessing.set(false);
  }

  async convertAll() {
     if (this.isProcessing() || this.images().length === 0) return;
     
     this.isProcessing.set(true);
     const format = this.targetFormat();
     const qual = this.quality();

     // Load libraries lazily
     // Note: We use dynamic import for heic2any only if needed
     let heicLib: ((options: { blob: Blob; toType: string }) => Promise<Blob | Blob[]>) | null = null;
     const needsHeic = this.images().some(i => i.file.name.toLowerCase().endsWith('.heic'));
     
     if (needsHeic) {
        try {
           const module = await import('heic2any');
           heicLib = module.default;
        } catch (e) {
           console.error('Failed to load heic2any', e);
           this.toast.show(this.t.get('ERR_HEIC'), 'error');
           this.isProcessing.set(false);
           return;
        }
     }

     // Process sequentially to avoid freezing UI too much
     const queue = this.images();
     
     for (const img of queue) {
        if (img.status === 'done') continue;

        this.updateStatus(img.id, 'converting');
        
        try {
           let sourceBlob: Blob = img.file;

           // Handle HEIC
           if (img.file.name.toLowerCase().endsWith('.heic')) {
              if (!heicLib) throw new Error('HEIC lib not loaded');
              const convertedBlob = await heicLib({ blob: img.file, toType: 'image/jpeg' });
              // heic2any can return Blob or Blob[], handle both
              sourceBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
           }

           // Convert via Canvas
           const resultBlob = await this.processImage(sourceBlob, format, qual);
           const resultUrl = URL.createObjectURL(resultBlob);
           
           this.images.update(curr => curr.map(i => 
              i.id === img.id ? { ...i, status: 'done', resultBlob, resultUrl, resultSize: resultBlob.size } : i
           ));

        } catch (e) {
           console.error(e);
           this.updateStatus(img.id, 'error');
        }
     }

     this.isProcessing.set(false);
     this.toast.show(this.t.get('SUCCESS_MSG'), 'success');
  }

  updateStatus(id: string, status: ImageStatus) {
     this.images.update(curr => curr.map(i => i.id === id ? { ...i, status } : i));
  }

  private processImage(file: Blob, format: string, quality: number): Promise<Blob> {
     return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
           const canvas = document.createElement('canvas');
           canvas.width = img.width;
           canvas.height = img.height;
           const ctx = canvas.getContext('2d');
           if (!ctx) { reject('No context'); return; }
           
           // Draw
           ctx.drawImage(img, 0, 0);
           
           // Export
           canvas.toBlob(blob => {
              if (blob) resolve(blob);
              else reject('Canvas export failed');
           }, format, quality);
           
           // Cleanup
           URL.revokeObjectURL(img.src);
        };
        img.onerror = (e) => reject(e);
        img.src = URL.createObjectURL(file);
     });
  }

  async downloadZip() {
     const files = this.images().filter(i => i.status === 'done' && i.resultBlob);
     if (files.length === 0) return;

     try {
        const module = await import('jszip');
        const JSZip = module.default;
        const zip = new JSZip();
        
        const ext = this.targetFormat().split('/')[1];

        files.forEach((img, idx) => {
           const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || `image-${idx}`;
           zip.file(`${name}.${ext}`, img.resultBlob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted-images.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

     } catch (e) {
        console.error(e);
        this.toast.show('Failed to create ZIP', 'error');
     }
  }

  downloadSingle(img: QueuedImage) {
     if (!img.resultUrl) return;
     const ext = this.targetFormat().split('/')[1];
     const name = img.file.name.substring(0, img.file.name.lastIndexOf('.')) || 'image';
     
     const a = document.createElement('a');
     a.href = img.resultUrl;
     a.download = `${name}.${ext}`;
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
