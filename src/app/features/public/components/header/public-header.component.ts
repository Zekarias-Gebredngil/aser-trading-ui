import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { ServiceCategory } from '../../../../core/models/quote.model';
import { TranslationService, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface HeaderNavItem {
  readonly path: string;
  readonly labelKey: string;
  readonly defaultLabel: string;
  readonly icon: string;
  readonly exact?: boolean;
}

export interface HeaderLanguageOption {
  readonly code: SupportedLanguage;
  readonly flag: string;
  readonly nativeName: string;
  readonly isCurrent: boolean;
}

@Component({
  selector: 'aser-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, TranslatePipe],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.css'
})
export class PublicHeaderComponent {
  private readonly state = inject(AserStateService);
  private readonly i18n = inject(TranslationService);
  readonly supportedLanguages = SUPPORTED_LANGUAGES;

  @Output() openCart = new EventEmitter<void>();
  @Output() requestQuote = new EventEmitter<ServiceCategory>();

  readonly mobileNavOpen = signal<boolean>(false);
  readonly isLangDropdownOpen = signal<boolean>(false);

  readonly navItems: readonly HeaderNavItem[] = [
    {
      path: '/',
      labelKey: 'STOREFRONT.NAV_HOME',
      defaultLabel: 'Home',
      icon: 'lucide:building-2',
      exact: true
    },
    {
      path: '/services',
      labelKey: 'STOREFRONT.NAV_SERVICES',
      defaultLabel: 'Services',
      icon: 'lucide:sparkles'
    },
    {
      path: '/products',
      labelKey: 'STOREFRONT.NAV_PRODUCTS',
      defaultLabel: 'Products & Supplies',
      icon: 'lucide:package'
    },
    {
      path: '/branches',
      labelKey: 'STOREFRONT.NAV_BRANCHES',
      defaultLabel: 'Branches & Warehouses',
      icon: 'lucide:map-pin'
    }
  ];

  readonly currentLang = computed<string>(() => this.i18n.currentLang());
  readonly cartCount = computed<number>(() => this.state.cartCount());
  readonly hasCartItems = computed<boolean>(() => this.cartCount() > 0);
  readonly isAuthenticated = computed<boolean>(() => this.state.isAuthenticated());
  readonly userRoleLabel = computed<string>(() => this.state.currentUser()?.roleLabel || '');
  readonly portalButtonText = computed<string>(() => {
    const role = this.userRoleLabel();
    return role ? `Enterprise Portal (${role})` : 'Enterprise Portal';
  });

  readonly languageOptions = computed<readonly HeaderLanguageOption[]>(() => {
    const cur = this.currentLang();
    return this.supportedLanguages.map(l => ({
      code: l.code,
      flag: l.flag,
      nativeName: l.nativeName,
      isCurrent: l.code === cur
    }));
  });

  toggleMobileNav(): void {
    this.mobileNavOpen.update(v => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  toggleLangDropdown(): void {
    this.isLangDropdownOpen.update(v => !v);
  }

  selectLanguage(lang: SupportedLanguage): void {
    this.i18n.setLanguage(lang);
    this.isLangDropdownOpen.set(false);
  }

  onOpenCart(): void {
    this.openCart.emit();
  }

  onMobileOpenCart(): void {
    this.openCart.emit();
    this.closeMobileNav();
  }

  onRequestQuote(cat: ServiceCategory = 'PRINTING_PRESS'): void {
    this.requestQuote.emit(cat);
  }

  onMobileRequestQuote(cat: ServiceCategory = 'PRINTING_PRESS'): void {
    this.requestQuote.emit(cat);
    this.closeMobileNav();
  }

  onMobileLogout(): void {
    this.state.logoutStaff();
    this.closeMobileNav();
  }
}
