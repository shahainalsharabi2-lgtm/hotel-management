export type GeneralCodeCategoryId =
  | 'purposes-of-stay'
  | 'nationalities'
  | 'relationship-types'
  | 'identification-types'
  | 'preference-type'
  | 'preference-category'
  | 'vip-levels'
  | 'age-qualifying-codes'
  | 'floor-types'
  | 'room-architecture'
  | 'room-features'
  | 'room-locations'
  | 'room-views'
  | 'room-classes'
  | 'room-maintenance-reasons'
  | 'room-move-reasons';

export interface GeneralCodeTabConfig {
  id: GeneralCodeCategoryId;
  labelKey: string;
  descriptionKey: string;
}

export const GENERAL_CODE_TABS: readonly GeneralCodeTabConfig[] = [
  { id: 'purposes-of-stay', labelKey: 'tabPurposesOfStay', descriptionKey: 'descPurposesOfStay' },
  { id: 'nationalities', labelKey: 'tabNationalities', descriptionKey: 'descNationalities' },
  { id: 'relationship-types', labelKey: 'tabRelationshipTypes', descriptionKey: 'descRelationshipTypes' },
  { id: 'preference-type', labelKey: 'tabPreferenceType', descriptionKey: 'descPreferenceType' },
  { id: 'preference-category', labelKey: 'tabPreferenceCategory', descriptionKey: 'descPreferenceCategory' },
  { id: 'room-architecture', labelKey: 'tabRoomArchitecture', descriptionKey: 'descRoomArchitecture' },
  { id: 'room-features', labelKey: 'tabRoomFeatures', descriptionKey: 'descRoomFeatures' },
  { id: 'room-locations', labelKey: 'tabRoomLocations', descriptionKey: 'descRoomLocations' },
  { id: 'room-views', labelKey: 'tabRoomViews', descriptionKey: 'descRoomViews' },
  { id: 'room-classes', labelKey: 'tabRoomClasses', descriptionKey: 'descRoomClasses' },
  { id: 'room-maintenance-reasons', labelKey: 'tabRoomMaintenanceReasons', descriptionKey: 'descRoomMaintenanceReasons' },
  { id: 'room-move-reasons', labelKey: 'tabRoomMoveReasons', descriptionKey: 'descRoomMoveReasons' },
] as const;

export const GENERAL_CODE_CATEGORIES_WITHOUT_FNAME = new Set<GeneralCodeCategoryId>([
  'purposes-of-stay',
  'nationalities',
  'relationship-types',
  'preference-type',
  'room-features',
  'room-locations',
  'room-views',
  'room-classes',
  'room-maintenance-reasons',
  'room-move-reasons',
]);

export const GENERAL_CODE_CATEGORIES_WITHOUT_DESCRIPTION = new Set<GeneralCodeCategoryId>([
  'purposes-of-stay',
  'relationship-types',
  'preference-type',
  'room-features',
]);

export function generalCodeShowsForeignName(category: GeneralCodeCategoryId): boolean {
  return !GENERAL_CODE_CATEGORIES_WITHOUT_FNAME.has(category);
}

export function generalCodeShowsDescription(category: GeneralCodeCategoryId): boolean {
  return !GENERAL_CODE_CATEGORIES_WITHOUT_DESCRIPTION.has(category);
}
