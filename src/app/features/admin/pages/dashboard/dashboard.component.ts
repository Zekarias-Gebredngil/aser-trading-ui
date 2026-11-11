import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { ReceiveStockModalComponent } from '../../components/receive-stock-modal/receive-stock-modal.component';
import { NewTransferModalComponent } from '../../components/new-transfer-modal/new-transfer-modal.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

// ============================================================================
// CONSTANTS (Avoid duplicate string literal smells - S1192) - SonarLint
// ============================================================================
const SCOPE_ALL = 'ALL';
const METRIC_REVENUE = 'revenue';
const METRIC_VOLUME = 'volume';
const METRIC_VALUATION = 'valuation';
const METRIC_UNITS = 'units';
const MODE_CATEGORY = 'category';
const MODE_STATUS = 'status';

const CSS_BLUE = 'var(--blue)';
const CSS_GREEN = 'var(--green)';
const CSS_AMBER = 'var(--amber)';
const CSS_MAGENTA = 'var(--magenta)';
const CSS_RED = 'var(--red)';
const CSS_INK = 'var(--ink)';

const BRAND_PALETTE: readonly string[] = [
  '#1e30c4',
  '#10b981',
  '#ec4899',
  '#f59e0b',
  '#6366f1',
  '#0284c7',
  '#8b5cf6',
  '#ea3b24'
];

// ============================================================================
// VIEW MODEL INTERFACES (Module level to avoid inner declaration smells)
// ============================================================================
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
  readonly totalUnitsOnHand: number;
  readonly totalValuationEtb: number;
}

export interface LineChartPoint {
  readonly label: string;
  readonly value: number;
  readonly formattedValue: string;
  readonly x: number;
  readonly y: number;
}

export interface LineChartViewModel {
  readonly points: readonly LineChartPoint[];
  readonly linePath: string;
  readonly areaPath: string;
  readonly maxValue: number;
  readonly totalFormatted: string;
  readonly yAxisLabels: readonly { value: string; y: number }[];
}

export interface BarChartItem {
  readonly id: string | number;
  readonly label: string;
  readonly shortLabel: string;
  readonly value: number;
  readonly formattedValue: string;
  readonly percentage: number;
  readonly relativePercentage: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly warehouseCount: number;
  readonly skuCount: number;
}

export interface KpiCardBarChart {
  readonly bars: readonly number[];
  readonly progressPercentage: number;
  readonly progressLabel: string;
  readonly color: string;
}

export interface BarChartViewModel {
  readonly bars: readonly BarChartItem[];
  readonly maxValue: number;
  readonly totalFormatted: string;
  readonly yAxisLabels: readonly { value: string; y: number }[];
}

export interface PieChartSlice {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly formattedValue: string;
  readonly percentage: number;
  readonly color: string;
  readonly pathData: string;
}

export interface PieChartViewModel {
  readonly slices: readonly PieChartSlice[];
  readonly totalFormatted: string;
  readonly totalLabel: string;
  readonly totalValue: number;
}

export interface VelocityMetric {
  readonly label: string;
  readonly count: number;
  readonly formattedUnits: string;
  readonly percentage: number;
  readonly color: string;
  readonly icon: string;
}

export interface RawBranchBar {
  readonly id: string | number;
  readonly name: string;
  readonly value: number;
  readonly warehouseCount: number;
  readonly skuCount: number;
}

