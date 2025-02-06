import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { isRetryableError, checkOnlineStatus, handleQueryError } from './errorHandlers';
import { RetryOptions, defaultOptions, calculateNextDelay, wait } from './retryConfig';

/**
 * Executes a Supabase query with retry logic for handling network issues
 * @param queryFn - Function that returns a Supabase query promise
 * @param options - Retry configuration options
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
        await wait(delay);
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
        handleQueryError(error, attempt, maxRetries, shouldToast);
        return { data: null, error };
      }

      // Wait before retrying
      await wait(delay);
      
      // Exponential backoff with max delay
      delay = calculateNextDelay(delay, maxDelay);
      
      handleQueryError(error, attempt, maxRetries, shouldToast);
    }
  }

  return { data: null, error: null };
}

/**
 * Executes multiple Supabase queries with retry logic
 * @param queries - Array of query functions to execute
 * @param options - Retry configuration options
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
