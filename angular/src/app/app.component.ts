import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, DestroyRef, HostListener, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  DASHBOARD_VIEW_MODE_CHANGED_EVENT,
  DASHBOARD_VIEW_MODE_STORAGE_KEY,
  readDashboardAdvancedEnabled,
} from './utils/dev-outlines';
import { UiTranslationsService } from './services/ui-translations.service';
import { SystemNotificationsService } from './services/system-notifications.service';
import { HotelBrandingStoreService } from './services/hotel-branding-store.service';
import { HotelSystemSettingsLoader } from './services/hotel-system-settings.loader';
import type { UiExtraLocaleCode } from './utils/ui-translation.constants';
import { AccountLocaleEditorComponent } from './shared/account-locale-editor/account-locale-editor.component';
import { AppTopBarComponent } from './shared/app-top-bar/app-top-bar.component';
import { UiMessagesComponent } from './shared/ui-messages/ui-messages.component';
import { CHECKIN_BOOKING_STORAGE_KEY } from './booking-form/booking-form.component';

type AppUiLocale = UiExtraLocaleCode | 'ar';

interface AppSearchEntry {
  id: string;
  title: string;
  breadcrumb: string;
  tag: string;
  pathSegments: string[];
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-root',
  template: `
    <div
      class="app-shell"
      dir="rtl"
      [class.app-shell--lang-rail-open]="!langRailClosed"
      [style.--nav-rail-width.px]="navRailCollapsed ? 76 : 260"
      [style.--lang-rail-width.px]="langRailClosed ? 0 : 224">
      <aside
        class="app-sidebar"
        [class.app-sidebar--advanced-nav]="dashboardPenMotion && isDashboardUrl"
        [class.app-sidebar--collapsed]="navRailCollapsed">
        <svg aria-hidden="true" focusable="false" width="0" height="0" class="nav-icon-defs">
          <defs>
            <linearGradient id="navIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="50%" stop-color="#e3f2fd" />
              <stop offset="100%" stop-color="#bbdefb" />
            </linearGradient>
            <symbol id="nav-icon-bookings" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8 2v3M16 2v3M5 7h14v13a2 2 0 01-2 2H7a2 2 0 01-2-2V7zM8 11h3M13 11h3M8 15h8" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M17 11l1.2 1.2L20 10.5" />
            </symbol>
            <symbol id="nav-icon-dashboard" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 5h6v6H4V5zm10 0h6v10h-6V5zM4 13h6v6H4v-6zm10 4h6v2h-6v-2z" />
            </symbol>
            <symbol id="nav-icon-front-desk" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v10H4V6zm2 12h12M9 20h6" />
              <circle cx="9" cy="11" r="1.25" fill="currentColor" />
              <circle cx="15" cy="11" r="1.25" fill="currentColor" />
            </symbol>
            <symbol id="nav-icon-settings" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l1.27 1.27-2 2-1.27-1.27a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21h-2.82v-1.18A1.65 1.65 0 009 18.29a1.65 1.65 0 00-1.82.33l-1.27 1.27-2-2 1.27-1.27A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3v-2h1.18A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82L3 5.91l2-2 1.27 1.27a1.65 1.65 0 001.82.33H9V3h2v1.18a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l1.27-1.27 2 2-1.27 1.27A1.65 1.65 0 0019.4 9c.07.2.1.42.1.65v1.35h1.51a1.65 1.65 0 00-1.51 1z" />
            </symbol>
            <symbol id="nav-icon-reports" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 19h16M6 17V9m6 8V5m6 12v-4" />
            </symbol>
            <symbol id="nav-icon-add" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M12 8v8M8 12h8" />
            </symbol>
            <symbol id="nav-icon-rooms" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 10h16v10H4V10zm3-6h10v6H7V4zM10 14h4" />
            </symbol>
            <symbol id="nav-icon-database" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
            </symbol>
            <symbol id="nav-icon-arriving" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 12h12m0 0l-4-4m4 4l-4 4M18 6v12" />
            </symbol>
            <symbol id="nav-icon-staying" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 12h16M6 18V8m12 10V8" />
            </symbol>
            <symbol id="nav-icon-departing" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M20 12H8m0 0l4 4m-4-4l4-4M4 6v12" />
            </symbol>
            <symbol id="nav-icon-cancelled" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8 2v3M16 2v3M5 7h14v13a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M9 11l6 6M15 11l-6 6" />
            </symbol>
            <symbol id="nav-icon-no-show" viewBox="0 0 24 24" fill="none">
              <circle cx="10" cy="9" r="3" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M4 19c0-2.8 2.7-5 6-5s6 2.2 6 5" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M17 8l2 2m0-2l-2 2" />
            </symbol>
            <symbol id="nav-icon-check-in" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 10h10v10H4V10zm2-6h6v6H6V4zM14 14h6m-3-3v6" />
            </symbol>
            <symbol id="nav-icon-hotel" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 20V6l8-4 8 4v14H4zm4-8h8M8 16h2m6 0h2" />
            </symbol>
            <symbol id="nav-icon-user-cog" viewBox="0 0 24 24" fill="none">
              <circle cx="9.5" cy="7.5" r="3.5" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" />
              <circle cx="17.5" cy="17" r="3" stroke="currentColor" stroke-width="1.75" />
              <circle cx="17.5" cy="17" r="1.15" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M17.5 13.5v1.4M17.5 20.1v1.4M14.1 17h1.4M20.9 17h1.4M15.1 15.1l1 1M19.9 19.9l1 1M19.9 15.1l-1 1M15.1 19.9l-1-1" />
            </symbol>
            <symbol id="nav-icon-user-plus" viewBox="0 0 24 24" fill="none">
              <circle cx="9.5" cy="7.5" r="3.5" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M17 7.5v7M13.5 11h7" />
            </symbol>
            <symbol id="nav-icon-layout" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 5h7v7H4V5zm9 0h7v4h-7V5zM4 14h7v5H4v-5zm9 3h7v2h-7v-2z" />
            </symbol>
            <symbol id="nav-icon-identities" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.75" />
              <circle cx="12" cy="11" r="2.5" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M8.5 16.5c.8-1.5 2.2-2 3.5-2s2.7.5 3.5 2" />
            </symbol>
            <symbol id="nav-icon-guests" viewBox="0 0 24 24" fill="none">
              <circle cx="10" cy="9" r="3" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M4 19c0-2.8 2.7-5 6-5s6 2.2 6 5" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M17 8l2 2m0-2l-2 2" />
            </symbol>
            <symbol id="nav-icon-currency" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M12 8v8M9.5 10c0-1 1-1.5 2.5-1.5S14 10 14 11s-1 1.5-2.5 1.5S9 12 9 13s1 1.5 2.5 1.5S14 14 14 15" />
            </symbol>
            <symbol id="nav-icon-language" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M3 12h18M12 3c2.5 2.8 4 6 4 9s-1.5 6.2-4 9M12 3c-2.5 2.8-4 6-4 9s1.5 6.2 4 9" />
            </symbol>
            <symbol id="nav-icon-invoice" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M8 4h8l3 3v13H8V4zm2 7h8m-8 4h8m-8 4h5" />
            </symbol>
            <symbol id="nav-icon-info" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M12 11v5M12 8h.01" />
            </symbol>
            <symbol id="nav-icon-payments" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M3 10h18M7 14h4" />
            </symbol>
            <symbol id="nav-icon-search" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M16 16l4.5 4.5" />
            </symbol>
            <symbol id="nav-icon-help" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M9.5 9.25a2.75 2.75 0 015.2 1.35c0 1.65-2.2 1.9-2.2 3.65M12 17h.01" />
            </symbol>
            <symbol id="nav-icon-bell" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M6 17h12l-1.2-2.4a5 5 0 01-.8-2.75V10a4 4 0 118 0v1.85a5 5 0 01-.8 2.75L18 17H6z" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M10 19a2 2 0 004 0" />
            </symbol>
            <symbol id="nav-icon-globe" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
              <path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" d="M3 12h18M12 3c2.6 2.9 4 6.1 4 9s-1.4 6.1-4 9M12 3c-2.6 2.9-4 6.1-4 9s1.4 6.1 4 9" />
            </symbol>
          </defs>
        </svg>

        <div class="sidebar-brand">
          <div class="brand-logo-frame" aria-hidden="true">
            <svg *ngIf="dashboardPenMotion" class="brand-pen-ring" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="brandPenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#90caf9" />
                  <stop offset="40%" stop-color="#1e88e5" />
                  <stop offset="100%" stop-color="#1565c0" />
                </linearGradient>
              </defs>
              <path
                class="brand-pen-stroke brand-pen-stroke--glow"
                [attr.d]="brandPenRingPath"
                pathLength="100" />
              <path
                class="brand-pen-stroke brand-pen-stroke--main"
                [attr.d]="brandPenRingPath"
                pathLength="100" />
            </svg>
            <div class="brand-logo-wrap">
              <img *ngIf="hotelImageSrc" [src]="hotelImageSrc" alt="" class="brand-logo-img" />
              <span *ngIf="!hotelImageSrc" class="brand-icon-fallback">{{ hotelNameInitial }}</span>
            </div>
          </div>
          <div class="brand-text">
            <strong class="brand-title" [title]="hotelDisplayName">{{ hotelDisplayName }}</strong>
            <small>{{ ui.brandSubtitle() }}</small>
          </div>
        </div>

        <div class="sidebar-nav-wrap">
        <nav class="sidebar-nav">
          <a
            routerLink="/dashboard"
            routerLinkActive="active"
            [attr.title]="navRailCollapsed ? ui.sidebarLabel('dashboard') : null"
            [attr.aria-label]="navRailCollapsed ? ui.sidebarLabel('dashboard') : null">
            <svg class="nav-icon-svg nav-icon-svg--dashboard" viewBox="0 0 24 24" aria-hidden="true">
              <use href="#nav-icon-dashboard" />
            </svg>
            <span class="sidebar-nav-label">{{ ui.sidebarLabel('dashboard') }}</span>
          </a>
          <div
            class="sidebar-nav-group"
            [class.sidebar-nav-group--open]="bookingsNavOpen"
            [class.sidebar-nav-group--section-active]="bookingsSectionActive"
            [class.sidebar-nav-group--flyout-active]="navRailCollapsed && collapsedNavFlyout === 'bookings'">
            <button
              type="button"
              class="sidebar-nav-group__head"
              (click)="toggleBookingsNav($event)"
              [attr.aria-expanded]="bookingsNavOpen"
              [attr.title]="ui.sidebarLabel('bookingsGroup')"
              [attr.aria-label]="ui.sidebarLabel('bookingsGroup')">
              <svg class="nav-icon-svg nav-icon-svg--bookings sidebar-nav-group__main-icon" viewBox="0 0 24 24" aria-hidden="true">
                <use href="#nav-icon-bookings" />
              </svg>
              <span class="sidebar-nav-label">{{ ui.sidebarLabel('bookingsGroup') }}</span>
              <i
                class="fas sidebar-nav-group__chevron"
                [class.fa-chevron-up]="bookingsNavOpen"
                [class.fa-chevron-down]="!bookingsNavOpen"
                aria-hidden="true"></i>
            </button>
            <div class="sidebar-nav-group__tree" *ngIf="bookingsNavOpen && !navRailCollapsed">
              <div
                class="sidebar-nav-subgroup"
                [class.sidebar-nav-subgroup--open]="addBookingNavOpen"
                [class.sidebar-nav-subgroup--active]="addBookingSectionActive">
                <button
                  type="button"
                  class="sidebar-nav-subgroup__head"
                  (click)="toggleAddBookingNav()"
                  [attr.aria-expanded]="addBookingNavOpen"
                  [attr.title]="ui.sidebarLabel('navAddBooking')"
                  [attr.aria-label]="ui.sidebarLabel('navAddBooking')">
                  <svg class="nav-icon-svg nav-icon-svg--add" viewBox="0 0 24 24" aria-hidden="true">
                    <use href="#nav-icon-add" />
                  </svg>
                  <span class="sidebar-nav-label">{{ ui.sidebarLabel('navAddBooking') }}</span>
                  <i
                    class="fas sidebar-nav-group__chevron"
                    [class.fa-chevron-up]="addBookingNavOpen"
                    [class.fa-chevron-down]="!addBookingNavOpen"
                    aria-hidden="true"></i>
                </button>
                <div class="sidebar-nav-subgroup__tree" *ngIf="addBookingNavOpen">
                  <a
                    *ngFor="let item of bookingsAddNavItems"
                    [routerLink]="item.path"
                    [queryParams]="item.queryParams ?? null"
                    class="sidebar-nav-group__link sidebar-nav-group__link--nested"
                    [class.active]="isBookingsAddNavItemActive(item)"
                    (click)="onBookingsAddNavClick(item, $event)"
                    [attr.title]="ui.sidebarLabel(item.labelKey)"
                    [attr.aria-label]="ui.sidebarLabel(item.labelKey)">
                    <svg
                      *ngIf="isSvgNavIcon(item.icon)"
                      class="nav-icon-svg"
                      [ngClass]="navIconModifier(item.icon)"
                      viewBox="0 0 24 24"
                      aria-hidden="true">
                      <use [attr.href]="navIconHref(item.icon)" />
                    </svg>
                    <i *ngIf="!isSvgNavIcon(item.icon)" class="fas" [ngClass]="item.icon" aria-hidden="true"></i>
                    <span class="sidebar-nav-label">{{ ui.sidebarLabel(item.labelKey) }}</span>
                  </a>
                </div>
              </div>
              <a
                *ngFor="let item of bookingsNavItems"
                [routerLink]="item.path"
                [queryParams]="item.queryParams ?? null"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-group__link"
                [attr.title]="ui.sidebarLabel(item.labelKey)"
                [attr.aria-label]="ui.sidebarLabel(item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas" [ngClass]="item.icon" aria-hidden="true"></i>
                <span class="sidebar-nav-label">{{ ui.sidebarLabel(item.labelKey) }}</span>
              </a>
            </div>
          </div>
          <div
            class="sidebar-nav-group"
            [class.sidebar-nav-group--open]="frontDeskNavOpen"
            [class.sidebar-nav-group--section-active]="frontDeskSectionActive"
            [class.sidebar-nav-group--flyout-active]="navRailCollapsed && collapsedNavFlyout === 'frontDesk'">
            <button
              type="button"
              class="sidebar-nav-group__head"
              (click)="toggleFrontDeskNav($event)"
              [attr.aria-expanded]="frontDeskNavOpen"
              [attr.title]="ui.sidebarLabel('frontDeskGroup')"
              [attr.aria-label]="ui.sidebarLabel('frontDeskGroup')">
              <svg class="nav-icon-svg nav-icon-svg--front-desk sidebar-nav-group__main-icon" viewBox="0 0 24 24" aria-hidden="true">
                <use href="#nav-icon-front-desk" />
              </svg>
              <span class="sidebar-nav-label">{{ ui.sidebarLabel('frontDeskGroup') }}</span>
              <i
                class="fas sidebar-nav-group__chevron"
                [class.fa-chevron-up]="frontDeskNavOpen"
                [class.fa-chevron-down]="!frontDeskNavOpen"
                aria-hidden="true"></i>
            </button>
            <div class="sidebar-nav-group__tree" *ngIf="frontDeskNavOpen && !navRailCollapsed">
              <a
                *ngFor="let item of frontDeskNavItems"
                [routerLink]="item.path"
                [queryParams]="item.queryParams ?? null"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-group__link"
                [attr.title]="ui.sidebarLabel(item.labelKey)"
                [attr.aria-label]="ui.sidebarLabel(item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas" [ngClass]="item.icon" aria-hidden="true"></i>
                <span class="sidebar-nav-label">{{ ui.sidebarLabel(item.labelKey) }}</span>
              </a>
            </div>
          </div>
          <div
            class="sidebar-nav-group"
            [class.sidebar-nav-group--open]="settingsNavOpen"
            [class.sidebar-nav-group--section-active]="settingsSectionActive"
            [class.sidebar-nav-group--flyout-active]="navRailCollapsed && collapsedNavFlyout === 'settings'">
            <button
              type="button"
              class="sidebar-nav-group__head"
              (click)="toggleSettingsNav($event)"
              [attr.aria-expanded]="settingsNavOpen"
              [attr.title]="ui.sidebarLabel('settings')"
              [attr.aria-label]="ui.sidebarLabel('settings')">
              <svg class="nav-icon-svg nav-icon-svg--settings sidebar-nav-group__main-icon" viewBox="0 0 24 24" aria-hidden="true">
                <use href="#nav-icon-settings" />
              </svg>
              <span class="sidebar-nav-label">{{ ui.sidebarLabel('settings') }}</span>
              <i
                class="fas sidebar-nav-group__chevron"
                [class.fa-chevron-up]="settingsNavOpen"
                [class.fa-chevron-down]="!settingsNavOpen"
                aria-hidden="true"></i>
            </button>
            <div class="sidebar-nav-group__tree" *ngIf="settingsNavOpen && !navRailCollapsed">
              <div
                class="sidebar-nav-subgroup"
                [class.sidebar-nav-subgroup--open]="systemSetupNavOpen"
                [class.sidebar-nav-subgroup--active]="systemSetupSectionActive">
                <button
                  type="button"
                  class="sidebar-nav-subgroup__head"
                  (click)="toggleSystemSetupNav()"
                  [attr.aria-expanded]="systemSetupNavOpen"
                  [attr.title]="ui.screenText('settings', 'tabSystemSetup')"
                  [attr.aria-label]="ui.screenText('settings', 'tabSystemSetup')">
                  <svg class="nav-icon-svg nav-icon-svg--settings" viewBox="0 0 24 24" aria-hidden="true">
                    <use href="#nav-icon-settings" />
                  </svg>
                  <span class="sidebar-nav-label">{{ ui.screenText('settings', 'tabSystemSetup') }}</span>
                  <i
                    class="fas sidebar-nav-group__chevron"
                    [class.fa-chevron-up]="systemSetupNavOpen"
                    [class.fa-chevron-down]="!systemSetupNavOpen"
                    aria-hidden="true"></i>
                </button>
                <div class="sidebar-nav-subgroup__tree" *ngIf="systemSetupNavOpen">
                  <a
                    *ngFor="let item of settingsSystemSetupItems"
                    [routerLink]="item.path"
                    [queryParams]="{ tab: item.tab }"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="item.linkActive"
                    class="sidebar-nav-group__link sidebar-nav-group__link--nested"
                    [attr.title]="ui.screenText('settings', item.labelKey)"
                    [attr.aria-label]="ui.screenText('settings', item.labelKey)">
                    <svg
                      *ngIf="isSvgNavIcon(item.icon)"
                      class="nav-icon-svg"
                      [ngClass]="navIconModifier(item.icon)"
                      viewBox="0 0 24 24"
                      aria-hidden="true">
                      <use [attr.href]="navIconHref(item.icon)" />
                    </svg>
                    <i *ngIf="!isSvgNavIcon(item.icon)" class="fas" [ngClass]="item.icon" aria-hidden="true"></i>
                    <span class="sidebar-nav-label">{{ ui.screenText('settings', item.labelKey) }}</span>
                  </a>
                </div>
              </div>
              <div
                class="sidebar-nav-subgroup"
                [class.sidebar-nav-subgroup--open]="hotelMgmtNavOpen"
                [class.sidebar-nav-subgroup--active]="hotelMgmtSectionActive">
                <button
                  type="button"
                  class="sidebar-nav-subgroup__head"
                  (click)="toggleHotelMgmtNav()"
                  [attr.aria-expanded]="hotelMgmtNavOpen"
                  [attr.title]="ui.screenText('settings', 'tabHotelManagement')"
                  [attr.aria-label]="ui.screenText('settings', 'tabHotelManagement')">
                  <svg class="nav-icon-svg nav-icon-svg--hotel" viewBox="0 0 24 24" aria-hidden="true">
                    <use href="#nav-icon-hotel" />
                  </svg>
                  <span class="sidebar-nav-label">{{ ui.screenText('settings', 'tabHotelManagement') }}</span>
                  <i
                    class="fas sidebar-nav-group__chevron"
                    [class.fa-chevron-up]="hotelMgmtNavOpen"
                    [class.fa-chevron-down]="!hotelMgmtNavOpen"
                    aria-hidden="true"></i>
                </button>
                <div class="sidebar-nav-subgroup__tree" *ngIf="hotelMgmtNavOpen">
                  <a
                    *ngFor="let item of settingsHotelMgmtItems"
                    [routerLink]="item.path"
                    [queryParams]="{ tab: item.tab }"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="item.linkActive"
                    class="sidebar-nav-group__link sidebar-nav-group__link--nested"
                    [attr.title]="ui.screenText('settings', item.labelKey)"
                    [attr.aria-label]="ui.screenText('settings', item.labelKey)">
                    <svg
                      *ngIf="isSvgNavIcon(item.icon)"
                      class="nav-icon-svg"
                      [ngClass]="navIconModifier(item.icon)"
                      viewBox="0 0 24 24"
                      aria-hidden="true">
                      <use [attr.href]="navIconHref(item.icon)" />
                    </svg>
                    <i *ngIf="!isSvgNavIcon(item.icon)" class="fas" [ngClass]="item.icon" aria-hidden="true"></i>
                    <span class="sidebar-nav-label">{{ ui.screenText('settings', item.labelKey) }}</span>
                  </a>
                </div>
              </div>
              <div
                class="sidebar-nav-subgroup"
                [class.sidebar-nav-subgroup--open]="userMgmtNavOpen"
                [class.sidebar-nav-subgroup--active]="userMgmtSectionActive">
                <button
                  type="button"
                  class="sidebar-nav-subgroup__head"
                  (click)="toggleUserMgmtNav()"
                  [attr.aria-expanded]="userMgmtNavOpen"
                  [attr.title]="ui.screenText('settings', 'tabUserManagement')"
                  [attr.aria-label]="ui.screenText('settings', 'tabUserManagement')">
                  <svg class="nav-icon-svg nav-icon-svg--user-cog" viewBox="0 0 24 24" aria-hidden="true">
                    <use href="#nav-icon-user-cog" />
                  </svg>
                  <span class="sidebar-nav-label">{{ ui.screenText('settings', 'tabUserManagement') }}</span>
                  <i
                    class="fas sidebar-nav-group__chevron"
                    [class.fa-chevron-up]="userMgmtNavOpen"
                    [class.fa-chevron-down]="!userMgmtNavOpen"
                    aria-hidden="true"></i>
                </button>
                <div class="sidebar-nav-subgroup__tree" *ngIf="userMgmtNavOpen">
                  <a
                    *ngFor="let item of settingsUserMgmtItems"
                    [routerLink]="item.path"
                    [queryParams]="{ tab: item.tab }"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="item.linkActive"
                    class="sidebar-nav-group__link sidebar-nav-group__link--nested"
                    [attr.title]="ui.screenText('settings', item.labelKey)"
                    [attr.aria-label]="ui.screenText('settings', item.labelKey)">
                    <svg
                      *ngIf="isSvgNavIcon(item.icon)"
                      class="nav-icon-svg"
                      [ngClass]="navIconModifier(item.icon)"
                      viewBox="0 0 24 24"
                      aria-hidden="true">
                      <use [attr.href]="navIconHref(item.icon)" />
                    </svg>
                    <i *ngIf="!isSvgNavIcon(item.icon)" class="fas" [ngClass]="item.icon" aria-hidden="true"></i>
                    <span class="sidebar-nav-label">{{ ui.screenText('settings', item.labelKey) }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div
            class="sidebar-nav-group"
            [class.sidebar-nav-group--open]="reportsNavOpen"
            [class.sidebar-nav-group--section-active]="reportsSectionActive"
            [class.sidebar-nav-group--flyout-active]="navRailCollapsed && collapsedNavFlyout === 'reports'">
            <button
              type="button"
              class="sidebar-nav-group__head"
              (click)="toggleReportsNav($event)"
              [attr.aria-expanded]="reportsNavOpen"
              [attr.title]="ui.sidebarLabel('reports')"
              [attr.aria-label]="ui.sidebarLabel('reports')">
              <svg class="nav-icon-svg nav-icon-svg--reports sidebar-nav-group__main-icon" viewBox="0 0 24 24" aria-hidden="true">
                <use href="#nav-icon-reports" />
              </svg>
              <span class="sidebar-nav-label">{{ ui.sidebarLabel('reports') }}</span>
              <i
                class="fas sidebar-nav-group__chevron"
                [class.fa-chevron-up]="reportsNavOpen"
                [class.fa-chevron-down]="!reportsNavOpen"
                aria-hidden="true"></i>
            </button>
            <div class="sidebar-nav-group__tree" *ngIf="reportsNavOpen && !navRailCollapsed">
              <a
                *ngFor="let item of reportsNavItems"
                [routerLink]="item.path"
                [queryParams]="item.queryParams ?? null"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-group__link"
                [attr.title]="ui.screenText('reports', item.labelKey)"
                [attr.aria-label]="ui.screenText('reports', item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas" [ngClass]="item.icon" aria-hidden="true"></i>
                <span class="sidebar-nav-label">{{ ui.screenText('reports', item.labelKey) }}</span>
              </a>
            </div>
          </div>
        </nav>

        <div
          class="sidebar-lang-mobile"
          [class.sidebar-lang-mobile--open]="langPickerOpen"
          role="group"
          [attr.aria-label]="ui.chromeLabel('langPickerAria')">
          <ng-container *ngFor="let opt of localeOptions">
            <button
              *ngIf="langPickerOpen || ui.displayLocale() === opt.code"
              type="button"
              class="sidebar-lang-mobile__pill"
              [class.sidebar-lang-mobile__pill--active]="ui.displayLocale() === opt.code"
              (click)="onLocalePillClick(opt.code, $event)"
              [attr.aria-label]="localeOptionLabel(opt.labelKey)"
              [attr.aria-pressed]="ui.displayLocale() === opt.code">
              <img class="sidebar-lang-mobile__flag" [src]="opt.flagSrc" alt="" width="24" height="24" />
              <span>{{ localeOptionLabel(opt.labelKey) }}</span>
            </button>
          </ng-container>
        </div>
        </div>
      </aside>

      <button
        type="button"
        class="sidebar-edge-toggle nav-rail-edge-toggle"
        (click)="toggleNavRail()"
        [attr.aria-expanded]="!navRailCollapsed"
        [title]="navRailCollapsed ? ui.chromeLabel('navRailExpandTitle') : ui.chromeLabel('navRailCollapseTitle')"
        [attr.aria-label]="
          navRailCollapsed ? ui.chromeLabel('navRailExpandAria') : ui.chromeLabel('navRailCollapseAria')
        ">
        <i
          class="fas"
          [class.fa-chevron-left]="navRailCollapsed"
          [class.fa-chevron-right]="!navRailCollapsed"
          aria-hidden="true"></i>
      </button>

      <div
        class="sidebar-nav-flyout"
        *ngIf="navRailCollapsed && collapsedNavFlyout as flyoutId"
        [style.top.px]="flyoutTop"
        [style.left.px]="flyoutLeft"
        role="dialog"
        [attr.aria-label]="collapsedFlyoutTitle(flyoutId)"
        (click)="$event.stopPropagation()">
          <header class="sidebar-nav-flyout__head">
            <h3 class="sidebar-nav-flyout__title">{{ collapsedFlyoutTitle(flyoutId) }}</h3>
          </header>
          <div class="sidebar-nav-flyout__body" [ngSwitch]="flyoutId">
            <ng-container *ngSwitchCase="'bookings'">
              <p class="sidebar-nav-flyout__section">{{ ui.sidebarLabel('navAddBooking') }}</p>
              <a
                *ngFor="let item of bookingsAddNavItems"
                [routerLink]="item.path"
                [queryParams]="item.queryParams ?? null"
                class="sidebar-nav-flyout__link"
                [class.active]="isBookingsAddNavItemActive(item)"
                (click)="onBookingsAddNavClick(item, $event); closeCollapsedNavFlyout()">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg sidebar-nav-flyout__icon"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas sidebar-nav-flyout__icon-fa" [ngClass]="item.icon" aria-hidden="true"></i>
                <span>{{ ui.sidebarLabel(item.labelKey) }}</span>
              </a>
              <p class="sidebar-nav-flyout__section sidebar-nav-flyout__section--divider">{{ ui.sidebarLabel('bookingsGroup') }}</p>
              <a
                *ngFor="let item of bookingsNavItems"
                [routerLink]="item.path"
                [queryParams]="item.queryParams ?? null"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-flyout__link"
                (click)="closeCollapsedNavFlyout()"
                [attr.title]="ui.sidebarLabel(item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg sidebar-nav-flyout__icon"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas sidebar-nav-flyout__icon-fa" [ngClass]="item.icon" aria-hidden="true"></i>
                <span>{{ ui.sidebarLabel(item.labelKey) }}</span>
              </a>
            </ng-container>
            <ng-container *ngSwitchCase="'frontDesk'">
              <a
                *ngFor="let item of frontDeskNavItems"
                [routerLink]="item.path"
                [queryParams]="item.queryParams ?? null"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-flyout__link"
                (click)="closeCollapsedNavFlyout()"
                [attr.title]="ui.sidebarLabel(item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg sidebar-nav-flyout__icon"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas sidebar-nav-flyout__icon-fa" [ngClass]="item.icon" aria-hidden="true"></i>
                <span>{{ ui.sidebarLabel(item.labelKey) }}</span>
              </a>
            </ng-container>
            <ng-container *ngSwitchCase="'settings'">
              <p class="sidebar-nav-flyout__section">{{ ui.screenText('settings', 'tabSystemSetup') }}</p>
              <a
                *ngFor="let item of settingsSystemSetupItems"
                [routerLink]="item.path"
                [queryParams]="{ tab: item.tab }"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-flyout__link"
                (click)="closeCollapsedNavFlyout()"
                [attr.title]="ui.screenText('settings', item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg sidebar-nav-flyout__icon"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas sidebar-nav-flyout__icon-fa" [ngClass]="item.icon" aria-hidden="true"></i>
                <span>{{ ui.screenText('settings', item.labelKey) }}</span>
              </a>
              <p class="sidebar-nav-flyout__section sidebar-nav-flyout__section--divider">{{ ui.screenText('settings', 'tabHotelManagement') }}</p>
              <a
                *ngFor="let item of settingsHotelMgmtItems"
                [routerLink]="item.path"
                [queryParams]="{ tab: item.tab }"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-flyout__link"
                (click)="closeCollapsedNavFlyout()"
                [attr.title]="ui.screenText('settings', item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg sidebar-nav-flyout__icon"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas sidebar-nav-flyout__icon-fa" [ngClass]="item.icon" aria-hidden="true"></i>
                <span>{{ ui.screenText('settings', item.labelKey) }}</span>
              </a>
              <p class="sidebar-nav-flyout__section sidebar-nav-flyout__section--divider">{{ ui.screenText('settings', 'tabUserManagement') }}</p>
              <a
                *ngFor="let item of settingsUserMgmtItems"
                [routerLink]="item.path"
                [queryParams]="{ tab: item.tab }"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-flyout__link"
                (click)="closeCollapsedNavFlyout()"
                [attr.title]="ui.screenText('settings', item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg sidebar-nav-flyout__icon"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas sidebar-nav-flyout__icon-fa" [ngClass]="item.icon" aria-hidden="true"></i>
                <span>{{ ui.screenText('settings', item.labelKey) }}</span>
              </a>
            </ng-container>
            <ng-container *ngSwitchCase="'reports'">
              <a
                *ngFor="let item of reportsNavItems"
                [routerLink]="item.path"
                [queryParams]="item.queryParams ?? null"
                routerLinkActive="active"
                [routerLinkActiveOptions]="item.linkActive"
                class="sidebar-nav-flyout__link"
                (click)="closeCollapsedNavFlyout()"
                [attr.title]="ui.screenText('reports', item.labelKey)">
                <svg
                  *ngIf="isSvgNavIcon(item.icon)"
                  class="nav-icon-svg sidebar-nav-flyout__icon"
                  [ngClass]="navIconModifier(item.icon)"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <use [attr.href]="navIconHref(item.icon)" />
                </svg>
                <i *ngIf="!isSvgNavIcon(item.icon)" class="fas sidebar-nav-flyout__icon-fa" [ngClass]="item.icon" aria-hidden="true"></i>
                <span>{{ ui.screenText('reports', item.labelKey) }}</span>
              </a>
            </ng-container>
          </div>
        </div>

      <div class="app-main-column">
        <app-top-bar
          [hotelDisplayName]="hotelDisplayName"
          [hotelImageSrc]="hotelImageSrc"
          [hotelNameInitial]="hotelNameInitial"
          [unreadNotifications]="notifications.unreadCount()"
          (searchOpen)="openSearchOverlay()"
          (notificationsOpen)="openNotificationsFromTopBar()" />

        <main class="app-content">
          <router-outlet />
          <app-ui-messages />
        </main>
      </div>

      <button
        type="button"
        class="sidebar-edge-toggle lang-rail-edge-toggle"
        [class.lang-rail-edge-toggle--close]="!langRailClosed"
        (click)="toggleLangRail()"
        [attr.aria-expanded]="!langRailClosed"
        [title]="langRailClosed ? ui.chromeLabel('accountRailOpenTitle') : ui.chromeLabel('accountRailCloseTitle')"
        [attr.aria-label]="
          langRailClosed ? ui.chromeLabel('accountRailOpenAria') : ui.chromeLabel('accountRailCloseAria')
        ">
        <svg *ngIf="langRailClosed" class="utility-edge-icon" viewBox="0 0 24 24" aria-hidden="true">
          <use href="#nav-icon-help" />
        </svg>
        <i class="fas fa-times" *ngIf="!langRailClosed" aria-hidden="true"></i>
      </button>

      <aside
        class="app-lang-rail"
        [class.app-lang-rail--closed]="langRailClosed"
        [attr.aria-hidden]="langRailClosed"
        [attr.aria-label]="ui.chromeLabel('helpMenuTitle')">
        <nav class="account-rail-nav lang-rail-inner" *ngIf="!langRailClosed" [attr.aria-label]="ui.chromeLabel('helpMenuTitle')">
          <header class="utility-rail-header">
            <h2 class="utility-rail-header__title">{{ ui.chromeLabel('helpMenuTitle') }}</h2>
          </header>

          <div class="utility-quick-bar" role="toolbar" [attr.aria-label]="ui.chromeLabel('helpMenuTitle')">
            <button
              type="button"
              class="utility-quick-btn utility-quick-btn--notify"
              [class.utility-quick-btn--active]="notificationsOpen"
              (click)="toggleNotificationsPanel($event)"
              [attr.title]="ui.chromeLabel('notificationsMenuTitle')"
              [attr.aria-label]="ui.chromeLabel('notificationsMenuTitle')"
              [attr.aria-expanded]="notificationsOpen">
              <svg class="utility-quick-btn__svg" viewBox="0 0 24 24" aria-hidden="true">
                <use href="#nav-icon-bell" />
              </svg>
              <span class="utility-quick-btn__badge" *ngIf="notifications.unreadCount() > 0">{{
                notifications.unreadCount()
              }}</span>
            </button>
          </div>

          <div
            class="account-rail-group account-rail-group--notify"
            [class.account-rail-group--open]="notificationsOpen"
            [attr.aria-label]="ui.chromeLabel('notificationsAria')">
            <button
              type="button"
              class="account-rail-group__head"
              (click)="toggleNotificationsPanel($event)"
              [attr.aria-expanded]="notificationsOpen"
              [attr.title]="ui.chromeLabel('notificationsMenuTitle')"
              [attr.aria-label]="ui.chromeLabel('notificationsMenuTitle')">
              <svg class="account-rail-group__main-icon account-rail-group__main-icon--svg" viewBox="0 0 24 24" aria-hidden="true">
                <use href="#nav-icon-bell" />
              </svg>
              <span class="account-rail-group__label">{{ ui.chromeLabel('notificationsMenuTitle') }}</span>
              <span class="account-rail-badge" *ngIf="notifications.unreadCount() > 0">{{
                notifications.unreadCount()
              }}</span>
              <i
                class="fas account-rail-group__chevron"
                [class.fa-chevron-up]="notificationsOpen"
                [class.fa-chevron-down]="!notificationsOpen"
                aria-hidden="true"></i>
            </button>
            <div class="account-rail-group__tree account-rail-group__tree--notify" *ngIf="notificationsOpen">
              <div class="account-rail-notify-toolbar" *ngIf="notifications.items().length > 0">
                <button type="button" class="account-rail-chip" (click)="notifications.markAllRead(); $event.stopPropagation()">
                  {{ ui.chromeLabel('notificationsMarkRead') }}
                </button>
                <button
                  type="button"
                  class="account-rail-chip account-rail-chip--muted"
                  (click)="notifications.clearAll(); $event.stopPropagation()">
                  {{ ui.chromeLabel('notificationsClear') }}
                </button>
              </div>
              <p class="account-rail-notify-empty" *ngIf="notifications.items().length === 0">
                <i class="fas fa-inbox" aria-hidden="true"></i>
                {{ ui.chromeLabel('notificationsEmpty') }}
              </p>
              <ul class="account-rail-notify-list" *ngIf="notifications.items().length > 0">
                <li
                  *ngFor="let n of notifications.items()"
                  class="account-rail-notify-item"
                  [class.account-rail-notify-item--unread]="!n.read">
                  <i [ngClass]="notifications.iconClass(n.kind)" class="account-rail-notify-item__type" aria-hidden="true"></i>
                  <div class="account-rail-notify-item__body">
                    <span class="account-rail-notify-item__text">{{ notifications.message(n) }}</span>
                    <span class="account-rail-notify-item__time">{{ notifications.timeLabel(n) }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </aside>

      <div
        class="app-search-overlay"
        *ngIf="searchOverlayOpen"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="ui.chromeLabel('searchOverlayAria')"
        (click)="closeSearchOverlay()">
        <div class="app-search-modal" (click)="$event.stopPropagation()">
          <div class="app-search-bar">
            <svg class="app-search-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
              <use href="#nav-icon-search" />
            </svg>
            <input
              #searchInput
              type="search"
              class="app-search-bar__input"
              [(ngModel)]="searchQuery"
              (keydown.escape)="closeSearchOverlay()"
              [placeholder]="ui.chromeLabel('searchOverlayPlaceholder')"
              [attr.aria-label]="ui.chromeLabel('searchOverlayAria')"
              autocomplete="off" />
            <kbd class="app-search-bar__esc">{{ ui.chromeLabel('searchOverlayEsc') }}</kbd>
          </div>
          <ul class="app-search-results" *ngIf="filteredSearchResults.length > 0">
            <li *ngFor="let item of filteredSearchResults">
              <button type="button" class="app-search-result" (click)="navigateFromSearch(item)">
                <div class="app-search-result__text">
                  <strong class="app-search-result__title">{{ item.title }}</strong>
                  <span class="app-search-result__crumb">{{ item.breadcrumb }}</span>
                </div>
                <span class="app-search-result__tag">{{ item.tag }}</span>
              </button>
            </li>
          </ul>
          <p class="app-search-empty" *ngIf="filteredSearchResults.length === 0 && searchQuery.trim()">
            {{ ui.chromeLabel('searchOverlayPlaceholder') }}
          </p>
        </div>
      </div>

      <app-account-locale-editor
        [open]="accountJsonEditorOpen"
        [locale]="ui.displayLocale()"
        initialScreenId="booking"
        [openOnScreenCopy]="true"
        (closed)="onAccountLocaleEditorClosed()"
        (saved)="onAccountLocaleEditorSaved()" />
    </div>
  `,
  styles: [
    `
    .app-shell {
      min-height: 100vh;
      display: flex;
      background: var(--app-bg);
      color: var(--app-text);
    }

    .app-sidebar {
      position: sticky;
      top: 0;
      z-index: 30;
      isolation: isolate;
      width: 260px;
      height: 100vh;
      padding: 1.25rem;
      color: #ffffff;
      background:
        radial-gradient(120% 70% at 100% 0%, rgba(66, 165, 245, 0.35), transparent 55%),
        radial-gradient(90% 60% at 0% 100%, rgba(13, 71, 161, 0.5), transparent 50%),
        linear-gradient(185deg, #1976d2 0%, #1565c0 42%, #0d47a1 100%);
      border-inline-end: 1px solid rgba(255, 255, 255, 0.14);
      border-start-end-radius: 20px;
      border-end-end-radius: 20px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.12),
        4px 0 32px rgba(13, 71, 161, 0.35);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: visible;
      transition:
        width 0.24s ease,
        padding 0.24s ease,
        box-shadow 0.28s ease,
        border-color 0.24s ease;
    }

    /* شريط ضوء عمودي على حافة التماس مع المحتوى */
    .app-sidebar::before {
      content: "";
      position: absolute;
      z-index: 0;
      pointer-events: none;
      inset-inline-end: 0;
      top: 24px;
      bottom: 24px;
      width: 2px;
      border-radius: 2px;
      background: linear-gradient(
        185deg,
        transparent 0%,
        rgba(255, 255, 255, 0.25) 8%,
        rgba(187, 222, 251, 0.85) 42%,
        rgba(255, 255, 255, 0.55) 68%,
        rgba(144, 202, 249, 0.4) 90%,
        transparent 100%
      );
      box-shadow:
        0 0 12px rgba(255, 255, 255, 0.2),
        0 0 24px rgba(66, 165, 245, 0.25);
      opacity: 0.92;
    }

    .app-sidebar > * {
      position: relative;
      z-index: 1;
    }

    .app-sidebar--advanced-nav::before {
      opacity: 1;
      box-shadow:
        0 0 22px rgba(0, 212, 255, 0.65),
        0 0 44px rgba(124, 247, 212, 0.18);
    }

    .sidebar-nav-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .sidebar-nav::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .sidebar-nav-label {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      text-align: start;
      transition: opacity 0.2s ease, max-width 0.26s ease, margin 0.24s ease;
    }

    @media (min-width: 901px) {
      .app-sidebar--collapsed {
        width: 76px;
        padding-inline: 0.55rem;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.12),
          4px 0 24px rgba(13, 71, 161, 0.35);
      }

      .app-sidebar--collapsed .brand-text,
      .app-sidebar--collapsed .sidebar-nav-label {
        opacity: 0;
        max-width: 0;
        margin: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .app-sidebar--collapsed .sidebar-brand {
        justify-content: center;
      }

      .app-sidebar--collapsed .sidebar-nav a {
        justify-content: center;
        gap: 0;
      }
    }

    /* زر دائري صغير — منتصف الشاشة عمودياً، على حافة القائمة */
    .sidebar-edge-toggle {
      position: fixed;
      z-index: 50;
      top: calc(50vh - 120px);
      inset-inline-start: var(--nav-rail-width, 260px);
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--app-border-strong);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-family: inherit;
      color: var(--app-primary);
      background: #ffffff;
      backdrop-filter: blur(10px) saturate(1.2);
      -webkit-backdrop-filter: blur(10px) saturate(1.2);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.9) inset,
        0 2px 12px rgba(21, 101, 192, 0.15),
        0 0 0 1px rgba(21, 101, 192, 0.08);
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease,
        inset-inline-start 0.24s ease;
    }

    .sidebar-edge-toggle i {
      font-size: 0.62rem;
      line-height: 1;
    }

    .sidebar-edge-toggle:hover {
      background: #e3f2fd;
      border-color: var(--app-primary-mid);
      color: var(--app-primary);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 1) inset,
        0 4px 16px rgba(21, 101, 192, 0.18);
    }

    .sidebar-edge-toggle:active {
      transform: translate(-50%, -50%) scale(0.94);
    }

    .sidebar-edge-toggle:focus-visible {
      outline: 2px solid rgba(30, 136, 229, 0.55);
      outline-offset: 2px;
    }

    .lang-rail-edge-toggle {
      top: 50vh;
      inset-inline-start: auto;
      inset-inline-end: 0;
      transform: translate(50%, -50%);
      width: 36px;
      height: 36px;
      background: #1976d2;
      border-color: #1565c0;
      color: #ffffff;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.25) inset,
        0 4px 16px rgba(21, 101, 192, 0.35);
      transition:
        background 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease,
        inset-inline-end 0.24s ease;
    }

    .app-shell--lang-rail-open .lang-rail-edge-toggle {
      inset-inline-end: var(--lang-rail-width, 168px);
    }

    .lang-rail-edge-toggle i {
      font-size: 0.95rem;
    }

    .lang-rail-edge-toggle:hover {
      background: #1565c0;
      border-color: #0d47a1;
      color: #ffffff;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.35) inset,
        0 6px 20px rgba(21, 101, 192, 0.4);
    }

    .lang-rail-edge-toggle:active {
      transform: translate(50%, -50%) scale(0.94);
    }

    .lang-rail-edge-toggle:focus-visible {
      outline: 2px solid rgba(144, 202, 249, 0.9);
      outline-offset: 2px;
    }

    .lang-rail-edge-toggle--close {
      background: #ffffff;
      color: #c62828;
      border-color: rgba(198, 40, 40, 0.35);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.9) inset,
        0 4px 16px rgba(198, 40, 40, 0.22);
    }

    .lang-rail-edge-toggle--close:hover {
      background: #ffebee;
      border-color: rgba(198, 40, 40, 0.5);
      color: #b71c1c;
    }

    .lang-rail-edge-toggle--close i {
      font-size: 1.05rem;
      font-weight: 700;
    }

    .app-lang-rail {
      --lr-font: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      --lr-title: 0.8rem;
      --lr-sub: 0.68rem;
      --lr-body: 0.72rem;
      --lr-meta: 0.62rem;
      position: sticky;
      top: 0;
      z-index: 28;
      width: 224px;
      height: 100vh;
      flex-shrink: 0;
      font-family: var(--lr-font);
      color: #0d47a1;
      background: linear-gradient(180deg, #f8fbff 0%, #ffffff 38%, #f3f8ff 100%);
      border-inline-start: 1px solid rgba(21, 101, 192, 0.12);
      border-start-start-radius: 22px;
      border-end-start-radius: 22px;
      box-shadow:
        inset 1px 0 0 rgba(255, 255, 255, 0.9),
        -8px 0 32px rgba(21, 101, 192, 0.08);
      transition:
        width 0.24s ease,
        opacity 0.22s ease,
        border-color 0.22s ease;
    }

    .app-lang-rail--closed {
      width: 0 !important;
      min-width: 0;
      border-color: transparent !important;
      opacity: 0;
      overflow: hidden;
      pointer-events: none;
      box-shadow: none !important;
    }

    .lang-rail-inner,
    .account-rail-nav {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      height: 100%;
      padding: 1rem 0.75rem 1.1rem;
      box-sizing: border-box;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .account-rail-group {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 0 0 auto;
      flex-shrink: 0;
    }

    .account-rail-group--notify {
      flex: 0 0 auto;
    }

    .account-rail-group--lang {
      flex: 0 0 auto;
      margin-top: 0;
    }

    .account-rail-group__head {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.72rem 0.75rem;
      border: 1px solid rgba(21, 101, 192, 0.14);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.95);
      color: #0d47a1;
      font-family: var(--lr-font);
      font-weight: 700;
      font-size: 0.86rem;
      cursor: pointer;
      text-align: inherit;
      transition:
        background 0.18s ease,
        border-color 0.18s ease,
        box-shadow 0.18s ease;
    }

    .account-rail-group--open > .account-rail-group__head {
      background: linear-gradient(135deg, rgba(227, 242, 253, 0.95) 0%, #ffffff 100%);
      border-color: rgba(25, 118, 210, 0.28);
      box-shadow: 0 4px 14px rgba(21, 101, 192, 0.08);
    }

    .account-rail-group__head:hover {
      background: #f0f7ff;
      border-color: rgba(25, 118, 210, 0.22);
    }

    .account-rail-group__main-icon {
      width: 38px;
      font-size: 1.55rem;
      line-height: 1;
      flex-shrink: 0;
      text-align: center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .account-rail-group__main-icon--account {
      color: #7b1fa2;
    }

    .account-rail-group__main-icon--notify {
      color: #f9a825;
    }

    .account-rail-group__main-icon--lang {
      color: #1565c0;
    }

    .account-rail-group__label {
      flex: 1;
      min-width: 0;
      text-align: start;
      line-height: 1.25;
    }

    .account-rail-group__chevron {
      font-size: 0.68rem;
      opacity: 0.85;
      flex-shrink: 0;
      margin-inline-start: auto;
      color: #1976d2;
    }

    .account-rail-badge {
      min-width: 1.2rem;
      height: 1.2rem;
      padding: 0 0.3rem;
      border-radius: 999px;
      background: linear-gradient(135deg, #ef5350, #c62828);
      color: #fff;
      font-size: 0.62rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .account-rail-group__tree {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin: 0.1rem 0.2rem 0.15rem 0;
      padding: 0.35rem 0.45rem 0.45rem 0;
      padding-inline-end: 0.75rem;
    }

    .account-rail-group__tree--notify {
      flex: 0 0 auto;
      overflow: visible;
    }

    button.sidebar-nav-group__link {
      width: 100%;
      font-family: inherit;
      cursor: pointer;
      background: transparent;
      text-align: inherit;
      border: none;
      box-shadow: none;
    }

    button.sidebar-nav-group__link:hover,
    button.sidebar-nav-group__link.active {
      background: #1565c0;
    }

    button.sidebar-nav-group__link.active {
      background: #0a3d91;
    }

    .account-rail-group__link {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      padding: 0.58rem 0.6rem;
      margin-inline-end: 0.1rem;
      color: #1565c0;
      text-decoration: none;
      border-radius: 11px;
      font-size: 0.82rem;
      font-weight: 600;
      border: 1px solid transparent;
      background: transparent;
      font-family: var(--lr-font);
      cursor: pointer;
      text-align: inherit;
      transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    }

    .account-rail-group__link i:first-child {
      width: 22px;
      font-size: 0.92rem;
      flex-shrink: 0;
      text-align: center;
    }

    .account-rail-group__link span {
      flex: 1;
      min-width: 0;
      text-align: start;
    }

    .account-rail-group__link:hover,
    .account-rail-group__link.active {
      color: #0d47a1;
      font-weight: 700;
      background: rgba(227, 242, 253, 0.9);
      border-color: rgba(25, 118, 210, 0.2);
    }

    .account-rail-group__link--locale .account-rail-locale-flag {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .account-rail-group__link--locale.active {
      background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
      border-color: #1976d2;
    }

    .account-rail-notify-toolbar {
      display: flex;
      gap: 0.3rem;
      flex-shrink: 0;
    }

    .account-rail-chip {
      flex: 1;
      padding: 0.3rem 0.4rem;
      border-radius: 999px;
      border: 1px solid rgba(25, 118, 210, 0.25);
      background: #fff;
      color: #1565c0;
      font-family: var(--lr-font);
      font-size: var(--lr-meta);
      font-weight: 700;
      cursor: pointer;
    }

    .account-rail-chip--muted {
      color: #c62828;
      border-color: rgba(198, 40, 40, 0.22);
    }

    .account-rail-notify-empty {
      margin: 0;
      padding: 0.85rem 0.4rem;
      text-align: center;
      font-size: var(--lr-body);
      font-weight: 600;
      color: #90a4ae;
    }

    .account-rail-notify-list {
      list-style: none;
      margin: 0;
      padding: 0.1rem;
      flex: 0 0 auto;
      max-height: min(240px, 32vh);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .account-rail-notify-item {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 0.45rem;
      padding: 0.48rem 0.5rem;
      border-radius: 11px;
      border: 1px solid rgba(21, 101, 192, 0.1);
      background: #fafcff;
    }

    .account-rail-notify-item--unread {
      background: linear-gradient(90deg, rgba(227, 242, 253, 0.95) 0%, #fafcff 70%);
      border-color: rgba(25, 118, 210, 0.22);
    }

    .account-rail-notify-item__type {
      width: 22px;
      font-size: 0.78rem;
      flex-shrink: 0;
      text-align: center;
      color: #1565c0;
      margin-top: 0.1rem;
    }

    .account-rail-notify-item__body {
      flex: 1;
      min-width: 0;
      text-align: start;
    }

    .account-rail-notify-item__text {
      display: block;
      font-size: var(--lr-body);
      font-weight: 700;
      color: #0d47a1;
      line-height: 1.35;
      word-break: break-word;
    }

    .account-rail-notify-item__time {
      font-size: var(--lr-meta);
      color: #78909c;
      font-weight: 600;
    }

    .lang-rail-block {
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      border: 1px solid rgba(21, 101, 192, 0.1);
      background: rgba(255, 255, 255, 0.88);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.95) inset,
        0 8px 24px rgba(21, 101, 192, 0.06);
      overflow: hidden;
      transition: box-shadow 0.22s ease, border-color 0.22s ease;
    }

    .lang-rail-block--expanded {
      border-color: rgba(25, 118, 210, 0.22);
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 1) inset,
        0 12px 28px rgba(21, 101, 192, 0.1);
    }

    .lang-rail-block--notify {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .lang-rail-block--notify.lang-rail-block--expanded {
      flex: 1 1 58%;
    }

    .lang-rail-block--lang {
      flex: 0 0 auto;
    }

    .lang-rail-block__head {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.65rem 0.7rem;
      border-bottom: 1px solid rgba(21, 101, 192, 0.08);
      background: linear-gradient(135deg, rgba(227, 242, 253, 0.55) 0%, rgba(255, 255, 255, 0.2) 100%);
    }

    .lang-rail-block__head--btn {
      width: 100%;
      border: none;
      cursor: pointer;
      font-family: var(--lr-font);
      text-align: inherit;
      transition: background 0.18s ease;
    }

    .lang-rail-block__head--btn:hover {
      background: linear-gradient(135deg, rgba(227, 242, 253, 0.9) 0%, rgba(255, 255, 255, 0.5) 100%);
    }

    .lang-rail-block__icon {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      font-size: 0.9rem;
    }

    .lang-rail-block__icon--bell {
      background: linear-gradient(145deg, #1976d2, #0d47a1);
      color: #fff;
      box-shadow: 0 4px 12px rgba(21, 101, 192, 0.35);
    }

    .lang-rail-block__icon--globe {
      background: linear-gradient(145deg, #e3f2fd, #bbdefb);
      color: #1565c0;
      border: 1px solid rgba(25, 118, 210, 0.2);
    }

    .lang-rail-block__titles {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      text-align: start;
    }

    .lang-rail-block__title {
      font-size: var(--lr-title);
      font-weight: 800;
      line-height: 1.2;
      color: #0d47a1;
      letter-spacing: 0.01em;
    }

    .lang-rail-block__subtitle {
      font-size: var(--lr-sub);
      font-weight: 600;
      color: #607d8b;
      line-height: 1.25;
    }

    .lang-rail-block__chevron {
      font-size: 0.7rem;
      color: #1976d2;
      opacity: 0.85;
      flex-shrink: 0;
    }

    .lang-rail-notify-badge {
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.35rem;
      border-radius: 999px;
      background: linear-gradient(135deg, #ef5350, #c62828);
      color: #fff;
      font-size: 0.65rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(198, 40, 40, 0.35);
    }

    .lang-rail-block__body {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding: 0.5rem 0.55rem 0.6rem;
      min-height: 0;
    }

    .lang-rail-block--notify .lang-rail-block__body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .lang-rail-split {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0 0.35rem;
      flex-shrink: 0;
    }

    .lang-rail-split__line {
      flex: 1;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(21, 101, 192, 0.22) 20%,
        rgba(21, 101, 192, 0.22) 80%,
        transparent
      );
    }

    .lang-rail-split__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15);
      flex-shrink: 0;
    }

    .lang-rail-notify-toolbar {
      display: flex;
      gap: 0.35rem;
      flex-shrink: 0;
    }

    .lang-rail-chip {
      flex: 1;
      padding: 0.32rem 0.45rem;
      border-radius: 999px;
      border: 1px solid rgba(25, 118, 210, 0.25);
      background: #fff;
      color: #1565c0;
      font-family: var(--lr-font);
      font-size: var(--lr-meta);
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .lang-rail-chip:hover {
      background: #e3f2fd;
    }

    .lang-rail-chip--muted {
      color: #c62828;
      border-color: rgba(198, 40, 40, 0.22);
    }

    .lang-rail-chip--muted:hover {
      background: #ffebee;
    }

    .lang-rail-notify-empty {
      margin: 0;
      padding: 1rem 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.45rem;
      font-size: var(--lr-body);
      font-weight: 600;
      color: #90a4ae;
      line-height: 1.45;
      text-align: center;
    }

    .lang-rail-notify-empty i {
      font-size: 1.35rem;
      color: #b0bec5;
    }

    .lang-rail-notify-list {
      list-style: none;
      margin: 0;
      padding: 0.15rem 0.1rem 0.2rem;
      flex: 1;
      min-height: 0;
      max-height: min(280px, 42vh);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: rgba(25, 118, 210, 0.35) transparent;
    }

    .lang-rail-notify-list::-webkit-scrollbar {
      width: 4px;
    }

    .lang-rail-notify-list::-webkit-scrollbar-thumb {
      background: rgba(25, 118, 210, 0.35);
      border-radius: 4px;
    }

    .lang-rail-notify-item {
      position: relative;
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      padding: 0.5rem 0.5rem 0.5rem 0.55rem;
      border-radius: 12px;
      border: 1px solid rgba(21, 101, 192, 0.08);
      background: #fafcff;
      overflow: hidden;
    }

    .lang-rail-notify-item::before {
      content: "";
      position: absolute;
      inset-inline-start: 0;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: transparent;
      transition: background 0.2s ease;
    }

    .lang-rail-notify-item--unread {
      background: linear-gradient(90deg, rgba(227, 242, 253, 0.95) 0%, #fafcff 55%);
      border-color: rgba(25, 118, 210, 0.2);
    }

    .lang-rail-notify-item--unread::before {
      background: linear-gradient(180deg, #42a5f5, #1565c0);
    }

    .lang-rail-notify-item__icon {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      background: #e3f2fd;
      color: #1565c0;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      font-size: 0.72rem;
    }

    .lang-rail-notify-item--unread .lang-rail-notify-item__icon {
      background: #1976d2;
      color: #fff;
    }

    .lang-rail-notify-item__body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding-top: 0.05rem;
    }

    .lang-rail-notify-item__text {
      font-size: var(--lr-body);
      font-weight: 700;
      color: #0d47a1;
      line-height: 1.4;
      word-break: break-word;
    }

    .lang-rail-notify-item__time {
      font-size: var(--lr-meta);
      color: #78909c;
      font-weight: 600;
    }

    .lang-rail-options {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .lang-rail-pill {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      padding: 0.48rem 0.5rem;
      border: 1px solid rgba(21, 101, 192, 0.12);
      border-radius: 12px;
      background: #fff;
      color: #1565c0;
      cursor: pointer;
      font-family: var(--lr-font);
      transition:
        background 0.18s ease,
        border-color 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.15s ease;
    }

    .lang-rail-pill:hover {
      background: #f0f7ff;
      border-color: rgba(25, 118, 210, 0.28);
      transform: translateY(-1px);
    }

    .lang-rail-pill--active {
      background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
      border-color: #1976d2;
      color: #0d47a1;
      box-shadow: 0 4px 14px rgba(21, 101, 192, 0.12);
    }

    .lang-rail-pill--chooser {
      opacity: 0.88;
    }

    .lang-rail-pill--chooser:hover {
      opacity: 1;
    }

    .lang-rail-pill__flag-wrap {
      width: 32px;
      height: 22px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .lang-rail-pill__flag {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .lang-rail-pill__name {
      flex: 1;
      font-size: var(--lr-body);
      font-weight: 700;
      text-align: start;
      line-height: 1.25;
    }

    .lang-rail-pill__check {
      font-size: 0.65rem;
      color: #1976d2;
      flex-shrink: 0;
    }

    .lang-rail-more-lang {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
      width: 100%;
      margin-top: 0.15rem;
      padding: 0.42rem 0.55rem;
      border: 1px dashed rgba(21, 101, 192, 0.28);
      border-radius: 11px;
      background: rgba(248, 251, 255, 0.9);
      color: #1976d2;
      cursor: pointer;
      font-family: var(--lr-font);
      font-size: var(--lr-meta);
      font-weight: 700;
      transition: background 0.18s ease, border-color 0.18s ease;
    }

    .lang-rail-more-lang:hover {
      background: #e3f2fd;
      border-color: rgba(25, 118, 210, 0.45);
    }

    .lang-rail-more-lang span {
      line-height: 1.3;
      text-align: start;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 0.5rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.18);
      margin-bottom: 1rem;
    }

    .brand-logo-frame {
      position: relative;
      flex-shrink: 0;
      width: 88px;
      height: 88px;
      display: grid;
      place-items: center;
      overflow: visible;
    }

    /* خط يشبه القلم: حلقة متموجة + تدفق على المسار */
    .brand-pen-ring {
      position: absolute;
      width: 112px;
      height: 112px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      overflow: visible;
    }

    .brand-pen-stroke {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .brand-pen-stroke--glow {
      stroke: rgba(0, 212, 255, 0.28);
      stroke-width: 5;
      stroke-dasharray: 12 9;
      animation: brand-pen-flow 4.8s linear infinite;
      animation-delay: -2.4s;
    }

    .brand-pen-stroke--main {
      stroke: url(#brandPenGrad);
      stroke-width: 2.15;
      stroke-dasharray: 12 9;
      animation: brand-pen-flow 4.8s linear infinite;
      filter: drop-shadow(0 0 5px rgba(0, 212, 255, 0.55));
    }

    @keyframes brand-pen-flow {
      to {
        stroke-dashoffset: -100;
      }
    }

    .brand-logo-wrap {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.45);
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.15) inset,
        0 4px 18px rgba(0, 0, 0, 0.2);
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.12);
    }

    .brand-logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    .brand-icon-fallback {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      background: var(--app-gradient);
      font-weight: 800;
      font-size: 1.55rem;
      color: #fff;
    }

    .brand-text {
      min-width: 0;
      flex: 1;
    }

    .brand-title {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #ffffff;
    }

    .sidebar-brand strong,
    .sidebar-brand small {
      display: block;
    }

    .sidebar-brand small {
      color: rgba(255, 255, 255, 0.78);
      margin-top: 0.15rem;
      font-size: 0.78rem;
    }

    .sidebar-nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .sidebar-nav-group__head {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      width: 100%;
      padding: 0.85rem 0.95rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #e3f2fd;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.92rem;
      cursor: pointer;
      text-align: inherit;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar-nav-group--open .sidebar-nav-group__head,
    .sidebar-nav-group--section-active .sidebar-nav-group__head {
      background: #0a3d91;
      color: #ffffff;
      box-shadow: none;
    }

    .sidebar-nav-group__head:hover {
      background: #1565c0;
      color: #ffffff;
    }

    .sidebar-nav-group__chevron {
      width: 14px;
      font-size: 0.72rem;
      opacity: 0.85;
      flex-shrink: 0;
      margin-inline-start: auto;
    }

    .sidebar-nav-group__main-icon {
      width: 26px;
      font-size: 1.15rem;
      flex-shrink: 0;
      text-align: center;
    }

    .sidebar-nav-group__tree {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      margin: 0.1rem 0 0.2rem;
      padding: 0;
      padding-inline-start: 0.65rem;
      border: none;
      border-inline-start: 2px solid #42a5f5;
    }

    .sidebar-nav-group__link {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.58rem 0.65rem;
      color: #bbdefb;
      text-decoration: none;
      border-radius: 8px;
      font-size: 0.86rem;
      font-weight: 500;
      border: none;
      background: transparent;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar-nav-group__link::before {
      content: none;
    }

    .sidebar-nav-group__link i {
      width: 22px;
      font-size: 0.95rem;
      flex-shrink: 0;
      text-align: center;
      color: inherit;
      opacity: 1;
    }

    .sidebar-nav-group__link:hover,
    .sidebar-nav-group__link.active {
      color: #ffffff;
      font-weight: 600;
      background: #1565c0;
      box-shadow: none;
    }

    .sidebar-nav-group__link--nested {
      margin-inline-start: 0.85rem;
      padding-inline-start: 0.5rem;
      font-size: 0.82rem;
      opacity: 0.92;
    }

    .sidebar-nav-group__link--nested::before {
      width: 0.4rem;
      inset-inline-end: -0.65rem;
    }

    .sidebar-nav-group__link--nested:hover,
    .sidebar-nav-group__link--nested.active {
      opacity: 1;
    }

    .sidebar-nav-subgroup {
      display: flex;
      flex-direction: column;
      gap: 0.08rem;
      margin-bottom: 0.15rem;
    }

    .sidebar-nav-subgroup--active > .sidebar-nav-subgroup__head {
      color: #ffffff;
      background: rgba(21, 101, 192, 0.35);
    }

    .sidebar-nav-subgroup__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.52rem 0.6rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #90caf9;
      font-family: inherit;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      text-align: inherit;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar-nav-subgroup__head:hover {
      color: #ffffff;
      background: rgba(21, 101, 192, 0.25);
    }

    .sidebar-nav-subgroup__head .sidebar-nav-group__chevron {
      margin-inline-start: auto;
      font-size: 0.7rem;
    }

    .sidebar-nav-subgroup__head .nav-icon-svg--hotel,
    .sidebar-nav-subgroup__head .nav-icon-svg--settings,
    .sidebar-nav-subgroup__head .nav-icon-svg--user-cog {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      color: rgba(255, 255, 255, 0.92);
    }

    .sidebar-nav-subgroup__head .nav-icon-svg--user-cog circle,
    .sidebar-nav-subgroup__head .nav-icon-svg--user-cog path,
    .sidebar-nav-group__link .nav-icon-svg--user-plus circle,
    .sidebar-nav-group__link .nav-icon-svg--user-plus path {
      fill: none;
      stroke: currentColor;
    }

    .sidebar-nav-subgroup__tree {
      display: flex;
      flex-direction: column;
      gap: 0.06rem;
      padding-inline-start: 0.35rem;
      margin-inline-start: 0.5rem;
      border-inline-start: 2px solid rgba(66, 165, 245, 0.45);
    }

    @media (min-width: 901px) {
      .app-sidebar--collapsed .sidebar-nav-group__tree {
        display: none !important;
      }

      .app-sidebar--collapsed .sidebar-nav-group__head {
        justify-content: center;
        gap: 0;
        padding-inline: 0.55rem;
      }

      .app-sidebar--collapsed .sidebar-nav-group__chevron {
        display: none;
      }

      .app-sidebar--collapsed .sidebar-nav-group--flyout-active .sidebar-nav-group__head {
        background: #0a3d91;
        color: #ffffff;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
      }
    }

    /* قائمة منبثقة عند طي الشريط — fixed فوق المحتوى بجانب الأيقونة */
    .sidebar-nav-flyout {
      position: fixed;
      z-index: 200;
      width: 272px;
      max-height: min(72vh, 520px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background:
        radial-gradient(120% 70% at 100% 0%, rgba(66, 165, 245, 0.35), transparent 55%),
        radial-gradient(90% 60% at 0% 100%, rgba(13, 71, 161, 0.5), transparent 50%),
        linear-gradient(185deg, #1976d2 0%, #1565c0 42%, #0d47a1 100%);
      box-shadow:
        4px 0 32px rgba(13, 71, 161, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      pointer-events: auto;
      animation: sidebar-flyout-in 0.18s ease-out;
    }

    @keyframes sidebar-flyout-in {
      from {
        opacity: 0;
        transform: translateX(12px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (max-width: 900px) {
      .sidebar-nav-flyout {
        display: none !important;
      }
    }

    .sidebar-nav-flyout__head {
      flex-shrink: 0;
      padding: 0.85rem 1rem 0.7rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    }

    .sidebar-nav-flyout__title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.01em;
      line-height: 1.35;
    }

    .sidebar-nav-flyout__body {
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      padding: 0.55rem 0.5rem 0.7rem;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
    }

    .sidebar-nav-flyout__section {
      margin: 0.35rem 0.5rem 0.2rem;
      padding: 0;
      font-size: 0.68rem;
      font-weight: 700;
      color: rgba(227, 242, 253, 0.75);
      letter-spacing: 0.02em;
    }

    .sidebar-nav-flyout__section--divider {
      margin-top: 0.55rem;
      padding-top: 0.45rem;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .sidebar-nav-flyout__link {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.65rem;
      width: 100%;
      padding: 0.62rem 0.75rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #e3f2fd;
      text-decoration: none;
      font-family: inherit;
      font-size: 0.86rem;
      font-weight: 600;
      text-align: inherit;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar-nav-flyout__link span {
      flex: 1;
      min-width: 0;
      text-align: start;
      line-height: 1.3;
    }

    .sidebar-nav-flyout__link:hover,
    .sidebar-nav-flyout__link.active {
      background: #1565c0;
      color: #ffffff;
    }

    .sidebar-nav-flyout__link.active {
      background: #0a3d91;
      box-shadow: inset 3px 0 0 #42a5f5;
    }

    .sidebar-nav-flyout__icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      color: #bbdefb;
    }

    .sidebar-nav-flyout__link:hover .sidebar-nav-flyout__icon,
    .sidebar-nav-flyout__link.active .sidebar-nav-flyout__icon,
    .sidebar-nav-flyout__link:hover .sidebar-nav-flyout__icon-fa,
    .sidebar-nav-flyout__link.active .sidebar-nav-flyout__icon-fa {
      color: #ffffff;
    }

    .sidebar-nav-flyout .nav-icon-svg path {
      fill: none !important;
      stroke: currentColor;
      stroke-width: 1.75;
    }

    .sidebar-nav-flyout__icon-fa {
      width: 22px;
      font-size: 0.95rem;
      flex-shrink: 0;
      text-align: center;
      color: #bbdefb;
    }

    .sidebar-nav a,
    .sidebar-nav-group__head,
    .sidebar-nav-group__link {
      flex-direction: row;
    }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      color: #e3f2fd;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 500;
      border: none;
      background: transparent;
      box-shadow: none;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar-nav a:hover,
    .sidebar-nav a.active {
      color: #ffffff;
      font-weight: 600;
      background: #1565c0;
      border: none;
      box-shadow: none;
    }

    .sidebar-nav a.active {
      background: #0a3d91;
    }

    .sidebar-nav i {
      width: 26px;
      font-size: 1.28rem;
      line-height: 1;
      flex-shrink: 0;
      color: inherit;
      text-align: center;
    }

    .nav-icon-defs {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }

    .sidebar-nav .nav-icon-svg {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      filter: none;
    }

    .sidebar-nav .nav-icon-svg path {
      fill: url(#navIconGrad);
    }

    .sidebar-nav a.active .nav-icon-svg {
      filter: none;
    }

    .sidebar-nav .nav-icon-svg--bookings {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      color: rgba(255, 255, 255, 0.92);
    }

    .sidebar-nav-group__head .nav-icon-svg--bookings {
      width: 26px;
      height: 26px;
    }

    .sidebar-nav-group__link.active .nav-icon-svg--bookings,
    .sidebar-nav-group--section-active .sidebar-nav-group__head .nav-icon-svg--bookings {
      color: #ffffff;
    }

    .sidebar-lang-mobile {
      display: none;
    }

    .utility-edge-icon {
      width: 1.15rem;
      height: 1.15rem;
      color: currentColor;
    }

    .utility-rail-header {
      padding: 0.35rem 0.5rem 0.65rem;
      border-bottom: 1px solid rgba(21, 101, 192, 0.1);
      margin-bottom: 0.35rem;
    }

    .utility-rail-header__title {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 800;
      color: #0d47a1;
      letter-spacing: 0.01em;
    }

    .utility-quick-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.35rem;
      padding: 0 0.35rem 0.65rem;
      margin-bottom: 0.25rem;
    }

    .utility-quick-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      aspect-ratio: 1;
      border: 1px solid rgba(21, 101, 192, 0.14);
      border-radius: 14px;
      background: linear-gradient(165deg, #ffffff 0%, #f0f7ff 100%);
      color: #1565c0;
      cursor: pointer;
      transition:
        background 0.16s ease,
        border-color 0.16s ease,
        box-shadow 0.16s ease,
        transform 0.12s ease;
    }

    .utility-quick-btn:hover {
      border-color: rgba(25, 118, 210, 0.35);
      box-shadow: 0 4px 14px rgba(21, 101, 192, 0.12);
      transform: translateY(-1px);
    }

    .utility-quick-btn--active {
      background: linear-gradient(165deg, #e3f2fd 0%, #ffffff 100%);
      border-color: #1976d2;
      box-shadow: inset 0 0 0 1px rgba(25, 118, 210, 0.15);
    }

    .utility-quick-btn__svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    .utility-quick-btn__badge {
      position: absolute;
      top: 4px;
      inset-inline-start: 4px;
      min-width: 1rem;
      height: 1rem;
      padding: 0 0.2rem;
      border-radius: 999px;
      background: #e53935;
      color: #fff;
      font-size: 0.58rem;
      font-weight: 800;
      line-height: 1rem;
      text-align: center;
    }

    .account-rail-group__main-icon--svg {
      width: 1.35rem;
      height: 1.35rem;
      flex-shrink: 0;
      color: #1565c0;
    }

    .account-rail-group__link-icon {
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      color: #1976d2;
    }

    .account-rail-group__link-icon-fa {
      width: 1.1rem;
      text-align: center;
      flex-shrink: 0;
      color: #1976d2;
    }

    .account-rail-lang-hint {
      margin: 0 0.5rem 0.35rem;
      font-size: 0.68rem;
      color: #5c6bc0;
      font-weight: 600;
    }

    .app-search-overlay {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 8vh 1rem 2rem;
      background: rgba(13, 27, 42, 0.45);
      backdrop-filter: blur(4px);
    }

    .app-search-modal {
      width: min(640px, 100%);
      background: #ffffff;
      border-radius: 20px;
      box-shadow:
        0 24px 64px rgba(15, 23, 42, 0.2),
        0 0 0 1px rgba(21, 101, 192, 0.08);
      overflow: hidden;
    }

    .app-search-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e8edf3;
    }

    .app-search-bar__icon {
      width: 1.35rem;
      height: 1.35rem;
      flex-shrink: 0;
      color: #90a4ae;
    }

    .app-search-bar__input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      font-size: 1.05rem;
      font-family: inherit;
      color: #1a237e;
      background: transparent;
    }

    .app-search-bar__input::placeholder {
      color: #b0bec5;
    }

    .app-search-bar__esc {
      flex-shrink: 0;
      padding: 0.2rem 0.45rem;
      border-radius: 6px;
      border: 1px solid #e0e6ed;
      background: #f5f7fa;
      color: #78909c;
      font-size: 0.68rem;
      font-family: inherit;
      line-height: 1.2;
    }

    .app-search-results {
      list-style: none;
      margin: 0;
      padding: 0.35rem 0;
      max-height: min(52vh, 420px);
      overflow-y: auto;
    }

    .app-search-result {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      border-bottom: 1px solid #f0f3f7;
      background: transparent;
      cursor: pointer;
      text-align: inherit;
      font-family: inherit;
      transition: background 0.12s ease;
    }

    .app-search-result:hover {
      background: #f5f9ff;
    }

    .app-search-result__text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
      text-align: start;
    }

    .app-search-result__title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #1a237e;
    }

    .app-search-result__crumb {
      font-size: 0.72rem;
      color: #90a4ae;
      direction: ltr;
      text-align: start;
    }

    .app-search-result__tag {
      flex-shrink: 0;
      padding: 0.2rem 0.55rem;
      border-radius: 8px;
      background: #e8f4fd;
      color: #1565c0;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .app-search-empty {
      margin: 0;
      padding: 1.25rem 1rem;
      text-align: center;
      color: #90a4ae;
      font-size: 0.85rem;
    }

    .app-main-column {
      flex: 1;
      min-width: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--app-bg);
    }

    .app-content {
      flex: 1;
      min-width: 0;
      min-height: 0;
      background: var(--app-bg);
    }

    @media (max-width: 900px) {
      .app-shell {
        flex-direction: column;
      }

      .app-sidebar {
        position: relative;
        width: auto;
        height: auto;
        border-start-end-radius: 14px;
        border-end-end-radius: 14px;
        border-inline-end: 1px solid var(--app-border);
        box-shadow: var(--app-shadow);
      }

      .app-sidebar::before {
        opacity: 0.45;
        top: 12px;
        bottom: 12px;
      }

      .sidebar-edge-toggle,
      .app-lang-rail {
        display: none;
      }

      .app-sidebar .sidebar-lang-mobile {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid rgba(255, 255, 255, 0.18);
      }

      .sidebar-lang-mobile__pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.55rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.12);
        color: #fff;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      }

      .sidebar-lang-mobile__pill--active {
        background: rgba(255, 255, 255, 0.18);
        border-color: rgba(255, 255, 255, 0.4);
      }

      .sidebar-lang-mobile__flag {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      }

      .app-sidebar--collapsed {
        width: auto !important;
        padding: 1.25rem !important;
      }

      .app-sidebar--collapsed .brand-text,
      .app-sidebar--collapsed .sidebar-nav-label {
        opacity: 1 !important;
        max-width: none !important;
        overflow: visible !important;
        pointer-events: auto !important;
      }

      .app-sidebar--collapsed .sidebar-nav a {
        justify-content: flex-start !important;
        gap: 0.75rem !important;
      }

      .app-sidebar--collapsed .sidebar-brand {
        justify-content: flex-start !important;
      }

      .sidebar-nav {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .brand-title {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .brand-logo-frame {
        margin-inline-end: 0.25rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .brand-pen-stroke--glow,
      .brand-pen-stroke--main {
        animation: none !important;
        stroke-dasharray: none !important;
        stroke-dashoffset: 0 !important;
      }
    }
  `,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    AccountLocaleEditorComponent,
    AppTopBarComponent,
    UiMessagesComponent,
  ],
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly ui = inject(UiTranslationsService);
  readonly notifications = inject(SystemNotificationsService);
  private readonly hotelBranding = inject(HotelBrandingStoreService);
  private readonly hotelSystemSettings = inject(HotelSystemSettingsLoader);

