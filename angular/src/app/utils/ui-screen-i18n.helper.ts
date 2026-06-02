import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { HOTEL_CURRENCY_UPDATED_EVENT } from '../services/hotel-currency.service';

/** يعيد رسم المكوّن عند تغيير لغة الواجهة أو تحديث الترجمات من الخادم */
export function bindUiTranslationRefresh(cdr: ChangeDetectorRef, destroyRef: DestroyRef): void {
  fromEvent(window, 'hotelUiLocaleChanged')
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => cdr.markForCheck());

  fromEvent(window, HOTEL_CURRENCY_UPDATED_EVENT)
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => cdr.markForCheck());

  fromEvent(window, 'hotelUiTranslationsUpdated')
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => cdr.markForCheck());
}
