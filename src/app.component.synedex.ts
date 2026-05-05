import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './services/theme.service';
import { ToolService } from './services/tool.service';
import { I18nService } from './services/i18n.service';
import { ShortcutService } from './services/shortcut.service';
import { SeoService } from './services/seo.service';
import { AppConfigService } from './services/app-config.service';
import { OfflineManagerService } from './services/offline-manager.service';
import { FontLoaderService } from './services/font-loader.service';
import { AppUpdateService } from './services/app-update.service';
import { provideTranslation, ScopedTranslationService } from './core/i18n';
import { BackgroundComponent } from './components/background/background.component';
import { ToastComponent } from './components/toast/toast.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { ClipboardHistoryComponent } from './components/clipboard-history/clipboard-history.component';
import { CommandPaletteComponent } from './components/command-palette/command-palette.component';
import { ErrorOverlayComponent } from './components/error-overlay/error-overlay.component';
import { NetworkStatusComponent } from './components/network-status/network-status.component';
import { DashboardModalsComponent } from './components/dashboard-modals/dashboard-modals.component';
import { DownloadStatusComponent } from './components/download-status/download-status.component';
import { GuideComponent } from './components/guide/guide.component';
import { BubbleDirective } from './directives/bubble.directive';
import { VirtualPetsComponent } from './components/virtual-pets/virtual-pets.component';
import { AppFooterComponent } from './components/app-footer/app-footer.component';
import { LocalLinkPipe } from './core/pipes/local-link.pipe';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import zh from './i18n/zh';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BackgroundComponent,
    ToastComponent,
    ClipboardHistoryComponent,
    CommandPaletteComponent,
    NetworkStatusComponent,
    DashboardModalsComponent,
    DownloadStatusComponent,
    GuideComponent,
    ErrorOverlayComponent,
    SettingsModalComponent,
    BubbleDirective,
    VirtualPetsComponent,
    AppFooterComponent,
    LocalLinkPipe,
  ],
  templateUrl: './app.component.synedex.html',
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
})
export class SynedexAppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly i18nService = inject(I18nService);
  themeService = inject(ThemeService);
  toolService = inject(ToolService);
  shortcutService = inject(ShortcutService);
  seoService = inject(SeoService);
  appConfig = inject(AppConfigService);
  offline = inject(OfflineManagerService);
  private readonly fonts = inject(FontLoaderService);
  updates = inject(AppUpdateService);
  t = inject(ScopedTranslationService);

  sidebarOpen = signal(false);
  mobileMenuOpen = signal(false);
  settingsOpen = signal(false);
  isWelcomePage = signal(false);

  @ViewChild(CommandPaletteComponent) commandPalette!: CommandPaletteComponent;

  currentLang = this.i18nService.currentLang;

  ngOnInit(): void {
    this.fonts.observeMaterialSymbolsUsage();
  }

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.mobileMenuOpen.set(false);
      if (window.innerWidth < 1024) {
        this.sidebarOpen.set(false);
      }
      const url = this.router.url.split('?')[0];
      const segments = url.split('/').filter((s) => s.length > 0);
      this.isWelcomePage.set(segments.length === 1);
    });
  }

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update((open) => !open);
  }

  toggleSettings() {
    this.settingsOpen.update((open) => !open);
  }

  openCommandPalette() {
    this.commandPalette.open();
  }
}