  readonly localeOptions: ReadonlyArray<{
    code: AppUiLocale;
    flagSrc: string;
    labelKey: 'localeAr' | 'localeFr' | 'localeId' | 'localeTr' | 'localeZh';
  }> = [
    { code: 'ar', flagSrc: 'assets/flags/sa.svg', labelKey: 'localeAr' },
    { code: 'fr', flagSrc: 'assets/flags/fr.svg', labelKey: 'localeFr' },
    { code: 'id', flagSrc: 'assets/flags/id.svg', labelKey: 'localeId' },
    { code: 'tr', flagSrc: 'assets/flags/tr.svg', labelKey: 'localeTr' },
    { code: 'zh-Hans', flagSrc: 'assets/flags/cn.svg', labelKey: 'localeZh' },
  ];

  /**
   * مسار إغلاق لحلقة حول الشعار: موجة على نصف القطر (خط متعرّج يشبه حركة القلم).
   */
  readonly brandPenRingPath =
    'M 88.371,53.076 L 89.179,55.739 L 89.374,58.429 L 88.834,61.014 L 87.567,63.365 L 85.712,65.405 L 83.498,67.130 L 81.195,68.621 L 79.043,70.023 L 77.205,71.511 L 75.730,73.236 L 74.553,75.278 L 73.520,77.620 L 72.433,80.133 L 71.107,82.606 L 69.416,84.789 L 67.321,86.450 L 64.873,87.437 L 62.193,87.714 L 59.434,87.376 L 56.734,86.631 L 54.178,85.750 L 51.783,85.007 L 49.496,84.613 L 47.221,84.665 L 44.855,85.122 L 42.332,85.819 L 39.647,86.504 L 36.872,86.900 L 34.139,86.769 L 31.607,85.967 L 29.420,84.478 L 27.658,82.407 L 26.315,79.954 L 25.289,77.363 L 24.404,74.862 L 23.451,72.608 L 22.246,70.662 L 20.678,68.981 L 18.750,67.441 L 16.582,65.880 L 14.393,64.146 L 12.452,62.139 L 11.019,59.839 L 10.277,57.302 L 10.292,54.641 L 10.995,51.987 L 12.191,49.450 L 13.611,47.083 L 14.971,44.869 L 16.036,42.729 L 16.680,40.550 L 16.906,38.226 L 16.846,35.698 L 16.722,32.983 L 16.795,30.180 L 17.296,27.453 L 18.374,24.993 L 20.068,22.970 L 22.297,21.479 L 24.894,20.518 L 27.646,19.973 L 30.351,19.646 L 32.865,19.298 L 35.131,18.709 L 37.183,17.736 L 39.121,16.351 L 41.079,14.657 L 43.174,12.867 L 45.472,11.257 L 47.968,10.104 L 50.588,9.621 L 53.215,9.904 L 55.726,10.914 L 58.032,12.481 L 60.111,14.350 L 62.011,16.239 L 63.846,17.903 L 65.754,19.192 L 67.861,20.079 L 70.228,20.659 L 72.833,21.123 L 75.556,21.701 L 78.203,22.606 L 80.553,23.983 L 82.405,25.875 L 83.638,28.225 L 84.241,30.890 L 84.323,33.690 L 84.094,36.456 L 83.815,39.067 L 83.738,41.484 L 84.041,43.742 L 84.785,45.934 L 85.898,48.171 L 87.183,50.541 L 88.371,53.076 Z';

