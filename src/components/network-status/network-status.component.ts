import { Component, inject } from '@angular/core';
import { NetworkService } from '../../services/network.service';
import { provideTranslation, ScopedTranslationService } from '../../core/i18n';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-network-status',
  standalone: true,
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
  template: `
    @if (!network.isOnline()) {
      <div class="animate-slide-up fixed right-4 bottom-4 z-50">
        <div
          class="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white shadow-lg"
        >
          <span class="relative flex h-3 w-3">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
            ></span>
            <span class="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
          </span>
          <span class="text-sm font-medium">{{ t.map()['OFFLINE_MSG'] }}</span>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .animate-slide-up {
        animation: slideUp 0.3s ease-out;
      }
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class NetworkStatusComponent {
  network = inject(NetworkService);
  t = inject(ScopedTranslationService);
}
