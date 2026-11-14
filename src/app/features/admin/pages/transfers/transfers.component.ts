import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { NewTransferModalComponent } from '../../components/new-transfer-modal/new-transfer-modal.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StockTransfer, TransferStatus } from '../../../../core/models/transfer.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface TransferItemViewModel {
  readonly requestedQty: number;
  readonly unit: string;
  readonly productName: string;
}

export interface TransferRowViewModel {
  readonly id: string;
  readonly referenceNumber: string;
  readonly date: string;
  readonly fromDisplayName: string;
  readonly toDisplayName: string;
  readonly items: readonly TransferItemViewModel[];
  readonly requestedBy: string;
  readonly status: TransferStatus;
  readonly statusBadgeClass: string;
  readonly rawTransfer: StockTransfer;
}

@Component({
  selector: 'aser-admin-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AdminShellComponent, NewTransferModalComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.css'
})
export class TransfersComponent {
  readonly state = inject(AserStateService);
  private readonly excelService = inject(ExcelExportService);
  private readonly toast = inject(ToastService);

  statusFilter = 'ALL';
  currentPage = 1;
  pageSize = 10;
  selectedTransfer = signal<StockTransfer | null>(null);
  isNewTransferModalOpen = signal(false);

  readonly canRequestTransfer = computed<boolean>(() => this.state.hasPermission('REQUEST_TRANSFER'));
  readonly canApproveTransfer = computed<boolean>(() => this.state.hasPermission('APPROVE_TRANSFER'));
  readonly canDispatchTransfer = computed<boolean>(() => this.state.hasPermission('DISPATCH_TRANSFER'));
  readonly canReceiveTransfer = computed<boolean>(() => this.state.hasPermission('RECEIVE_TRANSFER'));

  get filteredTransfers(): StockTransfer[] {
    const f = this.statusFilter;
    return this.state.filteredTransfers().filter(t => f === 'ALL' || t.status === f);
  }

  get pagedTransfers(): StockTransfer[] {
    const list = this.filteredTransfers;
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get pagedTransferRows(): readonly TransferRowViewModel[] {
    return this.pagedTransfers.map(t => ({
      id: t.id,
      referenceNumber: t.referenceNumber,
      date: t.date,
      fromDisplayName: this.getBranchDisplayName(t.fromBranchName, t.fromWarehouseName),
      toDisplayName: this.getBranchDisplayName(t.toBranchName, t.toWarehouseName),
      items: (t.items || []).map(i => ({
        requestedQty: i.requestedQty,
        unit: i.unit,
        productName: i.productName
      })),
      requestedBy: t.requestedBy || '—',
      status: t.status,
      statusBadgeClass: this.getStatusBadgeClass(t.status),
      rawTransfer: t
    }));
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  onStatusFilterChange(val: string): void {
    this.statusFilter = val;
    this.onFilterChange();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'badge-pending';
      case 'APPROVED':
      case 'RECEIVED':
        return 'badge-in-stock';
      case 'IN_TRANSIT':
        return 'badge-transit';
      case 'DISCREPANCY_REVIEW':
        return 'badge-out-of-stock';
      default:
        return 'badge-pending';
    }
  }

  openNewTransferModal(): void {
    this.isNewTransferModalOpen.set(true);
  }

  closeNewTransferModal(): void {
    this.isNewTransferModalOpen.set(false);
  }

  closeDetailsModal(): void {
    this.selectedTransfer.set(null);
  }

  getBranchDisplayName(name?: string, fallback?: string): string {
    const val = name || fallback || '—';
    return val.split('(')[0].trim();
  }

  openTimeline(event: Event, transfer: StockTransfer) {
    event.stopPropagation();
    this.selectedTransfer.set(transfer);
  }

  approveTransfer(event: Event, transfer: StockTransfer) {
    event.stopPropagation();
    this.state.approveTransfer(transfer.id, `${this.state.currentRole()} (Authorized)`);
    this.refreshSelected(transfer.id);
  }

  rejectTransfer(event: Event, transfer: StockTransfer) {
    event.stopPropagation();
    const reason = prompt('Please specify the reason for rejecting this transfer:', 'Inventory unavailable or duplicate requisition');
    if (reason) {
      this.state.rejectTransfer(transfer.id, reason);
      this.refreshSelected(transfer.id);
    }
  }

  dispatchTransfer(event: Event, transfer: StockTransfer) {
    event.stopPropagation();
    this.state.dispatchTransfer(transfer.id, `${this.state.currentRole()} (Storekeeper)`);
    this.refreshSelected(transfer.id);
  }

  receiveTransfer(event: Event, transfer: StockTransfer) {
    event.stopPropagation();
    this.state.receiveTransfer(transfer.id, `${this.state.currentRole()} (Storekeeper)`);
    this.refreshSelected(transfer.id);
  }

  private refreshSelected(id: string) {
    // Only refresh if modal is already open for this transfer; do not auto-open details modal
    if (this.selectedTransfer()?.id === id) {
      const updated = this.state.transfers().find(t => t.id === id);
      if (updated) {
        this.selectedTransfer.set(updated);
      }
    }
  }

  exportTransfersToExcel(): void {
    const list = this.filteredTransfers;
    if (list.length === 0) {
      this.toast.error('No transfer records found to export.');
      return;
    }

    const data = list.map(t => ({
      'Reference Number': t.referenceNumber,
      'Date': t.date,
      'Source Branch': t.fromBranchName,
      'Source Warehouse': t.fromWarehouseName,
      'Destination Branch': t.toBranchName,
      'Destination Warehouse': t.toWarehouseName,
      'Status': t.status,
      'Items Count': t.items?.length || 0,
      'Requested By': t.requestedBy || '—',
      'Approved By': t.approvedBy || '—',
      'Dispatched By': t.dispatchedBy || '—',
      'Received By': t.receivedBy || '—',
      'Notes': t.notes || '—'
    }));

    this.excelService.exportJsonToExcel(data, 'Aser_Branch_Stock_Transfers', 'Transfers');
    this.toast.success(`Exported ${data.length} transfer records to Excel.`);
  }
}
