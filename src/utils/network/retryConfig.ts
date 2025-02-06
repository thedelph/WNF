/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldToast?: boolean;
}

/**
 * Default retry configuration
 */
export const defaultOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  shouldToast: true,
};

/**
 * Calculates the next retry delay using exponential backoff
 * @param currentDelay - Current delay in milliseconds
 * @param maxDelay - Maximum allowed delay
 * @returns number - Next delay in milliseconds
 */
export function calculateNextDelay(currentDelay: number, maxDelay: number): number {
  return Math.min(currentDelay * 2, maxDelay);
}

/**
 * Waits for the specified delay
 * @param delay - Delay in milliseconds
 */
export async function wait(delay: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, delay));
}
