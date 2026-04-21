/**
 * Only these keys are persisted intentionally. Everything else is removed on app load
 * (legacy demo data, template cruft, duplicate role blobs, etc.).
 */
export const ALLOWED_LOCAL_STORAGE_KEYS = new Set([
  'accessToken',
  'user_role',
  'medi_follow_user_data',
  'medi_follow_user_role',
  'userId',
  'permissions',
  'app_language',
  'high_contrast',
]);

/** Drop any localStorage key not in {@link ALLOWED_LOCAL_STORAGE_KEYS}. */
export function pruneLocalStorageToWhitelist(): void {
  if (typeof localStorage === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) keys.push(k);
  }
  for (const k of keys) {
    if (!ALLOWED_LOCAL_STORAGE_KEYS.has(k)) {
      localStorage.removeItem(k);
    }
  }
}

/** Clears auth + UI prefs on logout (same keys headers already cleared ad hoc). */
export function clearAuthLocalStorage(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('medi_follow_user_data');
  localStorage.removeItem('medi_follow_user_role');
  // We keep UI preferences like language and contrast unless explicitly asked to clear them.
  localStorage.removeItem('permissions');
  localStorage.removeItem('userId');
  localStorage.removeItem('app_language');
  localStorage.removeItem('high_contrast');
}
