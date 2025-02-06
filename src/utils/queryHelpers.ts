import { toast } from 'react-hot-toast';
import { PostgrestError } from '@supabase/supabase-js';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldToast?: boolean;
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  shouldToast: true,
};

/**
 * Check if the error is a network-related error that we should retry
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

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
 * Check if we're online before making a request
 */
async function checkOnlineStatus(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Assume online if we can't check
}

/**
 * Executes a Supabase query with retry logic for handling network issues
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const { maxRetries, initialDelay, maxDelay, shouldToast } = { ...defaultOptions, ...options };
  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxRetries) {
    try {
      // Check online status before attempting
      const isOnline = await checkOnlineStatus();
      if (!isOnline) {
        if (shouldToast) {
          toast.error('No internet connection. Waiting for connection...');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const result = await queryFn();
      
      if (result.error) {
        // If it's a 404, don't retry
        if (result.error.code === '404' || result.error.message?.includes('404')) {
          return result;
        }
        
        // If it's not a retryable error, don't retry
        if (!isRetryableError(result.error)) {
          throw result.error;
        }
      } else {
        return result; // Success
      }
    } catch (error: any) {
      attempt++;
      
      // If it's the last attempt or not a retryable error, throw
      if (attempt === maxRetries || !isRetryableError(error)) {
        if (shouldToast) {
          const message = attempt === maxRetries
            ? 'Failed to connect after multiple attempts. Please check your internet connection.'
            : 'An error occurred while fetching data.';
          toast.error(message);
        }
        return { data: null, error };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff with max delay
      delay = Math.min(delay * 2, maxDelay);
      
      if (shouldToast) {
        toast.error(`Connection issue, retrying... (Attempt ${attempt}/${maxRetries})`);
      }
    }
  }

  // This should never be reached due to the return in the last attempt
  return { data: null, error: null };
}

/**
 * Wrapper for multiple Supabase queries that need to be executed together
 */
export async function executeBatchQueries<T>(
  queries: Array<() => Promise<{ data: any; error: PostgrestError | null }>>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  try {
    // Check online status first
    const isOnline = await checkOnlineStatus();
    if (!isOnline) {
      if (options.shouldToast !== false) {
        toast.error('No internet connection. Please check your connection and try again.');
      }
      return { data: null, error: new Error('No internet connection') };
    }

    const results = await Promise.all(
      queries.map(query => executeWithRetry(query, { ...options, shouldToast: false }))
    );

    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      if (options.shouldToast !== false) {
        const isNetworkError = errors.some(e => isRetryableError(e.error));
        const message = isNetworkError
          ? 'Network issues occurred while loading data. Please check your connection.'
          : 'Failed to load some data. Please try again.';
        toast.error(message);
      }
      return { data: null, error: errors[0].error };
    }

    return { 
      data: results.map(r => r.data) as T,
      error: null 
    };
  } catch (error: any) {
    if (options.shouldToast !== false) {
      toast.error('An error occurred while loading data.');
    }
    return { data: null, error };
  }
}
