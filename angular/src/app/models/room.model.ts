export interface Room {
  id: number;
  roomNumber: string;
  type: string;
  /** إطلالة الغرفة من المدخلات (room-views) */
  roomView?: string | null;
  status: 'available' | 'occupied' | 'maintenance' | 'dirty' | 'cleaning' | 'suspended';
  maintenanceReason?: string | null;
  price: number;
  floor: number;
  /** محفوظ مع الغرفة في قاعدة البيانات */
  currencyCode?: string;
  currencySymbol?: string;
}
