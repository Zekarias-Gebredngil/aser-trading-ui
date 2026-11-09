import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { FulfillmentType, Order, PaymentMethod } from '../../../../core/models/order.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { isValidEmail, isValidPhone } from '../../../../core/utils/validators';

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
  submitted = signal<boolean>(false);

  // Field touched flags for instant feedback on blur
  nameTouched = false;
  phoneTouched = false;
  emailTouched = false;
  deliveryTouched = false;

  get nameError(): string | null {
    if ((this.submitted() || this.nameTouched) && !this.customerName.trim()) {
      return 'Full name is required.';
    }
    return null;
  }

  get phoneError(): string | null {
    const val = this.customerPhone.trim();
    if ((this.submitted() || this.phoneTouched) && !val) {
      return 'Phone number is required.';
    }
    if (val && !isValidPhone(val)) {
      return 'Please enter a valid phone number (e.g. +251 91 123 4567 or 0911234567).';
    }
    return null;
  }

  get emailError(): string | null {
    const val = this.customerEmail.trim();
    if ((this.submitted() || this.emailTouched) && !val) {
      return 'Email address is required.';
    }
    if (val && !isValidEmail(val)) {
      return 'Please enter a valid email address (e.g. name@company.com).';
    }
    return null;
  }

  get deliveryAddressError(): string | null {
    if (this.fulfillment === 'DELIVERY' && (this.submitted() || this.deliveryTouched) && !this.deliveryAddress.trim()) {
      return 'Delivery address & landmarks are required for company delivery.';
    }
    return null;
  }

  get isFormValid(): boolean {
    if (!this.customerName.trim()) return false;
    if (!this.customerPhone.trim() || !isValidPhone(this.customerPhone)) return false;
    if (!this.customerEmail.trim() || !isValidEmail(this.customerEmail)) return false;
    if (this.fulfillment === 'DELIVERY' && !this.deliveryAddress.trim()) return false;
    if (this.fulfillment === 'BRANCH_PICKUP' && !this.pickupBranchId) return false;
    return true;
  }

  submitOrder() {
    this.submitted.set(true);
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
