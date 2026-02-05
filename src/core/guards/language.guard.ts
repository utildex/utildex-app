import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { I18nService, Language } from '../../services/i18n.service';

export const languageGuard: CanMatchFn = (route, segments) => {
  const i18n = inject(I18nService);
  const langCode = segments[0]?.path;

  // Check if the URL segment matches one of our supported languages
  const isValid = i18n.supportedLanguages.some(l => l.code === langCode);

  if (isValid) {
    // If valid, we sync the service with the URL immediately
    // Ideally the service should probably not be updating signals inside a guard 
    // but for this simple app structure it ensures state consistency.
    i18n.setLanguage(langCode as Language);
    return true;
  }

  return false; // Route will not match, Router proceeds to next rule (or 404)
};
