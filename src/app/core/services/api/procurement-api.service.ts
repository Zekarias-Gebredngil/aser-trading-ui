import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendSupplierDto {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  isActive: boolean;
}

export interface BackendCreateSupplierRequest {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
}

export interface BackendPOItemRequest {
  productId: number;
  quantity: number;
  unitCost: number;
}

export interface BackendCreatePORequest {
  supplierId: number;
  destinationWarehouseId: number;
  expectedDeliveryDate?: string;
  notes?: string;
  items: BackendPOItemRequest[];
}

export interface BackendPOItemDto {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  lineTotal: number;
  unitSymbol: string;
}

export interface BackendPurchaseOrderDto {
  id: number;
  poNumber: string;
  supplierId: number;
  supplierName: string;
  destinationWarehouseId: number;
  destinationWarehouseName: string;
  destinationBranchName: string;
  status: 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  items: BackendPOItemDto[];
}

export interface BackendGoodsReceiptItemRequest {
  poItemId: number;
  quantityReceived: number;
  unitCost: number;
}

export interface BackendGoodsReceiptRequest {
  items: BackendGoodsReceiptItemRequest[];
  deliveryNoteNumber?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProcurementApiService {
  private http = inject(HttpClient);

  getSuppliers(): Observable<ApiResponse<BackendSupplierDto[]>> {
    return this.http.get<ApiResponse<BackendSupplierDto[]>>(`${environment.apiUrl}/suppliers`);
  }

  createSupplier(request: BackendCreateSupplierRequest): Observable<ApiResponse<BackendSupplierDto>> {
    return this.http.post<ApiResponse<BackendSupplierDto>>(`${environment.apiUrl}/suppliers`, request);
  }

  getPurchaseOrders(status?: string, page = 0, size = 20): Observable<ApiResponse<PagedResponse<BackendPurchaseOrderDto>>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (status && status !== 'ALL') params = params.set('status', status);

    return this.http.get<ApiResponse<PagedResponse<BackendPurchaseOrderDto>>>(`${environment.apiUrl}/purchase-orders`, { params });
  }

  createPurchaseOrder(request: BackendCreatePORequest): Observable<ApiResponse<BackendPurchaseOrderDto>> {
    return this.http.post<ApiResponse<BackendPurchaseOrderDto>>(`${environment.apiUrl}/purchase-orders`, request);
  }

  getPurchaseOrderById(id: number): Observable<ApiResponse<BackendPurchaseOrderDto>> {
    return this.http.get<ApiResponse<BackendPurchaseOrderDto>>(`${environment.apiUrl}/purchase-orders/${id}`);
  }

  approvePurchaseOrder(id: number): Observable<ApiResponse<BackendPurchaseOrderDto>> {
    return this.http.post<ApiResponse<BackendPurchaseOrderDto>>(`${environment.apiUrl}/purchase-orders/${id}/approve`, {});
  }

  recordGoodsReceipt(id: number, request: BackendGoodsReceiptRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/purchase-orders/${id}/receipts`, request);
  }
}
