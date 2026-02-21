/**
 * YouTube URL parsing and embed URL generation utilities
 */

/**
 * Extracts a YouTube video ID from various URL formats:
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Builds a privacy-enhanced YouTube embed URL
 */
/**
 * Formats total seconds into a human-readable timestamp: "1:23" or "1:02:34"
 */
export function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Parses a timestamp string ("MM:SS" or "H:MM:SS") into total seconds.
 * Returns null if the input is invalid.
 */
export function parseTimestamp(input: string): number | null {
  const trimmed = input.trim();
  const parts = trimmed.split(':');

  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map(p => {
    const n = parseInt(p, 10);
    return isNaN(n) || n < 0 ? -1 : n;
  });

  if (nums.some(n => n < 0)) return null;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = nums;
    if (minutes > 59 || seconds > 59) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  const [minutes, seconds] = nums;
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
}

/**
 * Builds a privacy-enhanced YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string, startSeconds?: number): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
  });

  if (startSeconds !== undefined && startSeconds > 0) {
    params.set('start', String(Math.floor(startSeconds)));
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
