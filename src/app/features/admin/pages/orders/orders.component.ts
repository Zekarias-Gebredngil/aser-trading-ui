import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Order, OrderStatus, PaymentStatus } from '../../../../core/models/order.model';
import { QuotationRequest } from '../../../../core/models/quote.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface OrderRowViewModel {
  readonly id: string;
  readonly orderNumber: string;
  readonly createdAtFormatted: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly isPickup: boolean;
  readonly fulfillmentLabel: string;
  readonly fulfillmentDetail: string;
  readonly itemsCount: number;
  readonly totalAmount: number;
  readonly isBankTransfer: boolean;
  readonly paymentMethodLabel: string;
  readonly paymentStatusBadgeClass: string;
  readonly paymentStatusTextKey: string;
  readonly paymentStatusDefaultText: string;
  readonly paymentReference?: string;
  readonly status: OrderStatus;
  readonly statusBadgeClass: string;
  readonly paymentStatus: PaymentStatus;
  readonly rawOrder: Order;
}

@Component({
  selector: 'aser-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, AdminShellComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent {
  readonly state = inject(AserStateService);
  private readonly excelService = inject(ExcelExportService);
  private readonly toast = inject(ToastService);

  activeTab: 'orders' | 'quotes' = 'orders';
  statusFilter = 'ALL';
  branchFilter = 'ALL';
  selectedOrder = signal<Order | null>(null);

  // Pagination
  ordersPage = 1;
  ordersPageSize = 10;
  quotesPage = 1;
  quotesPageSize = 10;

  // Quote modal
  quotingInquiry = signal<QuotationRequest | null>(null);
  quotePriceInput = 0;
  quoteCostInput = 0;
  quoteNotesInput = '';
  quoteSubmitted = false;

  get filteredOrders(): Order[] {
    const f = this.statusFilter;
    const b = this.branchFilter;
    const locked = this.state.isBranchScopeLocked();
    const myBranchId = this.state.currentUser()?.assignedBranchId;

    return this.state.orders().filter(o => {
      if (f !== 'ALL' && o.status !== f) return false;

      // When branch scope is locked, only show orders for assigned branch
      if (locked && myBranchId) {
        return o.pickupBranchId === myBranchId;
      }

      // For global managers, apply selected branch filter
      if (b !== 'ALL') {
        return o.pickupBranchId === b;
      }

      return true;
    });
  }

  get pagedOrders(): Order[] {
    const list = this.filteredOrders;
    const start = (this.ordersPage - 1) * this.ordersPageSize;
    return list.slice(start, start + this.ordersPageSize);
  }

  get pagedOrderRows(): readonly OrderRowViewModel[] {
    return this.pagedOrders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAtFormatted: o.createdAt,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      isPickup: o.fulfillment === 'BRANCH_PICKUP',
      fulfillmentLabel: o.fulfillment === 'BRANCH_PICKUP' ? 'Pickup' : 'Delivery',
      fulfillmentDetail: o.fulfillment === 'BRANCH_PICKUP' ? (o.pickupBranchName || 'Branch') : (o.deliveryAddress || 'Address'),
      itemsCount: o.items.length,
      totalAmount: o.totalAmount,
      isBankTransfer: o.paymentMethod === 'MANUAL_BANK_TRANSFER',
      paymentMethodLabel: o.paymentMethod === 'MANUAL_BANK_TRANSFER' ? 'Bank Transfer' : 'Cash in Hand',
      paymentStatusBadgeClass: this.getPaymentStatusBadgeClass(o.paymentStatus),
      paymentStatusTextKey: o.paymentStatus === 'PAID' ? 'ORDERS.PAID' : 'ORDERS.PENDING',
      paymentStatusDefaultText: o.paymentStatus === 'PAID' ? 'Paid ✓' : 'Pending',
      paymentReference: o.paymentReference,
      status: o.status,
      statusBadgeClass: this.getOrderStatusBadgeClass(o.status),
      paymentStatus: o.paymentStatus,
      rawOrder: o
    }));
  }

  get pagedQuotations(): QuotationRequest[] {
    const list = this.state.quotations();
    const start = (this.quotesPage - 1) * this.quotesPageSize;
    return list.slice(start, start + this.quotesPageSize);
  }

  onStatusFilterChange(newFilter: string): void {
    this.statusFilter = newFilter;
    this.ordersPage = 1;
  }

  onBranchFilterChange(newBranch: string): void {
    this.branchFilter = newBranch;
    this.ordersPage = 1;
  }

  setActiveTab(tab: 'orders' | 'quotes'): void {
    this.activeTab = tab;
  }

  onOrdersPageChange(page: number): void {
    this.ordersPage = page;
  }

  onOrdersPageSizeChange(size: number): void {
    this.ordersPageSize = size;
    this.ordersPage = 1;
  }

  onQuotesPageChange(page: number): void {
    this.quotesPage = page;
  }

  onQuotesPageSizeChange(size: number): void {
    this.quotesPageSize = size;
    this.quotesPage = 1;
  }

  closeOrderModal(): void {
    this.selectedOrder.set(null);
  }

  closeQuotingModal(): void {
    this.quotingInquiry.set(null);
  }

  getOrderStatusBadgeClass(status?: OrderStatus): string {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'badge-pending';
      case 'PROCESSING':
        return 'badge-transit';
      case 'READY_FOR_DISPATCH':
        return 'badge-limited';
      case 'DELIVERED':
        return 'badge-paid';
      case 'CANCELLED':
        return 'badge-out-of-stock';
      default:
        return 'badge-pending';
    }
  }

  getPaymentStatusBadgeClass(status?: PaymentStatus): string {
    return status === 'PAID' ? 'badge-paid' : 'badge-pending';
  }

  getFulfillmentDisplay(order?: Order | null): string {
    if (!order) return '—';
    if (order.fulfillment === 'BRANCH_PICKUP') {
      return `Pickup at ${order.pickupBranchName || 'Branch'}`;
    }
    return `Address: ${order.deliveryAddress || 'Standard Delivery'}`;
  }

  openOrderDetails(event: Event, order: Order) {
    event.stopPropagation();
    this.selectedOrder.set(order);
  }

  updateStatus(event: Event, order: Order, status: OrderStatus, paymentStatus?: PaymentStatus) {
    event.stopPropagation();
    this.state.updateOrderStatus(order.id, status, paymentStatus);
    // Only refresh if modal is already open for this order; do not auto-open details
    if (this.selectedOrder()?.id === order.id) {
      const updated = this.state.orders().find(o => o.id === order.id);
      if (updated) {
        this.selectedOrder.set(updated);
      }
    }
  }

  cancelOrder(event: Event, order: Order) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to cancel order ${order.orderNumber}? Stock reservation will be released.`)) {
      this.state.cancelOrder(order.id, 'Cancelled by admin staff');
      if (this.selectedOrder()?.id === order.id) {
        this.selectedOrder.set(null);
      }
    }
  }

  openQuotingModal(quote: QuotationRequest) {
    this.quotingInquiry.set(quote);
    this.quotePriceInput = quote?.quotedPrice || 0;
    this.quoteCostInput = quote?.estimatedCost || 0;
    this.quoteNotesInput = quote?.notes || '';
    this.quoteSubmitted = false;
  }

  submitQuotation() {
    this.quoteSubmitted = true;
    const q = this.quotingInquiry();
    if (!q || this.quotePriceInput <= 0) return;
    this.state.quoteInquiry(q.id, this.quotePriceInput, this.quoteCostInput, this.quoteNotesInput);
    this.quotingInquiry.set(null);
  }

  exportOrdersToExcel(): void {
    const orders = this.filteredOrders;
    if (orders.length === 0) {
      this.toast.error('No orders available to export.');
      return;
    }

    const data = orders.map(o => ({
      'Order Number': o.orderNumber,
      'Date': new Date(o.createdAt).toLocaleString(),
      'Customer Name': o.customerName,
      'Phone': o.customerPhone,
      'Email': o.customerEmail || '—',
      'Branch / Pickup': o.pickupBranchName || o.fulfillment || '—',
      'Total Amount (ETB)': o.totalAmount,
      'Order Status': o.status,
      'Payment Status': o.paymentStatus,
      'Items Count': o.items?.length || 0,
      'Delivery Address': o.deliveryAddress || '—'
    }));

    this.excelService.exportJsonToExcel(data, 'Aser_Orders_Report', 'Orders');
    this.toast.success(`Exported ${data.length} orders to Excel.`);
  }

  exportQuotesToExcel(): void {
    const quotes = this.state.quotations();
    if (quotes.length === 0) {
      this.toast.error('No quotations available to export.');
      return;
    }

    const data = quotes.map(q => ({
      'Quote Ref': q.quoteNumber,
      'Date': new Date(q.createdAt).toLocaleString(),
      'Customer Name': q.customerName,
      'Company Name': q.companyName || '—',
      'Phone': q.customerPhone,
      'Email': q.customerEmail || '—',
      'Project / Service': q.projectTitle,
      'Category': q.serviceCategoryLabel,
      'Quantity': `${q.quantity} ${q.unit}`,
      'Status': q.status,
      'Quoted Price (ETB)': q.quotedPrice || 0,
      'Notes': q.notes || '—'
    }));

    this.excelService.exportJsonToExcel(data, 'Aser_Quotations_Report', 'Inquiries');
    this.toast.success(`Exported ${data.length} quotations to Excel.`);
  }
}
