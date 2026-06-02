/** مفتاح localStorage لمزامنة وضع «حواف ملوّنة» بين الشريط الجانبي وصفحات مثل سجلات الحجز */
export const DEV_COLORED_OUTLINES_STORAGE_KEY = 'hotelHomeDevColoredOutlines';

/** يُطلق من الصفحة الرئيسية عند تغيير الخيار لتحديث الصفحات المفتوحة دون إعادة تحميل */
export const DEV_OUTLINES_CHANGED_EVENT = 'hotelDevOutlinesChanged';

export function readDevColoredOutlinesEnabled(): boolean {
  try {
    return localStorage.getItem(DEV_COLORED_OUTLINES_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** نفس المفتاح المستخدم في `dashboard.component.ts` */
export const DASHBOARD_VIEW_MODE_STORAGE_KEY = 'dashboardViewMode';

/** يُطلق عند تغيير العرض العادي / المطوّر في لوحة التحكم */
export const DASHBOARD_VIEW_MODE_CHANGED_EVENT = 'hotelDashboardViewModeChanged';

export function readDashboardAdvancedEnabled(): boolean {
  try {
    return localStorage.getItem(DASHBOARD_VIEW_MODE_STORAGE_KEY) === 'advanced';
  } catch {
    return false;
  }
}

/** واجهة بطاقات سجلات الحجز: خيارات المطوّر في الشريط أو العرض المطوّر في لوحة التحكم */
export function readBookingsCardLayoutEnabled(): boolean {
  return readDevColoredOutlinesEnabled() || readDashboardAdvancedEnabled();
}
