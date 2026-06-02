export interface Booking {
  id?: number;
  first_Name: string;
  last_Name: string;
  phone_Number: string;
  payment_Amount: number;
  id_Number: string;
  id_Type: string;
  room_Type: string;
  room_Number: string;
  floor?: string;
  booking_Date?: string;
  booking_Time?: string;
  bookingDateTime?: string;
  payment_Method?: string;
  people_Count?: number;
  adults_Count?: number;
  children_Count?: number;
  invoice_Number?: string;
  stay_Days?: number;
  total_Price?: number;
  remaining_Amount?: number;
  status?: string; // 'active', 'reserved', 'checked_out', 'cancelled'
  guest_Notes?: string;
  /** مؤكد / غير مؤكد */
  booking_Confirmed?: boolean;
  /** direct | electronic | company | institution | employee */
  booking_Source?: string;
  /** محفوظ مع الحجز في قاعدة البيانات */
  currencyCode?: string;
  currencySymbol?: string;
  /** من الـ API؛ مفيد لعرض وقت الإلغاء عند الحالة ملغى */
  lastModificationTime?: string;
}
