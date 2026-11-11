import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendCreateInquiryRequest {
  customerName: string;
  email: string;
  phone?: string;
  companyName?: string;
  serviceType?: string;
  inquiryType?: 'GENERAL_INQUIRY' | 'QUOTATION_REQUEST' | 'PRICE_QUOTATION' | 'CUSTOM_PRINT_JOB' | 'FLEET_BRANDING' | 'BULK_MATERIAL_SUPPLY';
  subject: string;
  message: string;
  specifications?: string;
  requestedQuantity?: number;
}

export interface BackendInquiryDto {
  id: number;
  inquiryNumber: string;
  customerName: string;
  email: string;
  phone?: string;
  companyName?: string;
  serviceType?: string;
  inquiryType: string;
  subject: string;
  message: string;
  specifications?: string;
  requestedQuantity?: number;
  status: 'NEW' | 'UNDER_REVIEW' | 'QUOTED' | 'QUOTE_SENT' | 'CONVERTED_TO_ORDER' | 'DECLINED' | 'CLOSED';
  assignedStaffName?: string;
  quotedPrice?: number;
  quotedAmount?: number;
  estimatedCost?: number;
  netRevenue?: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class InquiryApiService {
  private http = inject(HttpClient);

  submitInquiry(request: BackendCreateInquiryRequest): Observable<ApiResponse<BackendInquiryDto>> {
    return this.http.post<ApiResponse<BackendInquiryDto>>(`${environment.apiUrl}/public/inquiries`, request);
  }

  getAdminInquiries(page = 0, size = 20): Observable<ApiResponse<PagedResponse<BackendInquiryDto>>> {
    return this.http.get<ApiResponse<PagedResponse<BackendInquiryDto>>>(`${environment.apiUrl}/inquiries?page=${page}&size=${size}`);
  }

  getInquiryById(id: number): Observable<ApiResponse<BackendInquiryDto>> {
    return this.http.get<ApiResponse<BackendInquiryDto>>(`${environment.apiUrl}/inquiries/${id}`);
  }

  quoteInquiry(id: number, request: {
    quotedPrice?: number;
    quotedAmount?: number;
    estimatedCost?: number;
    cost?: number;
    adminNotes?: string;
    notes?: string
  }): Observable<ApiResponse<BackendInquiryDto>> {
    const price = request.quotedPrice ?? request.quotedAmount ?? 0;
    const cost = request.estimatedCost ?? request.cost ?? 0;
    const payload = {
      quotedPrice: price,
      quotedAmount: price,
      estimatedCost: cost,
      cost: cost,
      adminNotes: request.adminNotes ?? request.notes ?? '',
      notes: request.notes ?? request.adminNotes ?? ''
    };
    return this.http.post<ApiResponse<BackendInquiryDto>>(`${environment.apiUrl}/inquiries/${id}/quote`, payload);
  }
}

