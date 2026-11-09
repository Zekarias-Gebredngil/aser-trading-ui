import { Component, EventEmitter, Input, Output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { QuotationRequest, ServiceCategory } from '../../../../core/models/quote.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { isValidEmail, isValidPhone } from '../../../../core/utils/validators';

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
  submitted = signal<boolean>(false);

  nameTouched = false;
  phoneTouched = false;
  emailTouched = false;
  titleTouched = false;
  specsTouched = false;
  qtyTouched = false;
  unitTouched = false;

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
      return 'Please enter a valid phone number (e.g. +251 91 234 5678 or 0912345678).';
    }
    return null;
  }

  get emailError(): string | null {
    const val = this.customerEmail.trim();
    if ((this.submitted() || this.emailTouched) && !val) {
      return 'Email address is required.';
    }
    if (val && !isValidEmail(val)) {
      return 'Please enter a valid email address (e.g. info@company.et).';
    }
    return null;
  }

  get projectTitleError(): string | null {
    if ((this.submitted() || this.titleTouched) && !this.projectTitle.trim()) {
      return 'Project title is required.';
    }
    return null;
  }

  get quantityError(): string | null {
    if ((this.submitted() || this.qtyTouched) && (this.quantity == null || this.quantity <= 0)) {
      return 'Estimated quantity must be greater than 0.';
    }
    return null;
  }

  get unitError(): string | null {
    if ((this.submitted() || this.unitTouched) && !this.unit.trim()) {
      return 'Unit of measure is required (e.g. copies, rolls, pcs).';
    }
    return null;
  }

  get specificationsError(): string | null {
    if ((this.submitted() || this.specsTouched) && !this.specifications.trim()) {
      return 'Detailed specifications & requirements are required.';
    }
    return null;
  }

  ngOnInit() {
    if (this.initialCategory) {
      this.serviceCategory = this.initialCategory;
    }
  }

  get isFormValid(): boolean {
    return !!(
      this.customerName.trim() &&
      this.customerPhone.trim() &&
      isValidPhone(this.customerPhone) &&
      this.customerEmail.trim() &&
      isValidEmail(this.customerEmail) &&
      this.projectTitle.trim() &&
      this.specifications.trim() &&
      this.quantity > 0 &&
      this.unit.trim()
    );
  }

  submitQuote() {
    this.submitted.set(true);
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
