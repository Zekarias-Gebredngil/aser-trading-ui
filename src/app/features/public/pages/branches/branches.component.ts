import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PublicHeaderComponent } from '../../components/header/public-header.component';
import { PublicFooterComponent } from '../../components/footer/public-footer.component';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal.component';
import { QuoteModalComponent } from '../../components/quote-modal/quote-modal.component';
import { ServiceCategory } from '../../../../core/models/quote.model';
import { Branch } from '../../../../core/models/inventory.model';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-public-branches',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    PublicHeaderComponent,
    PublicFooterComponent,
    CartDrawerComponent,
    CheckoutModalComponent,
    QuoteModalComponent,
    TranslatePipe
  ],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.css'
})
export class BranchesComponent {
  private readonly state = inject(AserStateService);

  // Reactive State Signals
  readonly branches = this.state.branches;
  readonly branchCount = computed(() => this.branches().length);
  readonly totalWarehouses = computed(() =>
    this.branches().reduce((acc, b) => acc + (b.warehouses?.length || 0), 0)
  );

  readonly bannerDescription = computed(() => {
    const count = this.branchCount();
    const whCount = this.totalWarehouses();
    return `Aser Trading operates ${count} registered distribution hubs and ${whCount} specialized warehouses, ensuring fast stock access and convenient customer pickup.`;
  });

  // Modal & Drawer UI State
  readonly isCartOpen = signal(false);
  readonly isCheckoutOpen = signal(false);
  readonly isQuoteOpen = signal(false);
  readonly activeQuoteCategory = signal<ServiceCategory>('PRINTING_PRESS');

  // Business Logic & Formatter Methods
  getBranchCodeTag(branch: Branch): string {
    return `Branch Code: ${branch.code || 'BR'}`;
  }

  getPrimaryPhone(phone?: string): string {
    if (!phone) return '—';
    return phone.split('/')[0].trim();
  }

  getTelHref(phone?: string): string {
    const raw = this.getPrimaryPhone(phone);
    if (!raw || raw === '—') return 'javascript:void(0)';
    const sanitized = raw.replace(/[^\d+]/g, '');
    return sanitized ? `tel:${sanitized}` : 'javascript:void(0)';
  }

  getFullAddress(branch: Branch): string {
    const parts = [branch.address, branch.city].filter(p => p && p.trim().length > 0);
    return parts.length > 0 ? parts.join(', ') : 'Addis Ababa, Ethiopia';
  }

  hasWarehouses(branch: Branch): boolean {
    return !!(branch.warehouses && branch.warehouses.length > 0);
  }

  // Modal & Navigation Handlers
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

  openQuote(cat: ServiceCategory = 'PRINTING_PRESS'): void {
    this.activeQuoteCategory.set(cat);
    this.isQuoteOpen.set(true);
  }

  closeQuote(): void {
    this.isQuoteOpen.set(false);
  }
}
