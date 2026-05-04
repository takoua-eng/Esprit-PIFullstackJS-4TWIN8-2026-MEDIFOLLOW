import { environment } from "src/environments/environment";


/** Backend API origin (no trailing slash). Override via `window` in index.html if needed. */
export const API_BASE_URL =
  (typeof window !== 'undefined' &&
    (window as unknown as { __API_BASE_URL__?: string }).__API_BASE_URL__) ||
  environment.apiUrl;

/**
 * Base URL for browser video calls (no trailing slash), e.g. Jitsi Meet.
 * Override with `window.__VIDEO_CALL_BASE_URL__` in index.html for a self-hosted instance.
 */
export const VIDEO_CALL_BASE_URL =
  (typeof window !== 'undefined' &&
    (window as unknown as { __VIDEO_CALL_BASE_URL__?: string })
      .__VIDEO_CALL_BASE_URL__) || 'https://meet.jit.si';

/**
 * Full Jitsi room URL. Hash flags are read by Jitsi Meet to skip the long prejoin
 * "waiting for moderator" screen when possible (you still join as a guest; no Jitsi login required).
 */
export function buildJitsiMeetUrl(roomName: string): string {
  const base = VIDEO_CALL_BASE_URL.replace(/\/$/, '');
  const path = `${base}/${encodeURIComponent(roomName)}`;
  const hash =
    'config.prejoinPageEnabled=false&config.enableWelcomePage=false';
  return `${path}#${hash}`;
}