import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AserStateService } from '../services/aser-state.service';
import { ToastService } from '../services/toast.service';
import { Permission } from '../models/user.model';

export const permissionGuard = (requiredPermission: Permission | Permission[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot, routerState: RouterStateSnapshot) => {
    const state = inject(AserStateService);
    const router = inject(Router);
    const toast = inject(ToastService);

    // 1. Must be authenticated
    if (!state.isAuthenticated()) {
      toast.warning(
        'Authentication Required',
        'Please sign in with your staff credentials to access this protected resource.'
      );
      router.navigate(['/app/login'], { queryParams: { returnUrl: routerState.url } });
      return false;
    }

    // 2. Must hold at least one of the required authorization permissions
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    if (state.hasAnyPermission(permissions)) {
      return true;
    }

    const user = state.currentUser();
    const roleTitle = user?.roleLabel || 'Your account';
    toast.warning(
      'Access Denied (403)',
      `${roleTitle} is not authorized to access this module. Please contact your System Administrator.`
    );
    router.navigate(['/app']);
    return false;
  };
};
