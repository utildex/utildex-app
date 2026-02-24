import {
  Component,
  inject,
  signal,
  OnDestroy,
  HostListener,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { VirtualPetsService } from '../../services/virtual-pets.service';
import { I18nService } from '@/src/services/i18n.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { Pet } from '../../data/virtual-pets.types';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-virtual-pets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (petsService.enabled()) {
      <!-- Pets Container -->
      <div
        class="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        [class.cursor-crosshair]="removalMode()"
      >
        @for (pet of pets(); track pet.id) {
          <!-- Wrapper for Pet + Portal -->
          <div
            class="absolute flex items-end justify-center transition-none select-none"
            [class.pointer-events-auto]="!pet.state.includes('dying')"
            [style.left.px]="pet.x"
            [style.bottom.px]="pet.y"
            [style.transform]="getTransform(pet)"
            (click)="onPetClick(pet)"
          >
            <!-- Portal Effect (Only when dying) -->
            @if (pet.state === 'dying') {
              <div
                class="pointer-events-none absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
              >
                <img
                  src="/assets/images/virtual-pets/portal/portal.gif"
                  alt="Portal"
                  class="animate-scale-in h-16 w-16 max-w-none object-contain"
                />
              </div>
            }

            <!-- Pet Sprite -->
            <div class="group relative z-10 flex flex-col items-center">
              <!-- Name Tag -->
              @if (pet.name && pet.state !== 'dying') {
                <div
                  class="pointer-events-none absolute -top-6 rounded bg-black/50 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                  [style.transform]="pet.flipped ? 'scaleX(-1)' : 'none'"
                >
                  {{ pet.name }}
                </div>
              }

              <img
                [attr.src]="getPetSprite(pet)"
                alt="Virtual pet"
                class="image-rendering-pixelated h-16 w-auto"
                [class.scale-0]="pet.state === 'dying'"
                [class.transition-transform]="pet.state === 'dying'"
                [class.duration-700]="pet.state === 'dying'"
                [class.ease-in-out]="pet.state === 'dying'"
                loading="lazy"
                draggable="false"
              />
            </div>
          </div>
        }
      </div>

      <!-- Removal Overlay Hint -->
      @if (removalMode()) {
        <div
          class="animate-fade-in fixed top-20 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-red-500 bg-white/90 px-4 py-2 text-red-600 shadow-lg backdrop-blur dark:bg-slate-900/90 dark:text-red-400"
        >
          <span class="material-symbols-outlined text-xl">delete</span>
          <span class="text-sm font-bold">{{ t.map()['MODE_REMOVAL_LABEL'] }}</span>
          <button
            (click)="toggleRemovalMode()"
            class="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
          >
            <span class="material-symbols-outlined text-sm font-bold">close</span>
          </button>
        </div>
      }

      <!-- Spawn Interface -->
      @if (petsService.showSpawnButton()) {
        <div class="fixed right-4 bottom-4 z-[61] flex flex-col items-end gap-2">
          <!-- Menu Panel -->
          @if (spawnMenuOpen()) {
            <div
              class="animate-fade-in mb-2 min-w-[200px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div class="flex flex-col gap-1 p-2">
                <!-- Add Button -->
                <button
                  (click)="openAddModal()"
                  class="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-500/20 dark:text-emerald-400"
                  >
                    <span class="material-symbols-outlined">add</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{
                      t.map()['BTN_ADD']
                    }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['BTN_ADD_DESC'] }}</span>
                  </div>
                </button>

                <!-- Remove Button -->
                <button
                  (click)="toggleRemovalMode(); spawnMenuOpen.set(false)"
                  class="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 transition-transform group-hover:scale-110 dark:bg-rose-500/20 dark:text-rose-400"
                  >
                    <span class="material-symbols-outlined">delete_sweep</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{
                      t.map()['BTN_REMOVE']
                    }}</span>
                    <span class="text-xs text-slate-500">{{ t.map()['BTN_REMOVE_DESC'] }}</span>
                  </div>
                </button>
              </div>
            </div>
            <!-- Backdrop to close menu -->
            <div class="fixed inset-0 z-[-1]" (click)="spawnMenuOpen.set(false)"></div>
          }

          <!-- Main Toggle Button -->
          <button
            (click)="toggleSpawnMenu()"
            class="z-[62] flex h-14 w-14 transform items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 dark:bg-white dark:text-slate-900"
            [class.rotate-45]="spawnMenuOpen()"
            title="Options Compagnons"
          >
            <span class="material-symbols-outlined text-3xl transition-transform">pets</span>
          </button>
        </div>
      }

      <!-- Add Pet Modal -->
      @if (showAddModal()) {
        <div class="fixed inset-0 z-100 flex items-center justify-center p-4">
          <!-- Modal Backdrop -->
          <div
            class="absolute inset-0 bg-black/40 backdrop-blur-sm"
            (click)="closeAddModal()"
          ></div>

          <!-- Modal Content -->
          <div
            class="animate-scale-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="p-6">
              <h2 class="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
                {{ t.map()['MODAL_TITLE'] }}
              </h2>

              <!-- Form -->
              <div class="space-y-4">
                <!-- Name Input -->
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-500">{{
                    t.map()['LABEL_NAME']
                  }}</label>
                  <input
                    type="text"
                    [(ngModel)]="newPetName"
                    class="w-full rounded-xl border-none bg-slate-100 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
                    [placeholder]="t.map()['PLACEHOLDER_NAME']"
                  />
                </div>

                <!-- Type Selection -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-500">{{
                    t.map()['LABEL_SPECIES']
                  }}</label>
                  <div class="grid grid-cols-2 gap-2">
                    @for (pet of petsService.AVAILABLE_PETS; track pet.id) {
                      <button
                        (click)="selectedPetType.set(pet.id)"
                        class="relative flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all"
                        [class.border-emerald-500]="selectedPetType() === pet.id"
                        [class.bg-emerald-50]="selectedPetType() === pet.id && !isDark()"
                        [class.border-slate-100]="selectedPetType() !== pet.id"
                        [ngClass]="{
                          'dark:bg-emerald-500/10': selectedPetType() === pet.id && isDark(),
                          'dark:border-slate-800': selectedPetType() !== pet.id,
                        }"
                      >
                        <img
                          [src]="pet.icon"
                          alt="Pet Icon"
                          class="image-rendering-pixelated h-10 w-10 object-contain"
                        />
                        <span
                          class="text-xs font-bold transition-colors"
                          [class.text-slate-700]="selectedPetType() !== pet.id"
                          [class.dark:text-slate-300]="selectedPetType() !== pet.id"
                          [class.text-emerald-900]="selectedPetType() === pet.id && !isDark()"
                          [class.dark:text-white]="selectedPetType() === pet.id && isDark()"
                        >
                          {{ t.map()[getPetTranslationKey(pet.id)] }}
                        </span>

                        @if (selectedPetType() === pet.id) {
                          <div
                            class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500"
                          >
                            <span class="material-symbols-outlined text-[10px] text-white"
                              >check</span
                            >
                          </div>
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-8 flex gap-3">
                <button
                  (click)="closeAddModal()"
                  class="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {{ t.map()['BTN_CANCEL'] }}
                </button>
                <button
                  (click)="confirmAddPet()"
                  class="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95"
                >
                  {{ t.map()['BTN_ADOPT'] }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .image-rendering-pixelated {
        image-rendering: pixelated;
      }
      .animate-scale-in {
        animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      @keyframes scaleIn {
        from {
          transform: scale(0);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class VirtualPetsComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  i18n = inject(I18nService);
  petsService = inject(VirtualPetsService);
  themeService = inject(ThemeService);
  t = inject(ScopedTranslationService);

  pets = signal<Pet[]>([]);
  spawnMenuOpen = signal(false);

  showAddModal = signal(false);
  removalMode = signal(false);
  newPetName = signal('');
  selectedPetType = signal('diplodocus');

  private nextId = 1;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private isLoaded = false;

  // Save throttle
  private lastSaveTime = 0;
  private readonly SAVE_INTERVAL = 1000; // Save every 2 seconds max

  isDark = this.themeService.isDark;

  // Movement constants
  private readonly WALK_SPEED = 100; // pixels per second
  private readonly CLIMB_SPEED = 80; // pixels per second
  private readonly GRAVITY = 2200; // pixels per second^2
  private readonly MAX_FALL_SPEED = 1600; // pixels per second
  private readonly JUMP_HORIZONTAL_SPEED = 500; // pixels per second
  private readonly GROUND_LEVEL = 0;
  private readonly MAX_HEIGHT = window.innerHeight - 80;

  constructor() {
    if (this.isBrowser) {
      // Sync local pets with persistent state when loaded
      effect(() => {
        const storedPets = this.petsService.activePets();

        if (Array.isArray(storedPets)) {
          const shouldInit = !this.isLoaded || (this.pets().length === 0 && storedPets.length > 0);

          if (shouldInit) {
            const petsList = (storedPets as Pet[]).filter((p) => p.state !== 'dying');
            this.pets.set(petsList);

            const maxId = petsList.reduce((max, p) => Math.max(max, p.id || 0), 0);
            this.nextId = Math.max(this.nextId, maxId + 1);

            this.isLoaded = true;
          }
        }
      });

      effect(() => {
        if (this.petsService.enabled()) {
          this.startAnimationLoop();
        } else {
          if (this.pets().length > 0) {
            this.savePets(this.pets());
          }
          this.stopAnimationLoop();
        }
      });

      this.petsService.clearPets$.pipe(takeUntilDestroyed()).subscribe(() => {
        this.pets.set([]);
      });
    }
  }

  private savePets(pets: Pet[]) {
    this.petsService.updateActivePets(pets.filter((p) => p.state !== 'dying'));
  }

  ngOnDestroy() {
    this.stopAnimationLoop();
  }

  private stopAnimationLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  toggleSpawnMenu() {
    this.spawnMenuOpen.update((v) => !v);
  }

  // Modal Logic
  openAddModal() {
    this.spawnMenuOpen.set(false);
    this.newPetName.set('');
    this.selectedPetType.set('diplodocus');
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  confirmAddPet() {
    this.spawnPet(this.selectedPetType(), this.newPetName());
    this.closeAddModal();
  }

  // Removal Logic
  toggleRemovalMode() {
    this.removalMode.update((v) => !v);
  }

  @HostListener('window:contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    if (this.removalMode()) {
      event.preventDefault();
      this.removalMode.set(false);
    }
  }

  getPetTranslationKey(id: string): string {
    return id.toUpperCase().replace('-', '_');
  }

  @HostListener('window:resize')
  onResize() {
    const newWidth = window.innerWidth;

    // Reposition pets that might be off-screen
    this.pets.update((pets) =>
      pets.map((pet) => {
        // If climbing the right wall, stick to it!
        if (pet.state === 'climb' && pet.direction === 'right') {
          // The margin used in handleWalking logic is (screenWidth - 80)
          // We should align it to the new screen width
          return { ...pet, x: newWidth - 80 };
        }

        // Otherwise, just clamp to ensure visibility
        return {
          ...pet,
          x: Math.min(pet.x, newWidth - 64),
        };
      }),
    );
  }

  spawnPet(type: string = 'diplodocus', name?: string) {
    if (!this.isBrowser) return;

    // Spawn randomly on left or right edge
    const spawnLeft = Math.random() > 0.5;
    const startX = spawnLeft ? -60 : window.innerWidth + 10;

    const newPet: Pet = {
      id: this.nextId++,
      type: type,
      name: name?.trim() || undefined,
      x: startX,
      y: this.GROUND_LEVEL,
      direction: spawnLeft ? 'right' : 'left',
      state: 'walk',
      speed: this.WALK_SPEED + (Math.random() * 20 - 10), // Speed variation
      flipped: !spawnLeft, // If spawning left (going right), no flip. If spawning right (going left), flip.
      climbing: false,
      vy: 0, // Initial vertical speed
      vx: 0, // Initial horizontal speed
      jumpStartY: 0, // No jump at start
    };

    this.pets.update((pets) => [...pets, newPet]);
  }

  onPetClick(pet: Pet) {
    // Handling Removal
    if (this.removalMode()) {
      this.removePet(pet);
      return;
    }

    // Click on a pet = change direction or fall if climbing
    this.pets.update((pets) =>
      pets.map((d) => {
        if (d.id === pet.id) {
          // If climbing, fall immediately
          if (d.state === 'climb') {
            return {
              ...d,
              state: 'fall',
              vy: 0,
              vx:
                d.direction === 'right' ? -this.JUMP_HORIZONTAL_SPEED : this.JUMP_HORIZONTAL_SPEED,
            };
          }
          // Otherwise change direction
          const newDirection = d.direction === 'left' ? 'right' : 'left';
          return {
            ...d,
            direction: newDirection,
            flipped: newDirection === 'left', // Flip if going left
          };
        }
        return d;
      }),
    );
  }

  removePet(pet: Pet) {
    // 1. Change state to dying to maximize portal effect
    this.pets.update((prev) =>
      prev.map((d) => {
        if (d.id === pet.id) {
          return { ...d, state: 'dying' };
        }
        return d;
      }),
    );

    // 2. Remove after animation
    setTimeout(() => {
      this.pets.update((prev) => prev.filter((d) => d.id !== pet.id));
      // If no more pets, maybe exit removal mode? kept it open for bulk removal
    }, 1000); // Wait for transition duration
  }

  getTransform(pet: Pet): string {
    if (pet.state === 'dying') {
      // Only scale the image via CSS, keep container visible for portal
      return `scaleX(${pet.flipped ? -1 : 1})`;
    }
    if (pet.climbing) {
      return `scaleX(${pet.flipped ? -1 : 1}) rotate(-90deg)`;
    }
    // Normal: just horizontal flip
    return `scaleX(${pet.flipped ? -1 : 1})`;
  }

  getPetSprite(pet: Pet): string {
    // Keep 'dying' sprite as idle or walk, doesn't matter much as it shrinks
    if (pet.state === 'dying') {
      return this.petsService.getSpriteUrl(pet.type, 'idle');
    }

    // Falling with horizontal momentum -> Run (looks like jumping/flailing)
    if (pet.state === 'fall') {
      if (Math.abs(pet.vx) > 50) {
        return this.petsService.getSpriteUrl(pet.type, 'run');
      }
      return this.petsService.getSpriteUrl(pet.type, 'idle');
    }

    // Use walk sprite for climbing to animate legs (looks like climbing)
    if (pet.state === 'climb') {
      return this.petsService.getSpriteUrl(pet.type, 'walk');
    }

    // Idle
    if (pet.state === 'idle') {
      return this.petsService.getSpriteUrl(pet.type, 'idle');
    }

    // Normal Walk
    return this.petsService.getSpriteUrl(pet.type, 'walk');
  }

  private startAnimationLoop() {
    if (this.animationFrameId !== null) return;

    this.lastTime = 0;

    const animate = (timestamp: number) => {
      if (!this.lastTime) {
        this.lastTime = timestamp;
      }

      const rawDeltaTime = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      const deltaTime = Math.min(rawDeltaTime, 0.1);

      this.updatePets(deltaTime);

      if (this.isLoaded && timestamp - this.lastSaveTime > this.SAVE_INTERVAL) {
        this.savePets(this.pets());
        this.lastSaveTime = timestamp;
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private updatePets(deltaTime: number) {
    if (!this.isBrowser || this.pets().length === 0) return;

    const screenWidth = window.innerWidth;
    const leftWallX = -10;
    const rightWallX = screenWidth - 80; // Increased margin to prevent clipping

    this.pets.update((pets) =>
      pets
        .map((pet) => {
          const nextPet = { ...pet };

          switch (pet.state) {
            case 'fall':
              this.handleFalling(nextPet, deltaTime, leftWallX, rightWallX);
              break;
            case 'climb':
              this.handleClimbing(nextPet, deltaTime);
              break;
            case 'walk':
              this.handleWalking(nextPet, deltaTime, leftWallX, rightWallX);
              break;
          }

          return nextPet;
        })
        .filter((pet) => {
          return pet.x > -100 && pet.x < screenWidth + 100;
        }),
    );
  }

  private handleFalling(pet: Pet, deltaTime: number, leftX: number, rightX: number) {
    // Accelerate fall with gravity + jump arc
    pet.vy = Math.min(pet.vy + this.GRAVITY * deltaTime, this.MAX_FALL_SPEED);
    pet.y -= pet.vy * deltaTime;

    // Add horizontal impulse if jumping (vx != 0)
    if (pet.vx !== 0) {
      pet.x += pet.vx * deltaTime;
      // Reduce horizontal impulse progressively
      pet.vx *= 0.94;

      // Update direction and flip based on horizontal movement during fall
      if (pet.vx > 0) {
        pet.direction = 'right';
        pet.flipped = false;
      } else if (pet.vx < 0) {
        pet.direction = 'left';
        pet.flipped = true;
      }
    }

    // Stop impulse only if hitting a wall
    if (pet.x <= leftX - 10) {
      pet.x = leftX;
      pet.direction = 'right';
      pet.flipped = false;
      pet.vx = 0;
    } else if (pet.x >= rightX + 10) {
      pet.x = rightX;
      pet.direction = 'left';
      pet.flipped = true;
      pet.vx = 0;
    }

    if (pet.y <= this.GROUND_LEVEL) {
      pet.y = this.GROUND_LEVEL;
      pet.state = 'walk';
      pet.vy = 0;
      pet.vx = 0; // Reset impulse
    }
    pet.climbing = false;
  }

  private handleClimbing(pet: Pet, deltaTime: number) {
    // Climb vertically along the edge with easing
    pet.climbing = true;
    pet.vy = 0;
    pet.vx = 0;

    const climbProgress = Math.min(pet.y / this.MAX_HEIGHT, 1);

    // Fall risk increases with height (e.g. progress^3)
    const fallRisk = Math.pow(climbProgress, 3) * 0.8 * deltaTime;

    if (Math.random() < fallRisk) {
      // Falling!
      pet.state = 'fall';
      pet.climbing = false;
      pet.jumpStartY = pet.y;
      // Moderate impulse to push away from wall
      pet.vx =
        pet.direction === 'right'
          ? -this.JUMP_HORIZONTAL_SPEED * 0.6
          : this.JUMP_HORIZONTAL_SPEED * 0.6;
      pet.vy = 0;
    } else {
      const climbEase = 1 - climbProgress * 0.4;
      pet.y += this.CLIMB_SPEED * climbEase * deltaTime;

      if (pet.y >= this.MAX_HEIGHT) {
        pet.y = this.MAX_HEIGHT;
        pet.state = 'fall';
        pet.climbing = false;
        pet.jumpStartY = pet.y;
        // Jump impulse away from wall
        pet.vx =
          pet.direction === 'right' ? -this.JUMP_HORIZONTAL_SPEED : this.JUMP_HORIZONTAL_SPEED;
        pet.vy = 0;
      }
    }
  }

  private handleWalking(pet: Pet, deltaTime: number, leftX: number, rightX: number) {
    pet.climbing = false;
    pet.vy = 0;
    pet.vx = 0;

    if (pet.direction === 'right') {
      pet.x += pet.speed * deltaTime;
      pet.flipped = false;

      if (pet.x >= rightX) {
        pet.x = rightX;
        pet.state = 'climb';
        pet.vy = 0;
        pet.vx = 0;
      }
    } else {
      pet.x -= pet.speed * deltaTime;
      pet.flipped = true;

      if (pet.x <= leftX) {
        pet.x = leftX;
        pet.state = 'climb';
        pet.vy = 0;
        pet.vx = 0;
      }
    }
  }
}
