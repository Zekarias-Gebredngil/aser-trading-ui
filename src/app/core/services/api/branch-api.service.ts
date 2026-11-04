import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './api-response.model';

export interface BackendBranchDto {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface BackendWarehouseDto {
  id: number;
  branchId: number;
  branchName: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BranchApiService {
  private http = inject(HttpClient);

  getPublicBranches(): Observable<ApiResponse<BackendBranchDto[]>> {
    return this.http.get<ApiResponse<BackendBranchDto[]>>(`${environment.apiUrl}/public/branches`);
  }

  getAdminBranches(): Observable<ApiResponse<BackendBranchDto[]>> {
    return this.http.get<ApiResponse<BackendBranchDto[]>>(`${environment.apiUrl}/branches`);
  }

  getWarehouses(branchId?: number): Observable<ApiResponse<BackendWarehouseDto[]>> {
    const url = branchId 
      ? `${environment.apiUrl}/warehouses/branch/${branchId}`
      : `${environment.apiUrl}/warehouses`;
    return this.http.get<ApiResponse<BackendWarehouseDto[]>>(url);
  }

  getWarehouseById(id: number): Observable<ApiResponse<BackendWarehouseDto>> {
    return this.http.get<ApiResponse<BackendWarehouseDto>>(`${environment.apiUrl}/warehouses/${id}`);
  }

  createWarehouse(request: {
    branchId: number;
    name: string;
    code: string;
    isDefault?: boolean;
  }): Observable<ApiResponse<BackendWarehouseDto>> {
    return this.http.post<ApiResponse<BackendWarehouseDto>>(`${environment.apiUrl}/warehouses`, request);
  }

  updateWarehouse(id: number, request: {
    branchId: number;
    name: string;
    code: string;
    isDefault?: boolean;
  }): Observable<ApiResponse<BackendWarehouseDto>> {
    return this.http.put<ApiResponse<BackendWarehouseDto>>(`${environment.apiUrl}/warehouses/${id}`, request);
  }

  createBranch(request: {
    name: string;
    code: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  }): Observable<ApiResponse<BackendBranchDto>> {
    return this.http.post<ApiResponse<BackendBranchDto>>(`${environment.apiUrl}/branches`, request);
  }

  updateBranch(id: number, request: {
    name: string;
    code: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  }): Observable<ApiResponse<BackendBranchDto>> {
    return this.http.put<ApiResponse<BackendBranchDto>>(`${environment.apiUrl}/branches/${id}`, request);
  }
}

