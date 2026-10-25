import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { ImageSliderComponent } from '../../../../core/components/image-slider/image-slider.component';
import { Product } from '../../../../core/models/product.model';
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
  readonly Math = Math;

  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() requestQuote = new EventEmitter<Product>();

  qty = 1;

  get specEntries(): { key: string; value: string }[] {
    if (!this.product?.specifications) return [];
    return Object.entries(this.product.specifications).map(([key, value]) => ({ key, value }));
  }

  onAddToCart() {
    if (this.product) {
      this.state.addToCart(this.product, this.qty);
      this.close.emit();
    }
  }
}
