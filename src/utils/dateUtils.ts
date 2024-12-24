import { format } from 'date-fns';

/**
 * Formats a date string into UK format (e.g., "Wednesday 18th December 2024")
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'EEEE do MMMM yyyy');
};

/**
 * Formats a time string into 12-hour format with AM/PM
 */
export const formatTime = (time: string | null | undefined): string => {
  if (!time) return '';
  
  // If we receive a full timestamp or time string, parse it
  const timeObj = new Date(`1970-01-01T${time.split('T')[1] || time}`);
  return format(timeObj, 'h:mm a');
};
