import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { FulfillmentType, Order, PaymentMethod } from '../../../../core/models/order.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './checkout-modal.component.html',
  styleUrl: './checkout-modal.component.css'
})
export class CheckoutModalComponent {
  readonly state = inject(AserStateService);
  @Output() close = new EventEmitter<void>();

  customerName = '';
  customerPhone = '';
  customerEmail = '';
  companyName = '';
  fulfillment: FulfillmentType = 'BRANCH_PICKUP';
  pickupBranchId = 'BR-02';
  deliveryAddress = '';
  paymentMethod: PaymentMethod = 'MANUAL_BANK_TRANSFER';

  confirmedOrder = signal<Order | null>(null);
  isSubmitting = signal<boolean>(false);
  orderError = signal<string | null>(null);

  get isFormValid(): boolean {
    if (!this.customerName.trim() || !this.customerPhone.trim() || !this.customerEmail.trim()) {
      return false;
    }
    if (this.fulfillment === 'DELIVERY' && !this.deliveryAddress.trim()) {
      return false;
    }
    return true;
  }

  submitOrder() {
    if (!this.isFormValid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.orderError.set(null);

    this.state.placeOrder({
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      customerEmail: this.customerEmail,
      companyName: this.companyName || undefined,
      fulfillment: this.fulfillment,
      pickupBranchId: this.pickupBranchId,
      deliveryAddress: this.deliveryAddress || undefined,
      paymentMethod: this.paymentMethod,
      notes: `Order placed via online storefront. Phone: ${this.customerPhone}`
    }, {
      onSuccess: (order) => {
        this.isSubmitting.set(false);
        this.confirmedOrder.set(order);
      },
      onError: (errMsg) => {
        this.isSubmitting.set(false);
        this.orderError.set(errMsg);
      }
    });
  }

  cancelConfirmedOrder() {
    const order = this.confirmedOrder();
    if (order) {
      this.state.cancelOrder(order.id, 'Customer requested immediate cancellation after checkout');
      this.confirmedOrder.set(null);
      this.close.emit();
    }
  }
}
