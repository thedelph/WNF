import toast from 'react-hot-toast';

/**
 * Extracts a human-readable message from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    if ('error_description' in error && typeof (error as { error_description: unknown }).error_description === 'string') {
      return (error as { error_description: string }).error_description;
    }
  }
  return 'An unexpected error occurred';
}

/**
 * Centralized error handler that logs and optionally toasts.
 *
 * Usage:
 *   import { handleError } from '@/utils/errorHandler';
 *
 *   try { ... } catch (error) {
 *     handleError(error, 'Loading player data');
 *   }
 *
 *   // Silent (no toast):
 *   handleError(error, 'Background sync', { silent: true });
 */
export function handleError(
  error: unknown,
  context: string,
  options: { silent?: boolean } = {}
): void {
  const message = getErrorMessage(error);

  console.error(`[${context}]`, message, error);

  if (!options.silent) {
    toast.error(`${context}: ${message}`);
  }
}
