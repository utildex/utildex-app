import { Component, inject, signal, OnDestroy, HostListener, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { VirtualPetsService } from '../../services/virtual-pets.service';
import {I18nService} from "@/src/services/i18n.service";
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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (petsService.enabled()) {
      <!-- Pets Container -->
      <div class="fixed inset-0 pointer-events-none z-50 overflow-hidden" [class.cursor-crosshair]="removalMode()">
        @for (pet of pets(); track pet.id) {
          <!-- Wrapper for Pet + Portal -->
          <div
            class="absolute transition-none select-none flex items-end justify-center"
            [class.pointer-events-auto]="!pet.state.includes('dying')"
            [style.left.px]="pet.x"
            [style.bottom.px]="pet.y"
            [style.transform]="getTransform(pet)"
            (click)="onPetClick(pet)"
          >
            <!-- Portal Effect (Only when dying) -->
            @if (pet.state === 'dying') {
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
                  <img src="/assets/images/virtual-pets/portal/portal.gif" alt="Portal" class="w-16 h-16 max-w-none object-contain animate-scale-in">
              </div>
            }

            <!-- Pet Sprite -->
            <div class="relative z-10 flex flex-col items-center group">
               <!-- Name Tag -->
               @if (pet.name && pet.state !== 'dying') {
                 <div
                   class="absolute -top-6 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                   [style.transform]="pet.flipped ? 'scaleX(-1)' : 'none'"
                 >
                   {{ pet.name }}
                 </div>
               }
               
               <img
                  [attr.src]="getPetSprite(pet)"
                  alt="Virtual pet"
                  class="h-16 w-auto image-rendering-pixelated"
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
        <div class="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-white/90 dark:bg-slate-900/90 border-2 border-red-500 text-red-600 dark:text-red-400 px-4 py-2 rounded-full shadow-lg backdrop-blur animate-fade-in flex items-center gap-3">
          <span class="material-symbols-outlined text-xl">delete</span>
          <span class="text-sm font-bold">{{ t.map()['MODE_REMOVAL_LABEL'] }}</span>
          <button (click)="toggleRemovalMode()" class="ml-1 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm">
             <span class="material-symbols-outlined text-sm font-bold">close</span>
          </button>
        </div>
      }

      <!-- Spawn Interface -->
      @if (petsService.showSpawnButton()) {
        <div class="fixed bottom-4 right-4 z-[61] flex flex-col items-end gap-2">
          
          <!-- Menu Panel -->
          @if (spawnMenuOpen()) {
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[200px] animate-fade-in mb-2">
               <div class="p-2 gap-1 flex flex-col">
                  <!-- Add Button -->
                  <button (click)="openAddModal()" class="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left w-full group">
                      <div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined">add</span>
                      </div>
                      <div class="flex flex-col">
                         <span class="font-bold text-sm text-slate-700 dark:text-slate-200">{{ t.map()['BTN_ADD'] }}</span>
                         <span class="text-xs text-slate-500">{{ t.map()['BTN_ADD_DESC'] }}</span>
                      </div>
                  </button>

                  <!-- Remove Button -->
                  <button (click)="toggleRemovalMode(); spawnMenuOpen.set(false)" class="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left w-full group">
                      <div class="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined">delete_sweep</span>
                      </div>
                      <div class="flex flex-col">
                         <span class="font-bold text-sm text-slate-700 dark:text-slate-200">{{ t.map()['BTN_REMOVE'] }}</span>
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
            class="flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 z-[62]"
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
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="closeAddModal()"></div>
            
            <!-- Modal Content -->
            <div class="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
               <div class="p-6">
                  <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">{{ t.map()['MODAL_TITLE'] }}</h2>
                  
                  <!-- Form -->
                  <div class="space-y-4">
                     <!-- Name Input -->
                     <div>
                        <label class="block text-sm font-medium text-slate-500 mb-1">{{ t.map()['LABEL_NAME'] }}</label>
                        <input 
                           type="text" 
                           [(ngModel)]="newPetName" 
                           class="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                           [placeholder]="t.map()['PLACEHOLDER_NAME']"
                        >
                     </div>

                     <!-- Type Selection -->
                     <div>
                        <label class="block text-sm font-medium text-slate-500 mb-2">{{ t.map()['LABEL_SPECIES'] }}</label>
                        <div class="grid grid-cols-2 gap-2">
                           @for (pet of AVAILABLE_PETS; track pet.id) {
                              <button 
                                 (click)="selectedPetType.set(pet.id)"
                                 class="relative p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-2"
                                 [class.border-emerald-500]="selectedPetType() === pet.id"
                                 [class.bg-emerald-50]="selectedPetType() === pet.id && !isDark()"
                                 [class.border-slate-100]="selectedPetType() !== pet.id"
                                 [ngClass]="{
                                    'dark:bg-emerald-500/10': selectedPetType() === pet.id && isDark(),
                                    'dark:border-slate-800': selectedPetType() !== pet.id
                                 }"
                              >
                                 <img [src]="pet.icon" alt="Pet Icon" class="w-10 h-10 object-contain image-rendering-pixelated">
                                 <span 
                                    class="text-xs font-bold transition-colors"
                                    [class.text-slate-700]="selectedPetType() !== pet.id"
                                    [class.dark:text-slate-300]="selectedPetType() !== pet.id"
                                    [class.text-emerald-900]="selectedPetType() === pet.id && !isDark()"
                                    [class.dark:text-white]="selectedPetType() === pet.id && isDark()"
                                 >
                                    {{ t.map()[getPetTranslationKey(pet.id)] }}
                                 </span>
                                 
                                 @if(selectedPetType() === pet.id) {
                                    <div class="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                       <span class="material-symbols-outlined text-[10px] text-white">check</span>
                                    </div>
                                 }
                              </button>
                           }
                        </div>
                     </div>
                  </div>
                  
                  <!-- Actions -->
                  <div class="flex gap-3 mt-8">
                     <button (click)="closeAddModal()" class="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        {{ t.map()['BTN_CANCEL'] }}
                     </button>
                     <button (click)="confirmAddPet()" class="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                        {{ t.map()['BTN_ADOPT'] }}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      }
    }
  `,
  styles: [`
    .image-rendering-pixelated {
      image-rendering: pixelated;
    }
    .animate-scale-in {
      animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes scaleIn {
       from { transform: scale(0); opacity: 0; }
       to { transform: scale(1); opacity: 1; }
    }
  `]
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

  // List of available pets for the interface
  readonly AVAILABLE_PETS = [
    { id: 'diplodocus', icon: '/assets/images/virtual-pets/diplodocus/icon.png' },
    { id: 'dog-akita', icon: '/assets/images/virtual-pets/dog-akita/icon_akita.png' },
    { id: 'dog-black', icon: '/assets/images/virtual-pets/dog-black/icon_black.png' },
    { id: 'dog-brown', icon: '/assets/images/virtual-pets/dog-brown/icon.png' },
    { id: 'dog-red', icon: '/assets/images/virtual-pets/dog-red/icon_red.png' },
    { id: 'dog-white', icon: '/assets/images/virtual-pets/dog-white/icon_white.png' },
    { id: 'fox-red', icon: '/assets/images/virtual-pets/fox-red/icon.png' },
    { id: 'fox-white', icon: '/assets/images/virtual-pets/fox-white/icon_white.png' },
    { id: 'rubber-duck', icon: '/assets/images/virtual-pets/rubber-duck/icon.png' }
  ];

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
              const petsList = (storedPets as Pet[]).filter(p => p.state !== 'dying');
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

      this.petsService.clearPets$.subscribe(() => {
        this.pets.set([]);
      });
    }
  }

  private savePets(pets: Pet[]) {
    this.petsService.updateActivePets(pets.filter(p => p.state !== 'dying'));
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
    this.spawnMenuOpen.update(v => !v);
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
     this.removalMode.update(v => !v);
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
    this.pets.update(pets => pets.map(pet => {
      // If climbing the right wall, stick to it!
      if (pet.state === 'climb' && pet.direction === 'right') {
         // The margin used in handleWalking logic is (screenWidth - 80)
         // We should align it to the new screen width
         return { ...pet, x: newWidth - 80 };
      }

      // Otherwise, just clamp to ensure visibility
      return {
        ...pet,
        x: Math.min(pet.x, newWidth - 64)
      };
    }));
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
      jumpStartY: 0 // No jump at start
    };

    this.pets.update(pets => [...pets, newPet]);
  }

  onPetClick(pet: Pet) {
    // Handling Removal
    if (this.removalMode()) {
       this.removePet(pet);
       return;
    }

    // Click on a pet = change direction or fall if climbing
    this.pets.update(pets => pets.map(d => {
      if (d.id === pet.id) {
        // If climbing, fall immediately
        if (d.state === 'climb') {
          return {
            ...d,
            state: 'fall',
            vy: 0,
            vx: d.direction === 'right' ? -this.JUMP_HORIZONTAL_SPEED : this.JUMP_HORIZONTAL_SPEED
          };
        }
        // Otherwise change direction
        const newDirection = d.direction === 'left' ? 'right' : 'left';
        return {
          ...d,
          direction: newDirection,
          flipped: newDirection === 'left' // Flip if going left
        };
      }
      return d;
    }));
  }

  removePet(pet: Pet) {
    // 1. Change state to dying to maximize portal effect
    this.pets.update(prev => prev.map(d => {
       if (d.id === pet.id) {
          return { ...d, state: 'dying' };
       }
       return d;
    }));

    // 2. Remove after animation
    setTimeout(() => {
       this.pets.update(prev => prev.filter(d => d.id !== pet.id));
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

    this.pets.update(pets => pets.map(pet => {
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
    }).filter(pet => {
      return pet.x > -100 && pet.x < screenWidth + 100;
    }));
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
        pet.vx = pet.direction === 'right' ? -this.JUMP_HORIZONTAL_SPEED * 0.6 : this.JUMP_HORIZONTAL_SPEED * 0.6;
        pet.vy = 0;
    } else {
        const climbEase = 1 - (climbProgress * 0.4);
        pet.y += this.CLIMB_SPEED * climbEase * deltaTime;

        if (pet.y >= this.MAX_HEIGHT) {
          pet.y = this.MAX_HEIGHT;
          pet.state = 'fall';
          pet.climbing = false;
          pet.jumpStartY = pet.y;
          // Jump impulse away from wall
          pet.vx = pet.direction === 'right' ? -this.JUMP_HORIZONTAL_SPEED : this.JUMP_HORIZONTAL_SPEED;
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
