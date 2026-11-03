import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

export type SupportedLanguage = 'en' | 'am' | 'ti' | 'om' | 'es' | 'zh';

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  country: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸', country: 'United States' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', country: 'Ethiopia' },
  { code: 'ti', name: 'Tigrigna', nativeName: 'ትግርኛ', flag: '🇪🇹', country: 'Ethiopia / Eritrea' },
  { code: 'om', name: 'Afan Oromo', nativeName: 'Afaan Oromoo', flag: '🇪🇹', country: 'Ethiopia' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', country: 'Spain' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (简体)', flag: '🇨🇳', country: 'China' }
];

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private http = inject(HttpClient);

  readonly currentLang = signal<SupportedLanguage>(this.getInitialLanguage());
  readonly translations = signal<Record<string, any>>({});
  readonly isLoading = signal<boolean>(false);

  private cache = new Map<SupportedLanguage, Record<string, any>>();

  constructor() {
    this.loadTranslations(this.currentLang());
  }

  private getInitialLanguage(): SupportedLanguage {
    const saved = localStorage.getItem('aser_lang') as SupportedLanguage;
    if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
      return saved;
    }
    return 'en';
  }

  setLanguage(lang: SupportedLanguage): void {
    if (this.currentLang() === lang && Object.keys(this.translations()).length > 0) {
      return;
    }
    this.currentLang.set(lang);
    localStorage.setItem('aser_lang', lang);
    this.loadTranslations(lang);
  }

  private loadTranslations(lang: SupportedLanguage): void {
    if (this.cache.has(lang)) {
      this.translations.set(this.cache.get(lang)!);
      return;
    }

    this.isLoading.set(true);
    // Fetch translation dynamically from assets/i18n/{lang}.json or /i18n/{lang}.json
    this.http.get<Record<string, any>>(`assets/i18n/${lang}.json`).pipe(
      catchError(() => this.http.get<Record<string, any>>(`/i18n/${lang}.json`)),
      catchError(() => of({}))
    ).subscribe({
      next: (data) => {
        this.cache.set(lang, data);
        this.translations.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  translate(key: string, defaultValue?: string): string {
    const keys = key.split('.');
    let result: any = this.translations();

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return defaultValue || key;
      }
    }

    return typeof result === 'string' ? result : (defaultValue || key);
  }

  instant(key: string, defaultValue?: string): string {
    return this.translate(key, defaultValue);
  }
}

