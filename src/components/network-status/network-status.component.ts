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
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ],
  template: `
    @if (!network.isOnline()) {
      <div class="fixed bottom-4 right-4 z-50 animate-slide-up">
        <div class="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-slate-700">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span class="text-sm font-medium">{{ t.map()['OFFLINE_MSG'] }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-slide-up { animation: slideUp 0.3s ease-out; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class NetworkStatusComponent {
  network = inject(NetworkService);
  t = inject(ScopedTranslationService);
}