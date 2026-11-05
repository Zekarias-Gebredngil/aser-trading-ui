import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { 
  ReportApiService, 
  SalesReportDto, 
  StockSummaryReportDto, 
  StockValuationReportDto, 
  TransferReportDto 
} from '../../../../core/services/api/report-api.service';
import { ExcelExportService, ExcelSheetData } from '../../../../core/services/excel-export.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-reports',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, IconComponent, TranslatePipe],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  readonly state = inject(AserStateService);
  private readonly reportApi = inject(ReportApiService);
  private readonly excelService = inject(ExcelExportService);
  private readonly toast = inject(ToastService);

  readonly activeTab = signal<'sales' | 'valuation' | 'stock' | 'transfers'>('sales');
  readonly isLoading = signal(false);

  readonly salesData = signal<SalesReportDto | null>(null);
  readonly stockSummary = signal<StockSummaryReportDto | null>(null);
  readonly valuationData = signal<StockValuationReportDto | null>(null);
  readonly transferData = signal<TransferReportDto | null>(null);

  // Valuation items pagination
  readonly valPage = signal(0);
  readonly valPageSize = signal(15);

  constructor() {
    effect(() => {
      // Re-trigger report loading whenever the selected branch filter changes
      this.state.selectedBranchFilter();
      this.loadAllReports();
    });
  }

  setActiveTab(tab: 'sales' | 'valuation' | 'stock' | 'transfers'): void {
    this.activeTab.set(tab);
  }

  ngOnInit(): void {
    // Initial load handled by effect
  }

  loadAllReports(): void {
    this.isLoading.set(true);

    const filter = this.state.selectedBranchFilter();
    const branchId = filter !== 'ALL'
      ? parseInt(filter.replace('BR-0', '').replace('BR-', ''), 10)
      : (this.state.isBranchScopeLocked() && this.state.currentUser()?.assignedBranchId
          ? parseInt(this.state.currentUser()!.assignedBranchId!.replace('BR-0', '').replace('BR-', ''), 10)
          : undefined);

    this.reportApi.getSalesReport(branchId).subscribe({
      next: (res) => { if (res.success) this.salesData.set(res.data || null); }
    });

    this.reportApi.getStockSummary(branchId).subscribe({
      next: (res) => { if (res.success) this.stockSummary.set(res.data || null); }
    });

    this.reportApi.getStockValuation(branchId).subscribe({
      next: (res) => { 
        this.isLoading.set(false);
        if (res.success) this.valuationData.set(res.data || null); 
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    this.reportApi.getTransferReport(branchId).subscribe({
      next: (res) => { if (res.success) this.transferData.set(res.data || null); }
    });
  }

  printReport(): void {
    window.print();
  }

  exportAllReportsToExcel(): void {
    const sheets: ExcelSheetData[] = [];

    // 1. Executive Summary Sheet
    const sales = this.salesData();
    const stock = this.stockSummary();
    const val = this.valuationData();
    const xfer = this.transferData();

    const summaryData = [
      { 'Metric Category': 'Commercial Sales', 'Key Indicator': 'Total Realized Revenue (ETB)', 'Value / Count': sales?.totalRevenueEtb ?? 0 },
      { 'Metric Category': 'Commercial Sales', 'Key Indicator': 'Average Order Value (ETB)', 'Value / Count': sales?.averageOrderValueEtb ?? 0 },
      { 'Metric Category': 'Commercial Sales', 'Key Indicator': 'Total Orders Processed', 'Value / Count': sales?.totalOrders ?? 0 },
      { 'Metric Category': 'Commercial Sales', 'Key Indicator': 'Completed & Delivered Orders', 'Value / Count': sales?.completedOrdersCount ?? 0 },
      { 'Metric Category': 'Commercial Sales', 'Key Indicator': 'Pending Fulfillment Orders', 'Value / Count': sales?.pendingFulfillmentCount ?? 0 },
      { 'Metric Category': 'Commercial Sales', 'Key Indicator': 'Cancelled / Rejected Orders', 'Value / Count': sales?.cancelledOrdersCount ?? 0 },
      { 'Metric Category': 'Inventory Valuation', 'Key Indicator': 'Total Inventory Valuation (ETB)', 'Value / Count': val?.totalValuationEtb ?? 0 },
      { 'Metric Category': 'Inventory Valuation', 'Key Indicator': 'Total Catalog Products', 'Value / Count': val?.productCount ?? stock?.totalProducts ?? 0 },
      { 'Metric Category': 'Branch Inventory', 'Key Indicator': 'Total Physical Units On Hand', 'Value / Count': stock?.totalUnitsOnHand ?? 0 },
      { 'Metric Category': 'Branch Inventory', 'Key Indicator': 'Operating Branches Count', 'Value / Count': stock?.branchSummaries?.length ?? 0 },
      { 'Metric Category': 'Logistics & Transfers', 'Key Indicator': 'Total Transfer Shipments', 'Value / Count': xfer?.totalTransfers ?? 0 },
      { 'Metric Category': 'Logistics & Transfers', 'Key Indicator': 'In-Transit Shipments', 'Value / Count': xfer?.inTransitCount ?? 0 },
      { 'Metric Category': 'Logistics & Transfers', 'Key Indicator': 'Safely Received Shipments', 'Value / Count': xfer?.receivedCount ?? 0 },
      { 'Metric Category': 'Logistics & Transfers', 'Key Indicator': 'Discrepancy Shipments', 'Value / Count': xfer?.discrepancyCount ?? 0 }
    ];
    sheets.push({ name: 'Executive Summary', data: summaryData });

    // 2. Valuation Breakdown Sheet
    if (val?.items && val.items.length > 0) {
      const valRows = val.items.map(item => ({
        'SKU': item.productSku || 'SKU',
        'Product Name': item.productName,
        'Category': item.categoryName || 'General',
        'Physical Units On Hand': item.totalUnitsOnHand,
        'Unit Cost (WAC ETB)': item.weightedAverageCost,
        'Total Valuation (ETB)': item.totalValuationEtb
      }));
      sheets.push({ name: 'Stock Valuation (WAC)', data: valRows });
    }

    // 3. Branch Operating Stock Sheet
    if (stock?.branchSummaries && stock.branchSummaries.length > 0) {
      const branchRows = stock.branchSummaries.map(b => ({
        'Branch Name': b.branchName,
        'Branch Code': b.branchCode,
        'Warehouse Count': b.warehouseCount,
        'Physical Units On Hand': b.totalUnitsOnHand,
        'Branch Valuation (ETB)': b.totalValuationEtb
      }));
      sheets.push({ name: 'Branch Stock Summary', data: branchRows });
    }

    // 4. Transfers Performance Sheet
    if (xfer) {
      const transferRows = [
        { 'Metric': 'Total Transfer Shipments', 'Value': xfer.totalTransfers },
        { 'Metric': 'In-Transit / En Route', 'Value': xfer.inTransitCount },
        { 'Metric': 'Safely Received', 'Value': xfer.receivedCount },
        { 'Metric': 'Discrepancy Reported', 'Value': xfer.discrepancyCount }
      ];
      sheets.push({ name: 'Logistics Performance', data: transferRows });
    }

    this.excelService.exportMultiSheetExcel(sheets, 'Aser_Commercial_Intelligence_Full_Report');
    this.toast.success('Commercial Intelligence Excel workbook downloaded successfully.');
  }

  exportCurrentTabToExcel(): void {
    const tab = this.activeTab();
    if (tab === 'valuation') {
      const items = this.valuationData()?.items || [];
      if (items.length === 0) {
        this.toast.error('No inventory valuation data available to export.');
        return;
      }
      const data = items.map(item => ({
        'SKU': item.productSku || 'SKU',
        'Product Name': item.productName,
        'Category': item.categoryName || 'General',
        'Physical Units On Hand': item.totalUnitsOnHand,
        'Unit Cost (WAC ETB)': item.weightedAverageCost,
        'Total Valuation (ETB)': item.totalValuationEtb
      }));
      this.excelService.exportJsonToExcel(data, 'Aser_Inventory_Valuation_Audit', 'Valuation WAC');
      this.toast.success('Inventory Valuation report exported to Excel.');
    } else if (tab === 'stock') {
      const branches = this.stockSummary()?.branchSummaries || [];
      if (branches.length === 0) {
        this.toast.error('No branch stock summaries available to export.');
        return;
      }
      const data = branches.map(b => ({
        'Branch Name': b.branchName,
        'Branch Code': b.branchCode,
        'Warehouse Facilities': b.warehouseCount,
        'Physical Units On Hand': b.totalUnitsOnHand,
        'Branch Valuation (ETB)': b.totalValuationEtb
      }));
      this.excelService.exportJsonToExcel(data, 'Aser_Branch_Stock_Summary', 'Branch Stock');
      this.toast.success('Branch Stock summary exported to Excel.');
    } else if (tab === 'sales') {
      const s = this.salesData();
      const data = [
        { 'Sales Indicator': 'Total Orders Processed', 'Value': s?.totalOrders || 0 },
        { 'Sales Indicator': 'Delivered & Closed Orders', 'Value': s?.completedOrdersCount || 0 },
        { 'Sales Indicator': 'In Progress / Pending Orders', 'Value': s?.pendingFulfillmentCount || 0 },
        { 'Sales Indicator': 'Cancelled / Rejected Orders', 'Value': s?.cancelledOrdersCount || 0 },
        { 'Sales Indicator': 'Total Realized Revenue (ETB)', 'Value': s?.totalRevenueEtb || 0 },
        { 'Sales Indicator': 'Average Order Value (ETB)', 'Value': s?.averageOrderValueEtb || 0 }
      ];
      this.excelService.exportJsonToExcel(data, 'Aser_Sales_Fulfillment_Report', 'Sales Summary');
      this.toast.success('Sales report exported to Excel.');
    } else if (tab === 'transfers') {
      const t = this.transferData();
      const data = [
        { 'Transfer Logistics Indicator': 'Total Transfer Shipments', 'Value': t?.totalTransfers || 0 },
        { 'Transfer Logistics Indicator': 'In-Transit / En Route', 'Value': t?.inTransitCount || 0 },
        { 'Transfer Logistics Indicator': 'Safely Received & Verified', 'Value': t?.receivedCount || 0 },
        { 'Transfer Logistics Indicator': 'Discrepancy Reported', 'Value': t?.discrepancyCount || 0 }
      ];
      this.excelService.exportJsonToExcel(data, 'Aser_Transfer_Logistics_Report', 'Transfers Summary');
      this.toast.success('Transfer logistics exported to Excel.');
    }
  }
}
