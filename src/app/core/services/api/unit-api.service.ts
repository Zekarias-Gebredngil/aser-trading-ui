import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './api-response.model';

export interface BackendUnitDto {
  id: number;
  name: string;
  code: string;
  symbol: string;
  isBaseUnit: boolean;
  conversionFactor?: number;
}

export interface CreateUnitRequest {
  name: string;
  code: string;
  symbol: string;
  isBaseUnit?: boolean;
  conversionFactor?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UnitApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/units`;

  getAllUnits(): Observable<ApiResponse<BackendUnitDto[]>> {
    return this.http.get<ApiResponse<BackendUnitDto[]>>(this.baseUrl);
  }

  createUnit(request: CreateUnitRequest): Observable<ApiResponse<BackendUnitDto>> {
    return this.http.post<ApiResponse<BackendUnitDto>>(this.baseUrl, request);
  }
}
