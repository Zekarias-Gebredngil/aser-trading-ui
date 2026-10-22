import { Component, Input, OnInit, inject, signal } from '@angular/core';
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

  selectLanguage(lang: SupportedLanguage): void {
    this.translation.setLanguage(lang);
    const meta = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    this.toast.info(
      'Language Updated',
      `Interface language set to ${meta?.nativeName || lang}`
    );
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
