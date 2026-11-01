import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResponse } from './api-response.model';

export interface BackendAuditLogDto {
  id: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/audit-logs`;

  getAuditLogs(actor?: string, entityType?: string, page = 0, size = 50): Observable<ApiResponse<PagedResponse<BackendAuditLogDto>>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (actor) params = params.set('actor', actor);
    if (entityType) params = params.set('entityType', entityType);

    return this.http.get<ApiResponse<PagedResponse<BackendAuditLogDto>>>(this.baseUrl, { params });
  }
}