export interface RawSlice {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

// Pure helper function for category normalization
function normalizeCategoryLabel(raw: string): string {
  const u = raw.toUpperCase().replace(/\s+/g, '_');
  if (u.includes('PRINTING_SUPPLIES') || u === 'PRINTING_PRESS') {
    return 'Printing Supplies';
  }
  if (u.includes('GARMENT')) {
    return 'Garment Materials';
  }
  if (u.includes('BRANDING') || u.includes('PROMO')) {
    return 'Branding & Promotion';
  }
  if (u.includes('EQUIPMENT')) {
    return 'Printing Equipment';
  }
  if (u.includes('SERVICE')) {
    return 'Commercial Printing';
  }
  return raw
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
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
export class DashboardComponent implements OnInit {
  readonly state = inject(AserStateService);
  readonly isReceiveModalOpen = signal(false);
  readonly isTransferModalOpen = signal(false);

  // Chart Metric Toggles
  readonly lineChartMetric = signal<'revenue' | 'volume'>(METRIC_REVENUE);
  readonly barChartMetric = signal<'valuation' | 'units'>(METRIC_VALUATION);
  readonly pieChartMode = signal<'category' | 'status'>(MODE_CATEGORY);

  // Interactive Hover Tooltip Signals
  readonly activeLinePoint = signal<LineChartPoint | null>(null);
  readonly activeBarItem = signal<BarChartItem | null>(null);
  readonly activePieSlice = signal<PieChartSlice | null>(null);

  ngOnInit(): void {
    if (this.state.isAuthenticated()) {
      this.state.fetchReports();
    }
  }

  // Strongly-typed reactive computed View Models
  readonly userGreetingName = computed<string>(() => this.state.currentUser()?.fullName || this.state.currentRole());
  readonly isAllBranchesScope = computed<boolean>(() => this.state.selectedBranchFilter() === SCOPE_ALL);
  readonly activeScopeName = computed<string>(() => {
    const filter = this.state.selectedBranchFilter();
    if (filter === SCOPE_ALL) {
      return '';
    }
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
  readonly lowStockColor = computed<string>(() => this.lowStockCount() > 0 ? CSS_RED : CSS_INK);

  // Master Branch Summaries (computed first for use in KPI micro-charts and branch comparisons)
  readonly branchSummaries = computed<readonly BranchSummaryViewModel[]>(() => {
    const filter = this.state.selectedBranchFilter();
    const summaries = this.state.stockSummaryReport()?.branchSummaries || [];
    const filtered = filter === SCOPE_ALL
      ? summaries
      : summaries.filter(s => {
          const bIdStr = typeof s.branchId === 'number' ? `BR-0${s.branchId}` : String(s.branchId);
          return bIdStr === filter || String(s.branchId) === filter;
        });

    if (filtered.length === 0) {
      return this.synthesizeBranchSummaries(filter);
    }

    return filtered.map(s => ({
      branchId: s.branchId,
      branchName: s.branchName,
      warehouseCount: s.warehouseCount,
      totalProducts: s.totalProducts,
      totalUnitsOnHand: s.totalUnitsOnHand ?? 0,
      totalValuationEtb: s.totalValuationEtb
    }));
  });

  readonly hasBranchSummaries = computed<boolean>(() => this.branchSummaries().length > 0);

  // Micro Bar Charts & Progress Indicators for the first 4 KPI Cards (Built with Actual Ledger Data)
  readonly valuationKpiChart = computed<KpiCardBarChart>(() => {
    const summaries = this.branchSummaries();
    const totalVal = this.totalValuation();
    const items = this.state.filteredInventory();

    let bars: number[] = [];
    if (summaries.length > 0) {
      const maxVal = Math.max(...summaries.map(s => s.totalValuationEtb), 1);
      bars = summaries.map(s => Math.max(12, Math.min(100, Math.round((s.totalValuationEtb / maxVal) * 100))));
      while (bars.length < 5) {
        bars.push(Math.max(10, Math.round((bars.at(-1) || 25) * 0.75)));
      }
    } else {
      bars = [20, 35, 50, 65, 80];
    }

    const healthyValuation = items
      .filter(i => (i.onHandQty || 0) > (i.reorderPoint || 0))
      .reduce((sum, i) => sum + (i.totalValuation || 0), 0);
    const progressPercentage = totalVal > 0 ? Math.min(100, Math.round((healthyValuation / totalVal) * 100)) : 100;
    const progressLabel = totalVal > 0
      ? `${progressPercentage}% healthy inventory valuation`
      : 'Initial inventory ready';

    return {
      bars: bars.slice(0, 7),
      progressPercentage,
      progressLabel,
      color: CSS_BLUE
    };
  });

  readonly locationsKpiChart = computed<KpiCardBarChart>(() => {
    const summaries = this.branchSummaries();
    const totalCatalogProducts = Math.max(this.state.products().length, 1);
    const stockedProductsCount = new Set(
      this.state.filteredInventory().filter(i => (i.onHandQty || 0) > 0).map(i => i.productId)
    ).size;

    let bars: number[] = [];
    if (summaries.length > 0) {
      const maxProducts = Math.max(...summaries.map(s => s.totalProducts), 1);
      bars = summaries.map(s => Math.max(14, Math.round((s.totalProducts / maxProducts) * 100)));
      while (bars.length < 5) {
        bars.push(Math.max(12, Math.round((bars.at(-1) || 30) * 0.8)));
      }
    } else {
      bars = [25, 45, 60, 75, 90];
    }

    const progressPercentage = Math.min(100, Math.max(0, Math.round((stockedProductsCount / totalCatalogProducts) * 100)));
    const totalCatalogCount = this.state.products().length || stockedProductsCount;
    const progressLabel = `${stockedProductsCount} of ${totalCatalogCount} catalog items stocked`;

    return {
      bars: bars.slice(0, 7),
      progressPercentage,
      progressLabel,
      color: CSS_GREEN
    };
  });

  readonly lowStockKpiChart = computed<KpiCardBarChart>(() => {
    const alerts = this.lowStockCount();
    const items = this.state.filteredInventory();
    const totalTracked = Math.max(items.length, 1);

    if (alerts === 0) {
      return {
        bars: [100, 100, 100, 100, 100],
        progressPercentage: 100,
        progressLabel: '100% of items above safety stock',
        color: CSS_GREEN
      };
    }

    const lowStockItems = items.filter(i => (i.onHandQty || 0) <= (i.reorderPoint || 0));
    const bars = lowStockItems.slice(0, 7).map(i => {
      const rp = Math.max(i.reorderPoint || 1, 1);
      return Math.max(10, Math.min(100, Math.round(((i.onHandQty || 0) / rp) * 100)));
    });
    while (bars.length < 5) {
      bars.push(15);
    }

    const lowStockPct = Math.min(100, Math.round((alerts / totalTracked) * 100));
    return {
      bars: bars.slice(0, 7),
      progressPercentage: Math.max(8, lowStockPct),
      progressLabel: `${alerts} items below safety stock (${lowStockPct}%)`,
      color: CSS_AMBER
    };
  });

  readonly transfersKpiChart = computed<KpiCardBarChart>(() => {
    const transfers = this.state.filteredTransfers();
    const pending = this.pendingTransfersCount();
    const total = transfers.length;

    const counts = [
      transfers.filter(t => t.status === 'PENDING_APPROVAL' || t.status === 'DRAFT').length,
      transfers.filter(t => t.status === 'APPROVED').length,
      transfers.filter(t => t.status === 'IN_TRANSIT').length,
      transfers.filter(t => t.status === 'RECEIVED').length,
      transfers.filter(t => t.status === 'REJECTED' || t.status === 'DISCREPANCY_REVIEW').length
    ];

    const maxCount = Math.max(...counts, 1);
    const bars = total > 0
      ? counts.map(c => Math.max(12, Math.round((c / maxCount) * 100)))
      : [20, 30, 40, 50, 60];

    const progressPercentage = total > 0 ? Math.min(100, Math.round((pending / total) * 100)) : 0;
    let progressLabel = 'No transfers pending';
    if (pending > 0) {
      progressLabel = `${pending} pending of ${total} total transfers (${progressPercentage}%)`;
    } else if (total > 0) {
      progressLabel = `All ${total} transfers completed`;
    }

    return {
      bars,
      progressPercentage: pending > 0 ? Math.max(10, progressPercentage) : 100,
      progressLabel,
      color: CSS_MAGENTA
    };
  });

  readonly recentStockMovements = computed<readonly StockMovementRowViewModel[]>(() => {
    return this.state.filteredMovements().slice(0, 5).map(mov => {
      const visual = this.getMovementVisual(mov.type);
      const prefix = mov.quantityDelta > 0 ? '+' : '';
      const formattedDelta = `${prefix}${mov.quantityDelta} ${mov.unit || ''}`.trim();
      return {
        id: mov.id,
        productName: mov.productName,
        quantityDelta: mov.quantityDelta,
        formattedDelta,
        deltaColor: mov.quantityDelta > 0 ? CSS_GREEN : CSS_RED,
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
      if (filter === SCOPE_ALL) {
        return true;
      }
      return !o.pickupBranchName || (branch && o.pickupBranchName.toLowerCase().includes(branch.name.toLowerCase()));
    });
    return orders.slice(0, 4).map(order => {
      const isPaid = order.paymentStatus === 'PAID';
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        itemCount: order.items?.length || 0,
        totalAmount: order.totalAmount,
        isPaid,
        isPending: order.paymentStatus === 'PENDING',
        paymentStatusKey: isPaid ? 'ORDERS.PAID' : 'ORDERS.PENDING',
        paymentStatusDefault: isPaid ? 'Paid ✓' : 'Payment Pending'
      };
    });
  });

  // ==========================================
  // 1. LINE CHART: REVENUE & ORDER VOLUME TREND (Actual Daily Timeline)
  // ==========================================
  readonly lineChartData = computed<LineChartViewModel>(() => {
    const metric = this.lineChartMetric();
    const filter = this.state.selectedBranchFilter();
    const branch = this.state.branches().find(b => b.id === filter);

    const orders = this.state.orders().filter(o => {
      if (filter === SCOPE_ALL) {
        return true;
      }
      return !o.pickupBranchName || (branch && o.pickupBranchName.toLowerCase().includes(branch.name.toLowerCase()));
    });

    const quotations = this.state.quotations().filter(q => {
      if (filter === SCOPE_ALL) {
        return true;
      }
      return !q.branchPreference || (branch && q.branchPreference.toLowerCase().includes(branch.name.toLowerCase()));
    });

    const timelineDays = this.buildTimelineDays(orders, quotations);
    const rawValues = timelineDays.map(slot => this.calculateDailyMetric(slot.date, orders, quotations, metric));

    const totalInPeriod = rawValues.reduce((sum, v) => sum + v, 0);
    const maxValFound = Math.max(...rawValues, 0);
    const defaultMax = metric === METRIC_REVENUE ? 5000 : 10;
    const maxValue = maxValFound > 0 ? maxValFound : defaultMax;

    const chartLeft = 55;
    const chartRight = 550;
    const chartWidth = chartRight - chartLeft;
    const chartTop = 30;
    const chartBottom = 175;
    const chartHeight = chartBottom - chartTop;

    const points: LineChartPoint[] = timelineDays.map((slot, idx) => {
      const val = rawValues[idx] || 0;
      const x = chartLeft + (idx / (timelineDays.length - 1)) * chartWidth;
      const y = maxValFound > 0
        ? chartBottom - (val / maxValue) * chartHeight
        : chartBottom;
      const formattedValue = metric === METRIC_REVENUE
        ? `ETB ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${val} Orders`;
      return { label: slot.label, value: val, formattedValue, x, y };
    });

    const linePath = this.buildSmoothLinePath(points);
    const areaPath = this.buildAreaPath(linePath, points, chartBottom);
    const yAxisLabels = this.buildLineChartYLabels(metric, maxValue, chartTop, chartHeight, chartBottom);

    const totalFormatted = metric === METRIC_REVENUE
      ? `ETB ${totalInPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${totalInPeriod} Orders`;

    return {
      points,
      linePath,
      areaPath,
      maxValue,
      totalFormatted,
      yAxisLabels
    };
  });

  // ==========================================
  // 2. BAR CHART: BRANCH INVENTORY VALUATION (Horizontal Progress Bars)
  // ==========================================
  readonly barChartData = computed<BarChartViewModel>(() => {
    const metric = this.barChartMetric();
    const summaries = this.branchSummaries();
    const branches = this.state.branches();

    const rawList: RawBranchBar[] = this.buildRawBranchBars(summaries, branches, metric);
    const totalVal = rawList.reduce((sum, item) => sum + item.value, 0);
    const maxValue = Math.max(...rawList.map(i => i.value), 1);

    const chartLeft = 55;
    const chartRight = 550;
    const chartWidth = chartRight - chartLeft;
    const chartTop = 30;
    const chartBottom = 175;
    const chartHeight = chartBottom - chartTop;

    const count = Math.max(rawList.length, 1);
    const slotWidth = chartWidth / count;
    const barWidth = Math.min(Math.max(slotWidth * 0.55, 20), 48);

    const bars: BarChartItem[] = rawList.map((item, idx) => {
      const x = chartLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
      const height = maxValue > 0 ? Math.max((item.value / maxValue) * chartHeight, 4) : 4;
      const y = chartBottom - height;
      const percentage = totalVal > 0 ? Math.round((item.value / totalVal) * 100) : 0;

      let relativePercentage = 0;
      if (maxValue > 0) {
        const floor = item.value > 0 ? 5 : 0;
        relativePercentage = Math.max(floor, Math.round((item.value / maxValue) * 100));
      }

      const formattedValue = metric === METRIC_VALUATION
        ? `ETB ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${item.value.toLocaleString()} units`;

      const shortLabel = item.name
        .replace('Distribution Depot', 'Depot')
        .replace('Main Industrial Plant', 'HQ Plant')
        .replace('Central Logistics Depot', 'Depot')
        .replace('Regional Depot', 'Depot');

      return {
        id: item.id,
        label: item.name,
        shortLabel,
        value: item.value,
        formattedValue,
        percentage,
        relativePercentage,
        x,
        y,
        width: barWidth,
        height,
        color: BRAND_PALETTE[idx % BRAND_PALETTE.length] || BRAND_PALETTE[0],
        warehouseCount: item.warehouseCount,
        skuCount: item.skuCount
      };
    });

    const yAxisLabels = [
      {
        value: metric === METRIC_VALUATION ? `ETB ${Math.round(maxValue / 1000)}k` : `${Math.round(maxValue)}`,
        y: chartTop + 4
      },
      {
        value: metric === METRIC_VALUATION ? `ETB ${Math.round((maxValue * 0.5) / 1000)}k` : `${Math.round(maxValue * 0.5)}`,
        y: chartTop + chartHeight * 0.5 + 4
      },
      {
        value: '0',
        y: chartBottom + 4
      }
    ];

    const totalFormatted = metric === METRIC_VALUATION
      ? `ETB ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${totalVal.toLocaleString()} Units`;

    return {
      bars,
      maxValue,
      totalFormatted,
      yAxisLabels
    };
  });

  // ==========================================
  // 3. PIE / DONUT CHART: CATEGORY & ORDER DISTRIBUTION
  // ==========================================
  readonly pieChartData = computed<PieChartViewModel>(() => {
    const mode = this.pieChartMode();
    const rawSlices = mode === MODE_CATEGORY
      ? this.buildCategorySlices()
      : this.buildStatusSlices();

    const totalLabel = mode === MODE_CATEGORY ? 'Inventory Valuation' : 'Total Orders';
    const totalValue = rawSlices.reduce((acc, curr) => acc + curr.value, 0);

    const cx = 140;
    const cy = 140;
    const outerRadius = 105;
    const innerRadius = 65;

    const slices = totalValue > 0
      ? this.buildDonutSlices(rawSlices, totalValue, mode, cx, cy, outerRadius, innerRadius)
      : this.buildEmptySlices(rawSlices, mode);

    let totalFormatted: string;
    if (mode === MODE_CATEGORY) {
      if (totalValue >= 1_000_000) {
        totalFormatted = `ETB ${(totalValue / 1_000_000).toFixed(2)}M`;
      } else {
        totalFormatted = `ETB ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    } else {
      totalFormatted = `${totalValue} Orders`;
    }

    return {
      slices,
      totalFormatted,
      totalLabel,
      totalValue
    };
  });

  // ==========================================
  // 4. OPERATIONAL VELOCITY FLOW (Actual Stock Movement Ledger)
  // ==========================================
  readonly velocityMetrics = computed<readonly VelocityMetric[]>(() => {
    const movements = this.state.stockMovements();
    const receipts = movements
      .filter(m => {
        const typeStr: string = m.type;
        return typeStr === 'RECEIPT' || typeStr === 'OPENING_BALANCE' || typeStr === 'RETURN_RESTOCK';
      })
      .reduce((acc, m) => acc + Math.abs(m.quantityDelta || 0), 0);

    const transfers = movements
      .filter(m => m.type === 'TRANSFER_OUT' || m.type === 'TRANSFER_IN')
      .reduce((acc, m) => acc + Math.abs(m.quantityDelta || 0), 0);

    const dispatches = movements
      .filter(m => m.type === 'ISSUE')
      .reduce((acc, m) => acc + Math.abs(m.quantityDelta || 0), 0);

    const totalFlow = receipts + transfers + dispatches;

    return [
      {
        label: 'Inbound Supplier Deliveries',
        count: receipts,
        formattedUnits: `${receipts.toLocaleString()} pcs`,
        percentage: totalFlow > 0 ? Math.round((receipts / totalFlow) * 100) : 0,
        color: '#10b981',
        icon: 'lucide:arrow-down'
      },
      {
        label: 'Inter-Branch Stock Relocations',
        count: transfers,
        formattedUnits: `${transfers.toLocaleString()} pcs`,
        percentage: totalFlow > 0 ? Math.round((transfers / totalFlow) * 100) : 0,
        color: '#1e30c4',
        icon: 'lucide:arrow-left-right-arrows'
      },
      {
        label: 'Customer Order Dispatches',
        count: dispatches,
        formattedUnits: `${dispatches.toLocaleString()} pcs`,
        percentage: totalFlow > 0 ? Math.round((dispatches / totalFlow) * 100) : 0,
        color: '#ec4899',
        icon: 'lucide:truck'
      }
    ];
  });

  // Chart Toggle Handlers
  setLineMetric(metric: 'revenue' | 'volume'): void {
    this.lineChartMetric.set(metric);
  }

  setBarMetric(metric: 'valuation' | 'units'): void {
    this.barChartMetric.set(metric);
  }

  setPieMode(mode: 'category' | 'status'): void {
    this.pieChartMode.set(mode);
  }

  // Modals
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

  private getGreetingPeriod(hour: number = new Date().getHours()): 'morning' | 'afternoon' | 'evening' {
    if (hour >= 12 && hour < 18) {
      return 'afternoon';
    }
    if (hour >= 18 || hour < 5) {
      return 'evening';
    }
    return 'morning';
  }

  get greetingKey(): string {
    const period = this.getGreetingPeriod();
    if (period === 'afternoon') {
      return 'DASHBOARD.GOOD_AFTERNOON';
    }
    if (period === 'evening') {
      return 'DASHBOARD.GOOD_EVENING';
    }
    return 'DASHBOARD.GOOD_MORNING';
  }

  get greetingDefault(): string {
    const period = this.getGreetingPeriod();
    if (period === 'afternoon') {
      return 'Good afternoon';
    }
    if (period === 'evening') {
      return 'Good evening';
    }
    return 'Good morning';
  }

  private getMovementVisual(type?: string): { background: string; color: string; icon: string } {
    switch (type) {
      case 'RECEIPT':
        return {
          background: 'var(--green-soft)',
          color: CSS_GREEN,
          icon: 'lucide:arrow-down'
        };
      case 'TRANSFER_OUT':
        return {
          background: 'var(--blue-soft)',
          color: CSS_BLUE,
          icon: 'lucide:arrow-left-right-arrows'
        };
      default:
        return {
          background: 'var(--amber-soft)',
          color: CSS_AMBER,
          icon: 'lucide:arrow-up'
        };
    }
  }

  // ============================================================================
  // PRIVATE DECOMPOSITION HELPERS (Lowers Cognitive Complexity & Duplication)
  // ============================================================================
  private synthesizeBranchSummaries(filter: string): readonly BranchSummaryViewModel[] {
    const branches = this.state.branches();
    const items = this.state.filteredInventory();
    const targetBranches = filter === SCOPE_ALL
      ? branches
      : branches.filter(b => b.id === filter);

    if (targetBranches.length === 0) {
      return [];
    }

    return targetBranches.map(b => {
      const branchItems = items.filter(i => i.branchId === b.id || i.branchName === b.name);
      const distinctProducts = new Set(branchItems.map(i => i.productId)).size;
      const valuation = branchItems.reduce((sum, i) => sum + (i.totalValuation || 0), 0);
      const units = branchItems.reduce((sum, i) => sum + (i.onHandQty || 0), 0);
      return {
        branchId: b.id,
        branchName: b.name,
        warehouseCount: b.warehouses?.length || 1,
        totalProducts: distinctProducts,
        totalUnitsOnHand: units,
        totalValuationEtb: valuation
      };
    });
  }

  private buildTimelineDays(
    orders: readonly { createdAt?: string }[],
    quotations: readonly { createdAt?: string }[]
  ): { date: Date; label: string }[] {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let anchorDate = today;
    const orderDates = orders
      .map(o => (o.createdAt ? new Date(o.createdAt) : null))
      .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

    const quoteDates = quotations
      .map(q => (q.createdAt ? new Date(q.createdAt) : null))
      .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

    const allDates = [...orderDates, ...quoteDates];
    if (allDates.length > 0) {
      const maxTime = allDates.reduce((max, d) => Math.max(max, d.getTime()), 0);
      const maxDate = new Date(maxTime);
      maxDate.setHours(0, 0, 0, 0);
      if (maxDate > today) {
        anchorDate = maxDate;
      }
    }

    const timelineDays: { date: Date; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      timelineDays.push({
        date: d,
        label: `${dayNames[d.getDay()]} ${d.getDate()}`
      });
    }
    return timelineDays;
  }

  private calculateDailyMetric(
    slotDate: Date,
    orders: readonly { createdAt?: string; totalAmount?: number }[],
    quotations: readonly { createdAt?: string; quotedPrice?: number; estimatedCost?: number }[],
    metric: 'revenue' | 'volume'
  ): number {
    const slotStart = new Date(slotDate);
    slotStart.setHours(0, 0, 0, 0);
    const slotEnd = new Date(slotDate);
    slotEnd.setHours(23, 59, 59, 999);

    const dayOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const oDate = new Date(o.createdAt);
      return oDate >= slotStart && oDate <= slotEnd;
    });

    const dayQuotations = quotations.filter(q => {
      if (!q.createdAt) return false;
      const qDate = new Date(q.createdAt);
      return qDate >= slotStart && qDate <= slotEnd;
    });

    if (metric === METRIC_REVENUE) {
      const orderRev = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const quoteNetRev = dayQuotations.reduce((sum, q) => {
        if (!q.quotedPrice) return sum;
        const net = Math.max(0, (q.quotedPrice || 0) - (q.estimatedCost || 0));
        return sum + net;
      }, 0);
      return orderRev + quoteNetRev;
    }

    return dayOrders.length + dayQuotations.filter(q => !!q.quotedPrice).length;
  }

  private buildSmoothLinePath(points: readonly LineChartPoint[]): string {
    if (points.length === 0) {
      return '';
    }
    let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const dx = (p1.x - p0.x) * 0.45;
      const cp1x = p0.x + dx;
      const cp1y = p0.y;
      const cp2x = p1.x - dx;
      const cp2y = p1.y;
      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return linePath;
  }

  private buildAreaPath(linePath: string, points: readonly LineChartPoint[], chartBottom: number): string {
    const lastPoint = points.at(-1);
    if (!lastPoint || points.length === 0) {
      return '';
    }
    return `${linePath} L ${lastPoint.x.toFixed(1)} ${chartBottom} L ${points[0].x.toFixed(1)} ${chartBottom} Z`;
  }

  private buildLineChartYLabels(
    metric: 'revenue' | 'volume',
    maxValue: number,
    chartTop: number,
    chartHeight: number,
    chartBottom: number
  ): readonly { value: string; y: number }[] {
    const topValue = metric === METRIC_REVENUE
      ? `ETB ${Math.round(maxValue / 1000)}k`
      : `${Math.round(maxValue)}`;
    const midValue = metric === METRIC_REVENUE
      ? `ETB ${Math.round((maxValue * 0.5) / 1000)}k`
      : `${Math.round(maxValue * 0.5)}`;

    return [
      { value: topValue, y: chartTop + 4 },
      { value: midValue, y: chartTop + chartHeight * 0.5 + 4 },
      { value: '0', y: chartBottom + 4 }
    ];
  }

  private buildRawBranchBars(
    summaries: readonly BranchSummaryViewModel[],
    branches: readonly { id: string | number; name: string; warehouses?: readonly unknown[] }[],
    metric: 'valuation' | 'units'
  ): RawBranchBar[] {
    if (summaries.length > 0) {
      return summaries.map(s => ({
        id: s.branchId,
        name: s.branchName,
        value: metric === METRIC_VALUATION ? s.totalValuationEtb : s.totalUnitsOnHand,
        warehouseCount: s.warehouseCount || 1,
        skuCount: s.totalProducts || 0
      }));
    }

    if (branches.length > 0) {
      const items = this.state.filteredInventory();
      return branches.map(b => {
        const branchItems = items.filter(i => i.branchId === b.id || i.branchName === b.name);
        const val = branchItems.reduce((acc, curr) => acc + (curr.totalValuation || 0), 0);
        const units = branchItems.reduce((acc, curr) => acc + (curr.onHandQty || 0), 0);
        return {
          id: b.id,
          name: b.name,
          value: metric === METRIC_VALUATION ? val : units,
          warehouseCount: b.warehouses?.length || 1,
          skuCount: branchItems.length
        };
      });
    }

    return [];
  }

  private buildCategorySlices(): RawSlice[] {
    const items = this.state.filteredInventory();
    const catMap = new Map<string, { label: string; value: number }>();

    if (items.length > 0) {
      for (const item of items) {
        const rawCat = item.category || 'Printing Supplies';
        const label = normalizeCategoryLabel(rawCat);
        const current = catMap.get(label) || { label, value: 0 };
        current.value += (item.totalValuation || 0);
        catMap.set(label, current);
      }
    } else {
      const products = this.state.products();
      for (const p of products) {
        const rawCat = p.category || 'Printing Supplies';
        const label = normalizeCategoryLabel(rawCat);
        const current = catMap.get(label) || { label, value: 0 };
        current.value += (p.unitPrice || p.baseCost || 0);
        catMap.set(label, current);
      }
    }

    let colorIdx = 0;
    return Array.from(catMap.entries()).map(([id, c]) => ({
      id,
      label: c.label,
      value: c.value,
      color: BRAND_PALETTE[colorIdx++ % BRAND_PALETTE.length] || BRAND_PALETTE[0]
    }));
  }

  private buildStatusSlices(): RawSlice[] {
    const orders = this.state.orders();
    const statusDefs: readonly { id: string; label: string; color: string }[] = [
      { id: 'DELIVERED', label: 'Delivered', color: '#10b981' },
      { id: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch', color: '#1e30c4' },
      { id: 'PROCESSING', label: 'Processing', color: '#f59e0b' },
      { id: 'PENDING_PAYMENT', label: 'Pending Payment', color: '#ec4899' },
      { id: 'CANCELLED', label: 'Cancelled', color: '#ea3b24' }
    ];

    const statusCounts = new Map<string, number>();
    for (const s of statusDefs) {
      statusCounts.set(s.id, 0);
    }

    for (const o of orders) {
      const st = (o.status || 'PENDING_PAYMENT').toUpperCase();
      statusCounts.set(st, (statusCounts.get(st) || 0) + 1);
    }

    return statusDefs.map(s => ({
      id: s.id,
      label: s.label,
      value: statusCounts.get(s.id) || 0,
      color: s.color
    }));
  }

  private buildDonutSlices(
    rawSlices: readonly RawSlice[],
    totalValue: number,
    mode: 'category' | 'status',
    cx: number,
    cy: number,
    outerR: number,
    innerR: number
  ): PieChartSlice[] {
    let currentAngle = 0;
    return rawSlices.map(item => {
      const fraction = item.value / totalValue;
      const angleSpan = fraction * 2 * Math.PI;
      const safeSpan = Math.min(angleSpan, 2 * Math.PI - 0.001);

      const theta1 = currentAngle - Math.PI / 2;
      const theta2 = currentAngle + safeSpan - Math.PI / 2;
      currentAngle += angleSpan;

      const x1 = cx + outerR * Math.cos(theta1);
      const y1 = cy + outerR * Math.sin(theta1);
      const x2 = cx + outerR * Math.cos(theta2);
      const y2 = cy + outerR * Math.sin(theta2);
      const x3 = cx + innerR * Math.cos(theta2);
      const y3 = cy + innerR * Math.sin(theta2);
      const x4 = cx + innerR * Math.cos(theta1);
      const y4 = cy + innerR * Math.sin(theta1);

      const largeArc = safeSpan > Math.PI ? 1 : 0;
      const pathData = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
      const percentage = Math.round(fraction * 100);

      const formattedValue = mode === MODE_CATEGORY
        ? `ETB ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${item.value} Orders`;

      return {
        id: item.id,
        label: item.label,
        value: item.value,
        formattedValue,
        percentage,
        color: item.color,
        pathData
      };
    });
  }

  private buildEmptySlices(rawSlices: readonly RawSlice[], mode: 'category' | 'status'): PieChartSlice[] {
    return rawSlices.map(item => ({
      id: item.id,
      label: item.label,
      value: 0,
      formattedValue: mode === MODE_CATEGORY ? 'ETB 0.00' : '0 Orders',
      percentage: 0,
      color: item.color,
      pathData: ''
    }));
  }
}
