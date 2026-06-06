/** لغات إضافية في قائمة الواجهة */
export const UI_EXTRA_LOCALES = [
  { code: 'fr', label: 'Français (فرنسية)' },
  { code: 'id', label: 'Bahasa Indonesia (إندونيسية)' },
  { code: 'tr', label: 'Türkçe (تركية)' },
  { code: 'zh-Hans', label: '简体中文 (صينية مبسطة)' },
] as const;

export type UiExtraLocaleCode = (typeof UI_EXTRA_LOCALES)[number]['code'];

export const HOTEL_UI_LOCALE_STORAGE_KEY = 'hotelUiLocale';

/** احتياطي عربي فقط عند فشل تحميل JSON من الخادم */
export const UI_CHROME_KEYS: readonly { key: string; arabic: string }[] = [
  { key: 'navRailExpandTitle', arabic: 'عرض أسماء القائمة' },
  { key: 'navRailCollapseTitle', arabic: 'إخفاء النصوص وطي القائمة' },
  { key: 'navRailExpandAria', arabic: 'توسيع شريط التنقل لعرض أسماء الروابط' },
  { key: 'navRailCollapseAria', arabic: 'طي شريط التنقل إلى أيقونات فقط' },
  { key: 'langPickerLabel', arabic: 'لغة الواجهة' },
  { key: 'langPickerAria', arabic: 'اختيار لغة عرض التطبيق' },
  { key: 'langPickerToggleAria', arabic: 'تغيير لغة الواجهة' },
  { key: 'langPickerOtherLocales', arabic: 'لغات أخرى' },
  { key: 'accountPanelTitle', arabic: 'قائمة المساعدة' },
  { key: 'accountMenuTitle', arabic: 'قائمة المساعدة' },
  { key: 'helpMenuTitle', arabic: 'قائمة المساعدة' },
  { key: 'helpSettingsLink', arabic: 'إعدادات النظام' },
  { key: 'helpSearchLink', arabic: 'بحث في التطبيق' },
  { key: 'searchOverlayPlaceholder', arabic: 'بحث…' },
  { key: 'searchOverlayAria', arabic: 'بحث سريع في صفحات التطبيق' },
  { key: 'searchOverlayEsc', arabic: 'ESC' },
  { key: 'searchTagSummary', arabic: 'ملخص' },
  { key: 'searchTagPage', arabic: 'صفحة' },
  { key: 'searchTagBookings', arabic: 'حجوزات' },
  { key: 'searchTagFrontDesk', arabic: 'مكاتب أمامية' },
  { key: 'searchTagRooms', arabic: 'غرف' },
  { key: 'searchTagReports', arabic: 'تقارير' },
  { key: 'searchOpenTitle', arabic: 'بحث' },
  { key: 'searchOpenAria', arabic: 'فتح البحث السريع' },
  { key: 'accountSettingsLink', arabic: 'إعدادات النظام' },
  { key: 'settingsMenuHotel', arabic: 'إعدادات الفندق' },
  { key: 'settingsMenuUiTranslation', arabic: 'ترجمة واجهة النظام' },
  { key: 'accountLocaleJsonHint', arabic: 'ملف ترجمة اللغة الحالية' },
  { key: 'accountJsonEditorOpen', arabic: 'فتح محرر الترجمة' },
  { key: 'accountJsonEditorTitle', arabic: 'تعديل ترجمة اللغة الحالية' },
  { key: 'accountJsonEditorSave', arabic: 'حفظ' },
  { key: 'accountJsonEditorCancel', arabic: 'إلغاء' },
  { key: 'accountJsonEditorInvalid', arabic: 'صيغة JSON غير صالحة' },
  { key: 'accountJsonEditorSaveFailed', arabic: 'تعذّر الحفظ في ملفات JSON على الخادم' },
  { key: 'notificationsMenuTitle', arabic: 'الإشعارات' },
  { key: 'translationMenuTitle', arabic: 'الترجمة' },
  { key: 'accountPanelAria', arabic: 'قائمة المساعدة: بحث، إشعارات، ترجمة، ومساعدة' },
  { key: 'accountRailOpenTitle', arabic: 'فتح قائمة المساعدة' },
  { key: 'accountRailOpenAria', arabic: 'فتح قائمة المساعدة' },
  { key: 'accountRailCloseTitle', arabic: 'إغلاق' },
  { key: 'accountRailCloseAria', arabic: 'إغلاق قائمة المساعدة' },
  { key: 'notificationsTitle', arabic: 'إشعارات النظام' },
  { key: 'notificationsSubtitle', arabic: 'آخر العمليات والتعديلات' },
  { key: 'langSectionSubtitle', arabic: 'لغة عرض الواجهة' },
  { key: 'notificationsAria', arabic: 'إشعارات عمليات النظام' },
  { key: 'notificationsEmpty', arabic: 'لا توجد عمليات مسجّلة بعد' },
  { key: 'notificationsMarkRead', arabic: 'تعليم كمقروء' },
  { key: 'notificationsClear', arabic: 'مسح الكل' },
  { key: 'notifyBookingCreated', arabic: 'حجز جديد — {guest} — غرفة {room}' },
  { key: 'notifyBookingUpdated', arabic: 'تعديل حجز — {guest} — غرفة {room}' },
  { key: 'notifyBookingTransfer', arabic: 'نقل حجز — {guest} — من {fromRoom} إلى {toRoom}' },
  { key: 'notifyBookingAddGuest', arabic: 'إضافة حجز لنفس النزيل — {guest}' },
  { key: 'notifyBookingPayment', arabic: 'دفعة على حجز — {guest} — {amount}' },
  { key: 'notifyBookingCheckout', arabic: 'تسجيل خروج — {guest} — غرفة {room}' },
  { key: 'notifyBookingCancelled', arabic: 'إلغاء حجز — {guest}' },
  { key: 'notifyBookingDeleted', arabic: 'حذف حجز' },
  { key: 'notifyRoomCreated', arabic: 'غرفة جديدة — {room}' },
  { key: 'notifyRoomUpdated', arabic: 'تحديث غرفة — {room}' },
  { key: 'notifyRoomDeleted', arabic: 'حذف غرفة — {room}' },
  { key: 'notifyRoomStatus', arabic: 'تغيير حالة غرفة — {room} — {status}' },
  { key: 'notifyTimeJustNow', arabic: 'الآن' },
  { key: 'notifyTimeMinutes', arabic: 'منذ {n} د' },
  { key: 'notifyTimeHours', arabic: 'منذ {n} س' },
  { key: 'notifyTimeDays', arabic: 'منذ {n} يوم' },
  { key: 'messageConfirmTitle', arabic: 'تأكيد' },
  { key: 'messageConfirm', arabic: 'نعم' },
  { key: 'messageCancel', arabic: 'إلغاء' },
  { key: 'messageClose', arabic: 'إغلاق' },
  { key: 'toastSavedTitle', arabic: 'تم بنجاح' },
  { key: 'toastSaveFailedTitle', arabic: 'تعذّر الحفظ' },
  { key: 'toastLocaleChangedTitle', arabic: 'تغيير اللغة' },
  { key: 'toastLocaleChanged', arabic: 'تم التبديل إلى {0}' },
  { key: 'toastLocaleCategoryTitle', arabic: 'فئة اللغة العربية' },
  { key: 'toastLocaleCategorySelected', arabic: 'تم اختيار {0}' },
  { key: 'toastCurrencySaved', arabic: 'تم حفظ إعدادات العملة' },
  { key: 'loadingDataHint', arabic: 'جاري تحميل البيانات…' },
  { key: 'loadingSlowHint', arabic: 'يستغرق التحميل وقتاً أطول — قد يكون الخادم في حالة إعداد' },
  { key: 'loadingRefreshBtn', arabic: 'تحديث الصفحة' },
  { key: 'loadingRefreshTitle', arabic: 'إعادة تحميل الصفحة' },
  { key: 'loadingRefreshAria', arabic: 'إعادة تحميل الصفحة لتحديث البيانات' },
];

