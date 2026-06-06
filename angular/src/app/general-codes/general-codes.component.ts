import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { UiTranslationsService } from '../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';
import { GeneralCodePanelComponent } from './general-code-panel/general-code-panel.component';
import { GENERAL_CODE_TABS } from './general-codes.constants';
import type { GeneralCodeCategoryId, GeneralCodeTabConfig } from './general-codes.constants';

@Component({
  selector: 'app-general-codes',
  standalone: true,
  imports: [CommonModule, GeneralCodePanelComponent],
  templateUrl: './general-codes.component.html',
  styleUrls: ['./general-codes.component.scss'],
})
export class GeneralCodesComponent implements OnInit {
  @Input() embedded = false;

  readonly ui = inject(UiTranslationsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs = GENERAL_CODE_TABS;
  activeTab: GeneralCodeCategoryId = GENERAL_CODE_TABS[0].id;

  ngOnInit(): void {
    if (this.embedded) {
      this.activeTab = 'preference-category';
    }
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
  }

  tabLabel(labelKey: string): string {
    return this.ui.screenText('generalCodes', labelKey);
  }

  selectTab(id: GeneralCodeCategoryId): void {
    this.activeTab = id;
  }

  activeTabConfig(): GeneralCodeTabConfig | undefined {
    return this.tabs.find((t) => t.id === this.activeTab);
  }
}
