import { CommonModule } from '@angular/common';
import { Component, Type, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { getToolComponent } from '../../core/tool-registry';
import { I18nService } from '../../services/i18n.service';
import {
  ResolvedToolSpace,
  ResolvedToolSpaceGroup,
  ToolSpacesService,
} from '../../services/tool-spaces.service';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-tool-space-host',
  standalone: true,
  imports: [CommonModule, RouterLink, LocalLinkPipe],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  template: `
    <div class="mx-auto flex h-[calc(100dvh-12rem)] max-w-7xl flex-col gap-5 overflow-hidden pb-1">
      @if (space(); as currentSpace) {
        <header class="space-y-4">
          <nav
            class="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400"
            aria-label="Breadcrumb"
          >
            <a
              [routerLink]="'/spaces' | localLink"
              class="hover:text-primary inline-flex items-center gap-1 transition-colors"
            >
              <span class="material-symbols-outlined text-sm">arrow_back</span>
              {{ t.map()['BREADCRUMB_ROOT'] }}
            </a>
            <span class="mx-2 text-slate-300 dark:text-slate-600">&gt;</span>
            <span class="truncate text-slate-800 dark:text-slate-100">{{
              getSpaceName(currentSpace)
            }}</span>
          </nav>

          <div class="flex items-start gap-4">
            <div
              class="bg-primary/10 text-primary inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
            >
              <span class="material-symbols-outlined text-2xl">{{ currentSpace.icon }}</span>
            </div>
            <div class="min-w-0">
              <h1 class="truncate text-3xl font-bold text-slate-900 dark:text-white">
                {{ getSpaceName(currentSpace) }}
              </h1>
              <p class="mt-1 text-slate-600 dark:text-slate-300">
                {{ getSpaceTagline(currentSpace) }}
              </p>
            </div>
          </div>
        </header>

        @if (currentSpace.tools.length === 0) {
          <div
            class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/50"
          >
            <span class="material-symbols-outlined mb-4 text-5xl text-slate-300">construction</span>
            <p class="mb-2 text-lg text-slate-500">{{ t.map()['NO_TOOLS_TITLE'] }}</p>
            <p class="text-sm text-slate-400">{{ t.map()['NO_TOOLS_DESC'] }}</p>
          </div>
        } @else {
          <div class="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside
              class="glass-surface glass-surface-strong relative h-full min-h-0 overflow-hidden rounded-3xl p-4 sm:p-5"
              aria-label="Tool space groups"
            >
              <div
                class="pointer-events-none absolute inset-x-0 -top-20 h-36 bg-gradient-to-b from-cyan-300/20 to-transparent dark:from-cyan-500/20"
              ></div>

              <div class="relative h-full space-y-3 overflow-y-auto overscroll-contain pr-1">
                <p
                  class="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase dark:text-slate-300"
                >
                  {{ t.map()['GROUPS_TITLE'] }}
                </p>

                @for (group of currentSpace.groups; track group.id) {
                  <section
                    class="rounded-2xl border border-white/60 bg-white/45 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/35"
                    [class.space-group-active]="isGroupActive(group)"
                  >
                    <button
                      type="button"
                      class="group flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left"
                      [attr.aria-expanded]="!isGroupCollapsed(currentSpace.id, group.id)"
                      (click)="toggleGroup(currentSpace.id, group.id)"
                    >
                      <span class="text-sm font-semibold text-slate-700 dark:text-slate-100">
                        {{ i18n.resolve(group.label) }}
                      </span>
                      <span
                        class="material-symbols-outlined text-base text-slate-500 transition-transform duration-200 group-hover:text-slate-700 dark:text-slate-300 dark:group-hover:text-white"
                        [class.rotate-180]="!isGroupCollapsed(currentSpace.id, group.id)"
                      >
                        expand_more
                      </span>
                    </button>

                    @if (!isGroupCollapsed(currentSpace.id, group.id)) {
                      @if (group.tools.length === 0) {
                        <div
                          class="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-300"
                        >
                          {{ t.map()['NO_TOOLS_DESC'] }}
                        </div>
                      } @else {
                        <div class="mt-2 space-y-1.5">
                          @for (tool of group.tools; track tool.id) {
                            <a
                              [routerLink]="['/spaces', currentSpace.id, tool.id] | localLink"
                              (click)="rememberSelection(currentSpace.id, tool.id)"
                              class="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all"
                              [class.bg-slate-900]="activeToolId() === tool.id"
                              [class.text-white]="activeToolId() === tool.id"
                              [class.dark:bg-slate-100]="activeToolId() === tool.id"
                              [class.dark:text-slate-900]="activeToolId() === tool.id"
                              [class.text-slate-700]="activeToolId() !== tool.id"
                              [class.dark:text-slate-100]="activeToolId() !== tool.id"
                              [class.hover:bg-slate-100/80]="activeToolId() !== tool.id"
                              [class.dark:hover:bg-slate-800/70]="activeToolId() !== tool.id"
                            >
                              <span
                                class="material-symbols-outlined text-base"
                                [class.opacity-80]="activeToolId() !== tool.id"
                              >
                                {{ tool.icon }}
                              </span>
                              <span class="truncate">{{ i18n.resolve(tool.name) }}</span>
                            </a>
                          }
                        </div>
                      }
                    }
                  </section>
                }
              </div>
            </aside>

            <main class="min-h-0 min-w-0 overflow-hidden">
              @if (loadError()) {
                <div
                  class="rounded-2xl border border-dashed border-red-300 bg-red-50 py-20 text-center dark:border-red-700/40 dark:bg-red-900/20"
                >
                  <span class="material-symbols-outlined mb-4 text-5xl text-red-400">error</span>
                  <p class="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">
                    {{ t.map()['LOAD_ERROR_TITLE'] }}
                  </p>
                  <p class="mb-6 text-sm text-red-500 dark:text-red-300">
                    {{ t.map()['LOAD_ERROR_DESC'] }}
                  </p>
                  <a
                    [routerLink]="'/tools' | localLink"
                    class="rounded-xl bg-slate-900 px-5 py-2 font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {{ t.map()['BROWSE_ALL_TOOLS'] }}
                  </a>
                </div>
              } @else if (componentType()) {
                <div
                  class="glass-subsection h-full min-h-0 overflow-auto overscroll-contain rounded-3xl border border-slate-200/70 p-4 sm:p-5 dark:border-white/10"
                >
                  <ng-container *ngComponentOutlet="componentType(); inputs: toolInputs()" />
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center py-40">
                  <div
                    class="border-primary mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
                  ></div>
                  <p class="animate-pulse font-medium text-slate-400">
                    {{ t.map()['LOADING_TOOL'] }}
                  </p>
                </div>
              }
            </main>
          </div>
        }
      } @else {
        <div class="space-y-4 py-16 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span class="material-symbols-outlined text-3xl text-red-500">error</span>
          </div>
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
            {{ t.map()['SPACE_NOT_FOUND_TITLE'] }}
          </h2>
          <p class="mx-auto max-w-lg text-slate-500 dark:text-slate-400">
            {{ t.map()['SPACE_NOT_FOUND_DESC'] }}
          </p>
          <a
            [routerLink]="'/spaces' | localLink"
            class="inline-flex rounded-xl bg-slate-900 px-5 py-2 font-bold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {{ t.map()['BACK_TO_SPACES'] }}
          </a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .space-group-active {
        border-color: rgba(56, 189, 248, 0.45);
        background: rgba(6, 182, 212, 0.12);
      }

      .dark .space-group-active {
        border-color: rgba(103, 232, 249, 0.35);
        background: rgba(8, 47, 73, 0.5);
      }
    `,
  ],
})
export class ToolSpaceHostComponent {
  private router = inject(Router);
  i18n = inject(I18nService);
  private toolSpaces = inject(ToolSpacesService);
  t = inject(ScopedTranslationService);

