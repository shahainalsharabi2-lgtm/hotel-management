import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { fromEvent } from 'rxjs';
import {
  ArabicPreferenceCategoryService,
  type ArabicPreferenceCategoryView,
} from '../../services/arabic-preference-category.service';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { UiMessageService } from '../../services/ui-message.service';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';

import { ArabicCategoryGridComponent } from '../../shared/arabic-category-grid/arabic-category-grid.component';

@Component({
  selector: 'app-arabic-locale-pick',
  standalone: true,
  imports: [CommonModule, RouterModule, ArabicCategoryGridComponent],
  templateUrl: './arabic-locale-pick.component.html',
  styleUrls: ['./arabic-locale-pick.component.scss'],
})
export class ArabicLocalePickComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  readonly arabicPref = inject(ArabicPreferenceCategoryService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.arabicPref.reload();
    fromEvent(window, 'hotelArabicCategoryChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
  }

  isActive(cat: ArabicPreferenceCategoryView): boolean {
    return this.arabicPref.selectedId() === cat.id;
  }

  pickCategory(id: string): void {
    const cat = this.arabicPref.categories().find((c) => c.id === id);
    this.arabicPref.selectCategory(id);
    if (this.ui.displayLocale() !== 'ar') {
      this.ui.setDisplayLocale('ar', { skipToast: true });
    }
    const label = cat?.label || cat?.region || id;
    const message = this.ui.chromeLabel('toastLocaleCategorySelected').replace('{0}', label);
    this.uiMsg.success(message, { title: this.ui.chromeLabel('toastLocaleCategoryTitle') });
    this.cdr.markForCheck();
  }
}
