import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { ServiceCategory } from '../../../../core/models/quote.model';
import { TranslationService, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-public-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, TranslatePipe],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.css'
})
export class PublicHeaderComponent {
  readonly state = inject(AserStateService);
  readonly i18n = inject(TranslationService);
  readonly supportedLanguages = SUPPORTED_LANGUAGES;

  @Output() openCart = new EventEmitter<void>();
  @Output() requestQuote = new EventEmitter<ServiceCategory>();

  mobileNavOpen = signal(false);
  isLangDropdownOpen = signal(false);

  toggleMobileNav() {
    this.mobileNavOpen.update(v => !v);
  }

  closeMobileNav() {
    this.mobileNavOpen.set(false);
  }

  toggleLangDropdown() {
    this.isLangDropdownOpen.update(v => !v);
  }

  selectLanguage(lang: SupportedLanguage) {
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
