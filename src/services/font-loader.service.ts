import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private loaded = new Set<string>();
  private observer?: MutationObserver;

  ensureInter(): Promise<void> {
    return Promise.all([
      this.loadFont('inter-400', 'Inter', 'url(assets/fonts/inter/inter-latin-400-normal.woff2)', {
        weight: '400',
        style: 'normal',
      }),
      this.loadFont('inter-500', 'Inter', 'url(assets/fonts/inter/inter-latin-500-normal.woff2)', {
        weight: '500',
        style: 'normal',
      }),
      this.loadFont('inter-600', 'Inter', 'url(assets/fonts/inter/inter-latin-600-normal.woff2)', {
        weight: '600',
        style: 'normal',
      }),
      this.loadFont('inter-700', 'Inter', 'url(assets/fonts/inter/inter-latin-700-normal.woff2)', {
        weight: '700',
        style: 'normal',
      }),
    ]).then(() => undefined);
  }

  ensureRobotoMono(): Promise<void> {
    return Promise.all([
      this.loadFont(
        'roboto-mono-400',
        'Roboto Mono',
        'url(assets/fonts/roboto-mono/roboto-mono-latin-400-normal.woff2)',
        {
          weight: '400',
          style: 'normal',
        },
      ),
      this.loadFont(
        'roboto-mono-500',
        'Roboto Mono',
        'url(assets/fonts/roboto-mono/roboto-mono-latin-500-normal.woff2)',
        {
          weight: '500',
          style: 'normal',
        },
      ),
    ]).then(() => undefined);
  }

  ensureMerriweather(): Promise<void> {
    return Promise.all([
      this.loadFont(
        'merriweather-400',
        'Merriweather',
        'url(assets/fonts/merriweather/merriweather-latin-400-normal.woff2)',
        {
          weight: '400',
          style: 'normal',
        },
      ),
      this.loadFont(
        'merriweather-700',
        'Merriweather',
        'url(assets/fonts/merriweather/merriweather-latin-700-normal.woff2)',
        {
          weight: '700',
          style: 'normal',
        },
      ),
    ]).then(() => undefined);
  }

  ensureMaterialSymbols(): Promise<void> {
    return this.loadFont(
      'material-symbols-outlined',
      'Material Symbols Outlined',
      'url(assets/fonts/material-symbols/material-symbols-outlined.woff2)',
      {
        weight: '100 700',
        style: 'normal',
      },
    ).then(() => undefined);
  }

  observeMaterialSymbolsUsage(): void {
    if (typeof document === 'undefined' || this.loaded.has('material-symbols-outlined')) {
      return;
    }

    if (document.querySelector('.material-symbols-outlined')) {
      this.ensureMaterialSymbols();
      return;
    }

    this.observer?.disconnect();
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }

          if (
            node.matches('.material-symbols-outlined') ||
            node.querySelector('.material-symbols-outlined')
          ) {
            this.ensureMaterialSymbols();
            this.observer?.disconnect();
            return;
          }
        }
      }
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private async loadFont(
    key: string,
    family: string,
    source: string,
    descriptors?: FontFaceDescriptors,
  ): Promise<void> {
    if (this.loaded.has(key) || typeof document === 'undefined' || !('fonts' in document)) {
      return;
    }

    const font = new FontFace(family, source, descriptors);
    await font.load();
    document.fonts.add(font);
    this.loaded.add(key);
  }
}
