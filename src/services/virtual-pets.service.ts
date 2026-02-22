import { Injectable, signal, inject, PLATFORM_ID, effect, WritableSignal, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PersistenceService } from './persistence.service';
import { Subject } from 'rxjs';
import { Pet } from '../data/virtual-pets.types';

/**
 * Service managing Virtual Pets activation/deactivation
 * with IndexedDB persistence (via PersistenceService).
 */
@Injectable({
  providedIn: 'root'
})
export class VirtualPetsService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private persistence = inject(PersistenceService);

  // Signal to enable/disable pets
  enabled = signal(false);

  // Option: show spawn button
  showSpawnButton = signal(true);

  // Signal to store active pets state (position, type, etc.)
  activePets: WritableSignal<Pet[]> = signal([]);

  // Event to request pets cleanup
  private clearPetsSource = new Subject<void>();
  clearPets$ = this.clearPetsSource.asObservable();

  // Resolved custom sprites map (type -> state -> url)
  private customSprites: Record<string, Record<string, string>> = {};

  // Centralized Pet Configuration
  private readonly PET_CONFIGS: Record<string, {
    icon: string,
    folder: string,
    states: Record<string, string>
  }> = {
    diplodocus: {
      icon: '/assets/images/virtual-pets/diplodocus/icon.png',
      folder: 'diplodocus',
      states: {
        idle: 'green_idle_8fps.gif',
        walk: 'green_walk_8fps.gif',
        walk_fast: 'green_walk_fast_8fps.gif',
        run: 'green_run_8fps.gif',
        swipe: 'green_swipe_8fps.gif',
        with_ball: 'green_with_ball_8fps.gif'
      }
    }
  };

  // List of available pets for the interface
  readonly AVAILABLE_PETS = Object.entries(this.PET_CONFIGS).map(([id, config]) => ({
    id,
    icon: config.icon
  }));

  constructor() {
    if (this.isBrowser) {
      // Use PersistenceService to store state in IndexedDB
      this.persistence.storage(this.enabled, 'virtual-pets-enabled', 'boolean');
      this.persistence.storage(this.showSpawnButton, 'virtual-pets-show-btn', 'boolean');
      this.persistence.storage(this.activePets, 'active-pets', { type: 'object' });

      // Load custom sprites manifest (fire-and-forget)
      this.loadCustomManifest();

      // Automatically preload assets if feature is already enabled (rehydrated from persistence)
      effect(() => {
        if (this.enabled()) {
           this.preloadBuiltInAssets();
        }
      });
    }
  }

  toggle() {
    this.enabled.update(v => !v);
  }
  setEnabled(value: boolean) {
    this.enabled.set(value);
    // When user enables pets, show the spawn button by default
    if (value) {
      this.setShowSpawnButton(true);
    }
  }

  setShowSpawnButton(value: boolean) {
    this.showSpawnButton.set(value);
  }

  updateActivePets(pets: Pet[]) {
    this.activePets.set(pets);
  }

  clearPets() {
    this.clearPetsSource.next();
    this.activePets.set([]);
  }

  ngOnDestroy() {
    this.clearPetsSource.complete();
  }

  /**
   * Attempts to load a JSON manifest file in /assets/images/virtual-pets/custom/manifest.json
   */
  async loadCustomManifest() {
    if (!this.isBrowser) return;
    try {
      // Use default caching strategy to support offline regular usage
      const res = await fetch('/assets/images/virtual-pets/custom/manifest.json');
      if (!res.ok) return; // no manifest
      const json = await res.json();

      // Basic validation: ensure json is an object
      if (!json || typeof json !== 'object') return;

      // convert filenames to urls and preload
      Object.keys(json).forEach((type: string) => {
        const states = json[type];
        // Ensure states is a Record<string, string>
        if (!states || typeof states !== 'object') return;

        this.customSprites[type] = this.customSprites[type] || {};
        Object.entries(states as Record<string, string>).forEach(([state, filename]) => {
          if (typeof filename !== 'string') return;

          const url = `/assets/images/virtual-pets/custom/${filename}`;
          this.customSprites[type][state] = url;
          // Preload image
          const img = new Image();
          img.src = url;
          this.preloadedImages.push(img);
        });
      });
    } catch {
      // ignore failures silently
    }
  }

  /**
   * Re-scans the custom folder (reloads the manifest). Useful after adding gifs.
   */
  async reloadCustomManifest() {
    this.customSprites = {};
    await this.loadCustomManifest();
  }

  /**
   * Returns the sprite URL for a given type and state
   */
  getSpriteUrl(type: string, state: string): string {
    // custom override
    if (this.customSprites[type] && this.customSprites[type][state]) {
      return this.customSprites[type][state];
    }

    // fallback to default map
    const cfg = this.PET_CONFIGS[type];
    if (cfg && cfg.states && cfg.states[state]) {
      return `/assets/images/virtual-pets/${cfg.folder}/${cfg.states[state]}`;
    }

    // final fallback
    return `/assets/images/virtual-pets/${type}/${state}.gif`;
  }

  // Preload flag
  private assetsPreloaded = false;
  // Keep references to loaded images to prevent GC
  private preloadedImages: HTMLImageElement[] = [];

  private preloadBuiltInAssets() {
    if (!this.isBrowser || this.assetsPreloaded) return;

    // 1. Preload portal asset (Critical for interaction)
    const portalImg = new Image();
    portalImg.src = '/assets/images/virtual-pets/portal/portal.gif';
    this.preloadedImages.push(portalImg);

    // 2. Preload built-in sprites
    Object.values(this.PET_CONFIGS).forEach(cfg => {
      Object.values(cfg.states).forEach(filename => {
        const url = `/assets/images/virtual-pets/${cfg.folder}/${filename}`;
        const img = new Image();
        img.src = url;
        this.preloadedImages.push(img);
      });
    });

    this.assetsPreloaded = true;
  }
}
