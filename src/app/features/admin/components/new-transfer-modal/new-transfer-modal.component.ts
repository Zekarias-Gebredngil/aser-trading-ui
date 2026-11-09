import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
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
export class NewTransferModalComponent implements OnInit {
  readonly state = inject(AserStateService);
  @Output() close = new EventEmitter<void>();

  fromBranchId = 'BR-01';
  toBranchId = 'BR-02';
  productId = 'PRD-02';
  requestedQty = 10;
  notes = 'Replenish showroom display and meet pending customer orders.';
  transferDirection: 'inbound' | 'outbound' = 'inbound';
  submitted = false;
  qtyTouched = false;

  get sameBranchError(): string | null {
    if (this.fromBranchId && this.toBranchId && this.fromBranchId === this.toBranchId) {
      return 'Source and destination branches cannot be the same.';
    }
    return null;
  }

  get qtyError(): string | null {
    if ((this.submitted || this.qtyTouched) && (!this.requestedQty || this.requestedQty <= 0)) {
      return 'Transfer quantity must be greater than 0.';
    }
    return null;
  }

  get productError(): string | null {
    if (this.submitted && !this.productId) {
      return 'Please select a product/equipment to transfer.';
    }
    return null;
  }

  ngOnInit(): void {
    if (this.state.isBranchScopeLocked() && this.state.currentUser()?.assignedBranchId) {
      const myBranch = this.state.currentUser()!.assignedBranchId!;
      const other = this.state.branches().find(b => b.id !== myBranch);
      const otherId = other ? other.id : 'BR-01';

      // Default to inbound replenishment (requesting from another branch to our branch)
      if (this.transferDirection === 'inbound') {
        this.fromBranchId = otherId;
        this.toBranchId = myBranch;
      } else {
        this.fromBranchId = myBranch;
        this.toBranchId = otherId;
      }
    }
  }

  setDirection(direction: 'inbound' | 'outbound'): void {
    this.transferDirection = direction;
    if (this.state.isBranchScopeLocked() && this.state.currentUser()?.assignedBranchId) {
      const myBranch = this.state.currentUser()!.assignedBranchId!;
      if (direction === 'inbound') {
        if (this.toBranchId !== myBranch) {
          const currentFrom = this.fromBranchId === myBranch ? this.toBranchId : this.fromBranchId;
          this.fromBranchId = currentFrom !== myBranch ? currentFrom : (this.state.branches().find(b => b.id !== myBranch)?.id || 'BR-01');
          this.toBranchId = myBranch;
        }
      } else {
        if (this.fromBranchId !== myBranch) {
          const currentTo = this.toBranchId === myBranch ? this.fromBranchId : this.toBranchId;
          this.toBranchId = currentTo !== myBranch ? currentTo : (this.state.branches().find(b => b.id !== myBranch)?.id || 'BR-01');
          this.fromBranchId = myBranch;
        }
      }
    }
  }

  swapBranches(): void {
    const temp = this.fromBranchId;
    this.fromBranchId = this.toBranchId;
    this.toBranchId = temp;
    if (this.state.isBranchScopeLocked() && this.state.currentUser()?.assignedBranchId) {
      const myBranch = this.state.currentUser()!.assignedBranchId!;
      this.transferDirection = (this.toBranchId === myBranch) ? 'inbound' : 'outbound';
    }
  }

  get isValid(): boolean {
    const basic = !!(
      this.fromBranchId &&
      this.toBranchId &&
      this.fromBranchId !== this.toBranchId &&
      this.productId &&
      this.requestedQty > 0
    );
    if (!basic) return false;
    if (this.state.isBranchScopeLocked()) {
      const myBranch = this.state.currentUser()?.assignedBranchId;
      return this.fromBranchId === myBranch || this.toBranchId === myBranch;
    }
    return true;
  }

  submitTransfer() {
    this.submitted = true;
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
