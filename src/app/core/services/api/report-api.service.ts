import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './api-response.model';

export interface SalesReportDto {
  totalOrders: number;
  totalRevenueEtb: number;
  averageOrderValueEtb: number;
  pendingFulfillmentCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  salesByDeliveryType?: Record<string, number>;
  salesByPaymentMethod?: Record<string, number>;
}

export interface BranchStockSummary {
  branchId: number;
  branchName: string;
  branchCode: string;
  warehouseCount: number;
  totalProducts: number;
  totalUnitsOnHand: number;
  totalValuationEtb: number;
}

export interface StockSummaryReportDto {
  totalProducts: number;
  totalUnitsOnHand: number;
  totalWarehouses: number;
  branchSummaries: BranchStockSummary[];
}

export interface ProductValuationItem {
  productId: number;
  productSku: string;
  productName: string;
  categoryName: string;
  totalUnitsOnHand: number;
  weightedAverageCost: number;
  totalValuationEtb: number;
}

export interface StockValuationReportDto {
  totalValuationEtb: number;
  productCount: number;
  items: ProductValuationItem[];
}

export interface TransferReportDto {
  totalTransfers: number;
  inTransitCount: number;
  receivedCount: number;
  discrepancyCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reports`;

  getSalesReport(): Observable<ApiResponse<SalesReportDto>> {
    return this.http.get<ApiResponse<SalesReportDto>>(`${this.baseUrl}/sales`);
  }

  getStockSummary(): Observable<ApiResponse<StockSummaryReportDto>> {
    return this.http.get<ApiResponse<StockSummaryReportDto>>(`${this.baseUrl}/stock-summary`);
  }

  getStockValuation(): Observable<ApiResponse<StockValuationReportDto>> {
    return this.http.get<ApiResponse<StockValuationReportDto>>(`${this.baseUrl}/stock-valuation`);
  }

  getTransferReport(): Observable<ApiResponse<TransferReportDto>> {
    return this.http.get<ApiResponse<TransferReportDto>>(`${this.baseUrl}/transfer-history`);
  }
}
