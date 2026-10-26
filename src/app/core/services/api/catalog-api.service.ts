import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendPublicProductDto {
  id: number;
  sku: string;
  name: string;
  slug: string;
  description: string;
  categoryId: number;
  categoryName: string;
  baseUnitName: string;
  baseUnitSymbol: string;
  sellingPrice: number | null;
  isQuotationOnly: boolean;
  imageUrl: string;
  specifications: string;
  availability: 'IN_STOCK' | 'LIMITED' | 'OUT_OF_STOCK' | 'ON_REQUEST';
}

export interface BackendProductDto {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  amharicName?: string;
  slug: string;
  description: string;
  categoryId: number;
  categoryName: string;
  baseUnitId: number;
  baseUnitName: string;
  baseUnitSymbol: string;
  purchaseCost: number;
  sellingPrice: number;
  reorderThreshold: number;
  preferredSupplierId?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isQuotationOnly: boolean;
  isPublished: boolean;
  imageUrl?: string;
  specifications?: string;
  totalOnHandStock?: number;
}

export interface BackendCategoryDto {
  id: number;
  name: string;
  code: string;
  slug: string;
  description?: string;
  isActive: boolean;
  productCount?: number;
}

export interface BackendServiceItemDto {
  serviceCode: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  features: string[];
  requiresQuotation: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogApiService {
  private http = inject(HttpClient);
  private readonly publicUrl = `${environment.apiUrl}/public`;
  private readonly adminUrl = `${environment.apiUrl}/products`;

  // Public Catalog
  getPublicProducts(filter?: { categoryId?: number; search?: string; page?: number; size?: number }): Observable<ApiResponse<PagedResponse<BackendPublicProductDto>>> {
    let params = new HttpParams();
    if (filter?.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.page !== undefined) params = params.set('page', filter.page.toString());
    if (filter?.size !== undefined) params = params.set('size', filter.size.toString());

    return this.http.get<ApiResponse<PagedResponse<BackendPublicProductDto>>>(`${this.publicUrl}/products`, { params });
  }

  getPublicProductBySlug(slug: string): Observable<ApiResponse<BackendPublicProductDto>> {
    return this.http.get<ApiResponse<BackendPublicProductDto>>(`${this.publicUrl}/products/${slug}`);
  }

  getPublicCategories(): Observable<ApiResponse<BackendCategoryDto[]>> {
    return this.http.get<ApiResponse<BackendCategoryDto[]>>(`${this.publicUrl}/categories`);
  }

  getPublicServices(): Observable<ApiResponse<BackendServiceItemDto[]>> {
    return this.http.get<ApiResponse<BackendServiceItemDto[]>>(`${this.publicUrl}/services`);
  }

  // Admin Catalog Management
  getAdminProducts(filter?: { status?: string; categoryId?: number; search?: string; page?: number; size?: number }): Observable<ApiResponse<PagedResponse<BackendProductDto>>> {
    let params = new HttpParams();
    if (filter?.status) params = params.set('status', filter.status);
    if (filter?.categoryId) params = params.set('categoryId', filter.categoryId.toString());
    if (filter?.search) params = params.set('search', filter.search);
    if (filter?.page !== undefined) params = params.set('page', filter.page.toString());
    if (filter?.size !== undefined) params = params.set('size', filter.size.toString());

    return this.http.get<ApiResponse<PagedResponse<BackendProductDto>>>(this.adminUrl, { params });
  }

  createProduct(request: {
    sku: string;
    barcode?: string;
    name: string;
    amharicName?: string;
    description: string;
    categoryId: number;
    baseUnitId: number;
    purchaseCost: number;
    sellingPrice: number;
    reorderThreshold: number;
    preferredSupplierId?: number;
    isQuotationOnly?: boolean;
    isPublished?: boolean;
    imageUrl?: string;
    specifications?: string;
  }): Observable<ApiResponse<BackendProductDto>> {
    return this.http.post<ApiResponse<BackendProductDto>>(this.adminUrl, request);
  }

  updateProduct(id: number, request: any): Observable<ApiResponse<BackendProductDto>> {
    return this.http.put<ApiResponse<BackendProductDto>>(`${this.adminUrl}/${id}`, request);
  }

  archiveProduct(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.adminUrl}/${id}`);
  }

  uploadMedia(file: File, folder = 'images'): Observable<ApiResponse<{ url: string; relativeUrl: string; fileName: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return this.http.post<ApiResponse<{ url: string; relativeUrl: string; fileName: string }>>(`${environment.apiUrl}/media/upload`, formData);
  }

  createAdminService(request: {
    serviceCode: string;
    title: string;
    category: string;
    description: string;
    imageUrl?: string;
    keyOfferings?: string;
    requiresQuotation?: boolean;
    displayOrder?: number;
  }): Observable<ApiResponse<BackendServiceItemDto>> {
    return this.http.post<ApiResponse<BackendServiceItemDto>>(`${environment.apiUrl}/services`, request);
  }

  updateAdminService(id: number, request: any): Observable<ApiResponse<BackendServiceItemDto>> {
    return this.http.put<ApiResponse<BackendServiceItemDto>>(`${environment.apiUrl}/services/${id}`, request);
  }

  deleteAdminService(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${environment.apiUrl}/services/${id}`);
  }
}

