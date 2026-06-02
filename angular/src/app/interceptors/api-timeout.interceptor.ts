import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';

/** يمنع تعليق الواجهة عند عدم تشغيل الخادم أو بطء الشبكة (Render free tier cold start) */
const API_TIMEOUT_MS = 60_000;

export const apiTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }
  return next(req).pipe(timeout(API_TIMEOUT_MS));
};