  /** طي شريط التنقل إلى أيقونات فقط؛ يُحفظ في localStorage */
  navRailCollapsed = false;

  /** قائمة منبثقة بجانب الأيقونة عند طي الشريط */
  collapsedNavFlyout: 'bookings' | 'frontDesk' | 'settings' | 'reports' | null = null;
  flyoutTop = 0;
  flyoutLeft = 0;
  private readonly flyoutPanelWidth = 272;
  private flyoutSuppressCloseUntil = 0;

  /** إغلاق شريط اللغة بالكامل (الزر الأزرق في المنتصف يفتحه/يغلقه) */
  langRailClosed = false;

  /** قائمة المساعدة (يسار الشاشة): الإشعارات فقط */
  notificationsOpen = false;

  searchOverlayOpen = false;
  searchQuery = '';

  accountJsonEditorOpen = false;

  /** اختيار اللغة في الشريط الجانبي على الجوال */
  langPickerOpen = false;

  /** قائمة الحجوزات القابلة للطي في الشريط الجانبي */
  bookingsNavOpen = false;
  /** قائمة «إضافة» في شريط الحجوزات: حجز جديد / تسكين مباشر */
  addBookingNavOpen = false;

  /** المكاتب الأمامية — منفصلة عن الحجوزات */
  frontDeskNavOpen = false;

