import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { ImageSliderComponent } from '../../../../core/components/image-slider/image-slider.component';
import { PublicHeaderComponent } from '../../components/header/public-header.component';
import { PublicFooterComponent } from '../../components/footer/public-footer.component';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal.component';
import { QuoteModalComponent } from '../../components/quote-modal/quote-modal.component';
import { ProductDetailModalComponent } from '../../components/product-detail-modal/product-detail-modal.component';
import { Product, ProductCategory } from '../../../../core/models/product.model';
import { ServiceCategory } from '../../../../core/models/quote.model';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface CatalogProductCardViewModel {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly amharicName?: string;
  readonly category: ProductCategory;
  readonly categoryLabel: string;
  readonly description: string;
  readonly unit: string;
  readonly unitPrice: number;
  readonly isFixedPrice: boolean;
  readonly badge?: string;
  readonly badgeClass: string;
  readonly badgeTextKey: string;
  readonly badgeDefaultText: string;
  readonly images: readonly string[];
  readonly rawProduct: Product;
}

@Component({
  selector: 'aser-public-products-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    PaginatorComponent,
    ImageSliderComponent,
    PublicHeaderComponent,
    PublicFooterComponent,
    CartDrawerComponent,
    CheckoutModalComponent,
    QuoteModalComponent,
    ProductDetailModalComponent,
    TranslatePipe
  ],
  templateUrl: './products-catalog.component.html',
  styleUrl: './products-catalog.component.css'
})
export class ProductsCatalogComponent implements OnInit {
  readonly state = inject(AserStateService);
  private route = inject(ActivatedRoute);

  selectedCategory = 'ALL';
  searchQuery = '';
  availabilityFilter = 'ALL';
  currentPage = 1;
  pageSize = 12;

  isCartOpen = signal(false);
  isCheckoutOpen = signal(false);
  isQuoteOpen = signal(false);
  activeQuoteCategory: ServiceCategory = 'PRINTING_PRESS';
  selectedModalProduct = signal<Product | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory = params['category'];
        this.currentPage = 1;
      }
    });
  }

  get filteredProducts(): Product[] {
    const q = this.searchQuery.toLowerCase().trim();
    const cat = this.selectedCategory;
    const avail = this.availabilityFilter;

    return this.state.products().filter(p => {
      const matchesCat = cat === 'ALL' || p.category === cat;
      const matchesAvail = avail === 'ALL' || p.availability === avail;
      const matchesQuery = !q || `${p.name} ${p.sku} ${p.categoryLabel} ${p.description} ${p.amharicName || ''}`.toLowerCase().includes(q);
      return matchesCat && matchesAvail && matchesQuery && p.isPublished;
    });
  }

  get pagedProducts(): Product[] {
    const list = this.filteredProducts;
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get pagedProductCards(): readonly CatalogProductCardViewModel[] {
    return this.pagedProducts.map(p => this.toProductCardViewModel(p));
  }

  private toProductCardViewModel(product: Product): CatalogProductCardViewModel {
    const badge = this.getAvailabilityBadge(product);
    const images: readonly string[] = product.images && product.images.length > 0
      ? product.images
      : (product.imageUrl ? [product.imageUrl] : []);

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      amharicName: product.amharicName,
      category: product.category,
      categoryLabel: product.categoryLabel,
      description: product.description,
      unit: product.unit,
      unitPrice: product.unitPrice,
      isFixedPrice: product.pricingType === 'FIXED',
      badge: product.badge,
      badgeClass: badge.badgeClass,
      badgeTextKey: badge.textKey,
      badgeDefaultText: badge.defaultText,
      images,
      rawProduct: product
    };
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  onSearchChange(q: string): void {
    this.searchQuery = q;
    this.onFilterChange();
  }

  onAvailabilityFilterChange(filter: string): void {
    this.availabilityFilter = filter;
    this.onFilterChange();
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.currentPage = 1;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'ALL';
    this.availabilityFilter = 'ALL';
    this.currentPage = 1;
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

  closeQuoteModal(): void {
    this.isQuoteOpen.set(false);
  }

  viewProductDetails(product: Product): void {
    this.selectedModalProduct.set(product);
  }

  closeProductDetails(): void {
    this.selectedModalProduct.set(null);
  }

  getAvailabilityBadge(product: Product): { badgeClass: string; textKey: string; defaultText: string } {
    if (product.pricingType === 'QUOTATION') {
      return { badgeClass: 'badge-quote-only', textKey: 'PRODUCTS.QUOTATION_ONLY', defaultText: 'Quotation' };
    }
    if (product.availability === 'OUT_OF_STOCK') {
      return { badgeClass: 'badge-out-of-stock', textKey: 'PRODUCT_DETAIL.OUT_OF_STOCK', defaultText: 'Out of Stock' };
    }
    if (product.availability === 'IN_STOCK') {
      return { badgeClass: 'badge-in-stock', textKey: 'STOREFRONT.IN_STOCK', defaultText: 'In Stock' };
    }
    if (product.availability === 'LIMITED') {
      return { badgeClass: 'badge-limited', textKey: 'PRODUCT_DETAIL.LIMITED_STOCK', defaultText: 'Limited' };
    }
    return { badgeClass: 'badge-quote-only', textKey: 'PRODUCTS.QUOTATION_ONLY', defaultText: 'Quotation' };
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
