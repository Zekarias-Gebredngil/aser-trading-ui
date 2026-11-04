import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { ImageSliderComponent } from '../../../../core/components/image-slider/image-slider.component';
import { Product } from '../../../../core/models/product.model';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface ProductSpecEntry {
  readonly key: string;
  readonly value: string;
}

export interface CategoryIconDescriptor {
  readonly name: string;
  readonly color: string;
  readonly size: number;
}

export interface AvailabilityStatusDescriptor {
  readonly textKey: string;
  readonly defaultText: string;
  readonly badgeClass: string;
}

export interface BranchAvailabilityViewModel {
  readonly id: string;
  readonly branchName: string;
  readonly isAvailable: boolean;
}

@Component({
  selector: 'aser-product-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ImageSliderComponent, TranslatePipe],
  templateUrl: './product-detail-modal.component.html',
  styleUrl: './product-detail-modal.component.css'
})
export class ProductDetailModalComponent {
  private readonly state = inject(AserStateService);

  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() requestQuote = new EventEmitter<Product>();

  qty = 1;

  readonly branchStockList = computed<readonly BranchAvailabilityViewModel[]>(() => {
    const isOut = this.product?.availability === 'OUT_OF_STOCK';
    const balances = this.state.inventoryBalances();
    const pid = this.product?.id;

    return this.state.branches().map(b => {
      let isAvailable = !isOut;
      if (balances.length > 0 && pid) {
        const bal = balances.find(item => item.productId === pid && item.branchId === b.id);
        if (bal) {
          isAvailable = bal.availableQty > 0;
        } else if (isOut) {
          isAvailable = false;
        }
      }
      return {
        id: b.id,
        branchName: this.getCleanBranchName(b.name),
        isAvailable
      };
    });
  });

  get specEntries(): readonly ProductSpecEntry[] {
    if (!this.product?.specifications) return [];
    return Object.entries(this.product.specifications).map(([key, value]) => ({ key, value }));
  }

  get productImages(): readonly string[] {
    if (!this.product) return [];
    if (this.product.images && this.product.images.length > 0) {
      return this.product.images;
    }
    return this.product.imageUrl ? [this.product.imageUrl] : [];
  }

  get hasImages(): boolean {
    return this.productImages.length > 0;
  }

  get categoryIcon(): CategoryIconDescriptor {
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

  get availabilityStatus(): AvailabilityStatusDescriptor {
    if (!this.product) return { textKey: '', defaultText: '', badgeClass: '' };
    if (this.product.pricingType === 'QUOTATION') {
      return { textKey: 'PRODUCT_DETAIL.QUOTATION_ONLY', defaultText: 'Quotation Only', badgeClass: 'badge-quote-only' };
    }
    if (this.product.availability === 'OUT_OF_STOCK') {
      return { textKey: 'PRODUCT_DETAIL.OUT_OF_STOCK', defaultText: 'Out of Stock', badgeClass: 'badge-out-of-stock' };
    }
    if (this.product.availability === 'IN_STOCK') {
      return { textKey: 'PRODUCT_DETAIL.IN_STOCK_READY', defaultText: 'In Stock (Ready)', badgeClass: 'badge-in-stock' };
    }
    if (this.product.availability === 'LIMITED') {
      return { textKey: 'PRODUCT_DETAIL.LIMITED_STOCK', defaultText: 'Limited Stock', badgeClass: 'badge-limited' };
    }
    return { textKey: 'PRODUCT_DETAIL.QUOTATION_ONLY', defaultText: 'Quotation Only', badgeClass: 'badge-quote-only' };
  }

  get isOutOfStock(): boolean {
    return this.product?.availability === 'OUT_OF_STOCK';
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
