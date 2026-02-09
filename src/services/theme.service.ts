
import { Injectable, signal, effect, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';

export type PrimaryColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
export type FontFamily = 'inter' | 'roboto' | 'system';
export type Density = 'comfortable' | 'compact';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private persistence = inject(PersistenceService);

  // Initialize with System Preference immediately so we don't need to force-set it later
  isDark = signal<boolean>(window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  primaryColor = signal<PrimaryColor>('blue');
  fontFamily = signal<FontFamily>('inter');
  density = signal<Density>('comfortable');

  private colorMap: Record<PrimaryColor, string> = {
    blue: '59 130 246',    // #3b82f6
    emerald: '16 185 129', // #10b981
    violet: '139 92 246',  // #8b5cf6
    amber: '245 158 11',   // #f59e0b
    rose: '244 63 94'      // #f43f5e
  };

  constructor() {
    // Bind Persistence (Hybrid Strategy for anti-flash)
    // If a value exists in storage, it will overwrite the system default above.
    this.persistence.storage(this.isDark, 'theme', { type: 'boolean', strategy: 'hybrid' });
    this.persistence.storage(this.primaryColor, 'color', { strategy: 'hybrid' });
    this.persistence.storage(this.fontFamily, 'font', { strategy: 'hybrid' });
    this.persistence.storage(this.density, 'density', { strategy: 'hybrid' });

    // Theme Effect
    effect(() => {
      const isDark = this.isDark();
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    // Color Effect
    effect(() => {
      const color = this.primaryColor();
      const rgb = this.colorMap[color];
      document.documentElement.style.setProperty('--color-primary', rgb);
    });

    // Font Effect
    effect(() => {
      const font = this.fontFamily();
      let fontValue = 'Inter';
      if (font === 'roboto') fontValue = 'Roboto Mono';
      if (font === 'system') fontValue = 'system-ui, sans-serif';
      
      document.documentElement.style.setProperty('--font-sans', fontValue);
    });

    // Density Effect
    effect(() => {
      const density = this.density();
      if (density === 'compact') {
        document.documentElement.classList.add('density-compact');
      } else {
        document.documentElement.classList.remove('density-compact');
      }
    });
  }

  toggleTheme() {
    this.isDark.update(current => !current);
  }

  setColor(color: PrimaryColor) {
    this.primaryColor.set(color);
  }

  setFont(font: FontFamily) {
    this.fontFamily.set(font);
  }

  setDensity(density: Density) {
    this.density.set(density);
  }

  reset() {
     this.isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
     this.primaryColor.set('blue');
     this.fontFamily.set('inter');
     this.density.set('comfortable');
  }
}
