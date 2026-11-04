import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './api-response.model';

export interface BackendCategoryDto {
  id: number;
  name: string;
  code?: string;
  slug: string;
  description?: string;
  isActive: boolean;
  productCount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  getAllCategories(): Observable<ApiResponse<BackendCategoryDto[]>> {
    return this.http.get<ApiResponse<BackendCategoryDto[]>>(this.baseUrl);
  }

  getCategoryById(id: number): Observable<ApiResponse<BackendCategoryDto>> {
    return this.http.get<ApiResponse<BackendCategoryDto>>(`${this.baseUrl}/${id}`);
  }

  createCategory(request: CreateCategoryRequest): Observable<ApiResponse<BackendCategoryDto>> {
    return this.http.post<ApiResponse<BackendCategoryDto>>(this.baseUrl, request);
  }
}
