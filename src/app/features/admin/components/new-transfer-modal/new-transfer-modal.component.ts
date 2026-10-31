import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-new-transfer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './new-transfer-modal.component.html',
  styleUrl: './new-transfer-modal.component.css'
})
export class NewTransferModalComponent {
  readonly state = inject(AserStateService);
  @Output() close = new EventEmitter<void>();

  fromBranchId = 'BR-01';
  toBranchId = 'BR-02';
  productId = 'PRD-02';
  requestedQty = 10;
  notes = 'Replenish showroom display and meet pending customer orders.';

  get isValid(): boolean {
    return !!(
      this.fromBranchId &&
      this.toBranchId &&
      this.fromBranchId !== this.toBranchId &&
      this.productId &&
      this.requestedQty > 0
    );
  }

  submitTransfer() {
    if (!this.isValid) return;

    this.state.createTransfer({
      fromBranchId: this.fromBranchId,
      toBranchId: this.toBranchId,
      items: [
        {
          productId: this.productId,
          requestedQty: Number(this.requestedQty)
        }
      ],
      notes: this.notes
    });

    this.close.emit();
  }
}
