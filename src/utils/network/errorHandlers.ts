import { toast } from 'react-hot-toast';

/**
 * Checks if an error is network-related and should be retried
 * @param error - The error to check
 * @returns boolean indicating if the error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Don't retry 404 errors
  if (error.code === '404' || 
      error.message?.includes('404') ||
      error.message?.includes('Not Found')) {
    return false;
  }

  // Check for network-related errors
  if (error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('Network request failed') ||
      error.details?.includes('Failed to fetch')) {
    return true;
  }

  // Check for specific error codes
  if (error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ENETUNREACH') {
    return true;
  }

  return false;
}

/**
 * Checks if the error is a table not found error
 * @param error - The error to check
 * @returns boolean indicating if the error is a table not found error
 */
export function isTableNotFoundError(error: any): boolean {
  if (!error) return false;

  return error.code === '404' || 
         error.message?.includes('404') ||
         error.message?.includes('Not Found');
}

/**
 * Checks if the browser is currently online
 * @returns Promise<boolean> indicating online status
 */
export async function checkOnlineStatus(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Assume online if we can't check
}

/**
 * Shows appropriate error messages to the user based on error type
 * @param error - The error to handle
 * @param attempt - Current retry attempt number
 * @param maxRetries - Maximum number of retries
 * @param shouldToast - Whether to show toast messages
 */
export function handleQueryError(error: any, attempt: number, maxRetries: number, shouldToast: boolean): void {
  if (!shouldToast) return;

  if (isTableNotFoundError(error)) {
    // Don't show toast for table not found errors as they might be expected
    console.warn('Table not found:', error);
    return;
  }

  if (attempt === maxRetries) {
    toast.error('Failed to connect after multiple attempts. Please check your internet connection.');
  } else if (!isRetryableError(error)) {
    toast.error('An error occurred while fetching data.');
  } else {
    toast.error(`Connection issue, retrying... (Attempt ${attempt}/${maxRetries})`);
  }
}
