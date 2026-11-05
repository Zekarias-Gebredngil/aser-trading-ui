import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { ReceiveStockModalComponent } from '../../components/receive-stock-modal/receive-stock-modal.component';
import { NewTransferModalComponent } from '../../components/new-transfer-modal/new-transfer-modal.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface StockMovementRowViewModel {
  readonly id: string;
  readonly productName: string;
  readonly quantityDelta: number;
  readonly formattedDelta: string;
  readonly deltaColor: string;
  readonly branchName: string;
  readonly warehouseName: string;
  readonly notes: string;
  readonly actor: string;
  readonly visualBackground: string;
  readonly visualColor: string;
  readonly visualIcon: string;
}

export interface DashboardOrderViewModel {
  readonly id: string;
  readonly orderNumber: string;
  readonly customerName: string;
  readonly itemCount: number;
  readonly totalAmount: number;
  readonly isPaid: boolean;
  readonly isPending: boolean;
  readonly paymentStatusKey: string;
  readonly paymentStatusDefault: string;
}

export interface BranchSummaryViewModel {
  readonly branchId: number | string;
  readonly branchName: string;
  readonly warehouseCount: number;
  readonly totalProducts: number;
  readonly totalValuationEtb: number;
}

@Component({
  selector: 'aser-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IconComponent,
    AdminShellComponent,
    ReceiveStockModalComponent,
    NewTransferModalComponent,
    TranslatePipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly state = inject(AserStateService);
  isReceiveModalOpen = signal(false);
  isTransferModalOpen = signal(false);

  // Strongly-typed reactive computed View Models
  readonly userGreetingName = computed<string>(() => this.state.currentUser()?.fullName || this.state.currentRole());
  readonly isAllBranchesScope = computed<boolean>(() => this.state.selectedBranchFilter() === 'ALL');
  readonly activeScopeName = computed<string>(() => {
    const filter = this.state.selectedBranchFilter();
    if (filter === 'ALL') return '';
    return this.state.branches().find(b => b.id === filter)?.name || filter;
  });
  readonly connectedBranchesCount = computed<number>(() => {
    if (!this.isAllBranchesScope()) {
      return 1;
    }
    return this.state.branches().length;
  });
  readonly totalValuation = computed<number>(() => this.state.totalValuation());
  readonly activeLocationsCount = computed<number>(() => this.state.filteredInventory().length);
  readonly lowStockCount = computed<number>(() => this.state.lowStockCount());
  readonly pendingTransfersCount = computed<number>(() => this.state.pendingTransfersCount());
  readonly lowStockColor = computed<string>(() => this.lowStockCount() > 0 ? 'var(--red)' : 'var(--ink)');

  readonly recentStockMovements = computed<readonly StockMovementRowViewModel[]>(() => {
    return this.state.filteredMovements().map(mov => {
      const visual = this.getMovementVisual(mov.type);
      const prefix = mov.quantityDelta > 0 ? '+' : '';
      const formattedDelta = `${prefix}${mov.quantityDelta} ${mov.unit || ''}`.trim();
      return {
        id: mov.id,
        productName: mov.productName,
        quantityDelta: mov.quantityDelta,
        formattedDelta,
        deltaColor: mov.quantityDelta > 0 ? 'var(--green)' : 'var(--red)',
        branchName: mov.branchName,
        warehouseName: mov.warehouseName,
        notes: mov.notes || 'Routine transaction',
        actor: mov.actor,
        visualBackground: visual.background,
        visualColor: visual.color,
        visualIcon: visual.icon
      };
    });
  });

  readonly recentOrders = computed<readonly DashboardOrderViewModel[]>(() => {
    const filter = this.state.selectedBranchFilter();
    const branch = this.state.branches().find(b => b.id === filter);
    const orders = this.state.orders().filter(o => {
      if (filter === 'ALL') return true;
      return !o.pickupBranchName || (branch && o.pickupBranchName.toLowerCase().includes(branch.name.toLowerCase()));
    });
    return orders.slice(0, 3).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      itemCount: order.items?.length || 0,
      totalAmount: order.totalAmount,
      isPaid: order.paymentStatus === 'PAID',
      isPending: order.paymentStatus === 'PENDING',
      paymentStatusKey: order.paymentStatus === 'PAID' ? 'ORDERS.PAID' : 'ORDERS.PENDING',
      paymentStatusDefault: order.paymentStatus === 'PAID' ? 'Paid ✓' : 'Payment Pending'
    }));
  });

  readonly branchSummaries = computed<readonly BranchSummaryViewModel[]>(() => {
    const filter = this.state.selectedBranchFilter();
    const summaries = this.state.stockSummaryReport()?.branchSummaries || [];
    const filtered = filter === 'ALL'
      ? summaries
      : summaries.filter(s => {
          const bIdStr = typeof s.branchId === 'number' ? `BR-0${s.branchId}` : String(s.branchId);
          return bIdStr === filter || String(s.branchId) === filter;
        });

    if (filtered.length === 0 && filter !== 'ALL') {
      const branch = this.state.branches().find(b => b.id === filter);
      if (branch) {
        const items = this.state.filteredInventory();
        const distinctProducts = new Set(items.map(i => i.productId)).size;
        const valuation = items.reduce((sum, i) => sum + i.totalValuation, 0);
        return [{
          branchId: branch.id,
          branchName: branch.name,
          warehouseCount: branch.warehouses?.length || 1,
          totalProducts: distinctProducts,
          totalValuationEtb: valuation
        }];
      }
    }

    return filtered.map(s => ({
      branchId: s.branchId,
      branchName: s.branchName,
      warehouseCount: s.warehouseCount,
      totalProducts: s.totalProducts,
      totalValuationEtb: s.totalValuationEtb
    }));
  });

  readonly hasBranchSummaries = computed<boolean>(() => this.branchSummaries().length > 0);

  openReceiveModal(): void {
    this.isReceiveModalOpen.set(true);
  }

  closeReceiveModal(): void {
    this.isReceiveModalOpen.set(false);
  }

  openTransferModal(): void {
    this.isTransferModalOpen.set(true);
  }

  closeTransferModal(): void {
    this.isTransferModalOpen.set(false);
  }

  get greetingKey(): string {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) {
      return 'DASHBOARD.GOOD_AFTERNOON';
    } else if (hour >= 18 || hour < 5) {
      return 'DASHBOARD.GOOD_EVENING';
    } else {
      return 'DASHBOARD.GOOD_MORNING';
    }
  }

  get greetingDefault(): string {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) {
      return 'Good afternoon';
    } else if (hour >= 18 || hour < 5) {
      return 'Good evening';
    } else {
      return 'Good morning';
    }
  }

  private getMovementVisual(type?: string): { background: string; color: string; icon: string } {
    switch (type) {
      case 'RECEIPT':
        return {
          background: 'var(--green-soft)',
          color: 'var(--green)',
          icon: 'lucide:arrow-down'
        };
      case 'TRANSFER_OUT':
        return {
          background: 'var(--blue-soft)',
          color: 'var(--blue)',
          icon: 'lucide:arrow-left-right-arrows'
        };
      default:
        return {
          background: 'var(--amber-soft)',
          color: 'var(--amber)',
          icon: 'lucide:arrow-up'
        };
    }
  }
}
