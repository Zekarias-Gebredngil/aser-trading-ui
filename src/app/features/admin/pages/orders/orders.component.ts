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
  selectedOrder = signal<Order | null>(null);

  // Pagination
  ordersPage = 1;
  ordersPageSize = 10;
  quotesPage = 1;
  quotesPageSize = 10;

  // Quote modal
  quotingInquiry = signal<QuotationRequest | null>(null);
  quotePriceInput = 0;
  quoteNotesInput = '';

  get filteredOrders(): Order[] {
    const f = this.statusFilter;
    return this.state.orders().filter(o => f === 'ALL' || o.status === f);
  }

  get pagedOrders(): Order[] {
    const list = this.filteredOrders;
    const start = (this.ordersPage - 1) * this.ordersPageSize;
    return list.slice(start, start + this.ordersPageSize);
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
    if (confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
      this.state.cancelOrder(order.id);
      if (this.selectedOrder()?.id === order.id) {
        this.selectedOrder.set(null);
      }
    }
  }

  openQuotingModal(quote: QuotationRequest) {
    this.quotingInquiry.set(quote);
    this.quotePriceInput = quote?.quotedPrice || 0;
    this.quoteNotesInput = '';
  }

  submitQuotation() {
    const q = this.quotingInquiry();
    if (!q || this.quotePriceInput <= 0) return;
    this.state.quoteInquiry(q.id, this.quotePriceInput, this.quoteNotesInput);
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
