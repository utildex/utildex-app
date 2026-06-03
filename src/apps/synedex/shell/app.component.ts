import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from '../../../services/ui/theme.service';
import { ModuleService } from '../../../services/modules/module.service';
import { I18nService } from '../../../services/ui/i18n.service';
import { ShortcutService } from '../../../services/platform/shortcut.service';
import { SeoService } from '../../../services/platform/seo.service';
import { AppConfigService } from '../../../services/platform/app-config.service';
import { FontLoaderService } from '../../../services/platform/font-loader.service';
import { AppUpdateService } from '../../../services/platform/app-update.service';
import { provideTranslation, ScopedTranslationService } from '../../../core/i18n';
import { BackgroundComponent } from '../../../components/background/background.component';
import { ToastComponent } from '../../../components/toast/toast.component';
import { SettingsModalComponent } from '../../../components/settings-modal/settings-modal.component';
import { CommandPaletteComponent } from '../../../components/command-palette/command-palette.component';
import { ErrorOverlayComponent } from '../../../components/error-overlay/error-overlay.component';
import { NetworkStatusComponent } from '../../../components/network-status/network-status.component';
import { BubbleDirective } from '../../../directives/bubble.directive';
import { AppFooterComponent } from '../../../components/app-footer/app-footer.component';
import { LocalLinkPipe } from '../../../core/pipes/local-link.pipe';
import en from '../../../i18n/en';
import fr from '../../../i18n/fr';
import es from '../../../i18n/es';
import zh from '../../../i18n/zh';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BackgroundComponent,
    ToastComponent,
    CommandPaletteComponent,
    NetworkStatusComponent,
    ErrorOverlayComponent,
    SettingsModalComponent,
    BubbleDirective,
    AppFooterComponent,
    LocalLinkPipe,
  ],
  templateUrl: './app.component.html',
  providers: [provideTranslation({ en: () => en, fr: () => fr, es: () => es, zh: () => zh })],
})
export class SynedexAppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly i18nService = inject(I18nService);
  themeService = inject(ThemeService);
  moduleService = inject(ModuleService);
  shortcutService = inject(ShortcutService);
  seoService = inject(SeoService);
  appConfig = inject(AppConfigService);
  private readonly fonts = inject(FontLoaderService);
  updates = inject(AppUpdateService);
  t = inject(ScopedTranslationService);

  mobileMenuOpen = signal(false);
  settingsOpen = signal(false);
  isWelcomePage = signal(false);

  @ViewChild(CommandPaletteComponent) commandPalette!: CommandPaletteComponent;

  currentLang = this.i18nService.currentLang;

  ngOnInit(): void {
    this.fonts.observeMaterialSymbolsUsage();
    this.updateShellRouteState();
  }

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.mobileMenuOpen.set(false);
      this.updateShellRouteState();
    });
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

  private updateShellRouteState() {
    const url = this.router.url.split('?')[0];
    const segments = url.split('/').filter((segment) => segment.length > 0);
    this.isWelcomePage.set(segments.length === 1);
  }
}
