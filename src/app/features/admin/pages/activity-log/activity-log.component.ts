import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { PaginatorComponent } from '../../../../core/components/paginator/paginator.component';
import { AuditApiService, BackendAuditLogDto } from '../../../../core/services/api/audit-api.service';
import { ExcelExportService } from '../../../../core/services/excel-export.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, IconComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './activity-log.component.html',
  styleUrl: './activity-log.component.css'
})
export class ActivityLogComponent implements OnInit {
  private readonly auditApi = inject(AuditApiService);
  private readonly excelService = inject(ExcelExportService);
  private readonly toast = inject(ToastService);

  readonly logs = signal<BackendAuditLogDto[]>([]);
  readonly isLoading = signal(false);
  readonly searchQuery = signal('');
  readonly selectedEntityType = signal('ALL');

  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);

  readonly entityTypes = [
    'ALL',
    'User',
    'Order',
    'Product',
    'Inventory',
    'StockTransfer',
    'Branch',
    'Category',
    'Auth'
  ];

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    const entity = this.selectedEntityType() === 'ALL' ? undefined : this.selectedEntityType();
    const actor = this.searchQuery().trim() || undefined;

    this.auditApi.getAuditLogs(actor, entity, this.page(), this.pageSize()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.logs.set(res.data.content || []);
          this.totalElements.set(res.data.totalElements || 0);
          this.totalPages.set(res.data.totalPages || 0);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Audit Log Error', 'Could not fetch system audit records.');
      }
    });
  }

  onFilterChange(): void {
    this.page.set(0);
    this.loadLogs();
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.loadLogs();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.page.set(0);
    this.loadLogs();
  }

  getActionBadgeClass(action: string): string {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('CONFIRM') || act.includes('SUCCESS') || act.includes('COMPLETE')) {
      return 'badge-success';
    }
    if (act.includes('CANCEL') || act.includes('REVOKE') || act.includes('DELETE') || act.includes('FAILURE')) {
      return 'badge-danger';
    }
    if (act.includes('UPDATE') || act.includes('DISPATCH') || act.includes('CHANGE')) {
      return 'badge-info';
    }
    return 'badge-neutral';
  }

  exportLogsToExcel(): void {
    const list = this.logs();
    if (list.length === 0) {
      this.toast.error('No activity log records found to export.');
      return;
    }

    const data = list.map(l => ({
      'Record ID': l.id,
      'Timestamp': new Date(l.createdAt).toLocaleString(),
      'Actor': l.actor,
      'Action': l.action,
      'Entity Module': l.entityType,
      'Entity ID': l.entityId || '—',
      'Forensic Details': l.details || '',
      'IP Address': l.ipAddress || '—'
    }));

    this.excelService.exportJsonToExcel(data, 'Aser_System_Activity_Audit_Log', 'Audit Trail');
    this.toast.success(`Exported ${data.length} audit log records to Excel.`);
  }
}

