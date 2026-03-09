import {
  Component,
  inject,
  input,
  signal,
  effect,
  computed,
  OnInit,
  ViewEncapsulation,
  ElementRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ArticleService } from '../../services/article.service';
import { ArticleMetadata } from '../../data/article-registry';
import { I18nService, Language } from '../../services/i18n.service';
import { ClipboardService } from '../../services/clipboard.service';
import { FontLoaderService } from '../../services/font-loader.service';
import { ScopedTranslationService, provideTranslation } from '../../core/i18n';
import { marked } from 'marked';
import Prism from 'prismjs';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-article-reader',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, LocalLinkPipe],
  encapsulation: ViewEncapsulation.None, // Required to style injected HTML content
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    <!-- Standard Layout Container -->
    <div class="animate-fade-in mx-auto max-w-3xl pb-20">
      <!-- Toolbar / Breadcrumb -->
      <div
        class="mb-8 flex items-center justify-between border-b border-slate-200 py-6 dark:border-slate-800"
      >
        <a
          [routerLink]="'/articles' | localLink"
          class="glass-control hover:text-primary group flex items-center gap-2 rounded-xl px-3 py-2 text-slate-500 transition-colors"
        >
          <span class="material-symbols-outlined transition-transform group-hover:-translate-x-1"
            >arrow_back</span
          >
          <span class="font-bold">{{ t.map()['BACK_TO_ARTICLES'] }}</span>
        </a>

        <div class="flex items-center gap-2">
          <!-- Appearance Toggle -->
          <div class="relative">
            <button
              (click)="togglePrefs()"
              class="glass-control cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:text-primary"
              [title]="t.map()['READER_SETTINGS']"
            >
              <span class="material-symbols-outlined">text_fields</span>
            </button>

            @if (showPrefs()) {
              <div
                class="glass-surface-strong animate-scale-in absolute top-full right-0 z-20 mt-2 w-64 rounded-xl p-4"
              >
                <!-- Font Size -->
                <div class="mb-4">
                  <div class="mb-2 flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-500 uppercase">{{
                      t.map()['SIZE']
                    }}</span>
                    <span class="text-xs text-slate-400">{{ fontSize() }}px</span>
                  </div>
                  <div class="glass-subsection flex items-center gap-2 rounded-lg p-1">
                    <button
                      (click)="decreaseFontSize()"
                      class="glass-control cursor-pointer flex-1 rounded p-1 text-sm"
                    >
                      A-
                    </button>
                    <button
                      (click)="increaseFontSize()"
                      class="glass-control cursor-pointer flex-1 rounded p-1 text-lg"
                    >
                      A+
                    </button>
                  </div>
                </div>

                <!-- Font Family -->
                <div>
                  <span class="mb-2 block text-xs font-bold text-slate-500 uppercase">{{
                    t.map()['TYPEFACE']
                  }}</span>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      (click)="setFont('sans')"
                      [class.ring-2]="fontFamily() === 'sans'"
                      class="glass-control ring-primary cursor-pointer rounded p-2 font-sans text-sm"
                    >
                      Sans
                    </button>
                    <button
                      (click)="setFont('serif')"
                      [class.ring-2]="fontFamily() === 'serif'"
                      class="glass-control ring-primary cursor-pointer rounded p-2 font-serif text-sm"
                    >
                      Serif
                    </button>
                    <button
                      (click)="setFont('mono')"
                      [class.ring-2]="fontFamily() === 'mono'"
                      class="glass-control ring-primary cursor-pointer rounded p-2 font-mono text-sm"
                    >
                      Mono
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Content -->
      <main
        [style.--article-font-size.px]="fontSize()"
        [class.font-utx-sans]="fontFamily() === 'sans'"
        [class.font-utx-serif]="fontFamily() === 'serif'"
        [class.font-utx-mono]="fontFamily() === 'mono'"
      >
        @if (article(); as meta) {
          <!-- Check content availability or override -->
          @if ((isContentAvailable() || overrideLang()) && !loadError()) {
            <header class="animate-fade-in mb-12 text-center">
              <div class="mb-6 flex flex-wrap items-center justify-center gap-2">
                @for (tag of meta.tags; track tag) {
                  <span
                    class="glass-control rounded px-2 py-1 text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-300"
                    >{{ tag }}</span
                  >
                }
              </div>

              <h1
                class="mb-6 text-3xl leading-tight font-black text-slate-900 md:text-5xl dark:text-white"
              >
                {{ i18n.resolve(meta.title) }}
              </h1>

              <div
                class="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full font-bold"
                  >
                    {{ meta.author.charAt(0) }}
                  </div>
                  <span class="font-medium">{{ meta.author }}</span>
                </div>
                <span>•</span>
                <span>{{ meta.date | date: 'longDate' }}</span>
                <span>•</span>
                <span>{{ meta.readingTime }} {{ t.map()['MIN_READ'] }}</span>
              </div>
            </header>

            <!-- Markdown Output -->
            <article
              class="prose dark:prose-invert prose-lg prose-slate prose-img:rounded-xl prose-pre:bg-[#282c34] prose-pre:p-0 prose-pre:overflow-hidden prose-a:text-primary hover:prose-a:text-blue-600 animate-fade-in max-w-none"
              [innerHTML]="content()"
            ></article>

            <!-- Footer -->
            <div class="mt-20 border-t border-slate-100 pt-10 text-center dark:border-slate-800">
              <p class="mb-4 text-slate-500">{{ t.map()['THANKS_READING'] }}</p>
              <a
                [routerLink]="'/articles' | localLink"
                class="glass-button text-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold transition-opacity hover:opacity-90"
              >
                <span class="material-symbols-outlined">arrow_back</span>
                {{ t.map()['BACK_TO_ARTICLES'] }}
              </a>
            </div>
          } @else {
            <!-- Fallback View: Content Unavailable -->
            <div
              class="animate-fade-in relative flex flex-col items-center justify-center py-32 text-center"
            >
              <!-- Background decoration -->
              <div
                class="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
              >
                <div
                  class="h-[500px] w-[500px] rounded-full bg-gradient-to-b from-slate-100 to-transparent opacity-60 blur-3xl dark:from-slate-800/20 dark:to-transparent"
                ></div>
              </div>

              <!-- Content -->
              <div class="relative z-10 mx-auto max-w-xl space-y-8">
                <!-- Illustrated Icon Composition -->
                <div class="mb-6 flex justify-center">
                  <div
                    class="flex h-16 w-16 translate-x-2 -rotate-12 transform items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none"
                  >
                    <span class="material-symbols-outlined text-3xl text-slate-400">translate</span>
                  </div>
                  <div
                    class="z-10 flex h-16 w-16 -translate-x-2 rotate-6 transform items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-xl ring-4 shadow-slate-200/50 ring-white dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:ring-slate-950"
                  >
                    <span class="material-symbols-outlined text-primary text-3xl">public</span>
                  </div>
                </div>

                <div>
                  <h2 class="mb-3 text-3xl font-black text-slate-900 dark:text-white">
                    {{ format('UNAVAILABLE_MSG', getLangLabel(currentAppLang())) }}
                  </h2>
                  <p class="text-lg font-medium text-slate-500 dark:text-slate-400">
                    {{ t.map()['AVAILABLE_IN'] }}
                  </p>
                </div>

                <!-- Language List -->
                <div class="flex flex-wrap justify-center gap-3">
                  @for (lang of alternativeLangs(); track lang) {
                    <button
                      (click)="overrideLang.set(lang)"
                      class="glass-control hover:border-primary hover:ring-primary hover:bg-primary/5 group flex cursor-pointer items-center gap-3 rounded-xl px-5 py-3 transition-all hover:ring-1"
                    >
                      <img
                        [src]="getLangFlagAsset(lang)"
                        class="h-4 w-6 rounded object-cover opacity-80 shadow-sm transition-opacity group-hover:opacity-100"
                      />
                      <span
                        class="group-hover:text-primary font-bold text-slate-700 transition-colors dark:text-slate-200"
                      >
                        {{ format('READ_IN', getLangLabel(lang)) }}
                      </span>
                    </button>
                  }
                </div>
              </div>

              <div class="relative z-10 pt-12">
                <a
                  [routerLink]="'/articles' | localLink"
                  class="glass-control flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold tracking-wider text-slate-400 uppercase transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <span class="material-symbols-outlined text-lg">arrow_back</span>
                  {{ t.map()['BACK_TO_ARTICLES'] }}
                </a>
              </div>
            </div>
          }
        } @else {
          <div class="py-40 text-center">
            <div
              class="border-primary inline-block h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
            ></div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [
    `
      /* Dynamic Font Size Application */
      article {
        font-size: var(--article-font-size, 18px);
      }

      .animate-scale-in {
        animation: scaleIn 0.1s ease-out;
      }
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      /* Code Block Styles (Prism Overrides & Enhancements) */
      :not(pre) > code[class*='language-'],
      pre[class*='language-'] {
        background: #282c34;
        text-shadow: none;
      }

      /* Ensure code blocks scroll horizontally */
      pre[class*='language-'] {
        overflow: auto;
        padding: 1.5rem !important;
        border-radius: 0.75rem;
        position: relative; /* For copy button absolute positioning */
      }

      /* Style for the injected copy button */
      .copy-code-btn {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
      }

      pre[class*='language-']:hover .copy-code-btn {
        opacity: 1;
      }

      .copy-code-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `,
  ],
})
export class ArticleReaderComponent implements OnInit {
  id = input.required<string>();

