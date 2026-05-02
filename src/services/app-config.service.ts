import { Injectable } from '@angular/core';
import { APP_CONFIG, getAppId, resolvePublicBaseUrl, toAbsoluteUrl } from '../core/app.config';

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  readonly appId = getAppId();
  readonly appName = APP_CONFIG.appName;
  readonly githubUrl = APP_CONFIG.githubUrl;
  readonly config = APP_CONFIG;

  getPublicBaseUrl(): string {
    const runtimeOrigin =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;
    return resolvePublicBaseUrl({ runtimeOrigin });
  }

  toAbsoluteUrl(value: string): string {
    return toAbsoluteUrl(this.getPublicBaseUrl(), value);
  }
}
