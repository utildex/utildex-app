export type Language = 'en' | 'fr' | 'es' | 'zh';

export interface LanguageInfo {
  code: Language;
  flagCode: string;
  label: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', label: 'English', flagCode: 'us' },
  { code: 'fr', label: 'Français', flagCode: 'fr' },
  { code: 'es', label: 'Español', flagCode: 'es' },
  { code: 'zh', label: '中文', flagCode: 'cn' },
] as const;
