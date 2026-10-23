import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './api-response.model';

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  assignedBranchId: number | null;
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  assignedBranchId?: number;
  assignedBranchName?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<AuthResponse | null>(this.getStoredUser());
  readonly isAuthenticated = signal<boolean>(!!this.getStoredToken());

  private getStoredToken(): string | null {
    return localStorage.getItem('aser_auth_token');
  }

  private getStoredUser(): AuthResponse | null {
    const raw = localStorage.getItem('aser_auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }

  login(credentials: { username?: string; usernameOrEmail?: string; password: string }): Observable<ApiResponse<AuthResponse>> {
    const payload = {
      username: credentials.username || credentials.usernameOrEmail,
      password: credentials.password
    };
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, payload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  register(customerData: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    companyName?: string;
  }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/register`, customerData).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  getCurrentUser(): Observable<ApiResponse<UserDto>> {
    return this.http.get<ApiResponse<UserDto>>(`${this.baseUrl}/me`);
  }

  changePassword(request: { currentPassword?: string; newPassword: string }): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/change-password`, request);
  }

  logout(): void {
    localStorage.removeItem('aser_auth_token');
    localStorage.removeItem('aser_auth_user');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  setSession(authData: AuthResponse): void {
    localStorage.setItem('aser_auth_token', authData.accessToken);
    localStorage.setItem('aser_auth_user', JSON.stringify(authData));
    this.currentUser.set(authData);
    this.isAuthenticated.set(true);
  }
}
