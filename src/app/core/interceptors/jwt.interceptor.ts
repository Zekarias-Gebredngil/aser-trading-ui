import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApiService } from '../services/api/auth-api.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authApi = inject(AuthApiService);
  const token = authApi.getStoredToken();

  let authReq = req;
  if (token && req.url.startsWith(environment.apiUrl)) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isAuthEndpoint = req.url.includes('/auth/login') ||
                               req.url.includes('/auth/register') ||
                               req.url.includes('/auth/refresh');

        const refreshToken = authApi.getStoredRefreshToken();

        if (!isAuthEndpoint && refreshToken) {
          return authApi.refreshToken().pipe(
            switchMap(res => {
              if (res.success && res.data?.accessToken) {
                const retriedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${res.data.accessToken}`
                  }
                });
                return next(retriedReq);
              }
              authApi.logout();
              return throwError(() => error);
            }),
            catchError(refreshErr => {
              authApi.logout();
              return throwError(() => refreshErr);
            })
          );
        }
      }

      return throwError(() => error);
    })
  );
};
