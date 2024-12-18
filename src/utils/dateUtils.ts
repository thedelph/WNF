import { format } from 'date-fns';

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'EEEE, MMMM do yyyy');
};

export const formatTime = (time: string): string => {
  // If time is in HH:mm format, convert it to Date object
  if (time.includes(':')) {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return format(date, 'h:mm a');
  }
  return time;
};
