import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { I18nService } from '../../services/i18n.service';

export const languageGuard: CanMatchFn = (route, segments) => {
  const i18n = inject(I18nService);
  const langCode = segments[0]?.path;

  const isValid = i18n.supportedLanguages.some(l => l.code === langCode);

  if (isValid) {
    return true;
  }

  return false;
};
