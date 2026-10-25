import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PublicHeaderComponent } from '../../components/header/public-header.component';
import { PublicFooterComponent } from '../../components/footer/public-footer.component';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal.component';
import { QuoteModalComponent } from '../../components/quote-modal/quote-modal.component';
import { ServiceCategory } from '../../../../core/models/quote.model';
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
  readonly state = inject(AserStateService);

  isCartOpen = signal(false);
  isCheckoutOpen = signal(false);
  isQuoteOpen = signal(false);

  openQuote(cat: ServiceCategory) {
    this.isQuoteOpen.set(true);
  }
}