  spaceId = input.required<string>();
  toolId = input<string | undefined>();

  space = computed(() => this.toolSpaces.getResolvedSpace(this.spaceId()));

  componentType = signal<Type<unknown> | null>(null);
  loadError = signal(false);
  activeToolId = signal<string | null>(null);
  collapsedGroups = signal<Set<string>>(new Set());

  toolInputs = signal({
    isWidget: false,
    widgetConfig: null,
  });

  constructor() {
    effect(
      async () => {
        const currentSpaceId = this.spaceId();
        const requestedToolId = this.toolId();
        const currentSpace = this.toolSpaces.getResolvedSpace(currentSpaceId);

        this.componentType.set(null);
        this.loadError.set(false);
        this.activeToolId.set(null);

        if (!currentSpace) {
          return;
        }

        this.toolSpaces.setSelectedSpace(currentSpace.id);

        let targetToolId: string | null = null;

        if (requestedToolId && currentSpace.tools.some((tool) => tool.id === requestedToolId)) {
          targetToolId = requestedToolId;
        } else {
          targetToolId = this.toolSpaces.getPreferredToolIdForSpace(currentSpace.id);
        }

        if (!targetToolId) {
          return;
        }

        if (requestedToolId !== targetToolId) {
          await this.router.navigate(
            ['/', this.i18n.currentLang(), 'spaces', currentSpace.id, targetToolId],
            { replaceUrl: true },
          );
          return;
        }

        this.activeToolId.set(targetToolId);
        this.toolSpaces.rememberToolSelection(currentSpace.id, targetToolId);

        const importer = getToolComponent(targetToolId);
        if (!importer) {
          this.loadError.set(true);
          return;
        }

        try {
          const loaded = await importer();
          if (this.activeToolId() === targetToolId) {
            this.componentType.set(loaded);
          }
        } catch (error) {
          console.error(`Failed to load tool "${targetToolId}" inside tool space host.`, error);
          if (this.activeToolId() === targetToolId) {
            this.loadError.set(true);
          }
        }
      },
      { allowSignalWrites: true },
    );
  }

  rememberSelection(spaceId: string, toolId: string) {
    this.toolSpaces.rememberToolSelection(spaceId, toolId);
  }

  toggleGroup(spaceId: string, groupId: string) {
    const key = this.groupKey(spaceId, groupId);
    this.collapsedGroups.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isGroupCollapsed(spaceId: string, groupId: string): boolean {
    return this.collapsedGroups().has(this.groupKey(spaceId, groupId));
  }

  isGroupActive(group: ResolvedToolSpaceGroup): boolean {
    const activeToolId = this.activeToolId();
    if (!activeToolId) {
      return false;
    }

    return group.tools.some((tool) => tool.id === activeToolId);
  }

  getSpaceName(space: ResolvedToolSpace): string {
    return this.i18n.resolve(space.name);
  }

  getSpaceTagline(space: ResolvedToolSpace): string {
    if (space.id === 'developer') {
      return this.t.map()['TAGLINE_DEVELOPER'];
    }

    if (space.id === 'office') {
      return this.t.map()['TAGLINE_OFFICE'];
    }

    return this.getSpaceDescription(space);
  }

  getSpaceDescription(space: ResolvedToolSpace): string {
    return this.i18n.resolve(space.description || '');
  }

  private groupKey(spaceId: string, groupId: string): string {
    return `${spaceId}:${groupId}`;
  }
}
