import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { ImageSliderComponent } from '../../../../core/components/image-slider/image-slider.component';
import { PublicHeaderComponent } from '../../components/header/public-header.component';
import { PublicFooterComponent } from '../../components/footer/public-footer.component';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal.component';
import { QuoteModalComponent } from '../../components/quote-modal/quote-modal.component';
import { ServiceCategory } from '../../../../core/models/quote.model';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface ServiceCardViewModel {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly category: ServiceCategory;
  readonly categoryLabel: string;
  readonly description: string;
  readonly iconName: string;
  readonly images: readonly string[];
  readonly hasImages: boolean;
  readonly features: readonly string[];
  readonly requiresQuotation: boolean;
}

@Component({
  selector: 'aser-public-services',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    ImageSliderComponent,
    PublicHeaderComponent,
    PublicFooterComponent,
    CartDrawerComponent,
    CheckoutModalComponent,
    QuoteModalComponent,
    TranslatePipe
  ],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent {
  private readonly state = inject(AserStateService);

  readonly isCartOpen = signal<boolean>(false);
  readonly isCheckoutOpen = signal<boolean>(false);
  readonly isQuoteOpen = signal<boolean>(false);
  readonly selectedCategory = signal<ServiceCategory>('PRINTING_PRESS');

  readonly serviceCards = computed<readonly ServiceCardViewModel[]>(() => {
    return this.state.activeServices().map(s => ({
      id: s.id,
      code: s.code,
      title: s.title,
      category: s.category,
      categoryLabel: s.categoryLabel,
      description: s.description,
      iconName: s.icon || 'lucide:printer',
      images: s.images || [],
      hasImages: !!(s.images && s.images.length > 0),
      features: s.features || [],
      requiresQuotation: s.requiresQuotation
    }));
  });

  openQuote(cat: ServiceCategory): void {
    this.selectedCategory.set(cat);
    this.isQuoteOpen.set(true);
  }

  closeQuote(): void {
    this.isQuoteOpen.set(false);
  }

  openCart(): void {
    this.isCartOpen.set(true);
  }

  closeCart(): void {
    this.isCartOpen.set(false);
  }

  proceedToCheckout(): void {
    this.isCartOpen.set(false);
    this.isCheckoutOpen.set(true);
  }

  closeCheckout(): void {
    this.isCheckoutOpen.set(false);
  }
}
