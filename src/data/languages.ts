export type Language = 'en' | 'fr' | 'es' | 'zh';

export interface LanguageInfo {
  code: Language;
  flagCode: string;
  flagAsset: string;
  label: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', label: 'English', flagCode: 'us', flagAsset: 'assets/flags/us.svg' },
  { code: 'fr', label: 'Français', flagCode: 'fr', flagAsset: 'assets/flags/fr.svg' },
  { code: 'es', label: 'Español', flagCode: 'es', flagAsset: 'assets/flags/es.svg' },
  { code: 'zh', label: '中文', flagCode: 'cn', flagAsset: 'assets/flags/cn.svg' },
] as const;
