import { Component, EventEmitter, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-receive-stock-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './receive-stock-modal.component.html',
  styleUrl: './receive-stock-modal.component.css'
})
export class ReceiveStockModalComponent implements OnInit {
  readonly state = inject(AserStateService);
  @Output() close = new EventEmitter<void>();

  selectedProductId = '';
  selectedBranchId = '';
  selectedWarehouseId = '';
  quantity = 100;
  unitCost = 490.00;
  supplierName = 'Addis Paper & Pulp Factory';
  referenceNumber = 'PO-2026-105';
  notes = 'Goods inspection confirmed zero damage on pallets.';

  currentQty = 0;
  currentAvgCost = 0;
  newAvgCost = 0;
  totalStockAfter = 0;

  private numId(val: string | undefined, prefix: string): number {
    if (!val) return 0;
    return parseInt(val.replace(`${prefix}-0`, '').replace(`${prefix}-`, ''), 10) || 0;
  }

  ngOnInit() {
    if (this.state.suppliers().length > 0) {
      this.supplierName = this.state.suppliers()[0].name;
    }
    if (this.state.products().length > 0) {
      this.selectedProductId = this.state.products()[0].id;
    }
    if (this.state.isBranchScopeLocked() && this.state.currentUser()?.assignedBranchId) {
      this.selectedBranchId = this.state.currentUser()!.assignedBranchId!;
    } else if (this.state.branches().length > 0) {
      this.selectedBranchId = this.state.branches()[0].id;
    }
    const whs = this.availableWarehouses;
    if (whs.length > 0) {
      this.selectedWarehouseId = whs[0].id;
    }
    this.onProductChange();
  }

  get selectedProduct() {
    const prodNum = this.numId(this.selectedProductId, 'PRD');
    return this.state.products().find(p => this.numId(p.id, 'PRD') === prodNum);
  }

  get availableWarehouses() {
    const branchNum = this.numId(this.selectedBranchId, 'BR');
    const br = this.state.branches().find(b => this.numId(b.id, 'BR') === branchNum);
    return br?.warehouses || [];
  }

  onBranchChange() {
    const whs = this.availableWarehouses;
    this.selectedWarehouseId = whs.length > 0 ? whs[0].id : 'WH-01';
    this.onProductChange();
  }

  onProductChange() {
    const prodNum = this.numId(this.selectedProductId, 'PRD');
    const branchNum = this.numId(this.selectedBranchId, 'BR');
    const whNum = this.numId(this.selectedWarehouseId, 'WH');

    const bal = this.state.inventoryBalances().find(b => {
      const bPid = this.numId(b.productId, 'PRD');
      const bWid = this.numId(b.warehouseId, 'WH');
      const bBid = this.numId(b.branchId, 'BR');
      return bPid === prodNum && (whNum > 0 ? bWid === whNum : bBid === branchNum);
    });

    if (bal) {
      this.currentQty = bal.onHandQty;
      this.currentAvgCost = bal.weightedAvgCost;
    } else {
      this.currentQty = 0;
      this.currentAvgCost = this.selectedProduct?.baseCost || 0;
    }
    if (this.currentAvgCost > 0) {
      this.unitCost = Math.round(this.currentAvgCost * 1.02 * 100) / 100;
    }
    this.recalculatePreview();
  }

  recalculatePreview() {
    const inboundQty = Number(this.quantity) || 0;
    const inboundCost = Number(this.unitCost) || 0;
    this.totalStockAfter = this.currentQty + inboundQty;
    if (this.totalStockAfter > 0) {
      this.newAvgCost = ((this.currentQty * this.currentAvgCost) + (inboundQty * inboundCost)) / this.totalStockAfter;
    } else {
      this.newAvgCost = inboundCost;
    }
  }

  get isValid(): boolean {
    return !!(
      this.selectedProductId &&
      this.selectedBranchId &&
      this.quantity > 0 &&
      this.unitCost > 0 &&
      this.supplierName.trim() &&
      this.referenceNumber.trim()
    );
  }

  commitReceipt() {
    if (!this.isValid) return;

    const whId = this.selectedWarehouseId || (this.availableWarehouses[0]?.id) || 'WH-01';

    this.state.receiveStock({
      productId: this.selectedProductId,
      branchId: this.selectedBranchId,
      warehouseId: whId,
      quantity: Number(this.quantity),
      unitCost: Number(this.unitCost),
      supplierName: this.supplierName,
      referenceNumber: this.referenceNumber,
      actor: `${this.state.currentRole()} (Authorized)`,
      notes: this.notes
    });

    this.close.emit();
  }
}