  /** قائمة الإعدادات القابلة للطي (نفس أسلوب الحجوزات) */
  settingsNavOpen = false;

  /** إدارة الفندق — معلومات، غرف، دفع، هوية، نزلاء، عملة */
  hotelMgmtNavOpen = false;

  /** تهيئة النظام — ترميزات عامة */
  systemSetupNavOpen = false;

  /** إدارة المستخدمين */
  userMgmtNavOpen = false;

  readonly settingsSystemSetupItems: ReadonlyArray<{
    path: string;
    tab: 'translations' | 'uiTranslations';
    labelKey: string;
    icon: string;
    linkActive: { exact: boolean; queryParams: 'exact' | 'ignored' };
  }> = [
    {
      path: '/settings',
      tab: 'translations',
      labelKey: 'tabGeneralCodings',
      icon: 'svg-language',
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/settings',
      tab: 'uiTranslations',
      labelKey: 'tabUiTranslations',
      icon: 'svg-language',
      linkActive: { exact: true, queryParams: 'exact' },
    },
  ];

  readonly settingsUserMgmtItems: ReadonlyArray<{
    path: string;
    tab: 'users';
    labelKey: string;
    icon: string;
    linkActive: { exact: boolean; queryParams: 'exact' | 'ignored' };
  }> = [
    {
      path: '/settings',
      tab: 'users',
      labelKey: 'tabUsers',
      icon: 'svg-user-plus',
      linkActive: { exact: true, queryParams: 'exact' },
    },
  ];

