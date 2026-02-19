
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { ToolService } from './services/tool.service';
import { I18nService } from './services/i18n.service';
import { ShortcutService } from './services/shortcut.service';
import { SeoService } from './services/seo.service';
import { NetworkService } from './services/network.service'; 
import { provideTranslation, ScopedTranslationService } from './core/i18n';
import { ToastComponent } from './components/toast/toast.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { ClipboardHistoryComponent } from './components/clipboard-history/clipboard-history.component';
import { CommandPaletteComponent } from './components/command-palette/command-palette.component';
import { ErrorOverlayComponent } from './components/error-overlay/error-overlay.component';
import { NetworkStatusComponent } from './components/network-status/network-status.component';
import { DashboardModalsComponent } from './components/dashboard-modals/dashboard-modals.component'; // Added
import { BackgroundComponent } from './components/background/background.component';
import { DownloadStatusComponent } from './components/download-status/download-status.component';
import { GuideComponent } from './components/guide/guide.component';
import { OfflineManagerService } from './services/offline-manager.service';
import { BubbleDirective } from './directives/bubble.directive';
import { LocalLinkPipe } from './core/pipes/local-link.pipe';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    ToastComponent, SettingsModalComponent, ClipboardHistoryComponent, 
    CommandPaletteComponent, ErrorOverlayComponent, NetworkStatusComponent,
    DashboardModalsComponent, DownloadStatusComponent, GuideComponent, BubbleDirective, BackgroundComponent,
    LocalLinkPipe
  ],
  templateUrl: './app.component.html',
  providers: [
    provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })
  ]
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  toolService = inject(ToolService);
  i18nService = inject(I18nService);
  shortcutService = inject(ShortcutService);
  seoService = inject(SeoService); 
  networkService = inject(NetworkService); 
  offline = inject(OfflineManagerService);
  t = inject(ScopedTranslationService);
  router: Router = inject(Router);

  // Layout State
  sidebarOpen = signal(false);
  settingsOpen = signal(false);
  mobileMenuOpen = signal(false);

  @ViewChild(CommandPaletteComponent) commandPalette!: CommandPaletteComponent;

  currentLang = this.i18nService.currentLang;

  ngOnInit() {
    // Services initialized via inject()
  }

  constructor() {
    // Close menus on route change
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.mobileMenuOpen.set(false);
      // We generally want to keep sidebar open if user toggled it, unless on mobile
      if (window.innerWidth < 1024) {
        this.sidebarOpen.set(false);
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen.update((v: boolean) => !v);
  }

  toggleSettings() {
    this.settingsOpen.update((v: boolean) => !v);
  }
  
  toggleMobileMenu() {
    this.mobileMenuOpen.update((v: boolean) => !v);
  }

  openCommandPalette() {
    this.commandPalette.open();
  }
}
