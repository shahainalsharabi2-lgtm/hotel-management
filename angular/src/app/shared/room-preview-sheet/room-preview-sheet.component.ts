import { CommonModule } from '@angular/common';
import { LocaleNumberPipe } from '../pipes/locale-number.pipe';
import { Component, EventEmitter, HostListener, inject, Input, Output, SimpleChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Booking } from '../../models/booking.model';
import { Room } from '../../models/room.model';
import { HotelCurrencyService } from '../../services/hotel-currency.service';
import { RoomService } from '../../services/room.service';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { UiMessageService } from '../../services/ui-message.service';
import { GeneralCodesService, type GeneralCodeItem } from '../../general-codes/general-codes.service';
import { bookingCurrencySymbol } from '../../utils/booking-currency';
import { roomCurrencySymbol } from '../../utils/room-currency';
import {
  bookingCheckInYmd,
  bookingCheckOutYmd,
  checkoutCountdownText,
  formatSlashDate,
  formatTime12h,
  guestFullName,
  guestInitial,
} from '../../utils/booking-display.util';
import type { RoomTransferHint } from '../../utils/room-transfer-display.util';

@Component({
  selector: 'app-room-preview-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LocaleNumberPipe],
  templateUrl: './room-preview-sheet.component.html',
  styleUrls: ['./room-preview-sheet.component.css'],
})
export class RoomPreviewSheetComponent {
  readonly ui = inject(UiTranslationsService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly roomService = inject(RoomService);
  private readonly generalCodes = inject(GeneralCodesService);

  @Input() room: Room | null = null;
  @Input() booking: Booking | null = null;
  @Input() transferHint: RoomTransferHint | null = null;
  /** تعديل حالة الغرفة (فارغة / نظيفة / صيانة…) */
  @Input() editableStatus = false;
  @Input() pickRoomMode = false;
  @Input() canPickRoom = false;
  @Output() dismiss = new EventEmitter<void>();
  @Output() roomUpdated = new EventEmitter<Room>();
  @Output() pickRoom = new EventEmitter<Room>();

  statusSaving = false;
  maintenanceReasonOpen = false;
  maintenanceReasonsLoading = false;
  maintenanceReasons: GeneralCodeItem[] = [];
  selectedMaintenanceReason = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['room']) {
      return;
    }
    this.ensureMaintenanceReasonsLoadedForDetails();
  }

  maintenanceReasonDescription(): string | null {
    const r = this.room;
    if (!r || r.status !== 'maintenance') {
      return null;
    }
    const name = (r.maintenanceReason ?? '').trim();
    if (!name) {
      return null;
    }
    const match = this.maintenanceReasons.find((x) => (x.name ?? '').trim() === name);
    const desc = (match?.description ?? '').trim();
    return desc || null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.room) {
      this.close();
    }
  }

  close(): void {
    this.dismiss.emit();
  }

  priceSymbol(r: Room): string {
    return roomCurrencySymbol(r, this.hotelCurrency);
  }

  bookingSymbol(b: Booking): string {
    return bookingCurrencySymbol(b, this.hotelCurrency);
  }

  checkInYmd = bookingCheckInYmd;
  checkOutYmd = bookingCheckOutYmd;
  formatSlashDate = formatSlashDate;
  formatTime12h = formatTime12h;
  guestFullName = guestFullName;
  guestInitial = guestInitial;
  checkoutCountdown = checkoutCountdownText;

  guestNumber(b: Booking): string {
    return (b.invoice_Number || b.id_Number || '—').trim() || '—';
  }

  statusLabel(status: Room['status']): string {
    switch (status) {
      case 'available':
        return this.ui.screenText('roomPreview', 'statusAvailable');
      case 'occupied':
        return this.ui.screenText('roomPreview', 'statusOccupied');
      case 'dirty':
        return this.ui.screenText('roomPreview', 'statusDirty');
      case 'maintenance':
        return this.ui.screenText('roomPreview', 'statusMaintenance');
      case 'suspended':
        return this.ui.screenText('roomPreview', 'statusSuspended');
      default:
        return '—';
    }
  }

  roomTitle(num: string | number | undefined): string {
    return this.ui.screenText('roomPreview', 'roomTitle').replace('{num}', String(num ?? ''));
  }

  transferLine(hint: RoomTransferHint): string {
    if (hint.role === 'from') {
      return this.ui
        .screenText('roomPreview', 'transferredToRoom')
        .replace('{to}', hint.otherRoom);
    }
    return this.ui
      .screenText('roomPreview', 'transferredFromRoom')
      .replace('{from}', hint.otherRoom);
  }

  changeStatus(newStatus: Room['status']): void {
    const r = this.room;
    if (!r || !this.editableStatus || r.status === newStatus || this.statusSaving) {
      return;
    }
    if (newStatus !== 'maintenance') {
      // إذا بدأ المستخدم باختيار صيانة ثم غيّر رأيه، لا نترك واجهة سبب الصيانة ظاهرة
      this.maintenanceReasonOpen = false;
      this.selectedMaintenanceReason = '';
    }
    if (newStatus === 'maintenance') {
      this.openMaintenanceReason();
      return;
    }
    this.statusSaving = true;
    const updated: Room = {
      ...r,
      status: newStatus,
      maintenanceReason: null,
    };
    this.roomService.updateRoom(r.id, updated, {
      kind: 'room_status',
      params: { room: String(r.roomNumber ?? ''), status: newStatus },
    }).subscribe({
      next: () => {
        this.room = updated;
        this.statusSaving = false;
        this.maintenanceReasonOpen = false;
        this.selectedMaintenanceReason = '';
        this.roomUpdated.emit(updated);
      },
      error: (err) => {
        console.error('room preview status update', err);
        this.statusSaving = false;
        this.uiMsg.error(this.ui.screenText('roomPreview', 'statusSaveError'));
      },
    });
  }

  openMaintenanceReason(): void {
    if (!this.room || !this.editableStatus || this.statusSaving) {
      return;
    }
    this.maintenanceReasonOpen = true;
    this.selectedMaintenanceReason = (this.room.maintenanceReason ?? '').trim();
    if (this.maintenanceReasons.length > 0 || this.maintenanceReasonsLoading) {
      return;
    }
    this.maintenanceReasonsLoading = true;
    this.generalCodes.getList('room-maintenance-reasons').subscribe({
      next: (items) => {
        this.maintenanceReasons = items ?? [];
        this.maintenanceReasonsLoading = false;
      },
      error: () => {
        this.maintenanceReasonsLoading = false;
      },
    });
  }

  private ensureMaintenanceReasonsLoadedForDetails(): void {
    const r = this.room;
    if (!r || r.status !== 'maintenance') {
      return;
    }
    if (this.maintenanceReasons.length > 0 || this.maintenanceReasonsLoading) {
      return;
    }
    this.maintenanceReasonsLoading = true;
    this.generalCodes.getList('room-maintenance-reasons').subscribe({
      next: (items) => {
        this.maintenanceReasons = items ?? [];
        this.maintenanceReasonsLoading = false;
      },
      error: () => {
        this.maintenanceReasonsLoading = false;
      },
    });
  }

  saveMaintenanceStatus(): void {
    const r = this.room;
    if (!r || !this.editableStatus || this.statusSaving) {
      return;
    }
    const reason = (this.selectedMaintenanceReason ?? '').trim();
    if (!reason) {
      this.uiMsg.error(this.ui.screenText('roomPreview', 'maintenanceReasonRequired'));
      return;
    }
    this.statusSaving = true;
    const updated: Room = { ...r, status: 'maintenance', maintenanceReason: reason };
    this.roomService.updateRoom(r.id, updated, {
      kind: 'room_status',
      params: { room: String(r.roomNumber ?? ''), status: 'maintenance' },
    }).subscribe({
      next: () => {
        this.room = updated;
        this.statusSaving = false;
        this.maintenanceReasonOpen = false;
        this.roomUpdated.emit(updated);
      },
      error: (err) => {
        console.error('room preview maintenance update', err);
        this.statusSaving = false;
        this.uiMsg.error(this.ui.screenText('roomPreview', 'statusSaveError'));
      },
    });
  }
}
