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
import { UiTranslationsService } from '../../services/ui-translations.service';
import type { UiExtraLocaleCode } from '../../utils/ui-translation.constants';
import { formatLocalePickerLabel } from '../../utils/locale-picker-label';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';
import { DbSettingsPanelComponent } from '../db-settings-panel/db-settings-panel.component';

type TopBarLocale = UiExtraLocaleCode | 'ar';

interface TopBarLocaleOption {
  code: TopBarLocale;
  flagSrc: string;
  shortCode: string;
  labelKey: 'localeAr' | 'localeFr' | 'localeId' | 'localeTr';
}

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, DbSettingsPanelComponent],
  templateUrl: './app-top-bar.component.html',
  styleUrls: ['./app-top-bar.component.css'],
})
export class AppTopBarComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
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

  readonly localeOptions: ReadonlyArray<TopBarLocaleOption> = [
    { code: 'ar', flagSrc: 'assets/flags/sa.svg', shortCode: 'SAU', labelKey: 'localeAr' },
    { code: 'fr', flagSrc: 'assets/flags/fr.svg', shortCode: 'FRA', labelKey: 'localeFr' },
    { code: 'id', flagSrc: 'assets/flags/id.svg', shortCode: 'IDN', labelKey: 'localeId' },
    { code: 'tr', flagSrc: 'assets/flags/tr.svg', shortCode: 'TUR', labelKey: 'localeTr' },
  ];

  breadcrumb = '';
  clockDate = '';
  clockTime = '';
  langPickerOpen = false;
  dbPanelOpen = false;

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
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

  localeLabel(labelKey: TopBarLocaleOption['labelKey']): string {
    const raw = this.ui.screenText('settings', labelKey);
    return formatLocalePickerLabel(raw, this.ui.displayLocale());
  }

  activeLocaleOption(): TopBarLocaleOption {
    const current = this.ui.displayLocale();
    return this.localeOptions.find((o) => o.code === current) ?? this.localeOptions[0];
  }

  otherLocaleOptions(): TopBarLocaleOption[] {
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
      this.breadcrumb = `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('navNewBooking')}`;
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

    if (path === '/settings') {
      const tab = params.get('tab')?.trim() || 'general';
      const settingsTitle = this.ui.chromeLabel('helpSettingsLink');
      if (tab === 'translations') {
        this.breadcrumb = `${settingsTitle} / ${this.ui.screenText('settings', 'tabGeneralCodings')}`;
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
