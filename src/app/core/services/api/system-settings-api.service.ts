import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './api-response.model';

export interface SystemSettingDto {
  id?: number;
  companyName: string;
  amharicName: string;
  tinNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  supportEmail?: string;
  currency?: string;
  lowStockThreshold: number;
  orderTimeoutHours: number;
  autoFulfillReservations: boolean;
  enforceStrictBranchLockdown: boolean;
  valuationMethod: string;
  sessionTimeoutHours: number;
  minPasswordLength: number;
  requireAuditLogging: boolean;
  allowedOrigins?: string;
  updatedAt?: string;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SystemSettingsApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/settings`;

  getSettings(): Observable<ApiResponse<SystemSettingDto>> {
    return this.http.get<ApiResponse<SystemSettingDto>>(this.baseUrl);
  }

  updateSettings(settings: Partial<SystemSettingDto>): Observable<ApiResponse<SystemSettingDto>> {
    return this.http.put<ApiResponse<SystemSettingDto>>(this.baseUrl, settings);
  }
}

