import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toJpeg } from 'html-to-image';

@Component({
  selector: 'app-preview-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-8 gap-8">
      
      <!-- Controls -->
      <div class="fixed top-4 right-4 bg-white/10 backdrop-blur p-4 rounded-xl border border-white/20 text-white shadow-2xl z-50">
        <h2 class="font-bold mb-2">Banner Generator</h2>
        <button (click)="downloadBanner()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer">
          <span class="material-symbols-outlined">download</span>
          Save as JPG
        </button>
      </div>

      <!-- The Canvas (1200x630) -->
      <div #bannerContainer class="relative w-[1200px] h-[630px] bg-slate-900 text-white overflow-hidden shadow-2xl flex flex-col items-center justify-center shrink-0">
        
        <!-- Decoration: Background Gradient Mesh -->
        <div class="absolute top-0 left-0 w-full h-full opacity-30">
          <div class="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px]"></div>
          <div class="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-violet-600 rounded-full blur-[150px]"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10 text-center flex flex-col items-center">
          
          <!-- Real Logo -->
          <div class="w-32 h-32 rounded-3xl shadow-2xl mb-6 overflow-hidden bg-white flex items-center justify-center">
             <img src="assets/images/logo_utildex_128.jpeg" class="w-full h-full object-cover">
          </div>

          <!-- Title -->
          <h1 class="text-9xl font-black tracking-tighter mb-4 text-white drop-shadow-xl relative z-10">
            Utildex
          </h1>

          <!-- Visual Decoration: Floating Elements -->
          <div class="absolute w-full h-full pointer-events-none">
             <!-- Left Side -->
             <div class="absolute top-1/2 -left-32 -translate-y-1/2 w-24 h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center transform -rotate-12 shadow-2xl">
               <span class="material-symbols-outlined text-5xl text-blue-300">picture_as_pdf</span>
             </div>
             <div class="absolute bottom-0 -left-16 w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center transform rotate-6 shadow-2xl">
               <span class="material-symbols-outlined text-4xl text-emerald-300">image</span>
             </div>

             <!-- Right Side -->
             <div class="absolute top-1/2 -right-32 -translate-y-1/2 w-24 h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center transform rotate-12 shadow-2xl">
               <span class="material-symbols-outlined text-5xl text-violet-300">terminal</span>
             </div>
             <div class="absolute bottom-0 -right-16 w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center transform -rotate-6 shadow-2xl">
               <span class="material-symbols-outlined text-4xl text-amber-300">qr_code</span>
             </div>
          </div>

        </div>

        <!-- App UI Mockup (Bottom Hint) -->
        <div class="absolute -bottom-40 w-[900px] h-[400px] bg-slate-950 rounded-t-3xl border-t border-l border-r border-slate-700/50 shadow-2xl opacity-80 backdrop-blur-xl transform rotate-x-12 perspective-1000">
             <!-- Mock Header -->
             <div class="h-12 border-b border-slate-800 flex items-center px-4 gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
             </div>
        </div>

      </div>

      <p class="text-neutral-500 font-mono text-sm">Preview Mode: Only visible in development</p>
    </div>
  `
})
export class PreviewBannerComponent {
  @ViewChild('bannerContainer') banner!: ElementRef;

  async downloadBanner() {
    if (!this.banner) return;
    
    try {
      // 1. Generate JPEG
      const dataUrl = await toJpeg(this.banner.nativeElement, { 
        quality: 0.95,
        width: 1200,
        height: 630
      });

      // 2. Download
      const link = document.createElement('a');
      link.download = 'preview-banner.jpg';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Could not generate banner', err);
      alert('Error generating banner. Check console.');
    }
  }
}
