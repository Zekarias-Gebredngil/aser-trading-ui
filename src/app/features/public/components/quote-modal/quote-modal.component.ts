import { Component, EventEmitter, Input, Output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { QuotationRequest, ServiceCategory } from '../../../../core/models/quote.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-quote-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './quote-modal.component.html',
  styleUrl: './quote-modal.component.css'
})
export class QuoteModalComponent implements OnInit {
  readonly state = inject(AserStateService);
  @Input() initialCategory: ServiceCategory = 'PRINTING_PRESS';
  @Output() close = new EventEmitter<void>();

  customerName = '';
  customerPhone = '';
  customerEmail = '';
  companyName = '';
  serviceCategory: ServiceCategory = 'PRINTING_PRESS';
  projectTitle = '';
  specifications = '';
  quantity = 100;
  unit = 'copies';
  targetTimeline = '';
  branchPreference = 'Head Office & Printing Plant (Piassa)';

  confirmedQuote = signal<QuotationRequest | null>(null);

  ngOnInit() {
    if (this.initialCategory) {
      this.serviceCategory = this.initialCategory;
    }
  }

  get isFormValid(): boolean {
    return !!(
      this.customerName.trim() &&
      this.customerPhone.trim() &&
      this.customerEmail.trim() &&
      this.projectTitle.trim() &&
      this.specifications.trim() &&
      this.quantity > 0
    );
  }

  submitQuote() {
    if (!this.isFormValid) return;

    const quote = this.state.submitQuotation({
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      customerEmail: this.customerEmail,
      companyName: this.companyName || undefined,
      serviceCategory: this.serviceCategory,
      projectTitle: this.projectTitle,
      specifications: this.specifications,
      quantity: this.quantity,
      unit: this.unit,
      targetTimeline: this.targetTimeline || undefined,
      deliveryPreference: 'PICKUP',
      branchPreference: this.branchPreference
    });

    this.confirmedQuote.set(quote);
  }
}
