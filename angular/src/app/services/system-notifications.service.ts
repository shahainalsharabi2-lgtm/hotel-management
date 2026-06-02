import { Injectable, computed, inject, signal } from '@angular/core';
import { UiTranslationsService } from './ui-translations.service';

export type SystemNotificationKind =
  | 'booking_created'
  | 'booking_updated'
  | 'booking_transfer'
  | 'booking_add_guest'
  | 'booking_payment'
  | 'booking_checkout'
  | 'booking_cancelled'
  | 'booking_deleted'
  | 'room_created'
  | 'room_updated'
  | 'room_deleted'
  | 'room_status';

export interface SystemNotificationParams {
  guest?: string;
  room?: string;
  fromRoom?: string;
  toRoom?: string;
  amount?: string;
  status?: string;
}

export interface SystemNotificationInput {
  kind: SystemNotificationKind;
  params?: SystemNotificationParams;
}

export interface SystemNotification extends SystemNotificationInput {
  id: string;
  at: number;
  read: boolean;
}

const STORAGE_KEY = 'hotelSystemNotifications';
const MAX_ITEMS = 80;

const KIND_CHROME_KEY: Record<SystemNotificationKind, string> = {
  booking_created: 'notifyBookingCreated',
  booking_updated: 'notifyBookingUpdated',
  booking_transfer: 'notifyBookingTransfer',
  booking_add_guest: 'notifyBookingAddGuest',
  booking_payment: 'notifyBookingPayment',
  booking_checkout: 'notifyBookingCheckout',
  booking_cancelled: 'notifyBookingCancelled',
  booking_deleted: 'notifyBookingDeleted',
  room_created: 'notifyRoomCreated',
  room_updated: 'notifyRoomUpdated',
  room_deleted: 'notifyRoomDeleted',
  room_status: 'notifyRoomStatus',
};

const KIND_ICON: Record<SystemNotificationKind, string> = {
  booking_created: 'fa-calendar-plus',
  booking_updated: 'fa-pen',
  booking_transfer: 'fa-exchange-alt',
  booking_add_guest: 'fa-user-plus',
  booking_payment: 'fa-coins',
  booking_checkout: 'fa-sign-out-alt',
  booking_cancelled: 'fa-ban',
  booking_deleted: 'fa-trash-alt',
  room_created: 'fa-door-open',
  room_updated: 'fa-bed',
  room_deleted: 'fa-times-circle',
  room_status: 'fa-broom',
};

@Injectable({
  providedIn: 'root',
})
export class SystemNotificationsService {
  private readonly ui = inject(UiTranslationsService);
  private readonly itemsSignal = signal<SystemNotification[]>([]);

  readonly items = this.itemsSignal.asReadonly();
  readonly unreadCount = computed(() => this.itemsSignal().filter((n) => !n.read).length);

  constructor() {
    this.restore();
  }

  record(input: SystemNotificationInput): void {
    const entry: SystemNotification = {
      id: this.newId(),
      at: Date.now(),
      read: false,
      kind: input.kind,
      params: { ...(input.params ?? {}) },
    };
    this.itemsSignal.update((list) => [entry, ...list].slice(0, MAX_ITEMS));
    this.persist();
    window.dispatchEvent(new Event('hotelSystemNotificationsChanged'));
  }

  markAllRead(): void {
    this.itemsSignal.update((list) => list.map((n) => ({ ...n, read: true })));
    this.persist();
    window.dispatchEvent(new Event('hotelSystemNotificationsChanged'));
  }

  clearAll(): void {
    this.itemsSignal.set([]);
    this.persist();
    window.dispatchEvent(new Event('hotelSystemNotificationsChanged'));
  }

  message(n: SystemNotification): string {
    const template = this.ui.chromeLabel(KIND_CHROME_KEY[n.kind]);
    return this.applyParams(template, n.params ?? {});
  }

  iconClass(kind: SystemNotificationKind): string {
    return `fas ${KIND_ICON[kind] ?? 'fa-bell'}`;
  }

  timeLabel(n: SystemNotification): string {
    const diffSec = Math.max(0, Math.floor((Date.now() - n.at) / 1000));
    if (diffSec < 60) {
      return this.ui.chromeLabel('notifyTimeJustNow');
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return this.applyParams(this.ui.chromeLabel('notifyTimeMinutes'), { n: String(diffMin) });
    }
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
      return this.applyParams(this.ui.chromeLabel('notifyTimeHours'), { n: String(diffHr) });
    }
    const diffDay = Math.floor(diffHr / 24);
    return this.applyParams(this.ui.chromeLabel('notifyTimeDays'), { n: String(diffDay) });
  }

  private applyParams(template: string, params: SystemNotificationParams & { n?: string }): string {
    let out = template;
    const map: Record<string, string | undefined> = {
      guest: params.guest,
      room: params.room,
      fromRoom: params.fromRoom,
      toRoom: params.toRoom,
      amount: params.amount,
      status: params.status,
      n: params.n,
    };
    for (const [key, val] of Object.entries(map)) {
      if (val != null) {
        out = out.split(`{${key}}`).join(val);
      }
    }
    return out;
  }

  private newId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    } catch {
      /* ignore */
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as SystemNotification[];
      if (!Array.isArray(parsed)) {
        return;
      }
      this.itemsSignal.set(
        parsed
          .filter((n) => n && typeof n.kind === 'string' && typeof n.at === 'number')
          .slice(0, MAX_ITEMS)
      );
    } catch {
      /* ignore */
    }
  }
}
