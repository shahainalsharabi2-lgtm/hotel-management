import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HotelAuthService } from '../services/hotel-auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(HotelAuthService);
  if (auth.isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login']);
};

export const loginPageGuard: CanActivateFn = () => {
  const auth = inject(HotelAuthService);
  if (!auth.isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/dashboard']);
};
