import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';

export interface ExcelSheetData {
  name: string;
  data: Record<string, any>[];
}

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {
  private readonly http = inject(HttpClient);

  /**
   * Download Excel file directly from backend export endpoint (supports exportAll=true/false, page, size)
   */
  downloadFromBackend(endpoint: string, params: Record<string, any> = {}, fallbackFilename = 'Aser_Export.xlsx'): Observable<void> {
    const fullUrl = `${environment.apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    let httpParams = new HttpParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) {
        httpParams = httpParams.set(k, String(params[k]));
      }
    });

    return this.http.get(fullUrl, {
      params: httpParams,
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        let filename = fallbackFilename;
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) filename = match[1];
        }

        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        }
      })
    );
  }

  /**
   * Export an array of objects to an Excel (.xlsx) file
   */
  exportJsonToExcel(data: Record<string, any>[], filename: string, sheetName = 'Sheet1'): void {
    if (!data || data.length === 0) {
      console.warn('No data to export to Excel.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = this.calculateColumnWidths(data);

    const workbook = XLSX.utils.book_new();
    const safeSheetName = sheetName.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || 'Data');

    const finalName = this.formatFileName(filename);
    XLSX.writeFile(workbook, finalName);
  }

  /**
   * Export multiple sheets to a single Excel (.xlsx) workbook
   */
  exportMultiSheetExcel(sheets: ExcelSheetData[], filename: string): void {
    const workbook = XLSX.utils.book_new();
    let hasSheets = false;

    for (const sheet of sheets) {
      if (sheet.data && sheet.data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sheet.data);
        worksheet['!cols'] = this.calculateColumnWidths(sheet.data);
        const safeName = sheet.name.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
        XLSX.utils.book_append_sheet(workbook, worksheet, safeName || 'Sheet');
        hasSheets = true;
      }
    }

    if (!hasSheets) {
      console.warn('No sheet data available to export.');
      return;
    }

    const finalName = this.formatFileName(filename);
    XLSX.writeFile(workbook, finalName);
  }

  /**
   * Export an existing HTML table directly to Excel (.xlsx)
   */
  exportTableToExcel(table: HTMLTableElement | string, filename: string, sheetName = 'Report'): void {
    const el = typeof table === 'string' ? (document.getElementById(table) as HTMLTableElement) : table;
    if (!el) {
      console.warn('Table element not found for Excel export.');
      return;
    }

    const worksheet = XLSX.utils.table_to_sheet(el);
    const workbook = XLSX.utils.book_new();
    const safeSheetName = sheetName.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || 'Report');

    const finalName = this.formatFileName(filename);
    XLSX.writeFile(workbook, finalName);
  }

  private calculateColumnWidths(data: Record<string, any>[]): { wch: number }[] {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.map(key => {
      let maxLen = key.length;
      for (let i = 0; i < Math.min(data.length, 50); i++) {
        const val = data[i][key];
        const valStr = val != null ? String(val) : '';
        if (valStr.length > maxLen) {
          maxLen = valStr.length;
        }
      }
      return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
    });
  }

  private formatFileName(filename: string): string {
    const clean = filename.replace(/\.xlsx$/i, '').replace(/[^a-zA-Z0-9_\-\u1200-\u137F]/g, '_');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return `${clean}_${dateStr}_${timeStr}.xlsx`;
  }
}

