import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { ArabicPreferenceCategoryView } from '../../services/arabic-preference-category.service';

@Component({
  selector: 'app-arabic-category-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arabic-category-grid.component.html',
  styleUrls: ['./arabic-category-grid.component.scss'],
})
export class ArabicCategoryGridComponent {
  @Input({ required: true }) categories: ArabicPreferenceCategoryView[] = [];
  @Input() selectedId: string | null = null;
  @Input() compact = false;
  @Output() categorySelect = new EventEmitter<string>();

  isActive(cat: ArabicPreferenceCategoryView): boolean {
    return this.selectedId === cat.id;
  }

  onPick(id: string): void {
    this.categorySelect.emit(id);
  }
}
