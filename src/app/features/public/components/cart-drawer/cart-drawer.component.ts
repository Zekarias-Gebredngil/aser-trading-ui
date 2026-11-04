import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

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

  readonly cart = this.state.cart;
  readonly cartCount = this.state.cartCount;
  readonly cartSubtotal = this.state.cartSubtotal;
  readonly isEmpty = computed(() => this.cart().length === 0);

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
