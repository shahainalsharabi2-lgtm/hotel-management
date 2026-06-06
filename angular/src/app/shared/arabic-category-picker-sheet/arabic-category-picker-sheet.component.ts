import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { fromEvent } from 'rxjs';
import { ArabicCategoryPickerService } from '../../services/arabic-category-picker.service';
import { ArabicPreferenceCategoryService } from '../../services/arabic-preference-category.service';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';
import { ArabicCategoryGridComponent } from '../arabic-category-grid/arabic-category-grid.component';

@Component({
  selector: 'app-arabic-category-picker-sheet',
  standalone: true,
  imports: [CommonModule, RouterModule, ArabicCategoryGridComponent],
  templateUrl: './arabic-category-picker-sheet.component.html',
  styleUrls: ['./arabic-category-picker-sheet.component.scss'],
})
export class ArabicCategoryPickerSheetComponent implements OnInit {
  readonly picker = inject(ArabicCategoryPickerService);
  readonly arabicPref = inject(ArabicPreferenceCategoryService);
  readonly ui = inject(UiTranslationsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    fromEvent(window, 'hotelArabicCategoryChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
  }

  onBackdropClick(): void {
    this.picker.cancel();
  }

  onPick(id: string): void {
    this.picker.confirmSelection(id);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.picker.open()) {
      this.picker.cancel();
    }
  }
}
