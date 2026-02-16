
import { Component, inject, input, signal, effect, computed, OnInit, ViewEncapsulation, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocalLinkPipe } from '../../core/pipes/local-link.pipe';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ArticleService } from '../../services/article.service';
import { ArticleMetadata } from '../../data/article-registry';
import { I18nService, Language } from '../../services/i18n.service';
import { ClipboardService } from '../../services/clipboard.service';
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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    <!-- Standard Layout Container -->
    <div class="max-w-3xl mx-auto pb-20 animate-fade-in">
      
      <!-- Toolbar / Breadcrumb -->
      <div class="flex items-center justify-between py-6 mb-8 border-b border-slate-200 dark:border-slate-800">
         <a [routerLink]="'/articles' | localLink" class="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group">
            <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span class="font-bold">{{ t.map()['BACK_TO_ARTICLES'] }}</span>
         </a>
         
         <div class="flex items-center gap-2">
            <!-- Appearance Toggle -->
            <div class="relative">
               <button (click)="togglePrefs()" class="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors" [title]="t.map()['READER_SETTINGS']">
                  <span class="material-symbols-outlined">text_fields</span>
               </button>
               
               @if (showPrefs()) {
                  <div class="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 animate-scale-in z-20">
                     <!-- Font Size -->
                     <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                           <span class="text-xs font-bold text-slate-500 uppercase">{{ t.map()['SIZE'] }}</span>
                           <span class="text-xs text-slate-400">{{ fontSize() }}px</span>
                        </div>
                        <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                           <button (click)="decreaseFontSize()" class="flex-1 p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-sm">A-</button>
                           <button (click)="increaseFontSize()" class="flex-1 p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-lg">A+</button>
                        </div>
                     </div>
                     
                     <!-- Font Family -->
                     <div>
                        <span class="text-xs font-bold text-slate-500 uppercase mb-2 block">{{ t.map()['TYPEFACE'] }}</span>
                        <div class="grid grid-cols-3 gap-2">
                           <button (click)="setFont('sans')" [class.ring-2]="fontFamily() === 'sans'" class="p-2 rounded bg-slate-50 dark:bg-slate-800 font-sans text-sm ring-primary hover:bg-slate-100 dark:hover:bg-slate-700">Sans</button>
                           <button (click)="setFont('serif')" [class.ring-2]="fontFamily() === 'serif'" class="p-2 rounded bg-slate-50 dark:bg-slate-800 font-serif text-sm ring-primary hover:bg-slate-100 dark:hover:bg-slate-700">Serif</button>
                           <button (click)="setFont('mono')" [class.ring-2]="fontFamily() === 'mono'" class="p-2 rounded bg-slate-50 dark:bg-slate-800 font-mono text-sm ring-primary hover:bg-slate-100 dark:hover:bg-slate-700">Mono</button>
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
         [class.font-sans]="fontFamily() === 'sans'"
         [class.font-serif]="fontFamily() === 'serif'"
         [class.font-mono]="fontFamily() === 'mono'"
      >
        @if (article(); as meta) {
           <!-- Check content availability or override -->
           @if ((isContentAvailable() || overrideLang()) && !loadError()) {
              <header class="mb-12 text-center animate-fade-in">
                 <div class="flex items-center justify-center gap-2 mb-6 flex-wrap">
                    @for (tag of meta.tags; track tag) {
                       <span class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{{ tag }}</span>
                    }
                 </div>
                 
                 <h1 class="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-6">
                    {{ i18n.resolve(meta.title) }}
                 </h1>
                 
                 <div class="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <div class="flex items-center gap-2">
                       <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {{ meta.author.charAt(0) }}
                       </div>
                       <span class="font-medium">{{ meta.author }}</span>
                    </div>
                    <span>•</span>
                    <span>{{ meta.date | date:'longDate' }}</span>
                    <span>•</span>
                    <span>{{ meta.readingTime }} {{ t.map()['MIN_READ'] }}</span>
                 </div>
              </header>
              
              <!-- Markdown Output -->
              <article 
                class="prose dark:prose-invert max-w-none prose-lg prose-slate prose-img:rounded-xl prose-pre:bg-[#282c34] prose-pre:p-0 prose-pre:overflow-hidden prose-a:text-primary hover:prose-a:text-blue-600 animate-fade-in"
                [innerHTML]="content()"
              ></article>

              <!-- Footer -->
              <div class="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 text-center">
                 <p class="text-slate-500 mb-4">{{ t.map()['THANKS_READING'] }}</p>
                 <a [routerLink]="'/articles' | localLink" class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:opacity-90 transition-opacity">
                    <span class="material-symbols-outlined">arrow_back</span>
                    {{ t.map()['BACK_TO_ARTICLES'] }}
                 </a>
              </div>
           
           } @else {
              <!-- Fallback View: Content Unavailable -->
              <div class="py-32 flex flex-col items-center justify-center text-center animate-fade-in relative">
                 
                 <!-- Background decoration -->
                 <div class="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                    <div class="w-[500px] h-[500px] bg-gradient-to-b from-slate-100 to-transparent dark:from-slate-800/20 dark:to-transparent rounded-full blur-3xl opacity-60"></div>
                 </div>

                 <!-- Content -->
                 <div class="relative z-10 max-w-xl mx-auto space-y-8">
                    <!-- Illustrated Icon Composition -->
                    <div class="flex justify-center mb-6">
                        <div class="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none flex items-center justify-center border border-slate-100 dark:border-slate-700 transform -rotate-12 translate-x-2">
                           <span class="material-symbols-outlined text-3xl text-slate-400">translate</span>
                        </div>
                        <div class="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center border border-slate-100 dark:border-slate-700 transform rotate-6 -translate-x-2 z-10 ring-4 ring-white dark:ring-slate-950">
                           <span class="material-symbols-outlined text-3xl text-primary">public</span>
                        </div>
                    </div>

                    <div>
                        <h2 class="text-3xl font-black text-slate-900 dark:text-white mb-3">
                           {{ format('UNAVAILABLE_MSG', getLangLabel(currentAppLang())) }}
                        </h2>
                        <p class="text-lg text-slate-500 dark:text-slate-400 font-medium">
                           {{ t.map()['AVAILABLE_IN'] }}
                        </p>
                    </div>

                    <!-- Language List -->
                    <div class="flex flex-wrap justify-center gap-3">
                        @for (lang of alternativeLangs(); track lang) {
                            <button (click)="overrideLang.set(lang)" 
                                    class="flex items-center gap-3 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:ring-1 hover:ring-primary hover:bg-primary/5 transition-all bg-white dark:bg-slate-900 shadow-sm hover:shadow-md group">
                               <img [src]="'https://flagcdn.com/w40/' + getLangFlag(lang) + '.png'" class="w-6 h-4 object-cover rounded shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                               <span class="font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                                  {{ format('READ_IN', getLangLabel(lang)) }}
                               </span>
                            </button>
                        }
                    </div>
                 </div>
                 
                 <div class="pt-12 relative z-10">
                    <a [routerLink]="'/articles' | localLink" class="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-wider flex items-center gap-2">
                       <span class="material-symbols-outlined text-lg">arrow_back</span>
                       {{ t.map()['BACK_TO_ARTICLES'] }}
                    </a>
                 </div>
              </div>
           }

        } @else {
           <div class="py-40 text-center">
              <div class="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           </div>
        }
      </main>
    </div>
  `,
  styles: [`
    /* Dynamic Font Size Application */
    article {
      font-size: var(--article-font-size, 18px);
    }
    
    .animate-scale-in { animation: scaleIn 0.1s ease-out; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    
    /* Code Block Styles (Prism Overrides & Enhancements) */
    :not(pre) > code[class*="language-"], pre[class*="language-"] {
      background: #282c34;
      text-shadow: none;
    }
    
    /* Ensure code blocks scroll horizontally */
    pre[class*="language-"] {
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
    
    pre[class*="language-"]:hover .copy-code-btn {
      opacity: 1;
    }
    
    .copy-code-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class ArticleReaderComponent implements OnInit {
  id = input.required<string>();
  
  articleService = inject(ArticleService);
  i18n = inject(I18nService);
  t = inject(ScopedTranslationService);
  sanitizer = inject(DomSanitizer) as DomSanitizer;
  clipboard = inject(ClipboardService);
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

  availableLangs = computed(() => {
     const title = this.article()?.title;
     if (!title || typeof title === 'string') return ['en'];
     return (Object.keys(title) as string[]).filter(
       (key): key is Language => this.VALID_LANGUAGES.includes(key as Language)
     );
  });

  isContentAvailable = computed(() => {
     return this.availableLangs().includes(this.currentAppLang());
  });

  targetLang = computed(() => this.overrideLang() || this.currentAppLang());

  alternativeLangs = computed(() => {
     return this.availableLangs().filter(l => l !== this.targetLang());
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
  }

  ngOnInit() {
     window.scrollTo(0, 0);
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
        }
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
             setTimeout(() => button.textContent = 'Copy', 2000);
          }
       });

       pre.appendChild(button);
    });
  }

  togglePrefs() {
    this.showPrefs.update(v => !v);
  }

  increaseFontSize() {
    this.fontSize.update(v => Math.min(32, v + 2));
  }
  
  decreaseFontSize() {
    this.fontSize.update(v => Math.max(14, v - 2));
  }

  setFont(font: 'sans' | 'serif' | 'mono') {
    this.fontFamily.set(font);
  }

  format(key: string, val: string): string {
    const text = this.t.map()[key] || '';
    return text.replace('$LANG', val);
  }

  getLangLabel(code: string): string {
    return this.i18n.supportedLanguages.find(l => l.code === code)?.label || code;
  }
  
  getLangFlag(code: string): string {
    return this.i18n.supportedLanguages.find(l => l.code === code)?.flagCode || 'us';
  }
}
