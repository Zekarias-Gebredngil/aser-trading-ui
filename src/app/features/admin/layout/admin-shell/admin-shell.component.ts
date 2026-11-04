import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { UserApiService } from '../../../../core/services/api/user-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslationService, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../../../core/services/translation.service';

@Component({
  selector: 'aser-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, IconComponent, TranslatePipe],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css'
})
export class AdminShellComponent implements OnInit {
  readonly state = inject(AserStateService);
  readonly translation = inject(TranslationService);
  private readonly authApi = inject(AuthApiService);
  private readonly userApi = inject(UserApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  @Input() section = 'Overview';

  readonly supportedLanguages = SUPPORTED_LANGUAGES;

  mobileSidebarOpen = signal(false);
  sidebarCollapsed = signal(this.getInitialSidebarCollapsed());
  profileMenuOpen = signal(false);
  activeProfileTab = signal<'details' | 'password' | 'language'>('details');

  // Strongly-typed reactive computed View Models
  readonly lowStockCount = computed<number>(() => this.state.lowStockCount());
  readonly pendingTransfersCount = computed<number>(() => this.state.pendingTransfersCount());
  readonly ordersCount = computed<number>(() => this.state.orders().length);
  readonly branchesCount = computed<number>(() => this.state.branches().length);
  readonly employeesCount = computed<number>(() => this.state.employees().length);
  readonly canAccessAllBranches = computed<boolean>(() => this.state.hasPermission('ACCESS_ALL_BRANCHES'));
  readonly isBranchScopeLocked = computed<boolean>(() => this.state.isBranchScopeLocked());
  readonly userAssignedBranch = computed<string>(() => this.state.currentUser()?.assignedBranchName || 'Assigned Branch');
  readonly currentUserName = computed<string>(() => this.state.currentUser()?.fullName || 'Signed In');
  readonly currentUserRole = computed<string>(() => this.state.currentUser()?.roleLabel || 'Staff');
  readonly currentUserEmail = computed<string>(() => this.state.currentUser()?.email || this.state.currentUser()?.username || '-');
  readonly currentUserUsername = computed<string>(() => this.state.currentUser()?.username || '-');
  readonly currentUserBranchName = computed<string>(() => this.state.currentUser()?.assignedBranchName || 'Global HQ / Consolidated');
  readonly branchFilter = computed<string>(() => this.state.selectedBranchFilter());
  readonly branchList = computed(() => this.state.branches());

  // Permissions & Role Computeds
  readonly canViewInventory = computed<boolean>(() => this.state.hasPermission('VIEW_INVENTORY'));
  readonly canManageProducts = computed<boolean>(() => this.state.hasPermission('MANAGE_PRODUCTS') || this.state.currentRole() === 'SYSTEM_ADMINISTRATOR');
  readonly canManageServices = computed<boolean>(() => this.state.hasPermission('MANAGE_SERVICES') || this.state.currentRole() === 'SYSTEM_ADMINISTRATOR');
  readonly canManageTransfers = computed<boolean>(() =>
    this.state.hasPermission('REQUEST_TRANSFER') ||
    this.state.hasPermission('DISPATCH_TRANSFER') ||
    this.state.hasPermission('APPROVE_TRANSFER')
  );
  readonly canManageOrders = computed<boolean>(() => this.state.hasPermission('MANAGE_ORDERS'));
  readonly canManageAdministration = computed<boolean>(() => this.state.hasPermission('MANAGE_BRANCHES') || this.state.hasPermission('MANAGE_EMPLOYEES'));
  readonly canManageBranches = computed<boolean>(() => this.state.hasPermission('MANAGE_BRANCHES'));
  readonly canManageEmployees = computed<boolean>(() => this.state.hasPermission('MANAGE_EMPLOYEES'));
  readonly isSystemAdmin = computed<boolean>(() => this.state.currentRole() === 'SYSTEM_ADMINISTRATOR');

  private getInitialSidebarCollapsed(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aser_sidebar_collapsed') === 'true';
    }
    return false;
  }

  // Change password form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordError = signal<string | null>(null);
  passwordSuccess = signal<string | null>(null);
  isSubmittingPassword = signal(false);

  ngOnInit(): void {
    // Translation service handles initialization from localStorage
  }

  toggleSidebarCollapse(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 992) {
      this.mobileSidebarOpen.update(v => !v);
    } else {
      this.sidebarCollapsed.update(v => {
        const next = !v;
        if (typeof window !== 'undefined') {
          localStorage.setItem('aser_sidebar_collapsed', String(next));
        }
        return next;
      });
    }
  }

  toggleSidebar(): void {
    this.toggleSidebarCollapse();
  }

  closeSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.profileMenuOpen.update(v => !v);
    this.passwordError.set(null);
    this.passwordSuccess.set(null);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  setActiveProfileTab(tab: 'details' | 'password' | 'language'): void {
    this.activeProfileTab.set(tab);
  }

  onBranchFilterChange(branchId: string): void {
    this.state.selectedBranchFilter.set(branchId);
  }

  selectLanguage(lang: SupportedLanguage): void {
    this.translation.setLanguage(lang);
    const meta = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    this.toast.info(
      'Language Updated',
      `Interface language set to ${meta?.nativeName || lang}`
    );
  }

  onSubmitPassword(event: Event): void {
    event.preventDefault();
    this.submitChangePassword();
  }

  submitChangePassword(): void {
    this.passwordError.set(null);
    this.passwordSuccess.set(null);

    if (!this.passwordForm.newPassword || this.passwordForm.newPassword.length < 6) {
      this.passwordError.set('New password must be at least 6 characters long.');
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError.set('New password and confirmation do not match.');
      return;
    }

    this.isSubmittingPassword.set(true);

    this.authApi.changePassword({
      currentPassword: this.passwordForm.currentPassword || undefined,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: () => {
        this.isSubmittingPassword.set(false);
        this.passwordSuccess.set('Password updated successfully!');
        this.toast.success('Password Changed', 'Your account password has been updated in database.');
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      },
      error: (err) => {
        this.isSubmittingPassword.set(false);
        const errMsg = err?.error?.detail || err?.error?.message || err?.message || 'Failed to update password.';
        this.passwordError.set(errMsg);
      }
    });
  }

  logout(): void {
    this.closeProfileMenu();
    this.state.logoutStaff();
    this.router.navigate(['/app/login']);
  }
}
