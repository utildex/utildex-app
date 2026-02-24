import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../services/i18n.service';

@Pipe({
  name: 'localLink',
  standalone: true,
  pure: false, // Must be impure to update when signal changes (though usually lang changes trigger page reload/route change)
  // Actually, route change implies component re-render, but pure:false is safer if we change lang dynamically.
})
export class LocalLinkPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(path: string | unknown[]): unknown[] {
    const lang = this.i18n.currentLang();

    // Handle string path: "/tools" -> ["/", "en", "tools"]
    if (typeof path === 'string') {
      // Handle root path explicitly to ensure clean URL generation
      if (path === '/' || path === '') {
        return ['/', lang];
      }
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return ['/', lang, ...cleanPath.split('/')];
    }

    // Handle array path: ["/", "tools", 123] -> ["/", "en", "tools", 123]
    if (Array.isArray(path)) {
      const segments = [...path];

      // Handle cases where the first segment is "/" or starts with "/"
      if (segments.length > 0 && typeof segments[0] === 'string') {
        if (segments[0] === '/') {
          segments.shift();
        } else if (segments[0].startsWith('/')) {
          segments[0] = segments[0].substring(1);
        }
      }

      return ['/', lang, ...segments];
    }

    return path;
  }
}
