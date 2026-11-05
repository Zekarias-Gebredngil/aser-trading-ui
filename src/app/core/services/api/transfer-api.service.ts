import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendTransferItemRequest {
  productId: number;
  requestedQuantity: number;
}

export interface BackendCreateTransferRequest {
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  notes?: string;
  items: BackendTransferItemRequest[];
}

export interface BackendTransferItemDto {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  requestedQuantity: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  unitSymbol: string;
}

export interface BackendTransferEventDto {
  id: number;
  eventType: string;
  timestamp: string;
  actor: string;
  role: string;
  notes?: string;
}

export interface BackendStockTransferDto {
  id: number;
  transferNumber: string;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  sourceBranchId?: number;
  sourceBranchName: string;
  destinationWarehouseId: number;
  destinationWarehouseName: string;
  destinationBranchId?: number;
  destinationBranchName: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'DISCREPANCY_REVIEW';
  requestedBy: string;
  approvedBy?: string;
  dispatchedBy?: string;
  receivedBy?: string;
  notes?: string;
  createdAt: string;
  items: BackendTransferItemDto[];
  events?: BackendTransferEventDto[];
}

@Injectable({
  providedIn: 'root'
})
export class TransferApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/transfers`;

  getTransfers(status?: string, page = 0, size = 50): Observable<ApiResponse<PagedResponse<BackendStockTransferDto>>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (status && status !== 'ALL') params = params.set('status', status);

    return this.http.get<ApiResponse<PagedResponse<BackendStockTransferDto>>>(this.baseUrl, { params });
  }

  getTransferById(id: number): Observable<ApiResponse<BackendStockTransferDto>> {
    return this.http.get<ApiResponse<BackendStockTransferDto>>(`${this.baseUrl}/${id}`);
  }

  createTransfer(request: BackendCreateTransferRequest): Observable<ApiResponse<BackendStockTransferDto>> {
    return this.http.post<ApiResponse<BackendStockTransferDto>>(this.baseUrl, request);
  }

  submitTransfer(id: number): Observable<ApiResponse<BackendStockTransferDto>> {
    return this.http.post<ApiResponse<BackendStockTransferDto>>(`${this.baseUrl}/${id}/submit`, {});
  }

  approveTransfer(id: number): Observable<ApiResponse<BackendStockTransferDto>> {
    return this.http.post<ApiResponse<BackendStockTransferDto>>(`${this.baseUrl}/${id}/approve`, {});
  }

  dispatchTransfer(id: number): Observable<ApiResponse<BackendStockTransferDto>> {
    return this.http.post<ApiResponse<BackendStockTransferDto>>(`${this.baseUrl}/${id}/dispatch`, {});
  }

  receiveTransfer(id: number, request: {
    items: { transferItemId: number; receivedQuantity: number }[];
    notes?: string;
  }): Observable<ApiResponse<BackendStockTransferDto>> {
    return this.http.post<ApiResponse<BackendStockTransferDto>>(`${this.baseUrl}/${id}/receive`, request);
  }

  getTransferEvents(id: number): Observable<ApiResponse<BackendTransferEventDto[]>> {
    return this.http.get<ApiResponse<BackendTransferEventDto[]>>(`${this.baseUrl}/${id}/events`);
  }

  rejectTransfer(id: number, reason: string): Observable<ApiResponse<BackendStockTransferDto>> {
    const params = new HttpParams().set('reason', reason);
    return this.http.post<ApiResponse<BackendStockTransferDto>>(`${this.baseUrl}/${id}/reject`, { reason }, { params });
  }

  reportDiscrepancy(id: number, request: {
    productId: number;
    expectedQuantity: number;
    receivedQuantity: number;
    discrepancyType: 'SHORTAGE' | 'DAMAGE' | 'EXCESS';
    notes?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${id}/report-discrepancy`, request);
  }

  getDiscrepancies(id: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/${id}/discrepancies`);
  }
}

