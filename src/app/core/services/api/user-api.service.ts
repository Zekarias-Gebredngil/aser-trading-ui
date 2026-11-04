import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendCreateUserRequest {
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  assignedBranchId?: number;
  password: string;
}

export interface BackendUpdateUserRequest {
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  assignedBranchId?: number;
  isActive?: boolean;
  newPassword?: string;
}

export interface BackendUserDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  assignedBranchId?: number;
  assignedBranchName?: string;
  isActive: boolean;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  getUsers(role?: string, branchId?: number, page = 0, size = 50): Observable<ApiResponse<PagedResponse<BackendUserDto>>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (role && role !== 'ALL') params = params.set('role', role);
    if (branchId) params = params.set('branchId', branchId.toString());

    return this.http.get<ApiResponse<PagedResponse<BackendUserDto>>>(this.baseUrl, { params });
  }

  getUserById(id: number): Observable<ApiResponse<BackendUserDto>> {
    return this.http.get<ApiResponse<BackendUserDto>>(`${this.baseUrl}/${id}`);
  }

  createUser(request: BackendCreateUserRequest): Observable<ApiResponse<BackendUserDto>> {
    return this.http.post<ApiResponse<BackendUserDto>>(this.baseUrl, request);
  }

  updateUser(id: number, request: BackendUpdateUserRequest): Observable<ApiResponse<BackendUserDto>> {
    return this.http.patch<ApiResponse<BackendUserDto>>(`${this.baseUrl}/${id}`, request);
  }

  grantBranchAccess(userId: number, branchId: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${userId}/branches/${branchId}`, {});
  }

  revokeBranchAccess(userId: number, branchId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${userId}/branches/${branchId}`);
  }

  getAccessibleBranchIds(userId: number): Observable<ApiResponse<number[]>> {
    return this.http.get<ApiResponse<number[]>>(`${this.baseUrl}/${userId}/branches`);
  }
}

