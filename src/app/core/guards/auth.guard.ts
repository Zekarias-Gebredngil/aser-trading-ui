import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AserStateService } from '../services/aser-state.service';
import { ToastService } from '../services/toast.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, routerState: RouterStateSnapshot) => {
  const state = inject(AserStateService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (state.isAuthenticated()) {
    return true;
  }

  toast.warning(
    'Authentication Required',
    'Please enter your credentials to access the system.'
  );
  router.navigate(['/app/login'], { queryParams: { returnUrl: routerState.url } });
  return false;
};

