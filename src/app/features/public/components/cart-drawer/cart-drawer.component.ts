import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface CartItemViewModel {
  readonly productId: string;
  readonly name: string;
  readonly categoryLabel: string;
  readonly unitPrice: number;
  readonly unit: string;
  readonly quantity: number;
  readonly lineTotal: number;
}

@Component({
  selector: 'aser-cart-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent, TranslatePipe],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.css'
})
export class CartDrawerComponent {
  private readonly state = inject(AserStateService);
  
  @Output() close = new EventEmitter<void>();
  @Output() checkout = new EventEmitter<void>();

  readonly cartCount = this.state.cartCount;
  readonly cartSubtotal = this.state.cartSubtotal;

  readonly items = computed<readonly CartItemViewModel[]>(() => {
    return this.state.cart().map(item => ({
      productId: item.product.id,
      name: item.product.name,
      categoryLabel: item.product.categoryLabel || item.product.category,
      unitPrice: item.product.unitPrice,
      unit: item.product.unit,
      quantity: item.quantity,
      lineTotal: item.lineTotal
    }));
  });

  readonly isEmpty = computed<boolean>(() => this.items().length === 0);

  increaseQuantity(productId: string, currentQty: number): void {
    this.state.updateCartQuantity(productId, currentQty + 1);
  }

  decreaseQuantity(productId: string, currentQty: number): void {
    this.state.updateCartQuantity(productId, Math.max(0, currentQty - 1));
  }

  removeItem(productId: string): void {
    this.state.removeFromCart(productId);
  }

  clearCart(): void {
    this.state.clearCart();
  }

  onClose(): void {
    this.close.emit();
  }

  onCheckout(): void {
    this.checkout.emit();
  }
}
