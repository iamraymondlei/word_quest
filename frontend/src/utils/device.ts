/**
 * Utility functions for device detection in MeLearn.
 * Accurately detects iPad / iPadOS / Tablet / Mobile vs Desktop PC.
 */

export const isIPadOrTabletDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';

  // 1. Classic mobile & tablet User Agents (iPad, iPhone, Android, etc.)
  const isMobileOrTabletUA = /iPad|iPhone|iPod|Android|Mobile|Tablet/i.test(ua);

  // 2. Modern iPadOS 13+ (defaults to desktop Safari UA: 'Macintosh', but has multi-touch points > 1)
  const isIPadOS =
    (navigator.platform === 'MacIntel' || ua.includes('Macintosh')) &&
    navigator.maxTouchPoints !== undefined &&
    navigator.maxTouchPoints > 1;

  return isMobileOrTabletUA || isIPadOS;
};
