import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { HotelAuthService } from '../../services/hotel-auth.service';
import { filter } from 'rxjs/operators';
import { fromEvent } from 'rxjs';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { ArabicPreferenceCategoryService } from '../../services/arabic-preference-category.service';
import { ArabicCategoryPickerService } from '../../services/arabic-category-picker.service';
import type { UiExtraLocaleCode } from '../../utils/ui-translation.constants';
import { formatLocalePickerLabel } from '../../utils/locale-picker-label';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';
import { UI_LOCALE_PICKER_OPTIONS, type UiLocalePickerOption } from '../../utils/ui-locale-picker.util';
import { DbSettingsPanelComponent } from '../db-settings-panel/db-settings-panel.component';

type TopBarLocale = UiLocalePickerOption['code'];

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, DbSettingsPanelComponent],
  templateUrl: './app-top-bar.component.html',
  styleUrls: ['./app-top-bar.component.css'],
})
export class AppTopBarComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  private readonly arabicPref = inject(ArabicPreferenceCategoryService);
  private readonly arabicCategoryPicker = inject(ArabicCategoryPickerService);
  private readonly auth = inject(HotelAuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @Input() hotelDisplayName = '';
  @Input() hotelImageSrc: string | null = null;
  @Input() hotelNameInitial = 'ف';
  @Input() unreadNotifications = 0;

  @Output() searchOpen = new EventEmitter<void>();
  @Output() notificationsOpen = new EventEmitter<void>();

  readonly localeOptions = UI_LOCALE_PICKER_OPTIONS;

  breadcrumb = '';
  clockDate = '';
  clockTime = '';
  langPickerOpen = false;
  dbPanelOpen = false;

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    fromEvent(window, 'hotelArabicCategoryChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
    this.updateBreadcrumb(this.router.url);
    this.tickClock();
    const clockTimer = window.setInterval(() => this.tickClock(), 30_000);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        this.updateBreadcrumb(e.urlAfterRedirects);
        this.langPickerOpen = false;
        this.cdr.markForCheck();
      });

    this.destroyRef.onDestroy(() => window.clearInterval(clockTimer));
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.dbPanelOpen) {
        this.dbPanelOpen = false;
        this.cdr.markForCheck();
        return;
      }
      if (this.langPickerOpen) {
        this.langPickerOpen = false;
        this.cdr.markForCheck();
      }
    }
  }

  localeLabel(labelKey: UiLocalePickerOption['labelKey']): string {
    const raw = this.ui.screenText('settings', labelKey);
    return formatLocalePickerLabel(raw, this.ui.displayLocale());
  }

  activeLocaleOption(): UiLocalePickerOption {
    const current = this.ui.displayLocale();
    const base = this.localeOptions.find((o) => o.code === current) ?? this.localeOptions[0];
    if (current === 'ar') {
      return {
        ...base,
        flagSrc: this.arabicPref.activeFlagSrc(),
        shortCode: this.arabicPref.activeShortCode(),
      };
    }
    return base;
  }

  otherLocaleOptions(): UiLocalePickerOption[] {
    const current = this.ui.displayLocale();
    return this.localeOptions.filter((o) => o.code !== current);
  }

  toggleLangPicker(event: Event): void {
    event.stopPropagation();
    this.langPickerOpen = !this.langPickerOpen;
    this.cdr.markForCheck();
  }

  closeLangPicker(): void {
    if (this.langPickerOpen) {
      this.langPickerOpen = false;
      this.cdr.markForCheck();
    }
  }

  selectLocale(code: TopBarLocale, event?: Event): void {
    event?.stopPropagation();
    this.langPickerOpen = false;
    if (this.ui.displayLocale() === code) {
      return;
    }
    if (code === 'ar') {
      this.arabicCategoryPicker.requestArabicLocaleSwitch(() =>
        this.ui.reloadFromBackend(() => this.cdr.markForCheck()),
      );
      return;
    }
    this.ui.setDisplayLocale(code);
    this.ui.reloadFromBackend(() => this.cdr.markForCheck());
  }

  openSearch(event: Event): void {
    event.stopPropagation();
    this.searchOpen.emit();
  }

  openNotifications(event: Event): void {
    event.stopPropagation();
    this.notificationsOpen.emit();
  }

  private tickClock(): void {
    const now = new Date();
    const loc = this.ui.displayLocale() === 'ar' ? 'ar-SA' : undefined;
    this.clockDate = now.toLocaleDateString(loc, {
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    this.clockTime = now.toLocaleTimeString(loc, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    this.cdr.markForCheck();
  }

  private updateBreadcrumb(url: string): void {
    const path = (url.split('?')[0] || '').replace(/\/$/, '') || '/';
    const params = new URLSearchParams(url.split('?')[1] || '');
    const home = this.ui.sidebarLabel('dashboard');

    if (path === '/dashboard' || path === '/') {
      this.breadcrumb = `/ ${home}`;
      return;
    }

    if (path === '/front-desk') {
      const fd = this.ui.sidebarLabel('frontDeskGroup');
      const tab = params.get('pmsTab');
      if (tab === 'arriving') {
        this.breadcrumb = `${fd} / ${this.ui.sidebarLabel('navArriving')}`;
        return;
      }
      if (tab === 'departing') {
        this.breadcrumb = `${fd} / ${this.ui.sidebarLabel('navDeparting')}`;
        return;
      }
      if (tab === 'staying') {
        this.breadcrumb = `${fd} / ${this.ui.sidebarLabel('navResidents')}`;
        return;
      }
      this.breadcrumb = `/ ${fd}`;
      return;
    }

    if (path === '/booking') {
      const walkIn = params.get('walkIn') === '1' || params.get('walkIn') === 'true';
      const isWalkInCheckIn = params.get('mode') === 'checkIn' && walkIn;
      const pageLabel = isWalkInCheckIn
        ? this.ui.sidebarLabel('navWalkInCheckIn')
        : this.ui.sidebarLabel('navNewBooking');
      this.breadcrumb = `${this.ui.sidebarLabel('bookingsGroup')} / ${pageLabel}`;
      return;
    }

    if (path === '/bookings') {
      this.breadcrumb = `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('bookingsHub')}`;
      return;
    }

    if (path === '/rooms') {
      this.breadcrumb = `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('rooms')}`;
      return;
    }

    if (path === '/database') {
      this.breadcrumb = `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('database')}`;
      return;
    }

    if (path === '/reports') {
      this.breadcrumb = `/ ${this.ui.sidebarLabel('reports')}`;
      return;
    }

    if (path === '/my-account') {
      this.breadcrumb = `/ ${this.ui.chromeLabel('myAccountBtn')}`;
      return;
    }

    if (path === '/settings') {
      const tab = params.get('tab')?.trim() || 'general';
      const settingsTitle = this.ui.chromeLabel('helpSettingsLink');
      if (tab === 'translations') {
        this.breadcrumb = `${settingsTitle} / ${this.ui.screenText('settings', 'tabGeneralCodings')}`;
        return;
      }
      if (tab === 'arabicLocale') {
        this.breadcrumb = `${settingsTitle} / ${this.ui.screenText('settings', 'tabArabicLocalePick')}`;
        return;
      }
      this.breadcrumb = `/ ${settingsTitle}`;
      return;
    }

    this.breadcrumb = `/ ${home}`;
  }

  currentUserLabel(): string {
    const u = this.auth.currentUser();
    if (!u) {
      return '';
    }
    const name = [u.firstName, u.lastName].filter((x) => x?.trim()).join(' ').trim();
    return name || u.userName;
  }

  toggleDbPanel(event: Event): void {
    event.stopPropagation();
    this.dbPanelOpen = !this.dbPanelOpen;
    if (this.dbPanelOpen) {
      this.langPickerOpen = false;
    }
    this.cdr.markForCheck();
  }

  closeDbPanel(): void {
    if (this.dbPanelOpen) {
      this.dbPanelOpen = false;
      this.cdr.markForCheck();
    }
  }

  userInitial(): string {
    const label = this.currentUserLabel().trim();
    return label ? label.charAt(0) : 'م';
  }
}
