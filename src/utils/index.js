// ✅ Central barrel — App.jsx imports everything from '../utils' in one line.
// Keep this in sync if new helpers are added.

export {
  getDeptAbbrev,
  getDeptPresets,
  getFullDepartmentName,
  getDeptBannerStyle,
  extractDeptAbbrev,
} from './departmentHelpers';

export { timeAgo, getNotificationIcon } from './formatters';
export { compressImage, getTicketImages } from './imageHelpers';
export { parseHarassmentReport, parseCoordinates } from './parseHelpers';
export { safeParseLikes } from './likeHelpers';
export {
  MUET_KEYWORD_PATTERNS,
  hasInstitutionKeyword,
  extractRollCandidates,
  REQUIRE_VALID_TILL,
  MONTHS,
  extractValidTill,
  preprocessIdImage,
} from './ocrHelpers';