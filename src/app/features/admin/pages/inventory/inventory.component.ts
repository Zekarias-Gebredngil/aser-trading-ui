import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { ReceiveStockModalComponent } from '../../components/receive-stock-modal/receive-stock-modal.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StockBalance } from '../../../../core/models/inventory.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface StockBalanceRowViewModel {
  readonly id: string;
  readonly productName: string;
  readonly productSku: string;
  readonly category: string;
  readonly branchName: string;
  readonly warehouseName: string;
  readonly onHandDisplay: string;
  readonly reservedDisplay: string;
  readonly availableDisplay: string;
  readonly weightedAvgCost: number;
  readonly totalValuation: number;
  readonly status: string;
  readonly statusBadgeClass: string;
  readonly rawBalance: StockBalance;
}

@Component({
  selector: 'aser-admin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AdminShellComponent, ReceiveStockModalComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent {
  readonly state = inject(AserStateService);
  private readonly excelService = inject(ExcelExportService);
  private readonly toast = inject(ToastService);

  searchQuery = '';
  statusFilter = 'ALL';
  activeTab: 'BALANCES' | 'MOVEMENTS' | 'ALERTS' = 'BALANCES';
  isReceiveModalOpen = signal(false);
  isAdjustModalOpen = signal(false);

  readonly canAdjustStock = computed<boolean>(() => {
    const role = this.state.currentRole();
    return role === 'SYSTEM_ADMINISTRATOR' || role === 'INVENTORY_MANAGER';
  });
  readonly canReceiveStock = computed<boolean>(() => this.state.hasPermission('RECEIVE_STOCK'));

  // Pagination
  balancesPage = 1;
  balancesPageSize = 10;
  movementsPage = 1;
  movementsPageSize = 10;

  // Adjustment fields
  adjustWarehouseId = 1;
  adjustProductId = 1;
  adjustDelta = 0;
  adjustReason = 'PHYSICAL_COUNT_AUDIT';
  adjustNotes = '';

  get filteredBalances(): StockBalance[] {
    const q = this.searchQuery.toLowerCase().trim();
    const st = this.statusFilter;

    return this.state.filteredInventory().filter(item => {
      const matchesSearch = !q || `${item.productName} ${item.productSku} ${item.branchName} ${item.category}`.toLowerCase().includes(q);
      const matchesStatus = st === 'ALL' || item.status === st;
      return matchesSearch && matchesStatus;
    });
  }

  get pagedBalances(): StockBalance[] {
    const list = this.filteredBalances;
    const start = (this.balancesPage - 1) * this.balancesPageSize;
    return list.slice(start, start + this.balancesPageSize);
  }

  get pagedBalanceRows(): readonly StockBalanceRowViewModel[] {
    return this.pagedBalances.map(b => ({
      id: b.id,
      productName: b.productName,
      productSku: b.productSku,
      category: b.category,
      branchName: b.branchName,
      warehouseName: b.warehouseName,
      onHandDisplay: `${b.onHandQty} ${b.unit}`,
      reservedDisplay: `${b.reservedQty} ${b.unit}`,
      availableDisplay: `${b.availableQty} ${b.unit}`,
      weightedAvgCost: b.weightedAvgCost,
      totalValuation: b.totalValuation,
      status: b.status,
      statusBadgeClass: this.getStockStatusBadgeClass(b.status),
      rawBalance: b
    }));
  }

  get pagedMovements() {
    const list = this.state.filteredMovements();
    const start = (this.movementsPage - 1) * this.movementsPageSize;
    return list.slice(start, start + this.movementsPageSize);
  }

  onFilterChange(): void {
    this.balancesPage = 1;
  }

  onSearchChange(val: string): void {
    this.searchQuery = val;
    this.onFilterChange();
  }

  onStatusChange(val: string): void {
    this.statusFilter = val;
    this.onFilterChange();
  }

  setActiveTab(tab: 'BALANCES' | 'MOVEMENTS' | 'ALERTS'): void {
    this.activeTab = tab;
  }

  openReceiveModal(): void {
    this.isReceiveModalOpen.set(true);
  }

  closeReceiveModal(): void {
    this.isReceiveModalOpen.set(false);
  }

  closeAdjustModal(): void {
    this.isAdjustModalOpen.set(false);
  }

  onBalancesPageChange(page: number): void {
    this.balancesPage = page;
  }

  onBalancesPageSizeChange(size: number): void {
    this.balancesPageSize = size;
    this.balancesPage = 1;
  }

  onMovementsPageChange(page: number): void {
    this.movementsPage = page;
  }

  onMovementsPageSizeChange(size: number): void {
    this.movementsPageSize = size;
    this.movementsPage = 1;
  }

  getStockStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'In stock':
        return 'badge-in-stock';
      case 'Low stock':
        return 'badge-limited';
      case 'Out of stock':
        return 'badge-out-of-stock';
      default:
        return 'badge-pending';
    }
  }

  get allWarehouses(): { id: number; name: string; branchName: string }[] {
    const filter = this.state.selectedBranchFilter();
    const list: { id: number; name: string; branchName: string }[] = [];
    for (const b of this.state.branches()) {
      if (filter !== 'ALL' && b.id !== filter) continue;
      for (const w of b.warehouses || []) {
        const numId = parseInt(w.id.replace('WH-0', '').replace('WH-', ''), 10);
        list.push({
          id: isNaN(numId) ? 1 : numId,
          name: w.name,
          branchName: b.name
        });
      }
    }
    return list;
  }

  openAdjustModal() {
    const whs = this.allWarehouses;
    if (whs.length > 0) this.adjustWarehouseId = whs[0].id;
    const prods = this.state.products();
    if (prods.length > 0) {
      const pid = parseInt(prods[0].id.replace('PRD-', ''), 10);
      this.adjustProductId = isNaN(pid) ? 1 : pid;
    }
    this.adjustDelta = 0;
    this.adjustReason = 'PHYSICAL_COUNT_AUDIT';
    this.adjustNotes = '';
    this.isAdjustModalOpen.set(true);
  }

  submitAdjustment() {
    if (this.adjustDelta === 0) return;
    this.state.recordStockAdjustment(
      this.adjustWarehouseId,
      this.adjustProductId,
      this.adjustDelta,
      this.adjustReason,
      this.adjustNotes
    );
    this.isAdjustModalOpen.set(false);
  }

  exportInventoryToExcel(): void {
    if (this.activeTab === 'BALANCES') {
      const balances = this.filteredBalances;
      if (balances.length === 0) {
        this.toast.error('No stock balance records found to export.');
        return;
      }
      const data = balances.map(b => ({
        'SKU': b.productSku,
        'Product Name': b.productName,
        'Category': b.category,
        'Branch': b.branchName,
        'Warehouse': b.warehouseName,
        'Physical On Hand': b.onHandQty,
        'Reserved Qty': b.reservedQty,
        'Available to Sell': b.availableQty,
        'Unit': b.unit,
        'Weighted Avg Cost (ETB)': b.weightedAvgCost,
        'Total Valuation (ETB)': b.totalValuation,
        'Status': b.status
      }));
      this.excelService.exportJsonToExcel(data, 'Aser_Inventory_Stock_Balances', 'Stock Balances');
      this.toast.success(`Exported ${data.length} stock balance records to Excel.`);
    } else if (this.activeTab === 'MOVEMENTS') {
      const movements = this.state.filteredMovements();
      if (movements.length === 0) {
        this.toast.error('No stock movement records to export.');
        return;
      }
      const data = movements.map(m => ({
        'Timestamp': m.timestamp,
        'Movement Type': m.type,
        'Product Name': m.productName,
        'SKU': m.productSku,
        'Branch': m.branchName,
        'Warehouse': m.warehouseName,
        'Quantity Delta': m.quantityDelta,
        'Unit': m.unit,
        'Unit Cost (ETB)': m.unitCost || 0,
        'Total Cost (ETB)': m.totalCost || 0,
        'Reference Number': m.referenceNumber,
        'Actor': m.actor
      }));
      this.excelService.exportJsonToExcel(data, 'Aser_Stock_Movements_Ledger', 'Movements');
      this.toast.success(`Exported ${data.length} movement records to Excel.`);
    } else if (this.activeTab === 'ALERTS') {
      const alerts = this.state.lowStockAlerts();
      if (alerts.length === 0) {
        this.toast.error('No low stock alerts to export.');
        return;
      }
      const data = alerts.map(a => ({
        'SKU': a.productSku,
        'Product Name': a.productName,
        'Warehouse': a.warehouseName,
        'Current Stock': a.currentStock,
        'Reorder Threshold': a.reorderThreshold,
        'Shortage Delta': a.shortageQuantity,
        'Urgency Status': 'Reorder Required'
      }));
      this.excelService.exportJsonToExcel(data, 'Aser_Low_Stock_Alerts', 'Low Stock Alerts');
      this.toast.success(`Exported ${data.length} alert records to Excel.`);
    }
  }
}