  readonly settingsHotelMgmtItems: ReadonlyArray<{
    path: string;
    tab: 'general' | 'layout' | 'payments' | 'identities' | 'guests' | 'currency';
    labelKey: string;
    icon: string;
    linkActive: { exact: boolean; queryParams: 'exact' | 'ignored' };
  }> = [
    {
      path: '/settings',
      tab: 'general',
      labelKey: 'tabGeneral',
      icon: 'svg-info',
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/settings',
      tab: 'layout',
      labelKey: 'tabRoomsFloors',
      icon: 'svg-layout',
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/settings',
      tab: 'payments',
      labelKey: 'tabPayments',
      icon: 'svg-payments',
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/settings',
      tab: 'identities',
      labelKey: 'tabIdentities',
      icon: 'svg-identities',
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/settings',
      tab: 'guests',
      labelKey: 'tabGuests',
      icon: 'svg-guests',
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/settings',
      tab: 'currency',
      labelKey: 'tabCurrency',
      icon: 'svg-currency',
      linkActive: { exact: true, queryParams: 'exact' },
    },
  ];

  readonly settingsEditorItem = {
    labelChrome: 'settingsMenuUiTranslation' as const,
    icon: 'svg-language',
  };

  readonly bookingsAddNavItems: ReadonlyArray<{
    id: 'newBooking' | 'walkIn';
    path: string;
    labelKey: string;
    icon: string;
    queryParams?: Record<string, string>;
  }> = [
    {
      id: 'newBooking',
      path: '/booking',
      labelKey: 'navNewBooking',
      icon: 'svg-add',
      queryParams: {},
    },
    {
      id: 'walkIn',
      path: '/booking',
      labelKey: 'navWalkInCheckIn',
      icon: 'fa-door-open',
      queryParams: { mode: 'checkIn', walkIn: '1' },
    },
  ];

