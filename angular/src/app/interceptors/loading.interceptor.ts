import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { AppLoadingService } from '../services/app-loading.service';

/** يتتبّع طلبات API لعرض مؤشر التحميل العام */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const loading = inject(AppLoadingService);
  loading.begin();

  return next(req).pipe(finalize(() => loading.end()));
};
