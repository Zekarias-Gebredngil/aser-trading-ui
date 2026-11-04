import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../../layout/admin-shell/admin-shell.component';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SystemSettingsApiService, SystemSettingDto } from '../../../../core/services/api/system-settings-api.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

@Component({
  selector: 'aser-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, IconComponent, TranslatePipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  readonly state = inject(AserStateService);
  private readonly toast = inject(ToastService);
  private readonly settingsApi = inject(SystemSettingsApiService);

  readonly activeTab = signal<'general' | 'inventory' | 'security' | 'system'>('general');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly lastUpdatedMeta = signal<{ at?: string; by?: string }>({});

  setActiveTab(tab: 'general' | 'inventory' | 'security' | 'system'): void {
    this.activeTab.set(tab);
  }

  // Dynamic Settings State loaded from and persisted to Database
  companySettings = {
    companyName: 'Aser Trading',
    amharicName: 'ኣሰር ትሬዲንግ (Aser Trading PLC)',
    tinNumber: '0012948571',
    address: 'Bole Medhanialem, Commercial Tower 4th Floor, Addis Ababa, Ethiopia',
    phone: '+251 11 662 4545',
    email: 'info@asertrading.et',
    supportEmail: 'support@asertrading.et',
    currency: 'ETB (Ethiopian Birr - ብር)'
  };

  policySettings = {
    lowStockThreshold: 10,
    autoFulfillReservations: true,
    enforceStrictBranchLockdown: true,
    valuationMethod: 'WEIGHTED_AVERAGE_COST',
    orderTimeoutHours: 48
  };

  securitySettings = {
    sessionTimeoutHours: 24,
    minPasswordLength: 6,
    requireAuditLogging: true,
    allowedOrigins: 'http://localhost:4200, http://127.0.0.1:4200'
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.settingsApi.getSettings().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.applySettings(res.data);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Settings Error', 'Could not load settings from server.');
      }
    });
  }

  private applySettings(data: SystemSettingDto): void {
    this.companySettings = {
      companyName: data.companyName || 'Aser Trading',
      amharicName: data.amharicName || 'ኣሰር ትሬዲንግ (Aser Trading PLC)',
      tinNumber: data.tinNumber || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      supportEmail: data.supportEmail || '',
      currency: data.currency || 'ETB (Ethiopian Birr - ብር)'
    };

    this.policySettings = {
      lowStockThreshold: data.lowStockThreshold ?? 10,
      autoFulfillReservations: data.autoFulfillReservations ?? true,
      enforceStrictBranchLockdown: data.enforceStrictBranchLockdown ?? true,
      valuationMethod: data.valuationMethod || 'WEIGHTED_AVERAGE_COST',
      orderTimeoutHours: data.orderTimeoutHours ?? 48
    };

    this.securitySettings = {
      sessionTimeoutHours: data.sessionTimeoutHours ?? 24,
      minPasswordLength: data.minPasswordLength ?? 6,
      requireAuditLogging: data.requireAuditLogging ?? true,
      allowedOrigins: data.allowedOrigins || 'http://localhost:4200, http://127.0.0.1:4200'
    };

    this.lastUpdatedMeta.set({
      at: data.updatedAt,
      by: data.updatedBy
    });
  }

  saveSettings(): void {
    this.isSaving.set(true);

    const payload: Partial<SystemSettingDto> = {
      companyName: this.companySettings.companyName,
      amharicName: this.companySettings.amharicName,
      tinNumber: this.companySettings.tinNumber,
      address: this.companySettings.address,
      phone: this.companySettings.phone,
      email: this.companySettings.email,
      supportEmail: this.companySettings.supportEmail,
      currency: this.companySettings.currency,

      lowStockThreshold: Number(this.policySettings.lowStockThreshold),
      orderTimeoutHours: Number(this.policySettings.orderTimeoutHours),
      autoFulfillReservations: Boolean(this.policySettings.autoFulfillReservations),
      enforceStrictBranchLockdown: Boolean(this.policySettings.enforceStrictBranchLockdown),
      valuationMethod: this.policySettings.valuationMethod,

      sessionTimeoutHours: Number(this.securitySettings.sessionTimeoutHours),
      minPasswordLength: Number(this.securitySettings.minPasswordLength),
      requireAuditLogging: Boolean(this.securitySettings.requireAuditLogging),
      allowedOrigins: this.securitySettings.allowedOrigins
    };

    this.settingsApi.updateSettings(payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.success && res.data) {
          this.applySettings(res.data);
          this.toast.success(
            'Settings Saved in Database',
            'All corporate parameters and system configurations have been permanently persisted to database.'
          );
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        const errorMsg = err?.error?.detail || err?.error?.message || 'Failed to persist settings to database.';
        this.toast.error('Save Failed', errorMsg);
      }
    });
  }

  resyncSystem(): void {
    this.toast.info('System Sync Initiated', 'Refreshing branch network, settings, and catalog cache...');
    this.state.initSync();
    this.loadSettings();
  }

  clearBrowserStorage(): void {
    localStorage.removeItem('aser_lang');
    this.toast.success('Cache Flushed', 'Local UI preference cache has been cleared.');
  }
}
