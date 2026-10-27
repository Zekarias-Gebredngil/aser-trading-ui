import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendStockBalanceDto {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  categoryName: string;
  warehouseId: number;
  warehouseName: string;
  branchId?: number;
  branchName: string;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  weightedAverageCost: number;
  totalValuation: number;
  unitSymbol: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface BackendStockMovementDto {
  id: number;
  timestamp: string;
  movementType: 'OPENING_BALANCE' | 'PURCHASE_RECEIPT' | 'TRANSFER_DISPATCH' | 'TRANSFER_RECEIPT' | 'SALES_ISSUE' | 'MANUAL_ADJUSTMENT' | 'DAMAGE_WRITE_OFF';
  productId: number;
  productSku: string;
  productName: string;
  warehouseName: string;
  branchName: string;
  quantityDelta: number;
  unitCost: number;
  totalCost: number;
  referenceType: string;
  referenceId: string;
  actor: string;
  notes?: string;
  unitSymbol: string;
}

export interface BackendStockReceiptRequest {
  warehouseId: number;
  productId: number;
  quantity: number;
  unitCost: number;
  referenceType?: 'PURCHASE_ORDER' | 'DIRECT_RECEIPT' | 'MANUAL';
  referenceId?: string;
  notes?: string;
}

export interface BackendLowStockAlertDto {
  productId: number;
  productSku: string;
  productName: string;
  warehouseName: string;
  currentStock: number;
  reorderThreshold: number;
  shortageQuantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/inventory`;

  getBalances(warehouseId?: number, page = 0, size = 50): Observable<ApiResponse<PagedResponse<BackendStockBalanceDto>>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (warehouseId) params = params.set('warehouseId', warehouseId.toString());

    return this.http.get<ApiResponse<PagedResponse<BackendStockBalanceDto>>>(`${this.baseUrl}/balances`, { params });
  }

  getMovements(filter?: { productId?: number; warehouseId?: number; movementType?: string; page?: number; size?: number }): Observable<ApiResponse<PagedResponse<BackendStockMovementDto>>> {
    let params = new HttpParams();
    if (filter?.productId) params = params.set('productId', filter.productId.toString());
    if (filter?.warehouseId) params = params.set('warehouseId', filter.warehouseId.toString());
    if (filter?.movementType) params = params.set('movementType', filter.movementType);
    params = params.set('page', (filter?.page ?? 0).toString()).set('size', (filter?.size ?? 50).toString());

    return this.http.get<ApiResponse<PagedResponse<BackendStockMovementDto>>>(`${this.baseUrl}/movements`, { params });
  }

  recordReceipt(request: BackendStockReceiptRequest): Observable<ApiResponse<BackendStockBalanceDto>> {
    return this.http.post<ApiResponse<BackendStockBalanceDto>>(`${this.baseUrl}/receipts`, request);
  }

  recordIssue(request: {
    warehouseId: number;
    productId: number;
    quantity: number;
    referenceType: string;
    referenceId?: string;
    notes?: string;
  }): Observable<ApiResponse<BackendStockBalanceDto>> {
    return this.http.post<ApiResponse<BackendStockBalanceDto>>(`${this.baseUrl}/issues`, request);
  }

  recordAdjustment(request: {
    warehouseId: number;
    productId: number;
    quantityDelta: number;
    reasonCode: string;
    notes?: string;
  }): Observable<ApiResponse<BackendStockBalanceDto>> {
    return this.http.post<ApiResponse<BackendStockBalanceDto>>(`${this.baseUrl}/adjustments`, request);
  }

  getLowStockAlerts(warehouseId?: number): Observable<ApiResponse<BackendLowStockAlertDto[]>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId.toString());

    return this.http.get<ApiResponse<BackendLowStockAlertDto[]>>(`${this.baseUrl}/alerts/low-stock`, { params });
  }
}

