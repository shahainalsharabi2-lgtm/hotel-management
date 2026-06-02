import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';
import type { GeneralCodeCategoryId } from '../general-codes.constants';
import {
  CreateUpdateGeneralCodeItem,
  GeneralCodeItem,
  GeneralCodesService,
} from '../general-codes.service';

@Component({
  selector: 'app-general-code-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './general-code-panel.component.html',
  styleUrls: ['./general-code-panel.component.scss'],
})
export class GeneralCodePanelComponent implements OnInit {
  @Input({ required: true }) category!: GeneralCodeCategoryId;
  @Input({ required: true }) titleKey!: string;
  @Input({ required: true }) descriptionKey!: string;

  readonly ui = inject(UiTranslationsService);
  private readonly api = inject(GeneralCodesService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  items: GeneralCodeItem[] = [];
  loading = false;
  saving = false;
  modalOpen = false;
  editingId: string | null = null;
  errorMessage = '';

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(256)]],
    fName: ['', Validators.maxLength(256)],
    description: ['', Validators.maxLength(1024)],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.loadItems();
  }

  ngOnChanges(): void {
    // عند التنقّل بين التبويبات يتم تحديث @Input(category) على نفس المكوّن،
    // لذلك نعيد التحميل ليظهر البيانات السابقة فوراً.
    if (this.category) {
      this.loadItems();
    }
  }

  loadItems(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api
      .getList(this.category)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.items = items;
        },
        error: () => {
          this.errorMessage = this.ui.screenText('generalCodes', 'loadFailed');
        },
      });
  }

  openCreate(): void {
    this.editingId = null;
    this.form.reset({ name: '', fName: '', description: '', displayOrder: this.nextDisplayOrder() });
    this.modalOpen = true;
  }

  openEdit(item: GeneralCodeItem): void {
    this.editingId = item.id;
    this.form.reset({
      name: item.name,
      fName: item.fName ?? '',
      description: item.description ?? '',
      displayOrder: item.displayOrder,
    });
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingId = null;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as CreateUpdateGeneralCodeItem;
    this.saving = true;
    const req$ = this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(this.category, payload);

    req$
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.closeModal();
          this.upsertItem(saved);
          this.sortItems();
        },
        error: () => {
          this.errorMessage = this.ui.screenText('generalCodes', 'saveFailed');
        },
      });
  }

  deleteItem(item: GeneralCodeItem): void {
    const msg = this.ui.screenText('generalCodes', 'confirmDelete');
    if (!window.confirm(`${msg}\n${item.name}`)) {
      return;
    }

    this.api
      .delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.items = this.items.filter((x) => x.id !== item.id);
          this.sortItems();
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = this.ui.screenText('generalCodes', 'deleteFailed');
        },
      });
  }

  private upsertItem(saved: GeneralCodeItem): void {
    const idx = this.items.findIndex((x) => x.id === saved.id);
    if (idx >= 0) {
      this.items = [...this.items.slice(0, idx), saved, ...this.items.slice(idx + 1)];
      return;
    }
    this.items = [...this.items, saved];
  }

  private sortItems(): void {
    this.items = [...this.items].sort((a, b) => {
      const ao = Number(a.displayOrder ?? 0);
      const bo = Number(b.displayOrder ?? 0);
      if (ao !== bo) return ao - bo;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ar');
    });
  }

  private nextDisplayOrder(): number {
    if (!this.items.length) {
      return 1;
    }
    return Math.max(...this.items.map((x) => x.displayOrder)) + 1;
  }
}
