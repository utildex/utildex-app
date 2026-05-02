import { Component, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toJpeg, toPng } from 'html-to-image';

type Mode = 'utildex' | 'synedex' | 'synedex-logo';

@Component({
  selector: 'app-preview-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <style>
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 900;
        src: url('/assets/fonts/inter/inter-latin-700-normal.woff2') format('woff2');
      }
    </style>
    <div class="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-900 p-8">
      <!-- Controls -->
      <div
        class="fixed top-4 right-4 z-50 flex flex-col gap-4 rounded-xl border border-white/20 bg-white/10 p-4 text-white shadow-2xl backdrop-blur"
      >
        <h2 class="font-bold">Generator Modes</h2>
        <div class="flex gap-2">
          <button
            (click)="mode.set('utildex')"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            [class.bg-blue-600]="mode() === 'utildex'"
            [class.bg-white]="mode() !== 'utildex'"
            [class.text-white]="mode() === 'utildex'"
            [class.text-slate-900]="mode() !== 'utildex'"
          >
            Utildex Banner
          </button>
          <button
            (click)="mode.set('synedex')"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            [class.bg-teal-600]="mode() === 'synedex'"
            [class.bg-white]="mode() !== 'synedex'"
            [class.text-white]="mode() === 'synedex'"
            [class.text-slate-900]="mode() !== 'synedex'"
          >
            Synedex Banner
          </button>
          <button
            (click)="mode.set('synedex-logo')"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            [class.bg-emerald-600]="mode() === 'synedex-logo'"
            [class.bg-white]="mode() !== 'synedex-logo'"
            [class.text-white]="mode() === 'synedex-logo'"
            [class.text-slate-900]="mode() !== 'synedex-logo'"
          >
            Synedex Logo
          </button>
        </div>

        <button
          (click)="downloadBanner()"
          class="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-500"
        >
          <span class="material-symbols-outlined">download</span>
          Save as {{ mode() === 'synedex-logo' ? 'PNG' : 'JPG' }}
        </button>
      </div>

      <!-- BANNER CANVAS (1200x630) -->
      @if (mode() === 'utildex' || mode() === 'synedex') {
        <div
          #bannerContainer
          class="relative flex h-[630px] w-[1200px] shrink-0 flex-col items-center justify-center overflow-hidden text-white shadow-2xl"
          [class.bg-slate-900]="mode() === 'utildex'"
          [class.bg-slate-950]="mode() === 'synedex'"
        >
          <!-- Decoration: Background Gradient Mesh -->
          <div class="absolute top-0 left-0 h-full w-full opacity-30">
            <div
              class="absolute top-[-100px] left-[-100px] h-[600px] w-[600px] rounded-full blur-[150px]"
              [class.bg-blue-600]="mode() === 'utildex'"
              [class.bg-teal-600]="mode() === 'synedex'"
            ></div>
            <div
              class="absolute right-[-100px] bottom-[-100px] h-[600px] w-[600px] rounded-full blur-[150px]"
              [class.bg-violet-600]="mode() === 'utildex'"
              [class.bg-emerald-600]="mode() === 'synedex'"
            ></div>
          </div>

          <!-- Content -->
          <div class="relative z-10 flex flex-col items-center text-center">
            <!-- Logo -->
            <div
              class="mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              @if (mode() === 'utildex') {
                <img src="/assets/images/logo_utildex_128.jpeg" class="h-full w-full object-cover" crossorigin="anonymous" />
              } @else {
                <div class="p-4 w-full h-full flex items-center justify-center">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-full w-full drop-shadow-sm">
                    <rect x="0" y="0" width="28" height="28" rx="8" fill="#22d3ee" />
                    <rect x="36" y="0" width="28" height="28" rx="8" fill="#2dd4bf" />
                    <rect x="72" y="0" width="28" height="28" rx="8" fill="#34d399" />
                    <rect x="0" y="36" width="28" height="28" rx="8" fill="#38bdf8" />
                    <rect x="36" y="36" width="28" height="28" rx="8" fill="#818cf8" />
                    <circle cx="86" cy="50" r="13" stroke="#0f172a" stroke-width="8" />
                    <rect x="0" y="72" width="28" height="28" rx="8" fill="#60a5fa" />
                    <rect x="36" y="72" width="28" height="28" rx="8" fill="#a78bfa" />
                    <rect x="72" y="72" width="28" height="28" rx="8" fill="#a3e635" />
                  </svg>
                </div>
              }
            </div>

            <!-- Title -->
            <h1
              class="relative z-10 mb-4 text-9xl font-black tracking-tighter text-white drop-shadow-xl font-utx-sans"
            >
              {{ mode() === 'utildex' ? 'Utildex' : 'Synedex' }}
            </h1>

            <!-- Visual Decoration: Floating Elements -->
            <div class="pointer-events-none absolute h-full w-full">
              <!-- Left Side -->
              <div
                class="absolute top-1/2 -left-32 flex h-24 w-24 -translate-y-1/2 -rotate-12 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
              >
                @if (mode() === 'utildex') {
                  <svg class="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                } @else {
                  <svg class="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                }
              </div>
              <div
                class="absolute bottom-0 -left-16 flex h-20 w-20 rotate-6 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
              >
                @if (mode() === 'utildex') {
                  <svg class="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                } @else {
                  <svg class="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                }
              </div>

              <!-- Right Side -->
              <div
                class="absolute top-1/2 -right-32 flex h-24 w-24 -translate-y-1/2 rotate-12 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
              >
                @if (mode() === 'utildex') {
                  <svg class="w-12 h-12 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                } @else {
                  <svg class="w-12 h-12 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                }
              </div>
              <div
                class="absolute -right-16 bottom-0 flex h-20 w-20 -rotate-6 transform items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
              >
                @if (mode() === 'utildex') {
                  <svg class="w-10 h-10 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h6m-3-3v6"></path></svg>
                } @else {
                  <svg class="w-10 h-10 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                }
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
      }

      <!-- LOGO CANVAS (1024x1024) -->
      @if (mode() === 'synedex-logo') {
        <div
          #logoContainer
          class="relative flex items-center justify-center bg-transparent"
          style="width: 1024px; height: 1024px;"
        >
          <svg width="1024" height="1024" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="28" height="28" rx="8" fill="#22d3ee" />
            <rect x="36" y="0" width="28" height="28" rx="8" fill="#2dd4bf" />
            <rect x="72" y="0" width="28" height="28" rx="8" fill="#34d399" />
            <rect x="0" y="36" width="28" height="28" rx="8" fill="#38bdf8" />
            <rect x="36" y="36" width="28" height="28" rx="8" fill="#818cf8" />
            <circle cx="86" cy="50" r="13" stroke="#000000" stroke-width="8" />
            <rect x="0" y="72" width="28" height="28" rx="8" fill="#60a5fa" />
            <rect x="36" y="72" width="28" height="28" rx="8" fill="#a78bfa" />
            <rect x="72" y="72" width="28" height="28" rx="8" fill="#a3e635" />
          </svg>
        </div>
      }

      <p class="font-mono text-sm text-neutral-500">Preview Mode: Only visible in development</p>
    </div>
  `,
})
export class PreviewBannerComponent {
  @ViewChild('bannerContainer') banner!: ElementRef;
  @ViewChild('logoContainer') logo!: ElementRef;

  mode = signal<Mode>('utildex');

  async downloadBanner() {
    try {
      const currentMode = this.mode();
      
      if (currentMode === 'synedex-logo') {
        if (!this.logo) return;
        const dataUrl = await toPng(this.logo.nativeElement, {
          quality: 1,
          width: 1024,
          height: 1024,
          pixelRatio: 1, // Ensures exactly 1024x1024 output
        });
        const link = document.createElement('a');
        link.download = 'synedex_logo.png';
        link.href = dataUrl;
        link.click();
      } else {
        if (!this.banner) return;
        const dataUrl = await toJpeg(this.banner.nativeElement, {
          quality: 0.95,
          width: 1200,
          height: 630,
          pixelRatio: 1,
        });
        const link = document.createElement('a');
        link.download = currentMode === 'utildex' ? 'preview-banner-utildex.jpg' : 'preview-banner-synedex.jpg';
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Could not generate image', err);
      alert('Error generating image. Check console.');
    }
  }
}
