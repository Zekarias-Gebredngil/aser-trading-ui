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

export interface WarehouseViewModel {
  readonly id: string;
  readonly name: string;
  readonly code: string;
}

export interface BranchViewModel {
  readonly id: string;
  readonly name: string;
  readonly codeTag: string;
  readonly isHeadOffice: boolean;
  readonly fullAddress: string;
  readonly phoneDisplay: string;
  readonly telHref: string;
  readonly emailDisplay: string;
  readonly hasWarehouses: boolean;
  readonly warehouses: readonly WarehouseViewModel[];
}

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

  // Raw domain signal
  private readonly rawBranches = this.state.branches;

  // Strongly-typed reactive View Models
  readonly branchList = computed<readonly BranchViewModel[]>(() => {
    return this.rawBranches().map(b => this.toBranchViewModel(b));
  });

  readonly branchCount = computed<number>(() => this.branchList().length);
  readonly totalWarehouses = computed<number>(() =>
    this.branchList().reduce((acc, b) => acc + b.warehouses.length, 0)
  );

  readonly bannerDescription = computed<string>(() => {
    const count = this.branchCount();
    const whCount = this.totalWarehouses();
    return `Aser Trading operates ${count} registered distribution hubs and ${whCount} specialized warehouses, ensuring fast stock access and convenient customer pickup.`;
  });

  // Modal & Drawer UI State
  readonly isCartOpen = signal<boolean>(false);
  readonly isCheckoutOpen = signal<boolean>(false);
  readonly isQuoteOpen = signal<boolean>(false);
  readonly activeQuoteCategory = signal<ServiceCategory>('PRINTING_PRESS');

  private toBranchViewModel(branch: Branch): BranchViewModel {
    const primaryPhone = this.formatPrimaryPhone(branch.phone);
    const addressParts = [branch.address, branch.city].filter(p => !!p && p.trim().length > 0);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Addis Ababa, Ethiopia';

    const warehouses: readonly WarehouseViewModel[] = (branch.warehouses || []).map(w => ({
      id: w.id,
      name: w.name,
      code: w.code
    }));

    return {
      id: branch.id,
      name: branch.name,
      codeTag: `Branch Code: ${branch.code || 'BR'}`,
      isHeadOffice: !!branch.isHeadOffice,
      fullAddress,
      phoneDisplay: branch.phone || '—',
      telHref: this.formatTelHref(primaryPhone),
      emailDisplay: branch.email || '—',
      hasWarehouses: warehouses.length > 0,
      warehouses
    };
  }

  private formatPrimaryPhone(phone?: string): string {
    if (!phone) return '';
    return phone.split('/')[0].trim();
  }

  private formatTelHref(sanitizedPhone: string): string {
    if (!sanitizedPhone) return 'javascript:void(0)';
    const cleanDigits = sanitizedPhone.replace(/[^\d+]/g, '');
    return cleanDigits ? `tel:${cleanDigits}` : 'javascript:void(0)';
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
