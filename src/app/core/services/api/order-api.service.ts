import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendOrderItemRequest {
  productId: number;
  quantity: number;
}

export interface BackendCreateOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deliveryType: 'STORE_PICKUP' | 'STANDARD_DELIVERY' | 'COLLECTION' | 'DELIVERY';
  deliveryAddress?: string;
  collectionBranchId?: number;
  fulfillmentWarehouseId?: number;
  paymentMethod?: 'MANUAL_BANK_TRANSFER' | 'CASH_ON_DELIVERY' | 'MANUAL_TRANSFER' | 'CASH';
  paymentReference?: string;
  notes?: string;
  items: BackendOrderItemRequest[];
}

export interface BackendOrderItemDto {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unitSymbol: string;
}

export interface BackendOrderDto {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deliveryType: 'STORE_PICKUP' | 'STANDARD_DELIVERY' | 'COLLECTION' | 'DELIVERY';
  deliveryAddress?: string;
  collectionBranchId?: number;
  collectionBranchName?: string;
  fulfillmentWarehouseId?: number;
  fulfillmentWarehouseName?: string;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  status: 'PENDING_PAYMENT' | 'PROCESSING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod?: 'MANUAL_BANK_TRANSFER' | 'CASH_ON_DELIVERY' | 'MANUAL_TRANSFER' | 'CASH';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  items: BackendOrderItemDto[];
}

export interface BackendCheckoutQuoteResponse {
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  isAllInStock: boolean;
  canFulfillLocally: boolean;
  recommendedWarehouseId: number | null;
  recommendedWarehouseName: string | null;
  items: {
    productId: number;
    productName: string;
    productSku: string;
    requestedQuantity: number;
    unitPrice: number;
    lineTotal: number;
    isAvailable: boolean;
    availableStock: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderApiService {
  private http = inject(HttpClient);

  calculateQuote(request: {
    deliveryType: 'STORE_PICKUP' | 'STANDARD_DELIVERY';
    collectionBranchId?: number;
    deliveryAddress?: string;
    items: BackendOrderItemRequest[];
  }): Observable<ApiResponse<BackendCheckoutQuoteResponse>> {
    return this.http.post<ApiResponse<BackendCheckoutQuoteResponse>>(`${environment.apiUrl}/checkout/quote`, request);
  }

  createOrder(request: BackendCreateOrderRequest): Observable<ApiResponse<BackendOrderDto>> {
    return this.http.post<ApiResponse<BackendOrderDto>>(`${environment.apiUrl}/orders`, request);
  }

  getOrders(status?: string, page = 0, size = 20): Observable<ApiResponse<PagedResponse<BackendOrderDto>>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (status && status !== 'ALL') params = params.set('status', status);

    return this.http.get<ApiResponse<PagedResponse<BackendOrderDto>>>(`${environment.apiUrl}/orders`, { params });
  }

  getOrderById(id: number): Observable<ApiResponse<BackendOrderDto>> {
    return this.http.get<ApiResponse<BackendOrderDto>>(`${environment.apiUrl}/orders/${id}`);
  }

  getOrderByNumber(orderNumber: string): Observable<ApiResponse<BackendOrderDto>> {
    return this.http.get<ApiResponse<BackendOrderDto>>(`${environment.apiUrl}/orders/number/${orderNumber}`);
  }

  confirmOrder(id: number): Observable<ApiResponse<BackendOrderDto>> {
    return this.http.post<ApiResponse<BackendOrderDto>>(`${environment.apiUrl}/orders/${id}/confirm`, {});
  }

  cancelOrder(id: number): Observable<ApiResponse<BackendOrderDto>> {
    return this.http.post<ApiResponse<BackendOrderDto>>(`${environment.apiUrl}/orders/${id}/cancel`, {});
  }

  initiatePayment(request: { orderId: number; paymentMethod: string; amount: number }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/payments/initiate`, request);
  }

  getPaymentsByOrder(orderId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/payments/order/${orderId}`);
  }

  getPaymentById(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/payments/${id}`);
  }

  updateOrderStatus(id: number, status: string, comment?: string): Observable<ApiResponse<BackendOrderDto>> {
    return this.http.patch<ApiResponse<BackendOrderDto>>(`${environment.apiUrl}/orders/${id}/status`, {
      status,
      comment
    });
  }

  confirmManualPayment(paymentId: number, bankReferenceNumber: string, notes?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/payments/${paymentId}/confirm-manual`, {
      bankReferenceNumber,
      notes
    });
  }
}

