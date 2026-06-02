import { Pipe, PipeTransform, inject } from '@angular/core';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { formatLocaleMoney, formatLocaleNumber } from '../../utils/locale-format.util';

/**
 * أرقام حسب لغة الواجهة — عربي: ٠١٢٣٤٥٦٧٨٩
 * استخدام: {{ value | localeNumber }} أو {{ value | localeNumber:'money' }}
 */
@Pipe({
  name: 'localeNumber',
  standalone: true,
  pure: false,
})
export class LocaleNumberPipe implements PipeTransform {
  private readonly ui = inject(UiTranslationsService);

  transform(
    value: number | string | null | undefined,
    kind: 'money' | 'int' | 'decimal' = 'decimal',
    maxFractionDigits = 2,
  ): string {
    const num = Number(value);
    const loc = this.ui.displayLocale();
    if (kind === 'money') {
      return formatLocaleMoney(num, loc);
    }
    if (kind === 'int') {
      return formatLocaleNumber(num, loc, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    return formatLocaleNumber(num, loc, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits,
    });
  }
}
