import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { ImageSliderComponent } from '../../../../core/components/image-slider/image-slider.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { Product, ProductCategory } from '../../../../core/models/product.model';
import { ServiceCategory } from '../../../../core/models/quote.model';
import { PublicHeaderComponent } from '../../components/header/public-header.component';
import { PublicFooterComponent } from '../../components/footer/public-footer.component';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal.component';
import { QuoteModalComponent } from '../../components/quote-modal/quote-modal.component';
import { ProductDetailModalComponent } from '../../components/product-detail-modal/product-detail-modal.component';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-public-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    IconComponent,
    ImageSliderComponent,
    PublicHeaderComponent,
    PublicFooterComponent,
    CartDrawerComponent,
    CheckoutModalComponent,
    QuoteModalComponent,
    ProductDetailModalComponent,
    TranslatePipe
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  readonly state = inject(AserStateService);

  selectedCategory = 'ALL';
  searchQuery = '';

  isCartOpen = signal(false);
  isCheckoutOpen = signal(false);
  isQuoteOpen = signal(false);
  activeQuoteCategory: ServiceCategory = 'PRINTING_PRESS';
  selectedModalProduct = signal<Product | null>(null);

  get filteredProducts(): Product[] {
    const q = this.searchQuery.toLowerCase().trim();
    const cat = this.selectedCategory;

    return this.state.products().filter(p => {
      const matchesCat = cat === 'ALL' || p.category === cat;
      const matchesQuery = !q || `${p.name} ${p.sku} ${p.categoryLabel} ${p.description} ${p.amharicName || ''}`.toLowerCase().includes(q);
      return matchesCat && matchesQuery && p.isPublished;
    });
  }

  addToCart(product: Product) {
    this.state.addToCart(product, 1);
    this.isCartOpen.set(true);
  }

  openQuoteModal(cat: ServiceCategory) {
    this.activeQuoteCategory = cat;
    this.isQuoteOpen.set(true);
  }

  onProductQuoteRequest(product: Product) {
    this.selectedModalProduct.set(null);
    let cat: ServiceCategory = 'PRINTING_PRESS';
    if (product.category === 'BRANDING_PROMOTION') cat = 'BRANDING_PROMOTION';
    else if (product.category === 'GARMENT_MATERIALS') cat = 'GARMENT_MATERIALS';
    else if (product.category === 'EQUIPMENT') cat = 'EQUIPMENT_DISTRIBUTION';
    else if (product.category === 'PRINTING_SUPPLIES') cat = 'PRINTING_SUPPLIES';
    this.openQuoteModal(cat);
  }
}
