import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiTranslationsService } from '../../services/ui-translations.service';
import type { UiExtraLocaleCode } from '../../utils/ui-translation.constants';
import type { UiLocaleFilePayload } from '../../utils/ui-translations-locale.util';
import { extractLocaleFile } from '../../utils/ui-translations-locale.util';
import {
  UI_LOCALE_BRAND_SUBTITLE_FIELD,
  type LocaleEditorSectionId,
  localeEditorChromeLabel,
  localeEditorReferenceHint,
  localeEditorScreenTitle,
  localeEditorSectionHint,
  localeEditorSectionTitle,
  localeEditorSidebarNavLabel,
} from '../../utils/ui-locale-editor-labels';
import { localeFieldPath } from '../../utils/ui-locale-file-structure';

type AppUiLocale = UiExtraLocaleCode | 'ar';

const EDITOR_TABS: ReadonlyArray<{ id: LocaleEditorSectionId; tech: string }> = [
  { id: 'brandSubtitle', tech: 'brandSubtitle' },
  { id: 'sidebarNav', tech: 'sidebarNav' },
  { id: 'chrome', tech: 'chrome' },
  { id: 'screenCopy', tech: 'screenCopy' },
];

@Component({
  selector: 'app-account-locale-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="le-overlay"
      *ngIf="open"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="ui.chromeLabel('accountJsonEditorTitle')">
      <div class="le-shell">
        <header class="le-top">
          <div class="le-top__brand">
            <h2 class="le-top__title">
              <i class="fas fa-language" aria-hidden="true"></i>
              {{ ui.chromeLabel('accountJsonEditorTitle') }}
            </h2>
            <span class="le-top__file">{{ locale }}.json</span>
            <span class="le-top__meta">{{ totalFieldCount }} حقل</span>
          </div>
          <label class="le-search">
            <i class="fas fa-search" aria-hidden="true"></i>
            <input
              type="search"
              [(ngModel)]="searchQuery"
              placeholder="بحث في الحقول أو المفاتيح..."
              autocomplete="off" />
          </label>
          <button
            type="button"
            class="le-top__close"
            (click)="close()"
            [attr.aria-label]="ui.chromeLabel('accountJsonEditorCancel')">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </header>

        <p class="le-loading" *ngIf="!form">
          <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
          جاري تحميل الترجمات...
        </p>

        <div class="le-workspace" *ngIf="form">
          <aside class="le-nav" aria-label="أقسام الترجمة">
            <button
              *ngFor="let tab of editorTabs"
              type="button"
              class="le-nav__tab"
              [class.le-nav__tab--active]="activeTab === tab.id"
              (click)="setActiveTab(tab.id)">
              <span class="le-nav__tab-title">{{ sectionTitle(tab.id) }}</span>
              <code class="le-nav__tab-tech">{{ tab.tech }}</code>
              <span class="le-nav__tab-count">{{ sectionFieldCount(tab.id) }}</span>
            </button>

            <div class="le-nav__screens" *ngIf="activeTab === 'screenCopy'">
              <p class="le-nav__screens-label">الشاشات</p>
              <button
                *ngFor="let screenId of filteredScreenIds"
                type="button"
                class="le-nav__screen"
                [class.le-nav__screen--active]="activeScreenId === screenId"
                (click)="setActiveScreen(screenId)">
                <span>{{ screenTitle(screenId) }}</span>
                <code>{{ screenId }}</code>
                <small>{{ screenMsgKeys(screenId).length }}</small>
              </button>
              <p class="le-nav__empty" *ngIf="filteredScreenIds.length === 0">لا توجد شاشات مطابقة للبحث</p>
            </div>
          </aside>

          <main class="le-main">
            <div class="le-main__head">
              <h3>{{ sectionTitle(activeTab) }}</h3>
              <p>{{ sectionHint(activeTab) }}</p>
              <code>{{ activeTab }}</code>
              <span class="le-main__visible" *ngIf="searchQuery.trim()">
                {{ visibleFieldCount }} / {{ activeTabFieldCount }} حقل ظاهر
              </span>
            </div>

            <div class="le-main__scroll">
              <!-- brandSubtitle -->
              <ng-container *ngIf="activeTab === 'brandSubtitle'">
                <label class="le-field le-field--card">
                  <div class="le-field__head">
                    <span class="le-field__label">{{ fieldHeading('brandSubtitle', 'brandSubtitle') }}</span>
                    <code class="le-field__tech">{{ localeJsonPath('brandSubtitle', 'brandSubtitle') }}</code>
                  </div>
                  <input
                    type="text"
                    class="le-field__input"
                    [(ngModel)]="form.brandSubtitle"
                    name="brandSubtitle"
                    [attr.placeholder]="fieldPlaceholder('brandSubtitle', 'brandSubtitle')" />
                </label>
              </ng-container>

              <!-- sidebarNav -->
              <ng-container *ngIf="activeTab === 'sidebarNav'">
                <label class="le-field le-field--card" *ngFor="let key of filteredSidebarNavKeys">
                  <div class="le-field__head">
                    <span class="le-field__label">{{ fieldHeading('sidebarNav', key) }}</span>
                    <code class="le-field__tech">{{ localeJsonPath('sidebarNav', key) }}</code>
                  </div>
                  <input
                    type="text"
                    class="le-field__input"
                    [(ngModel)]="form.sidebarNav![key]"
                    [name]="'nav-' + key"
                    [attr.placeholder]="fieldPlaceholder('sidebarNav', key)" />
                </label>
                <p class="le-empty" *ngIf="filteredSidebarNavKeys.length === 0">لا توجد حقول مطابقة</p>
              </ng-container>

              <!-- chrome -->
              <ng-container *ngIf="activeTab === 'chrome'">
                <label class="le-field le-field--card" *ngFor="let key of filteredChromeKeys">
                  <div class="le-field__head">
                    <span class="le-field__label">{{ fieldHeading('chrome', key) }}</span>
                    <code class="le-field__tech">{{ localeJsonPath('chrome', key) }}</code>
                  </div>
                  <input
                    type="text"
                    class="le-field__input"
                    [(ngModel)]="form.chrome![key]"
                    [name]="'chrome-' + key"
                    [attr.placeholder]="fieldPlaceholder('chrome', key)" />
                </label>
                <p class="le-empty" *ngIf="filteredChromeKeys.length === 0">لا توجد حقول مطابقة</p>
              </ng-container>

              <!-- screenCopy — شاشة واحدة في كل مرة -->
              <ng-container *ngIf="activeTab === 'screenCopy' && activeScreenId">
                <label class="le-field le-field--card" *ngFor="let msgKey of filteredScreenMsgKeys">
                  <div class="le-field__head">
                    <span class="le-field__label">{{ fieldHeading('screenCopy', msgKey, activeScreenId) }}</span>
                    <code class="le-field__tech">{{ localeJsonPath('screenCopy', msgKey, activeScreenId) }}</code>
                  </div>
                  <input
                    type="text"
                    class="le-field__input"
                    [(ngModel)]="form.screenCopy![activeScreenId][msgKey]"
                    [name]="activeScreenId + '-' + msgKey"
                    [attr.placeholder]="fieldPlaceholder('screenCopy', msgKey, activeScreenId)" />
                </label>
                <p class="le-empty" *ngIf="filteredScreenMsgKeys.length === 0">لا توجد حقول مطابقة في هذه الشاشة</p>
              </ng-container>
            </div>
          </main>
        </div>

        <p class="le-error" *ngIf="error">{{ error }}</p>

        <footer class="le-footer">
          <button type="button" class="le-btn le-btn--muted" (click)="close()" [disabled]="saveBusy">
            {{ ui.chromeLabel('accountJsonEditorCancel') }}
          </button>
          <button type="button" class="le-btn le-btn--primary" [disabled]="saveBusy || !form" (click)="save()">
            <i class="fas fa-save" [class.fa-spin]="saveBusy" aria-hidden="true"></i>
            {{ ui.chromeLabel('accountJsonEditorSave') }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .le-overlay {
        position: fixed;
        inset: 0;
        z-index: 2000;
        background: #eef4fb;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .le-shell {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      }

      .le-top {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 0.65rem 1rem;
        background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
        color: #fff;
        box-shadow: 0 2px 12px rgba(13, 71, 161, 0.25);
      }

      .le-top__brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        min-width: 0;
      }

      .le-top__title {
        margin: 0;
        font-size: 1.05rem;
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }

      .le-top__file,
      .le-top__meta {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.18);
      }

      .le-search {
        flex: 1;
        min-width: 180px;
        max-width: 420px;
        display: flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.4rem 0.65rem;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.95);
        color: #37474f;
      }

      .le-search input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        font-size: 0.88rem;
        font-family: inherit;
        background: transparent;
        color: #263238;
      }

      .le-top__close {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
        font-size: 1.1rem;
      }

      .le-top__close:hover {
        background: rgba(255, 255, 255, 0.32);
      }

      .le-loading {
        flex: 1;
        display: grid;
        place-items: center;
        color: #1565c0;
        font-weight: 700;
        gap: 0.5rem;
      }

      .le-workspace {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
        gap: 0;
        overflow: hidden;
      }

      .le-nav {
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 0.65rem 0.5rem;
        background: #fff;
        border-inline-end: 1px solid rgba(21, 101, 192, 0.15);
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #90caf9 #f5f8fc;
      }

      .le-nav__tab {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.12rem;
        width: 100%;
        padding: 0.55rem 0.6rem;
        border: 1px solid rgba(21, 101, 192, 0.12);
        border-radius: 10px;
        background: #fafcfe;
        cursor: pointer;
        text-align: start;
        font-family: inherit;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .le-nav__tab--active {
        background: #e3f2fd;
        border-color: #1976d2;
        box-shadow: inset 3px 0 0 #1976d2;
      }

      .le-nav__tab-title {
        font-size: 0.82rem;
        font-weight: 800;
        color: #0d47a1;
      }

      .le-nav__tab-tech {
        font-size: 0.62rem;
        color: #607d8b;
        font-family: ui-monospace, Consolas, monospace;
      }

      .le-nav__tab-count {
        font-size: 0.65rem;
        font-weight: 800;
        color: #fff;
        background: #1976d2;
        padding: 0.08rem 0.4rem;
        border-radius: 999px;
        margin-top: 0.1rem;
      }

      .le-nav__screens {
        margin-top: 0.35rem;
        padding-top: 0.45rem;
        border-top: 1px dashed rgba(21, 101, 192, 0.2);
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        min-height: 0;
        overflow-y: auto;
        flex: 1;
      }

      .le-nav__screens-label {
        margin: 0 0.25rem;
        font-size: 0.68rem;
        font-weight: 800;
        color: #607d8b;
      }

      .le-nav__screen {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.08rem;
        width: 100%;
        padding: 0.45rem 0.5rem;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        text-align: start;
        font-family: inherit;
      }

      .le-nav__screen span {
        font-size: 0.78rem;
        font-weight: 700;
        color: #37474f;
      }

      .le-nav__screen code {
        font-size: 0.6rem;
        color: #78909c;
      }

      .le-nav__screen small {
        font-size: 0.62rem;
        font-weight: 800;
        color: #1565c0;
      }

      .le-nav__screen--active {
        background: #e8f4fc;
        border-color: rgba(25, 118, 210, 0.35);
      }

      .le-nav__empty,
      .le-empty {
        margin: 0.5rem 0;
        font-size: 0.8rem;
        color: #78909c;
        font-weight: 600;
        text-align: center;
      }

      .le-main {
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: #f8fbff;
        overflow: hidden;
      }

      .le-main__head {
        flex-shrink: 0;
        padding: 0.75rem 1rem 0.5rem;
        border-bottom: 1px solid rgba(21, 101, 192, 0.1);
        background: #fff;
      }

      .le-main__head h3 {
        margin: 0 0 0.2rem;
        font-size: 1rem;
        color: #0d47a1;
      }

      .le-main__head p {
        margin: 0 0 0.35rem;
        font-size: 0.78rem;
        color: #607d8b;
        font-weight: 600;
      }

      .le-main__head code {
        font-size: 0.68rem;
        color: #1565c0;
        background: #f0f7ff;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
      }

      .le-main__visible {
        display: inline-block;
        margin-top: 0.35rem;
        font-size: 0.72rem;
        font-weight: 700;
        color: #1565c0;
      }

      .le-main__scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0.85rem 1rem 1.25rem;
        scrollbar-width: thin;
        scrollbar-color: #1976d2 #e3f2fd;
      }

      .le-main__scroll::-webkit-scrollbar {
        width: 12px;
      }

      .le-main__scroll::-webkit-scrollbar-thumb {
        background: #64b5f6;
        border-radius: 8px;
        border: 3px solid #e3f2fd;
      }

      .le-field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.65rem;
      }

      .le-field--card {
        padding: 0.75rem 0.85rem;
        border-radius: 12px;
        background: #fff;
        border: 1px solid rgba(21, 101, 192, 0.12);
        box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
      }

      .le-field__head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.35rem 0.55rem;
      }

      .le-field__label {
        font-size: 0.88rem;
        font-weight: 700;
        color: #263238;
        line-height: 1.4;
      }

      .le-field__tech {
        font-size: 0.68rem;
        color: #78909c;
        font-family: ui-monospace, Consolas, monospace;
        background: #f5f8fc;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
      }

      .le-field__hint {
        margin: 0;
        font-size: 0.76rem;
        color: #546e7a;
        line-height: 1.4;
      }

      .le-field__input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.65rem 0.75rem;
        border-radius: 10px;
        border: 1px solid rgba(21, 101, 192, 0.22);
        font-size: 0.95rem;
        line-height: 1.4;
        color: #263238;
        background: #fff;
        font-family: inherit;
        min-height: 44px;
      }

      .le-field__input:focus {
        outline: none;
        border-color: #1976d2;
        box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2);
      }

      .le-error {
        flex-shrink: 0;
        margin: 0;
        padding: 0.4rem 1rem;
        font-size: 0.82rem;
        font-weight: 700;
        color: #b71c1c;
        background: #ffebee;
      }

      .le-footer {
        flex-shrink: 0;
        display: flex;
        justify-content: flex-end;
        gap: 0.55rem;
        padding: 0.65rem 1rem;
        background: #fff;
        border-top: 1px solid rgba(21, 101, 192, 0.15);
        box-shadow: 0 -4px 16px rgba(13, 71, 161, 0.08);
      }

      .le-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.6rem 1.15rem;
        border-radius: 10px;
        border: 1px solid transparent;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }

      .le-btn--muted {
        background: #f5f8fc;
        color: #546e7a;
        border-color: rgba(21, 101, 192, 0.15);
      }

      .le-btn--primary {
        background: linear-gradient(145deg, #1976d2, #0d47a1);
        color: #fff;
      }

      .le-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      @media (max-width: 768px) {
        .le-workspace {
          grid-template-columns: 1fr;
          grid-template-rows: auto minmax(0, 1fr);
        }

        .le-nav {
          max-height: 38vh;
          border-inline-end: none;
          border-bottom: 1px solid rgba(21, 101, 192, 0.15);
        }

        .le-nav__screens {
          flex-direction: row;
          flex-wrap: wrap;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .le-nav__screen {
          width: auto;
          min-width: 120px;
        }
      }
    `,
  ],
})
export class AccountLocaleEditorComponent implements OnChanges, OnDestroy {
  readonly ui = inject(UiTranslationsService);
  readonly editorTabs = EDITOR_TABS;
  readonly brandSubtitleField = UI_LOCALE_BRAND_SUBTITLE_FIELD;

  @Input() open = false;
  @Input({ required: true }) locale!: AppUiLocale;
  /** عند الفتح من «ترجمة واجهة النظام»: الانتقال مباشرة لشاشة booking */
  @Input() initialScreenId: string | null = 'booking';
  @Input() openOnScreenCopy = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  form: UiLocaleFilePayload | null = null;
  referenceAr: UiLocaleFilePayload | null = null;
  saveBusy = false;
  error = '';
  searchQuery = '';

  activeTab: LocaleEditorSectionId = 'brandSubtitle';
  activeScreenId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.open &&
      this.locale &&
      (changes['open'] || changes['locale'] || changes['initialScreenId'] || changes['openOnScreenCopy'])
    ) {
      this.loadForm();
    }
    this.syncBodyScrollLock();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  get sidebarNavKeys(): string[] {
    return Object.keys(this.form?.sidebarNav ?? {}).sort();
  }

  get chromeKeys(): string[] {
    return Object.keys(this.form?.chrome ?? {}).sort();
  }

  get screenIds(): string[] {
    return Object.keys(this.form?.screenCopy ?? {}).sort();
  }

  get filteredSidebarNavKeys(): string[] {
    return this.filterKeys(this.sidebarNavKeys, (k) => this.fieldHeading('sidebarNav', k), (k) => this.form?.sidebarNav?.[k]);
  }

  get filteredChromeKeys(): string[] {
    return this.filterKeys(this.chromeKeys, (k) => this.fieldHeading('chrome', k), (k) => this.form?.chrome?.[k]);
  }

  get filteredScreenIds(): string[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return this.screenIds;
    }
    return this.screenIds.filter((id) => {
      const title = this.screenTitle(id).toLowerCase();
      if (id.toLowerCase().includes(q) || title.includes(q)) {
        return true;
      }
      return this.screenMsgKeys(id).some((mk) =>
        this.matchesSearch(mk, () => this.fieldHeading('screenCopy', mk, id), () => this.form?.screenCopy?.[id]?.[mk]),
      );
    });
  }

  get filteredScreenMsgKeys(): string[] {
    if (!this.activeScreenId) {
      return [];
    }
    return this.filterKeys(
      this.screenMsgKeys(this.activeScreenId),
      (mk) => this.fieldHeading('screenCopy', mk, this.activeScreenId!),
      (mk) => this.form?.screenCopy?.[this.activeScreenId!]?.[mk],
    );
  }

  get activeTabFieldCount(): number {
    return this.sectionFieldCount(this.activeTab);
  }

  get visibleFieldCount(): number {
    switch (this.activeTab) {
      case 'brandSubtitle':
        return this.matchesSearch('brandSubtitle', () => this.brandSubtitleField.title, () => this.form?.brandSubtitle) ? 1 : 0;
      case 'sidebarNav':
        return this.filteredSidebarNavKeys.length;
      case 'chrome':
        return this.filteredChromeKeys.length;
      case 'screenCopy':
        return this.filteredScreenMsgKeys.length;
    }
  }

  screenMsgKeys(screenId: string): string[] {
    return Object.keys(this.form?.screenCopy?.[screenId] ?? {}).sort();
  }

  sectionTitle(section: LocaleEditorSectionId): string {
    return localeEditorSectionTitle(section);
  }

  sectionHint(section: LocaleEditorSectionId): string {
    return localeEditorSectionHint(section);
  }

  sidebarNavLabel(routeKey: string): string {
    return localeEditorSidebarNavLabel(routeKey);
  }

  chromeLabel(key: string): string {
    return localeEditorChromeLabel(key);
  }

  screenTitle(screenId: string): string {
    return localeEditorScreenTitle(screenId);
  }

  /** مسار المفتاح داخل ملف JSON (مثل screenCopy.booking.pageTitle) */
  localeJsonPath(section: LocaleEditorSectionId, key: string, screenId?: string): string {
    return localeFieldPath(section, key, screenId);
  }

  /** عنوان الحقل للعرض: نص اللغة الحالية (قيمة الإدخال) ثم احتياطي */
  fieldHeading(section: LocaleEditorSectionId, key: string, screenId?: string): string {
    const current = this.currentFieldValue(section, key, screenId)?.trim();
    if (current) {
      return current;
    }
    return this.fieldFallbackLabel(section, key, screenId);
  }

  fieldPlaceholder(section: LocaleEditorSectionId, key: string, screenId?: string): string {
    const ar = localeEditorReferenceHint(this.referenceAr, section, key, screenId)?.trim();
    if (ar && this.locale !== 'ar') {
      return ar;
    }
    return 'أدخل النص...';
  }

  private currentFieldValue(
    section: LocaleEditorSectionId,
    key: string,
    screenId?: string,
  ): string | undefined {
    if (!this.form) {
      return undefined;
    }
    if (section === 'brandSubtitle') {
      return this.form.brandSubtitle;
    }
    if (section === 'sidebarNav') {
      return this.form.sidebarNav?.[key];
    }
    if (section === 'chrome') {
      return this.form.chrome?.[key];
    }
    if (section === 'screenCopy' && screenId) {
      return this.form.screenCopy?.[screenId]?.[key];
    }
    return undefined;
  }

  private fieldFallbackLabel(
    section: LocaleEditorSectionId,
    key: string,
    screenId?: string,
  ): string {
    if (section === 'brandSubtitle') {
      return this.brandSubtitleField.title;
    }
    if (section === 'sidebarNav') {
      return localeEditorSidebarNavLabel(key);
    }
    if (section === 'chrome') {
      return localeEditorChromeLabel(key);
    }
    if (section === 'screenCopy' && screenId && this.locale === 'ar') {
      const ar = this.referenceAr?.screenCopy?.[screenId]?.[key]?.trim();
      if (ar) {
        return ar;
      }
    }
    return key;
  }

  get totalFieldCount(): number {
    return EDITOR_TABS.reduce((sum, t) => sum + this.sectionFieldCount(t.id), 0);
  }

  sectionFieldCount(section: LocaleEditorSectionId): number {
    if (!this.form) {
      return 0;
    }
    if (section === 'brandSubtitle') {
      return 1;
    }
    if (section === 'sidebarNav') {
      return Object.keys(this.form.sidebarNav ?? {}).length;
    }
    if (section === 'chrome') {
      return Object.keys(this.form.chrome ?? {}).length;
    }
    let n = 0;
    for (const screenId of Object.keys(this.form.screenCopy ?? {})) {
      n += Object.keys(this.form.screenCopy?.[screenId] ?? {}).length;
    }
    return n;
  }

  setActiveTab(tab: LocaleEditorSectionId): void {
    this.activeTab = tab;
    if (tab === 'screenCopy' && !this.activeScreenId && this.screenIds.length > 0) {
      this.activeScreenId = this.screenIds[0];
    }
  }

  setActiveScreen(screenId: string): void {
    this.activeScreenId = screenId;
    this.activeTab = 'screenCopy';
  }

  close(): void {
    if (this.saveBusy) {
      return;
    }
    this.closed.emit();
  }

  save(): void {
    if (this.saveBusy || !this.form) {
      return;
    }
    this.saveBusy = true;
    this.error = '';
    this.ui.saveLocaleFileForm(this.locale, this.form).subscribe({
      next: (ok) => {
        this.saveBusy = false;
        if (ok) {
          this.ui.reloadFromBackend(() => this.saved.emit());
        } else {
          this.error = this.ui.chromeLabel('accountJsonEditorSaveFailed');
        }
      },
      error: () => {
        this.saveBusy = false;
        this.error = this.ui.chromeLabel('accountJsonEditorSaveFailed');
      },
    });
  }

  private loadForm(): void {
    this.error = '';
    this.searchQuery = '';
    this.ui.fetchFromBackend(() => {
      this.referenceAr = extractLocaleFile(this.ui.getPayload(), 'ar');
      this.form = this.ui.loadLocaleFileForForm(this.locale);
      this.applyInitialView();
      if (this.totalFieldCount < 15) {
        this.error =
          'عدد الحقول قليل — تأكد أن الخادم يعمل وأن ملفات الترجمة محمّلة.';
      }
    });
  }

  private applyInitialView(): void {
    const ids = this.screenIds;
    if (this.openOnScreenCopy) {
      this.activeTab = 'screenCopy';
      const prefer = this.initialScreenId?.trim();
      if (prefer && ids.includes(prefer)) {
        this.activeScreenId = prefer;
        return;
      }
      if (ids.includes('booking')) {
        this.activeScreenId = 'booking';
        return;
      }
      this.activeScreenId = ids.length > 0 ? ids[0] : null;
      return;
    }
    this.activeTab = 'brandSubtitle';
    this.activeScreenId = ids.includes('booking') ? 'booking' : ids[0] ?? null;
  }

  private syncBodyScrollLock(): void {
    document.body.style.overflow = this.open ? 'hidden' : '';
  }

  private filterKeys(
    keys: string[],
    labelFn: (k: string) => string,
    valueFn: (k: string) => string | undefined,
  ): string[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return keys;
    }
    return keys.filter((k) => this.matchesSearch(k, () => labelFn(k), () => valueFn(k)));
  }

  private matchesSearch(
    key: string,
    labelFn: () => string,
    valueFn: () => string | undefined,
  ): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return true;
    }
    const parts = [key, labelFn(), valueFn() ?? '', this.refHintForSearch(key)].map((p) => p.toLowerCase());
    return parts.some((p) => p.includes(q));
  }

  private refHintForSearch(key: string): string {
    if (this.activeTab === 'screenCopy' && this.activeScreenId) {
      return localeEditorReferenceHint(this.referenceAr, 'screenCopy', key, this.activeScreenId) ?? '';
    }
    if (this.activeTab === 'sidebarNav') {
      return localeEditorReferenceHint(this.referenceAr, 'sidebarNav', key) ?? '';
    }
    if (this.activeTab === 'chrome') {
      return localeEditorReferenceHint(this.referenceAr, 'chrome', key) ?? '';
    }
    return localeEditorReferenceHint(this.referenceAr, 'brandSubtitle', 'brandSubtitle') ?? '';
  }
}
