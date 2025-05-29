import { toast } from 'react-hot-toast'

// Helper function to format date
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Helper function to retry Supabase queries
export async function executeWithRetry<T>(queryFn: () => Promise<T>, options = { maxRetries: 3, shouldToast: true }): Promise<T> {
  const { maxRetries, shouldToast } = options;
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  if (shouldToast) {
    toast.error('Failed to load data after multiple attempts');
  }
  
  throw lastError;
}

// Calculate rarity percentile based on player's XP compared to all players
export const calculateRarity = (playerXP: number, allXP: number[]): number => {
  const totalPlayers = allXP.length;
  const playersBelow = allXP.filter(xp => xp < playerXP).length;
  return Math.round((playersBelow / totalPlayers) * 100);
};