  readonly bookingsNavItems: ReadonlyArray<{
    path: string;
    labelKey: string;
    icon: string;
    queryParams?: Record<string, string>;
    linkActive: { exact: boolean; queryParams: 'exact' | 'ignored' };
  }> = [
    {
      path: '/bookings',
      labelKey: 'bookingsHub',
      icon: 'svg-bookings',
      queryParams: { view: 'records' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/rooms',
      labelKey: 'rooms',
      icon: 'svg-rooms',
      linkActive: { exact: false, queryParams: 'ignored' },
    },
    {
      path: '/database',
      labelKey: 'database',
      icon: 'svg-database',
      linkActive: { exact: true, queryParams: 'ignored' },
    },
  ];

  readonly frontDeskNavItems: ReadonlyArray<{
    path: string;
    labelKey: string;
    icon: string;
    queryParams?: Record<string, string>;
    linkActive: { exact: boolean; queryParams: 'exact' | 'ignored' };
  }> = [
    {
      path: '/front-desk',
      labelKey: 'navArriving',
      icon: 'svg-arriving',
      queryParams: { pmsTab: 'arriving' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/front-desk',
      labelKey: 'navResidents',
      icon: 'svg-staying',
      queryParams: { pmsTab: 'staying' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/front-desk',
      labelKey: 'navDeparting',
      icon: 'svg-departing',
      queryParams: { pmsTab: 'departing' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
  ];

  /** قائمة التقارير القابلة للطي */
  reportsNavOpen = false;

  readonly reportsNavItems: ReadonlyArray<{
    path: string;
    labelKey: string;
    icon: string;
    queryParams?: Record<string, string>;
    linkActive: { exact: boolean; queryParams: 'exact' | 'ignored' };
  }> = [
    {
      path: '/reports',
      labelKey: 'navReportStayingList',
      icon: 'svg-staying',
      queryParams: { report: 'staying' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/reports',
      labelKey: 'navReportStayingSummary',
      icon: 'svg-payments',
      queryParams: { report: 'staying-summary' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/reports',
      labelKey: 'navReportDeparting',
      icon: 'svg-departing',
      queryParams: { report: 'departing' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/reports',
      labelKey: 'navReportBookings',
      icon: 'svg-bookings',
      queryParams: { report: 'bookings' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/reports',
      labelKey: 'navReportCancelled',
      icon: 'svg-cancelled',
      queryParams: { report: 'cancelled' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
    {
      path: '/reports',
      labelKey: 'navReportNoShow',
      icon: 'svg-no-show',
      queryParams: { report: 'no_show' },
      linkActive: { exact: true, queryParams: 'exact' },
    },
  ];

  private readonly bookingsNavStorageKey = 'hotelBookingsNavOpen';
  private readonly frontDeskNavStorageKey = 'hotelFrontDeskNavOpen';
  private readonly settingsNavStorageKey = 'hotelSettingsNavOpen';

  private readonly navRailStorageKey = 'hotelNavRailCollapsed';
  private readonly langRailStorageKey = 'hotelLangRailCollapsed';

  /** حركة خط القلم حول الشعار — تُفعَّل فقط مع «العرض المطوّر» في لوحة التحكم */
  dashboardPenMotion = false;

  /** الاسم الظاهر في الشريط */
  hotelDisplayName = 'فندق مضياف العرب';
  /** صورة من الإعدادات (data URL) */
  hotelImageSrc: string | null = null;

  get bookingsSectionActive(): boolean {
    return this.isBookingsSectionUrl(this.router.url);
  }

  get addBookingSectionActive(): boolean {
    const path = (this.router.url.split('?')[0] || '').replace(/\/$/, '') || '/';
    return path === '/booking' || path.startsWith('/booking/');
  }

  toggleAddBookingNav(): void {
    this.addBookingNavOpen = !this.addBookingNavOpen;
    this.cdr.markForCheck();
  }

  isBookingsAddNavItemActive(item: (typeof this.bookingsAddNavItems)[number]): boolean {
    if (!this.addBookingSectionActive) {
      return false;
    }
    const q = this.router.parseUrl(this.router.url).queryParams;
    const walkIn = q['walkIn'] === '1' || q['walkIn'] === 'true';
    if (item.id === 'walkIn') {
      return q['mode'] === 'checkIn' && walkIn;
    }
    return !(q['mode'] === 'checkIn' && walkIn);
  }

  onBookingsAddNavClick(item: (typeof this.bookingsAddNavItems)[number], event?: Event): void {
    if (item.id === 'walkIn' || item.id === 'newBooking') {
      try {
        sessionStorage.removeItem(CHECKIN_BOOKING_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    if (item.id === 'newBooking') {
      event?.preventDefault();
      void this.router.navigate(['/booking'], { queryParams: {}, replaceUrl: true });
    }
    this.addBookingNavOpen = true;
  }

  get frontDeskSectionActive(): boolean {
    return this.isFrontDeskSectionUrl(this.router.url);
  }

  get settingsSectionActive(): boolean {
    return this.router.url.startsWith('/settings');
  }

  get hotelMgmtSectionActive(): boolean {
    return this.isHotelMgmtSettingsTab(this.settingsTabFromUrl(this.router.url));
  }

  get systemSetupSectionActive(): boolean {
    const tab = this.settingsTabFromUrl(this.router.url);
    return tab === 'translations' || tab === 'uiTranslations';
  }

  get userMgmtSectionActive(): boolean {
    return this.settingsTabFromUrl(this.router.url) === 'users';
  }

  get reportsSectionActive(): boolean {
    return this.isReportsSectionUrl(this.router.url);
  }

  get isDashboardUrl(): boolean {
    const path = (this.router.url.split('?')[0] || '').replace(/\/$/, '') || '/';
    return path === '/dashboard' || path === '/' || path.startsWith('/dashboard/');
  }

  ngOnInit(): void {
    this.restoreNavRail();
    this.restoreLangRail();
    this.syncSidebarNavForUrl(this.router.url);
    this.loadHotelBranding();
    this.syncDashboardPenMotion();
    this.ui.fetchFromBackend();

    // الشريط الجانبي خارج signal()-linked template؛ نفرض إعادة الرسم بعد تبديل اللغة/الترجمات.
    fromEvent(window, 'hotelUiLocaleChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadHotelBranding();
        this.cdr.markForCheck();
      });

    fromEvent(window, 'hotelUiTranslationsUpdated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());

    fromEvent(window, 'hotelSystemNotificationsChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());

    fromEvent(window, DASHBOARD_VIEW_MODE_CHANGED_EVENT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncDashboardPenMotion());

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.loadHotelBranding();
        this.syncSidebarNavForUrl(e.urlAfterRedirects);
        this.closeCollapsedNavFlyout();
        this.cdr.markForCheck();
      });

    fromEvent(window, 'hotelSettingsUpdated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadHotelBranding());

    fromEvent(window, 'focus')
      .pipe(throttleTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadHotelBranding());

    fromEvent<StorageEvent>(window, 'storage')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ev) => {
        if (ev.key === 'hotelSettings' || ev.key === null) {
          this.loadHotelBranding();
        }
        if (ev.key === DASHBOARD_VIEW_MODE_STORAGE_KEY || ev.key === null) {
          this.syncDashboardPenMotion();
        }
      });
  }

  private syncDashboardPenMotion(): void {
    this.dashboardPenMotion = readDashboardAdvancedEnabled();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.searchOverlayOpen) {
        event.preventDefault();
        this.closeSearchOverlay();
        return;
      }
      if (this.collapsedNavFlyout) {
        event.preventDefault();
        this.closeCollapsedNavFlyout();
        this.cdr.markForCheck();
        return;
      }
    }
    const isMod = event.ctrlKey || event.metaKey;
    if (event.key === 'F3') {
      const target = event.target as HTMLElement | null;
      if (target && this.isSidebarTypingTarget(target)) {
        return;
      }
      event.preventDefault();
      if (this.searchOverlayOpen) {
        this.closeSearchOverlay();
      } else {
        this.openSearchOverlay();
      }
      return;
    }
    if (isMod && (event.key === 'k' || event.key === 'K')) {
      const target = event.target as HTMLElement | null;
      if (target && this.isSidebarTypingTarget(target)) {
        return;
      }
      event.preventDefault();
      if (this.searchOverlayOpen) {
        this.closeSearchOverlay();
      } else {
        this.openSearchOverlay();
      }
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target?.closest('.sidebar-nav')) {
      return;
    }
    if (this.isSidebarTypingTarget(target)) {
      return;
    }

    const key = event.key;
    if (key === 'Enter' && target.classList.contains('sidebar-nav-group__head')) {
      event.preventDefault();
      target.click();
      return;
    }

    if (key !== 'ArrowDown' && key !== 'ArrowUp') {
      return;
    }

    const focusables = this.sidebarNavFocusables();
    if (focusables.length === 0) {
      return;
    }

    event.preventDefault();
    const idx = focusables.indexOf(target);
    const delta = key === 'ArrowDown' ? 1 : -1;
    const nextIdx =
      idx < 0 ? 0 : (idx + delta + focusables.length) % focusables.length;
    focusables[nextIdx]?.focus();
  }

  private isSidebarTypingTarget(el: HTMLElement): boolean {
    const tag = el.tagName?.toLowerCase();
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      el.isContentEditable
    );
  }

  private sidebarNavFocusables(): HTMLElement[] {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) {
      return [];
    }
    return Array.from(
      nav.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    ).filter((el) => el.offsetParent !== null && !el.hasAttribute('hidden'));
  }

  get hotelNameInitial(): string {
    const t = this.hotelDisplayName.trim();
    return t.length > 0 ? t.charAt(0) : 'ف';
  }

  localeOptionLabel(
    labelKey: 'localeAr' | 'localeFr' | 'localeId' | 'localeTr' | 'localeZh',
  ): string {
    return this.ui.screenText('settings', labelKey);
  }

  openAccountJsonEditor(event?: Event): void {
    event?.stopPropagation();
    this.closeSearchOverlay();
    this.accountJsonEditorOpen = true;
    this.openExclusiveSidebarSection('settings');
    this.cdr.markForCheck();
  }

  onAccountLocaleEditorClosed(): void {
    this.accountJsonEditorOpen = false;
    this.syncSidebarNavForUrl(this.router.url);
    this.cdr.markForCheck();
  }

  onAccountLocaleEditorSaved(): void {
    this.accountJsonEditorOpen = false;
    this.syncSidebarNavForUrl(this.router.url);
    this.cdr.markForCheck();
  }

  // NOTE: تم حذف قسم "المساعدة" من قائمة المساعدة.

  private ensureHelpRailOpen(): void {
    if (this.langRailClosed) {
      this.langRailClosed = false;
      try {
        localStorage.setItem(this.langRailStorageKey, '0');
      } catch {
        /* ignore */
      }
    }
  }

  openSearchOverlay(event?: Event): void {
    event?.stopPropagation();
    this.searchOverlayOpen = true;
    this.searchQuery = '';
    this.cdr.markForCheck();
    queueMicrotask(() => {
      const el = document.querySelector<HTMLInputElement>('.app-search-bar__input');
      el?.focus();
    });
  }

  openNotificationsFromTopBar(): void {
    this.ensureHelpRailOpen();
    this.closeAccountRailSections('notifications');
    this.notificationsOpen = true;
    this.cdr.markForCheck();
  }

  closeSearchOverlay(): void {
    if (!this.searchOverlayOpen) {
      return;
    }
    this.searchOverlayOpen = false;
    this.searchQuery = '';
    this.cdr.markForCheck();
  }

  collapseHelpRailAfterNav(): void {
    this.closeSearchOverlay();
    this.cdr.markForCheck();
  }

  navigateFromSearch(item: AppSearchEntry): void {
    this.closeSearchOverlay();
    this.router.navigate(item.pathSegments, item.queryParams ? { queryParams: item.queryParams } : undefined);
  }

  get filteredSearchResults(): AppSearchEntry[] {
    const q = this.searchQuery.trim().toLowerCase();
    const items = this.buildSearchEntries();
    if (!q) {
      return items;
    }
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.breadcrumb.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q)
    );
  }

  private buildSearchEntries(): AppSearchEntry[] {
    const fd = this.ui.sidebarLabel('frontDeskGroup');
    return [
      {
        id: 'dashboard',
        title: this.ui.sidebarLabel('dashboard'),
        breadcrumb: `/ ${this.ui.sidebarLabel('dashboard')}`,
        tag: this.ui.chromeLabel('searchTagSummary'),
        pathSegments: ['/dashboard'],
      },
      {
        id: 'front-desk',
        title: fd,
        breadcrumb: `/ ${fd}`,
        tag: this.ui.chromeLabel('searchTagPage'),
        pathSegments: ['/front-desk'],
        queryParams: { pmsTab: 'staying' },
      },
      {
        id: 'arriving',
        title: this.ui.sidebarLabel('navArriving'),
        breadcrumb: `${fd} / ${this.ui.sidebarLabel('navArriving')}`,
        tag: this.ui.chromeLabel('searchTagFrontDesk'),
        pathSegments: ['/front-desk'],
        queryParams: { pmsTab: 'arriving' },
      },
      {
        id: 'departing',
        title: this.ui.sidebarLabel('navDeparting'),
        breadcrumb: `${fd} / ${this.ui.sidebarLabel('navDeparting')}`,
        tag: this.ui.chromeLabel('searchTagFrontDesk'),
        pathSegments: ['/front-desk'],
        queryParams: { pmsTab: 'departing' },
      },
      {
        id: 'staying',
        title: this.ui.sidebarLabel('navResidents'),
        breadcrumb: `${fd} / ${this.ui.sidebarLabel('navResidents')}`,
        tag: this.ui.chromeLabel('searchTagFrontDesk'),
        pathSegments: ['/front-desk'],
        queryParams: { pmsTab: 'staying' },
      },
      {
        id: 'booking',
        title: this.ui.sidebarLabel('navNewBooking'),
        breadcrumb: `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('navNewBooking')}`,
        tag: this.ui.chromeLabel('searchTagBookings'),
        pathSegments: ['/booking'],
      },
      {
        id: 'bookings',
        title: this.ui.sidebarLabel('bookingsHub'),
        breadcrumb: `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('bookingsHub')}`,
        tag: this.ui.chromeLabel('searchTagBookings'),
        pathSegments: ['/bookings'],
        queryParams: { view: 'records' },
      },
      {
        id: 'rooms',
        title: this.ui.sidebarLabel('rooms'),
        breadcrumb: `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('rooms')}`,
        tag: this.ui.chromeLabel('searchTagRooms'),
        pathSegments: ['/rooms'],
      },
      {
        id: 'database',
        title: this.ui.sidebarLabel('database'),
        breadcrumb: `${this.ui.sidebarLabel('bookingsGroup')} / ${this.ui.sidebarLabel('database')}`,
        tag: this.ui.chromeLabel('searchTagBookings'),
        pathSegments: ['/database'],
      },
      {
        id: 'reports',
        title: this.ui.sidebarLabel('reports'),
        breadcrumb: `/ ${this.ui.sidebarLabel('reports')}`,
        tag: this.ui.chromeLabel('searchTagReports'),
        pathSegments: ['/reports'],
        queryParams: { report: 'bookings' },
      },
      {
        id: 'settings',
        title: this.ui.chromeLabel('helpSettingsLink'),
        breadcrumb: `/ ${this.ui.chromeLabel('helpSettingsLink')}`,
        tag: this.ui.chromeLabel('searchTagPage'),
        pathSegments: ['/settings'],
      },
    ];
  }

  // NOTE: تم حذف قسم "الترجمة" من قائمة المساعدة.

  toggleLangPicker(event: Event): void {
    event.stopPropagation();
    this.langPickerOpen = !this.langPickerOpen;
  }

  toggleNotificationsPanel(event: Event): void {
    event.stopPropagation();
    this.ensureHelpRailOpen();
    const opening = !this.notificationsOpen;
    this.closeAccountRailSections('notifications');
    this.notificationsOpen = opening;
    if (opening) {
      this.notifications.markAllRead();
    }
  }

  /** قسم واحد مفتوح في لوحة المساعدة — عند النقر فقط */
  private closeAccountRailSections(except?: 'notifications'): void {
    if (except !== 'notifications') {
      this.notificationsOpen = false;
    }
  }

  onLocalePillClick(code: AppUiLocale, event?: Event): void {
    event?.stopPropagation();
    if (this.ui.displayLocale() === code) {
      this.langPickerOpen = !this.langPickerOpen;
      this.cdr.markForCheck();
      return;
    }
    this.langPickerOpen = false;
    this.ui.setDisplayLocale(code);
    this.ui.reloadFromBackend(() => this.cdr.markForCheck());
  }

  toggleHotelMgmtNav(): void {
    this.hotelMgmtNavOpen = !this.hotelMgmtNavOpen;
    this.cdr.markForCheck();
  }

  toggleSystemSetupNav(): void {
    this.systemSetupNavOpen = !this.systemSetupNavOpen;
    this.cdr.markForCheck();
  }

  toggleUserMgmtNav(): void {
    this.userMgmtNavOpen = !this.userMgmtNavOpen;
    this.cdr.markForCheck();
  }

  private isHotelMgmtSettingsTab(tab: string): boolean {
    return (
      tab === 'general' ||
      tab === 'layout' ||
      tab === 'payments' ||
      tab === 'identities' ||
      tab === 'guests' ||
      tab === 'currency'
    );
  }

  private syncSettingsSubgroupsForTab(tab: string): void {
    if (tab === 'translations' || tab === 'uiTranslations') {
      this.systemSetupNavOpen = true;
      this.hotelMgmtNavOpen = false;
      this.userMgmtNavOpen = false;
      return;
    }
    if (tab === 'users') {
      this.userMgmtNavOpen = true;
      this.hotelMgmtNavOpen = false;
      this.systemSetupNavOpen = false;
      return;
    }
    if (this.isHotelMgmtSettingsTab(tab)) {
      this.hotelMgmtNavOpen = true;
      this.systemSetupNavOpen = false;
      this.userMgmtNavOpen = false;
    }
  }

  private settingsTabFromUrl(url: string): string {
    const q = url.split('?')[1] || '';
    return new URLSearchParams(q).get('tab')?.trim() || 'general';
  }

  toggleSettingsNav(event?: Event): void {
    event?.stopPropagation();
    if (this.navRailCollapsed) {
      this.toggleCollapsedNavFlyout('settings', event?.currentTarget);
      this.cdr.markForCheck();
      return;
    }
    if (this.settingsNavOpen) {
      this.closeSidebarSection('settings');
    } else {
      this.openExclusiveSidebarSection('settings');
    }
    this.cdr.markForCheck();
  }

  private syncSidebarNavForUrl(url: string): void {
    const path = (url.split('?')[0] || '').replace(/\/$/, '') || '/';
    const onBookings = this.isBookingsSectionUrl(path);
    const onSettings = path === '/settings' || path.startsWith('/settings/');

    if (onSettings || this.accountJsonEditorOpen) {
      this.openExclusiveSidebarSection('settings');
      this.syncSettingsSubgroupsForTab(this.settingsTabFromUrl(url));
      return;
    }
    if (this.isReportsSectionUrl(path)) {
      this.openExclusiveSidebarSection('reports');
      return;
    }
    if (this.isFrontDeskSectionUrl(url)) {
      this.openExclusiveSidebarSection('frontDesk');
      return;
    }
    if (onBookings) {
      this.openExclusiveSidebarSection('bookings');
      const path = (url.split('?')[0] || '').replace(/\/$/, '') || '/';
      this.addBookingNavOpen = path === '/booking' || path.startsWith('/booking/');
      return;
    }
    this.closeAllSidebarSections();
  }

  /** قسم رئيسي واحد مفتوح — يُغلق الباقي عند الفتح */
  private openExclusiveSidebarSection(section: 'bookings' | 'frontDesk' | 'settings' | 'reports'): void {
    this.bookingsNavOpen = section === 'bookings';
    this.frontDeskNavOpen = section === 'frontDesk';
    this.settingsNavOpen = section === 'settings';
    this.reportsNavOpen = section === 'reports';
    if (section !== 'settings') {
      this.hotelMgmtNavOpen = false;
      this.systemSetupNavOpen = false;
    }
    this.persistSidebarSectionOpenState();
  }

  private closeSidebarSection(section: 'bookings' | 'frontDesk' | 'settings' | 'reports'): void {
    if (section === 'bookings') {
      this.bookingsNavOpen = false;
      this.addBookingNavOpen = false;
    } else if (section === 'frontDesk') {
      this.frontDeskNavOpen = false;
    } else if (section === 'settings') {
      this.settingsNavOpen = false;
    } else {
      this.reportsNavOpen = false;
    }
    this.persistSidebarSectionOpenState();
  }

  private closeAllSidebarSections(): void {
    this.bookingsNavOpen = false;
    this.addBookingNavOpen = false;
    this.frontDeskNavOpen = false;
    this.settingsNavOpen = false;
    this.reportsNavOpen = false;
    this.hotelMgmtNavOpen = false;
    this.systemSetupNavOpen = false;
    this.persistSidebarSectionOpenState();
  }

  private persistSidebarSectionOpenState(): void {
    try {
      localStorage.setItem(this.bookingsNavStorageKey, this.bookingsNavOpen ? '1' : '0');
      localStorage.setItem(this.frontDeskNavStorageKey, this.frontDeskNavOpen ? '1' : '0');
      localStorage.setItem(this.settingsNavStorageKey, this.settingsNavOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  toggleReportsNav(event?: Event): void {
    event?.stopPropagation();
    if (this.navRailCollapsed) {
      this.toggleCollapsedNavFlyout('reports', event?.currentTarget);
      this.cdr.markForCheck();
      return;
    }
    if (this.reportsNavOpen) {
      this.closeSidebarSection('reports');
    } else {
      this.openExclusiveSidebarSection('reports');
    }
    this.cdr.markForCheck();
  }

  toggleBookingsNav(event?: Event): void {
    event?.stopPropagation();
    if (this.navRailCollapsed) {
      this.toggleCollapsedNavFlyout('bookings', event?.currentTarget);
      this.cdr.markForCheck();
      return;
    }
    if (this.bookingsNavOpen) {
      this.closeSidebarSection('bookings');
    } else {
      this.openExclusiveSidebarSection('bookings');
    }
    this.cdr.markForCheck();
  }

  toggleFrontDeskNav(event?: Event): void {
    event?.stopPropagation();
    if (this.navRailCollapsed) {
      this.toggleCollapsedNavFlyout('frontDesk', event?.currentTarget);
      this.cdr.markForCheck();
      return;
    }
    if (this.frontDeskNavOpen) {
      this.closeSidebarSection('frontDesk');
    } else {
      this.openExclusiveSidebarSection('frontDesk');
    }
    this.cdr.markForCheck();
  }

  collapsedFlyoutTitle(section: 'bookings' | 'frontDesk' | 'settings' | 'reports'): string {
    switch (section) {
      case 'bookings':
        return this.ui.sidebarLabel('bookingsGroup');
      case 'frontDesk':
        return this.ui.sidebarLabel('frontDeskGroup');
      case 'settings':
        return this.ui.sidebarLabel('settings');
      case 'reports':
        return this.ui.sidebarLabel('reports');
    }
  }

  closeCollapsedNavFlyout(): void {
    this.collapsedNavFlyout = null;
  }

  private toggleCollapsedNavFlyout(
    section: 'bookings' | 'frontDesk' | 'settings' | 'reports',
    anchor?: EventTarget | null,
  ): void {
    if (this.collapsedNavFlyout === section) {
      this.closeCollapsedNavFlyout();
      return;
    }
    this.openCollapsedNavFlyout(section, anchor);
  }

  private openCollapsedNavFlyout(
    section: 'bookings' | 'frontDesk' | 'settings' | 'reports',
    anchor?: EventTarget | null,
  ): void {
    this.flyoutSuppressCloseUntil = Date.now() + 280;
    this.openExclusiveSidebarSection(section);
    this.collapsedNavFlyout = section;
    if (anchor instanceof HTMLElement) {
      this.updateFlyoutPosition(anchor);
    }
  }

  private updateFlyoutPosition(anchorEl: HTMLElement): void {
    const rect = anchorEl.getBoundingClientRect();
    const gap = 12;
    const width = this.flyoutPanelWidth;
    let left = rect.left - width - gap;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const maxH = Math.min(520, window.innerHeight * 0.72);
    let top = rect.top - 6;
    top = Math.max(8, Math.min(top, window.innerHeight - maxH - 8));
    this.flyoutLeft = left;
    this.flyoutTop = top;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClickCloseNavFlyout(event: MouseEvent): void {
    if (!this.navRailCollapsed || !this.collapsedNavFlyout) {
      return;
    }
    if (Date.now() < this.flyoutSuppressCloseUntil) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('.sidebar-nav-flyout') || target.closest('.sidebar-nav-group__head')) {
      return;
    }
    this.closeCollapsedNavFlyout();
    this.cdr.markForCheck();
  }

  toggleNavRail(): void {
    this.navRailCollapsed = !this.navRailCollapsed;
    if (this.navRailCollapsed) {
      this.closeCollapsedNavFlyout();
    }
    try {
      localStorage.setItem(this.navRailStorageKey, this.navRailCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  private isBookingsSectionUrl(url: string): boolean {
    const path = (url.split('?')[0] || '').replace(/\/$/, '') || '/';
    return (
      path === '/booking' ||
      path.startsWith('/booking/') ||
      path === '/bookings' ||
      path.startsWith('/bookings/') ||
      path === '/rooms' ||
      path.startsWith('/rooms/') ||
      path === '/database' ||
      path.startsWith('/database/')
    );
  }

  private isFrontDeskSectionUrl(url: string): boolean {
    const path = (url.split('?')[0] || '').replace(/\/$/, '') || '/';
    return path === '/front-desk' || path.startsWith('/front-desk/');
  }

  private isReportsSectionUrl(url: string): boolean {
    const path = (url.split('?')[0] || '').replace(/\/$/, '') || '/';
    return path === '/reports' || path.startsWith('/reports/');
  }


  toggleLangRail(): void {
    this.langRailClosed = !this.langRailClosed;
    if (this.langRailClosed) {
      this.closeAccountRailSections();
    }
    try {
      localStorage.setItem(this.langRailStorageKey, this.langRailClosed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  private restoreNavRail(): void {
    try {
      this.navRailCollapsed = localStorage.getItem(this.navRailStorageKey) === '1';
    } catch {
      /* ignore */
    }
  }

  private restoreLangRail(): void {
    try {
      this.langRailClosed = localStorage.getItem(this.langRailStorageKey) === '1';
    } catch {
      /* ignore */
    }
  }

  private loadHotelBranding(): void {
    const fallbackName = 'فندق مضياف العرب';
    this.hotelSystemSettings.load().subscribe({
      next: () => {
        const view = this.hotelBranding.brandingView();
        this.hotelDisplayName = view.name || fallbackName;
        this.hotelImageSrc =
          view.imageSrc && view.imageSrc.startsWith('data:image/') ? view.imageSrc : null;
        this.cdr.markForCheck();
      },
      error: () => {
        const view = this.hotelBranding.brandingView();
        this.hotelDisplayName = view.name || fallbackName;
        this.hotelImageSrc = null;
        this.cdr.markForCheck();
      },
    });
  }

  isSvgNavIcon(icon: string): boolean {
    return icon.startsWith('svg-');
  }

  navIconHref(icon: string): string {
    return `#nav-icon-${icon.replace(/^svg-/, '')}`;
  }

  navIconModifier(icon: string): string {
    return `nav-icon-svg--${icon.replace(/^svg-/, '')}`;
  }
}
