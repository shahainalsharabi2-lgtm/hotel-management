import { Injectable, inject, signal } from '@angular/core';
import { ArabicPreferenceCategoryService } from './arabic-preference-category.service';
import { UiTranslationsService } from './ui-translations.service';
import { UiMessageService } from './ui-message.service';

@Injectable({ providedIn: 'root' })
export class ArabicCategoryPickerService {
  private readonly arabicPref = inject(ArabicPreferenceCategoryService);
  private readonly ui = inject(UiTranslationsService);
  private readonly uiMsg = inject(UiMessageService);

  readonly open = signal(false);
  private afterComplete: (() => void) | null = null;

  /** يفتح منتقي الفئة عند التبديل إلى العربية. يُرجع true إذا فُتحت النافذة. */
  requestArabicLocaleSwitch(onComplete?: () => void): boolean {
    this.arabicPref.reload();
    const cats = this.arabicPref.categories();
    if (!cats.length && !this.arabicPref.loading()) {
      this.ui.setDisplayLocale('ar');
      onComplete?.();
      return false;
    }
    this.afterComplete = onComplete ?? null;
    this.open.set(true);
    return true;
  }

  confirmSelection(id: string): void {
    const cat = this.arabicPref.categories().find((c) => c.id === id);
    if (!cat) {
      return;
    }
    this.arabicPref.selectCategory(id);
    if (this.ui.displayLocale() !== 'ar') {
      this.ui.setDisplayLocale('ar', { skipToast: true });
    }
    const label = cat.label || cat.region || id;
    const message = this.ui.chromeLabel('toastLocaleCategorySelected').replace('{0}', label);
    this.uiMsg.success(message, { title: this.ui.chromeLabel('toastLocaleCategoryTitle') });
    this.close(true);
  }

  cancel(): void {
    this.close(false);
  }

  private close(completed: boolean): void {
    this.open.set(false);
    if (completed) {
      this.afterComplete?.();
    }
    this.afterComplete = null;
  }
}