/** احتياطي عربي فقط للقائمة الجانبية عند غياب JSON */
export const SIDEBAR_NAV_KEYS: readonly { routeKey: string; arabic: string }[] = [
  { routeKey: 'dashboard', arabic: 'الصفحة الرئيسية' },
  { routeKey: 'bookingsGroup', arabic: 'الحجوزات' },
  { routeKey: 'booking', arabic: 'حجز جديد' },
  { routeKey: 'navAddBooking', arabic: 'إضافة' },
  { routeKey: 'navNewBooking', arabic: 'حجز جديد' },
  { routeKey: 'navWalkInCheckIn', arabic: 'تسكين مباشر' },
  { routeKey: 'bookingsHub', arabic: 'الحجوزات' },
  { routeKey: 'frontDeskGroup', arabic: 'المكاتب الأمامية' },
  { routeKey: 'navResidents', arabic: 'المقيمون' },
  { routeKey: 'navDeparting', arabic: 'المغادرون' },
  { routeKey: 'navArriving', arabic: 'القادمون' },
  { routeKey: 'rooms', arabic: 'مخطط التوافير' },
  { routeKey: 'database', arabic: 'مخطط الحجوزات' },
  { routeKey: 'reports', arabic: 'التقارير' },
  { routeKey: 'settings', arabic: 'إعدادات النظام' },
];

/** شاشات تُستبدَل ترجماتها العربية دائماً من ملفات assets المدمجة مع التطبيق */
export const UI_AR_SCREEN_COPY_ASSET_OVERRIDES = new Set(['generalCodes', 'settings']);

/**
 * شكل JSON المُركَّب من الخادم (ar.json / tr.json / zh-Hans.json):
 * {
 *   "sidebarNav": { "ar": { "dashboard": "..." }, "tr": { ... } },
 *   "brandSubtitle": { "ar": "...", "tr": "..." },
 *   "chrome": { "ar": { ... }, "tr": { ... } },
 *   "screenCopy": { "ar": { "dashboard": { "topbarKicker": "..." } }, ... }
 * }
 */
export interface UiManualTranslationsPayload {
  sidebarNav?: Record<string, Record<string, string>>;
  brandSubtitle?: Record<string, string>;
  chrome?: Record<string, Record<string, string>>;
  screenCopy?: Record<string, Record<string, Record<string, string>>>;
}

export interface UiTranslationsBlobDto {
  payloadJson: string;
}
