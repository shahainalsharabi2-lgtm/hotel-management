import { Pipe, PipeTransform, inject } from '@angular/core';
import { HotelCurrencyService } from '../services/hotel-currency.service';

/** رمز العملة الحالي من إعدادات الفندق */
@Pipe({ name: 'hotelSymbol', standalone: true, pure: false })
export class HotelSymbolPipe implements PipeTransform {
  private readonly currency = inject(HotelCurrencyService);

  transform(): string {
    return this.currency.symbol();
  }
}
