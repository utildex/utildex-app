import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import { I18nService } from '../../services/i18n.service';
import { ResolvedToolSpace, ToolSpacesService } from '../../services/tool-spaces.service';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-tool-spaces',
  standalone: true,
  imports: [RouterLink, LocalLinkPipe],
  providers: [
    provideTranslation({
      en: () => en,
      fr: () => fr,
      es: () => es,
      zh: () => zh,
    }),
  ],
  template: `
    <div
      class="mx-auto flex max-w-7xl flex-col space-y-8 pb-10 lg:min-h-[calc(100dvh-22rem)] lg:justify-center"
    >
      <section class="space-y-3 text-center">
        <h1
          class="inline-flex items-center justify-center gap-3 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white"
        >
          <span class="material-symbols-outlined text-primary text-3xl sm:text-4xl"
            >space_dashboard</span
          >
          {{ t.map()['TITLE'] }}
        </h1>

        <p class="mx-auto max-w-3xl text-slate-600 dark:text-slate-300">
          {{ t.map()['SUBTITLE'] }}
        </p>
      </section>

      @if (orderedSpaces().length === 0) {
        <div
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-800/50"
        >
          <span class="material-symbols-outlined mb-4 text-5xl text-slate-300">folder_off</span>
          <p class="mb-2 text-lg text-slate-500">{{ t.map()['EMPTY_TITLE'] }}</p>
          <p class="text-sm text-slate-400">{{ t.map()['EMPTY_DESC'] }}</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
          @for (space of orderedSpaces(); track space.id) {
            <a
              [routerLink]="getOpenLink(space) | localLink"
              (click)="selectSpace(space.id)"
              class="space-card glass-surface group block self-start rounded-3xl p-6"
            >
              <div class="space-card-glow"></div>

              <div class="relative space-y-4">
                <span
                  class="material-symbols-outlined text-primary/60 group-hover:text-primary absolute top-0 right-0 transition-transform duration-300 group-hover:translate-x-1"
                  >arrow_forward</span
                >

                <div class="flex items-start gap-4">
                  <div
                    class="bg-primary/10 text-primary group-hover:bg-primary rounded-2xl p-3 transition-colors group-hover:text-white"
                  >
                    <span class="material-symbols-outlined text-2xl">{{ space.icon }}</span>
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                      {{ getSpaceName(space) }}
                    </h2>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {{ getSpaceDescription(space) }}
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2">
                  @for (tag of getGroupTags(space); track tag) {
                    <span
                      class="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50/80 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-500/10 dark:text-cyan-200"
                    >
                      {{ tag }}
                    </span>
                  }
                </div>

                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  @for (toolName of getToolHighlights(space); track toolName) {
                    <span
                      class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300"
                    >
                      <span
                        class="material-symbols-outlined text-[14px] text-sky-500 dark:text-sky-300"
                        >bolt</span
                      >
                      <span class="truncate">{{ toolName }}</span>
                    </span>
                  }
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                    >
                      {{ space.tools.length }} {{ t.map()['TOOLS_LABEL'] }}
                    </span>
                    <span
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/90 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/15 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {{ space.groups.length }} {{ t.map()['GROUPS_LABEL'] }}
                    </span>
                  </div>

                  <span class="text-primary inline-flex items-center gap-1 text-sm font-semibold">
                    {{ t.map()['OPEN_SPACE'] }}
                    <span class="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .space-card {
        position: relative;
        overflow: hidden;
        isolation: isolate;
        transition:
          transform 0.28s ease,
          box-shadow 0.28s ease,
          border-color 0.28s ease;
      }

      .space-card:hover {
        transform: translateY(-6px);
      }

      .space-card-glow {
        position: absolute;
        inset: -35%;
        z-index: -1;
        opacity: 0;
        transform: scale(0.9);
        transition:
          opacity 0.35s ease,
          transform 0.35s ease;
        background: radial-gradient(
          circle at 20% 20%,
          rgb(var(--color-primary) / 0.22),
          transparent 55%
        );
      }

      .space-card:hover .space-card-glow {
        opacity: 1;
        transform: scale(1);
      }
    `,
  ],
})
export class ToolSpacesComponent {
  private i18n = inject(I18nService);
  private toolSpaces = inject(ToolSpacesService);
  t = inject(ScopedTranslationService);

  orderedSpaces = computed(() => {
    return [...this.toolSpaces.resolvedSpaces()].sort(
      (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
    );
  });

  selectSpace(spaceId: string) {
    this.toolSpaces.setSelectedSpace(spaceId);
  }

  getSpaceName(space: ResolvedToolSpace): string {
    return this.i18n.resolve(space.name);
  }

  getSpaceDescription(space: ResolvedToolSpace): string {
    return this.i18n.resolve(space.description || '');
  }

  getGroupTags(space: ResolvedToolSpace): string[] {
    return space.groups.slice(0, 3).map((group) => this.i18n.resolve(group.label));
  }

  getToolHighlights(space: ResolvedToolSpace): string[] {
    return space.tools.slice(0, 4).map((tool) => this.i18n.resolve(tool.name));
  }

  getOpenLink(space: ResolvedToolSpace): string[] {
    const preferredToolId = this.toolSpaces.getPreferredToolIdForSpace(space.id);
    if (preferredToolId) {
      return ['/spaces', space.id, preferredToolId];
    }

    return ['/spaces', space.id];
  }
}
