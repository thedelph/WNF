/**
 * Utility functions for highlight sharing and deep linking
 */

/**
 * Generates a shareable URL for a specific highlight within a game
 */
export function getHighlightShareUrl(sequenceNumber: number, highlightId: string): string {
  const base = `${window.location.origin}/results/${sequenceNumber}`;
  return `${base}?highlight=${highlightId}`;
}

/**
 * Copies text to the clipboard, returns true on success
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
