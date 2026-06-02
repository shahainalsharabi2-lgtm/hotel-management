import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Room } from '../../models/room.model';
import { RoomService } from '../../services/room.service';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { HotelCurrencyService } from '../../services/hotel-currency.service';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';
import { UiMessageService } from '../../services/ui-message.service';
import { roomCurrencySymbol } from '../../utils/room-currency';

@Component({
  selector: 'app-room-details',
  templateUrl: './room-details.html',
  styleUrl: './room-details.css',
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class RoomDetailsComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  room: Room | null = null;
  isLoading = true;
  isSaving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService
  ) { }

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRoom(+id);
    }
  }

  loadRoom(id: number): void {
    this.isLoading = true;
    this.roomService.getRoomById(id).subscribe({
      next: (data) => {
        this.room = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading room details', err);
        this.isLoading = false;
      }
    });
  }

  changeStatus(newStatus: Room['status']): void {
    if (!this.room || this.room.status === newStatus) return;
    this.isSaving = true;
    const updated: Room = { ...this.room, status: newStatus };
    this.roomService.updateRoom(this.room.id, updated).subscribe({
      next: () => {
        this.room = updated;
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error updating room status', err);
        this.isSaving = false;
        this.uiMsg.error('فشل تحديث الحالة، يرجى المحاولة مجدداً');
      }
    });
  }

  priceSymbol(): string {
    return roomCurrencySymbol(this.room, this.hotelCurrency);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'available':
        return this.ui.screenText('roomDetails', 'btnClean');
      case 'occupied':
        return this.ui.screenText('roomDetails', 'statusOccupiedShort');
      case 'dirty':
        return this.ui.screenText('roomDetails', 'btnDirty');
      case 'maintenance':
        return this.ui.screenText('roomDetails', 'btnMaintenance');
      case 'suspended':
        return this.ui.screenText('roomDetails', 'btnSuspended');
      default:
        return status;
    }
  }

  goBack(): void {
    this.router.navigate(['/rooms']);
  }

  goToEdit(): void {
    if (this.room) {
      this.router.navigate(['/rooms/edit', this.room.id]);
    }
  }

  goToBooking(): void {
    if (this.room && this.room.status === 'available') {
      this.router.navigate(['/booking'], { queryParams: { roomNumber: this.room.roomNumber } });
    }
  }
}