  articleService = inject(ArticleService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);
  sanitizer = inject(DomSanitizer) as DomSanitizer;
  clipboard = inject(ClipboardService);
  fontLoader = inject(FontLoaderService);
  el = inject(ElementRef);

  // State
  article = signal<ArticleMetadata | undefined>(undefined);
  content = signal<SafeHtml>('');

  // UI State
  showPrefs = signal(false);

  // Preferences
  fontSize = signal(18);
  fontFamily = signal<'sans' | 'serif' | 'mono'>('sans');

  // Logic for Fallback
  overrideLang = signal<Language | null>(null);
  loadError = signal(false);
  currentAppLang = this.i18n.currentLang;

  private readonly VALID_LANGUAGES: Language[] = ['en', 'fr', 'es', 'zh'];
  private static prismThemeLoaded = false;

  availableLangs = computed(() => {
    const title = this.article()?.title;
    if (!title || typeof title === 'string') return ['en'];
    return (Object.keys(title) as string[]).filter((key): key is Language =>
      this.VALID_LANGUAGES.includes(key as Language),
    );
  });

  isContentAvailable = computed(() => {
    return this.availableLangs().includes(this.currentAppLang());
  });

  targetLang = computed(() => this.overrideLang() || this.currentAppLang());

  alternativeLangs = computed(() => {
    return this.availableLangs().filter((l) => l !== this.targetLang());
  });

