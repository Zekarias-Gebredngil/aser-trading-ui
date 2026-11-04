import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/components/icon/icon.component';
import { AserStateService } from '../../../../core/services/aser-state.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../../../core/services/translation.service';

@Component({
  selector: 'aser-staff-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, TranslatePipe],
  templateUrl: './staff-login.component.html',
  styleUrl: './staff-login.component.css'
})
export class StaffLoginComponent implements OnInit {
  readonly state = inject(AserStateService);
  readonly translation = inject(TranslationService);
  readonly supportedLanguages = SUPPORTED_LANGUAGES;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  username = '';
  password = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  returnUrl = '/app';

  selectLanguage(code: SupportedLanguage) {
    this.translation.setLanguage(code);
  }

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app';
    // If user is already authenticated with valid credentials, navigate forward
    if (this.state.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage.set('Please enter both username and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.state.loginAsUser(this.username, this.password, (success) => {
      this.isLoading.set(false);
      if (success) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.errorMessage.set('Invalid credentials or unauthorized account.');
      }
    });
  }
}
