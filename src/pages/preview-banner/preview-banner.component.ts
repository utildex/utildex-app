import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toJpeg } from 'html-to-image';

@Component({
  selector: 'app-preview-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-900 p-8">
      <!-- Controls -->
      <div
        class="fixed top-4 right-4 z-50 rounded-xl border border-white/20 bg-white/10 p-4 text-white shadow-2xl backdrop-blur"
      >
        <h2 class="mb-2 font-bold">Banner Generator</h2>
        <button
          (click)="downloadBanner()"
          class="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500"
        >
          <span class="material-symbols-outlined">download</span>
          Save as JPG
        </button>
      </div>

      <!-- The Canvas (1200x630) -->
      <div
        #bannerContainer
        class="relative flex h-[630px] w-[1200px] shrink-0 flex-col items-center justify-center overflow-hidden bg-slate-900 text-white shadow-2xl"
      >
        <!-- Decoration: Background Gradient Mesh -->
        <div class="absolute top-0 left-0 h-full w-full opacity-30">
          <div
            class="absolute top-[-100px] left-[-100px] h-[600px] w-[600px] rounded-full bg-blue-600 blur-[150px]"
          ></div>
          <div
            class="absolute right-[-100px] bottom-[-100px] h-[600px] w-[600px] rounded-full bg-violet-600 blur-[150px]"
          ></div>
        </div>

        <!-- Content -->
        <div class="relative z-10 flex flex-col items-center text-center">
          <!-- Real Logo -->
          <div
            class="mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <img src="assets/images/logo_utildex_128.jpeg" class="h-full w-full object-cover" />
          </div>

          <!-- Title -->
          <h1
            class="relative z-10 mb-4 text-9xl font-black tracking-tighter text-white drop-shadow-xl"
          >
            Utildex
          </h1>

          <!-- Visual Decoration: Floating Elements -->
          <div class="pointer-events-none absolute h-full w-full">
            <!-- Left Side -->
            <div
              class="absolute top-1/2 -left-32 flex h-24 w-24 -translate-y-1/2 -rotate-12 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
            >
              <span class="material-symbols-outlined text-5xl text-blue-300">picture_as_pdf</span>
            </div>
            <div
              class="absolute bottom-0 -left-16 flex h-20 w-20 rotate-6 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
            >
              <span class="material-symbols-outlined text-4xl text-emerald-300">image</span>
            </div>

            <!-- Right Side -->
            <div
              class="absolute top-1/2 -right-32 flex h-24 w-24 -translate-y-1/2 rotate-12 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
            >
              <span class="material-symbols-outlined text-5xl text-violet-300">terminal</span>
            </div>
            <div
              class="absolute -right-16 bottom-0 flex h-20 w-20 -rotate-6 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
            >
              <span class="material-symbols-outlined text-4xl text-amber-300">qr_code</span>
            </div>
          </div>
        </div>

        <!-- App UI Mockup (Bottom Hint) -->
        <div
          class="perspective-1000 absolute -bottom-40 h-[400px] w-[900px] rotate-x-12 transform rounded-t-3xl border-t border-r border-l border-slate-700/50 bg-slate-950 opacity-80 shadow-2xl backdrop-blur-xl"
        >
          <!-- Mock Header -->
          <div class="flex h-12 items-center gap-2 border-b border-slate-800 px-4">
            <div class="h-3 w-3 rounded-full bg-red-500"></div>
            <div class="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div class="h-3 w-3 rounded-full bg-green-500"></div>
          </div>
        </div>
      </div>

      <p class="font-mono text-sm text-neutral-500">Preview Mode: Only visible in development</p>
    </div>
  `,
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
        height: 630,
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