  constructor() {
    const size = localStorage.getItem('utildex-reader-size');
    if (size) this.fontSize.set(parseInt(size));

    const font = localStorage.getItem('utildex-reader-font');
    if (font) this.fontFamily.set(font as 'sans' | 'serif' | 'mono');

    effect(() => {
      localStorage.setItem('utildex-reader-size', this.fontSize().toString());
      localStorage.setItem('utildex-reader-font', this.fontFamily());
    });

    effect(() => {
      const id = this.id();
      const lang = this.targetLang();

      if (id) {
        const meta = this.articleService.getById(id);
        this.article.set(meta);

        const isAvailable = this.availableLangs().includes(lang);

        if (isAvailable) {
          this.loadContent(id, lang);
        } else {
          this.loadError.set(true);
        }
      }
    });

    effect(() => {
      const family = this.fontFamily();
      if (family === 'sans') {
        this.fontLoader.ensureInter();
      } else if (family === 'serif') {
        this.fontLoader.ensureMerriweather();
      } else {
        this.fontLoader.ensureRobotoMono();
      }
    });
  }

  ngOnInit() {
    this.ensurePrismTheme();
    window.scrollTo(0, 0);
  }

  private ensurePrismTheme() {
    if (ArticleReaderComponent.prismThemeLoaded || typeof document === 'undefined') {
      return;
    }

    const existing = document.getElementById('prism-theme') as HTMLLinkElement | null;
    if (existing) {
      ArticleReaderComponent.prismThemeLoaded = true;
      return;
    }

    const link = document.createElement('link');
    link.id = 'prism-theme';
    link.rel = 'stylesheet';
    link.href = 'assets/styles/prism-tomorrow.css';
    document.head.appendChild(link);
    ArticleReaderComponent.prismThemeLoaded = true;
  }

  loadContent(id: string, lang: Language) {
    this.loadError.set(false);

    this.articleService.fetchContent(id, lang).subscribe({
      next: (markdown) => {
        if (!markdown) {
          this.loadError.set(true);
          return;
        }

        const rawHtml = marked.parse(markdown) as string;

        this.content.set(this.sanitizer.bypassSecurityTrustHtml(rawHtml));

        setTimeout(() => {
          Prism.highlightAll();
          this.addCopyButtons();
        }, 100);
      },
      error: () => {
        this.loadError.set(true);
      },
    });
  }

  addCopyButtons() {
    const preElements = this.el.nativeElement.querySelectorAll('pre');

    preElements.forEach((pre: HTMLPreElement) => {
      if (pre.querySelector('.copy-code-btn')) return;

      const button = document.createElement('button');
      button.className = 'copy-code-btn';
      button.textContent = 'Copy';
      button.type = 'button';

      button.addEventListener('click', () => {
        const code = pre.querySelector('code');
        if (code) {
          const text = code.innerText;
          this.clipboard.copy(text, 'Article snippet');
          button.textContent = 'Copied!';
          setTimeout(() => (button.textContent = 'Copy'), 2000);
        }
      });

      pre.appendChild(button);
    });
  }

  togglePrefs() {
    this.showPrefs.update((v) => !v);
  }

  increaseFontSize() {
    this.fontSize.update((v) => Math.min(32, v + 2));
  }

  decreaseFontSize() {
    this.fontSize.update((v) => Math.max(14, v - 2));
  }

  setFont(font: 'sans' | 'serif' | 'mono') {
    this.fontFamily.set(font);
  }

  format(key: string, val: string): string {
    const text = this.t.map()[key] || '';
    return text.replace('$LANG', val);
  }

  getLangLabel(code: string): string {
    return this.i18n.supportedLanguages.find((l) => l.code === code)?.label || code;
  }

  getLangFlagAsset(code: string): string {
    return this.i18n.supportedLanguages.find((l) => l.code === code)?.flagAsset || '';
  }
}
