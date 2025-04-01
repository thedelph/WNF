import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * UK timezone - will automatically handle BST/GMT transitions
 * Europe/London automatically switches between GMT and BST based on daylight saving time
 */
export const UK_TIMEZONE = 'Europe/London';

/**
 * Converts a UTC date string to a date object in UK timezone (handles BST/GMT automatically)
 * @param utcDate - UTC date string or Date object
 * @returns Date object adjusted to UK timezone
 */
export const utcToUkTime = (utcDate: string | Date): Date => {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return toZonedTime(dateObj, UK_TIMEZONE);
};

/**
 * Converts a UK timezone date to UTC
 * @param ukDate - Date in UK timezone
 * @returns Date object in UTC
 */
export const ukTimeToUtc = (ukDate: string | Date): Date => {
  const dateObj = typeof ukDate === 'string' ? new Date(ukDate) : ukDate;
  return fromZonedTime(dateObj, UK_TIMEZONE);
};

/**
 * Formats a date string into UK format (e.g., "Wednesday 18th December 2024")
 * Automatically handles timezone conversion from UTC to UK time
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Convert UTC date to UK timezone (handles BST/GMT automatically)
  const ukDate = toZonedTime(dateObj, UK_TIMEZONE);
  return format(ukDate, 'EEEE do MMMM yyyy');
};

/**
 * Formats a time string into 12-hour format with AM/PM
 * Automatically handles timezone conversion from UTC to UK time
 * 
 * IMPORTANT: This function handles the conversion from UTC to UK time,
 * which means it will display times correctly regardless of whether the UK
 * is in GMT or BST (adding +1 hour during summer time).
 */
export const formatTime = (time: string | Date | null | undefined): string => {
  if (!time) return '';
  
  // If we receive a full timestamp or time string, parse it
  const timeObj = typeof time === 'string' ? new Date(time) : time;
  
  // Convert UTC time to UK timezone (handles BST/GMT automatically)
  const ukTime = toZonedTime(timeObj, UK_TIMEZONE);
  
  return format(ukTime, 'h:mm a');
};

/**
 * Formats a date and time together in a user-friendly format
 * Automatically handles timezone conversion from UTC to UK time
 */
export const formatDateTime = (dateTime: string | Date): string => {
  if (!dateTime) return '';
  
  const dateObj = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  // Convert UTC date to UK timezone (handles BST/GMT automatically)
  const ukDateTime = toZonedTime(dateObj, UK_TIMEZONE);
  return format(ukDateTime, 'EEEE do MMMM yyyy, h:mm a');
};
