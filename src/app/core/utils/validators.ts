/**
 * Core validation utilities for forms across Aser Trading platform.
 */

/**
 * Validates standard email patterns (e.g. user@domain.com, info@asertrading.et).
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

/**
 * Validates Ethiopian and international phone numbers.
 * Supports:
 * - Ethiopian mobile: 09XXXXXXXX, 07XXXXXXXX, +251 9X XXX XXXX, +251 7X XXX XXXX
 * - Landline formats: 011XXXXXXX, 022XXXXXXX, +251 11 XXXXXXX
 * - International numbers: +1 (555) 123-4567, etc.
 * Cleans spaces, dashes, parentheses, and dots, requiring 9 to 15 digits.
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  return /^\+?[0-9]{9,15}$/.test(cleaned);
}

