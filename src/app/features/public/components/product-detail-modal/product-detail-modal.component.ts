import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { ImageSliderComponent } from '../../../../core/components/image-slider/image-slider.component';
import { Product, ProductCategory } from '../../../../core/models/product.model';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-product-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ImageSliderComponent, TranslatePipe],
  templateUrl: './product-detail-modal.component.html',
  styleUrl: './product-detail-modal.component.css'
})
export class ProductDetailModalComponent {
  readonly state = inject(AserStateService);

  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() requestQuote = new EventEmitter<Product>();

  qty = 1;

  get specEntries(): { key: string; value: string }[] {
    if (!this.product?.specifications) return [];
    return Object.entries(this.product.specifications).map(([key, value]) => ({ key, value }));
  }

  get productImages(): string[] {
    if (!this.product) return [];
    if (this.product.images && this.product.images.length > 0) {
      return this.product.images;
    }
    return this.product.imageUrl ? [this.product.imageUrl] : [];
  }

  get hasImages(): boolean {
    return this.productImages.length > 0;
  }

  get categoryIcon(): { name: string; color: string; size: number } {
    switch (this.product?.category) {
      case 'GARMENT_MATERIALS':
        return { name: 'lucide:scissors', color: 'var(--magenta)', size: 64 };
      case 'PRINTING_SUPPLIES':
        return { name: 'lucide:file-text', color: 'var(--blue)', size: 64 };
      case 'BRANDING_PROMOTION':
        return { name: 'lucide:sparkles', color: 'var(--amber)', size: 64 };
      case 'EQUIPMENT':
        return { name: 'lucide:cog', color: 'var(--ink)', size: 64 };
      default:
        return { name: 'lucide:printer', color: 'var(--blue)', size: 48 };
    }
  }

  get availabilityBadgeClass(): string {
    return this.availabilityStatus.badgeClass;
  }

  get availabilityStatus(): { textKey: string; defaultText: string; badgeClass: string } {
    if (!this.product) return { textKey: '', defaultText: '', badgeClass: '' };
    if (this.product.pricingType === 'QUOTATION') {
      return { textKey: 'PRODUCT_DETAIL.QUOTATION_ONLY', defaultText: 'Quotation Only', badgeClass: 'badge-quote-only' };
    }
    if (this.product.availability === 'IN_STOCK') {
      return { textKey: 'PRODUCT_DETAIL.IN_STOCK_READY', defaultText: 'In Stock (Ready)', badgeClass: 'badge-in-stock' };
    }
    if (this.product.availability === 'LIMITED') {
      return { textKey: 'PRODUCT_DETAIL.LIMITED_STOCK', defaultText: 'Limited Stock', badgeClass: 'badge-limited' };
    }
    return { textKey: 'PRODUCT_DETAIL.QUOTATION_ONLY', defaultText: 'Quotation Only', badgeClass: 'badge-quote-only' };
  }

  get isQuotationOnly(): boolean {
    return this.product?.pricingType === 'QUOTATION';
  }

  get isFixedPrice(): boolean {
    return this.product?.pricingType === 'FIXED';
  }

  incrementQty(): void {
    this.qty++;
  }

  decrementQty(): void {
    if (this.qty > 1) {
      this.qty--;
    }
  }

  getCleanBranchName(name?: string): string {
    if (!name) return '—';
    return name.split('(')[0].trim();
  }

  onAddToCart(): void {
    if (this.product) {
      this.state.addToCart(this.product, this.qty);
      this.close.emit();
    }
  }

  onRequestQuote(): void {
    if (this.product) {
      this.requestQuote.emit(this.product);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
