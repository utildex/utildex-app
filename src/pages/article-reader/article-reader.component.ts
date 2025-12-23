
import { Component, inject, input, signal, effect, OnInit, ViewEncapsulation, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ArticleService } from '../../services/article.service';
import { ArticleMetadata } from '../../data/article-registry';
import { I18nService } from '../../services/i18n.service';
import { ClipboardService } from '../../services/clipboard.service';
import { marked } from 'marked';
import Prism from 'prismjs';

@Component({
  selector: 'app-article-reader',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  encapsulation: ViewEncapsulation.None, // Required to style injected HTML content
  template: `
    <!-- Standard Layout Container -->
    <div class="max-w-3xl mx-auto pb-20 animate-fade-in">
      
      <!-- Toolbar / Breadcrumb -->
      <div class="flex items-center justify-between py-6 mb-8 border-b border-slate-200 dark:border-slate-800">
         <a routerLink="/articles" class="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group">
            <span class="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span class="font-bold">Back to Articles</span>
         </a>
         
         <div class="flex items-center gap-2">
            <!-- Appearance Toggle -->
            <div class="relative">
               <button (click)="togglePrefs()" class="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors" title="Reader Settings">
                  <span class="material-symbols-outlined">text_fields</span>
               </button>
               
               @if (showPrefs()) {
                  <div class="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 animate-scale-in z-20">
                     <!-- Font Size -->
                     <div class="mb-4">
                        <div class="flex justify-between items-center mb-2">
                           <span class="text-xs font-bold text-slate-500 uppercase">Size</span>
                           <span class="text-xs text-slate-400">{{ fontSize() }}px</span>
                        </div>
                        <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                           <button (click)="decreaseFontSize()" class="flex-1 p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-sm">A-</button>
                           <button (click)="increaseFontSize()" class="flex-1 p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-lg">A+</button>
                        </div>
                     </div>
                     
                     <!-- Font Family -->
                     <div>
                        <span class="text-xs font-bold text-slate-500 uppercase mb-2 block">Typeface</span>
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
           <header class="mb-12 text-center">
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
                 <span>{{ meta.readingTime }} min read</span>
              </div>
           </header>
           
           <!-- Markdown Output -->
           <article 
             class="prose dark:prose-invert max-w-none prose-lg prose-slate prose-img:rounded-xl prose-pre:bg-[#282c34] prose-pre:p-0 prose-pre:overflow-hidden prose-a:text-primary hover:prose-a:text-blue-600"
             [innerHTML]="content()"
           ></article>

           <!-- Footer -->
           <div class="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 text-center">
              <p class="text-slate-500 mb-4">Thanks for reading!</p>
              <a routerLink="/articles" class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:opacity-90 transition-opacity">
                 <span class="material-symbols-outlined">arrow_back</span>
                 Back to Articles
              </a>
           </div>

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
  sanitizer = inject(DomSanitizer);
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

  constructor() {
     // Load Prefs from LocalStorage
     const size = localStorage.getItem('utildex-reader-size');
     if (size) this.fontSize.set(parseInt(size));
     
     const font = localStorage.getItem('utildex-reader-font');
     if (font) this.fontFamily.set(font as any);

     // Save Prefs Effect
     effect(() => {
        localStorage.setItem('utildex-reader-size', this.fontSize().toString());
        localStorage.setItem('utildex-reader-font', this.fontFamily());
     });

     // Load Article Logic
     effect(() => {
        const id = this.id();
        if (id) {
           this.article.set(this.articleService.getById(id));
           this.loadContent(id);
        }
     });
  }

  ngOnInit() {
     window.scrollTo(0, 0);
  }

  loadContent(id: string) {
     this.articleService.fetchContent(id).subscribe(markdown => {
        // Parse Markdown to HTML
        const rawHtml = marked.parse(markdown) as string;
        
        // Sanitize and set content
        this.content.set(this.sanitizer.bypassSecurityTrustHtml(rawHtml));

        // Trigger Syntax Highlighting & Copy Buttons
        setTimeout(() => {
           Prism.highlightAll();
           this.addCopyButtons();
        }, 100);
     });
  }

  addCopyButtons() {
    const preElements = this.el.nativeElement.querySelectorAll('pre');
    
    preElements.forEach((pre: HTMLPreElement) => {
       // Avoid adding multiple buttons if called multiple times
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

  // Helper methods to fix template arrow functions
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
}
