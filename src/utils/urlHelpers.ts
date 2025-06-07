/**
 * Converts a friendly name to a URL-safe slug
 * - Converts spaces to hyphens
 * - Removes special characters
 * - Converts to lowercase
 * - Handles accented characters
 * @param friendlyName The friendly name to convert
 * @returns A URL-safe version of the friendly name
 */
export const toUrlFriendly = (friendlyName: string): string => {
  return friendlyName
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove any characters that aren't alphanumeric or hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
};

/**
 * Converts a URL-safe slug back to a friendly name format
 * - Replaces hyphens with spaces
 * - Capitalizes words
 * @param slug The URL-safe slug to convert
 * @returns A more readable version of the slug with a % wildcard for ILIKE queries
 */
export const fromUrlFriendly = (slug: string): string => {
  return slug
    // Replace hyphens with spaces
    .replace(/-/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, letter => letter.toUpperCase())
    // Add a wildcard to handle potential trailing spaces
    + '%';
};
