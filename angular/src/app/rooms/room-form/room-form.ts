import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Floor } from '../../models/floor.model';
import { Room } from '../../models/room.model';
import { FloorService } from '../../services/floor.service';
import { RoomService } from '../../services/room.service';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { HotelCurrencyService } from '../../services/hotel-currency.service';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';
import { UiMessageService } from '../../services/ui-message.service';
import { roomCurrencySymbol } from '../../utils/room-currency';
import { ROOM_TYPE_STORED_VALUES } from '../../utils/room-type-i18n';

@Component({
  selector: 'app-room-form',
  templateUrl: './room-form.html',
  styleUrl: './room-form.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
})
export class RoomFormComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  private readonly uiMsg = inject(UiMessageService);
  readonly roomTypeOptions = ROOM_TYPE_STORED_VALUES;
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  isEditMode = false;
  roomId: number | null = null;
  room: Room = {
    id: 0,
    roomNumber: '',
    type: 'غرفة عادية',
    status: 'available',
    price: 0,
    floor: 1
  };
  floors: Floor[] = [];
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService,
    private floorService: FloorService
  ) {}

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.loadFloors();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.roomId = +id;
      this.loadRoom(this.roomId);
    }
  }

  loadRoom(id: number): void {
    this.roomService.getRoomById(id).subscribe(data => {
      this.room = data;
    });
  }

  loadFloors(): void {
    this.floorService.getFloors().subscribe({
      next: (floors) => {
        this.floors = floors;
      },
      error: (err) => {
        console.error('Error loading floors', err);
        this.error = 'فشل في تحميل قائمة الطوابق. أضف طوابق أولاً من صفحة الإعدادات.';
      }
    });
  }

  onSubmit(): void {
    if (this.isEditMode && this.roomId) {
      this.roomService.updateRoom(this.roomId, this.room).subscribe({
        next: () => {
          this.uiMsg.success('تم تعديل حالة الغرفة بنجاح');
          this.router.navigate(['/rooms']);
        },
        error: (err) => {
          console.error('Error updating room', err);
          const message = err?.error?.error?.message || err?.message || 'حدث خطأ أثناء تعديل حالة الغرفة';
          this.uiMsg.error(`فشل تعديل حالة الغرفة: ${message}`);
        }
      });
    } else {
      this.roomService.addRoom(this.room).subscribe({
        next: () => {
          this.uiMsg.success('تم إضافة الغرفة الجديدة بنجاح');
          this.router.navigate(['/rooms']);
        },
        error: (err) => {
          console.error('Error adding room', err);
          const message = err?.error?.error?.message || err?.message || 'حدث خطأ أثناء إضافة الغرفة';
          this.uiMsg.error(`فشل إضافة الغرفة: ${message}`);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/rooms']);
  }

  priceCurrencySymbol(): string {
    return roomCurrencySymbol(this.room, this.hotelCurrency);
  }
}
