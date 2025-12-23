
import { Injectable, signal, effect, inject } from '@angular/core';
import { DbService } from './db.service';

export type PrimaryColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
export type FontFamily = 'inter' | 'roboto' | 'system';
export type Density = 'comfortable' | 'compact';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private db = inject(DbService);

  isDark = signal<boolean>(false);
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

  private loaded = false;

  constructor() {
    this.loadSettings();

    // Theme Effect
    effect(() => {
      const isDark = this.isDark();
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      if (this.loaded) this.saveSetting('utildex-theme', isDark ? 'dark' : 'light');
    });

    // Color Effect
    effect(() => {
      const color = this.primaryColor();
      const rgb = this.colorMap[color];
      document.documentElement.style.setProperty('--color-primary', rgb);
      if (this.loaded) this.saveSetting('utildex-color', color);
    });

    // Font Effect
    effect(() => {
      const font = this.fontFamily();
      let fontValue = 'Inter';
      if (font === 'roboto') fontValue = 'Roboto Mono';
      if (font === 'system') fontValue = 'system-ui, sans-serif';
      
      document.documentElement.style.setProperty('--font-sans', fontValue);
      if (this.loaded) this.saveSetting('utildex-font', font);
    });

    // Density Effect
    effect(() => {
      const density = this.density();
      if (density === 'compact') {
        document.documentElement.classList.add('density-compact');
      } else {
        document.documentElement.classList.remove('density-compact');
      }
      if (this.loaded) this.saveSetting('utildex-density', density);
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
     // Effects will run and save
  }

  private async loadSettings() {
    try {
      // Theme
      const savedTheme = await this.db.get<string>('utildex-theme');
      if (savedTheme) {
        this.isDark.set(savedTheme === 'dark');
      } else {
        this.isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }

      // Color
      const savedColor = await this.db.get<PrimaryColor>('utildex-color');
      if (savedColor && this.colorMap[savedColor]) {
        this.primaryColor.set(savedColor);
      }

      // Font
      const savedFont = await this.db.get<FontFamily>('utildex-font');
      if (savedFont) {
        this.fontFamily.set(savedFont);
      }

      // Density
      const savedDensity = await this.db.get<Density>('utildex-density');
      if (savedDensity) {
        this.density.set(savedDensity);
      }
      
      this.loaded = true;
    } catch (e) {
      console.warn('Failed to load theme settings', e);
      this.loaded = true; // enable saving even if load failed
    }
  }

  private saveSetting(key: string, value: string) {
    this.db.set(key, value);
  }
}
