/**
 * Configuration and helpers for Administrator Access Control
 */

export const ADMIN_EMAILS: readonly string[] = [
  'sbireino@gmail.com',
  'jibriltengeh@gmail.com',
  'jibriltengeh4@gmail.com',
];

/**
 * Checks whether an email belongs to the authorized administrator list.
 * Performs trim and case-insensitive matching.
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === cleanEmail);
}
