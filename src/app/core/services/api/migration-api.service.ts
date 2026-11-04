import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './api-response.model';

export interface ImportErrorDto {
  rowNumber: number;
  columnName?: string;
  field?: string;
  rejectedValue?: string;
  errorMessage: string;
}

export interface ImportValidationResultDto {
  jobId: number;
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  status: 'VALIDATED' | 'ERRORS_FOUND' | 'COMMITTED' | 'FAILED';
  errors: ImportErrorDto[];
}

export interface ImportJobDto {
  id: number;
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  status: 'VALIDATED' | 'ERRORS_FOUND' | 'COMMITTED' | 'FAILED';
  committedAt?: string;
  committedBy?: string;
  errors: ImportErrorDto[];
}

@Injectable({
  providedIn: 'root'
})
export class MigrationApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/imports`;

  uploadSpreadsheet(file: File): Observable<ApiResponse<ImportValidationResultDto>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<ImportValidationResultDto>>(`${this.baseUrl}/inventory`, formData);
  }

  getImportJob(id: number): Observable<ApiResponse<ImportJobDto>> {
    return this.http.get<ApiResponse<ImportJobDto>>(`${this.baseUrl}/${id}`);
  }

  commitImport(id: number): Observable<ApiResponse<ImportJobDto>> {
    return this.http.post<ApiResponse<ImportJobDto>>(`${this.baseUrl}/${id}/commit`, {});
  }
}
