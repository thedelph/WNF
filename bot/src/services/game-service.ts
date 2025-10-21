import { supabaseService } from '../supabase-client';
import { logger } from '../utils/logger';
import { Game } from '../types';

/**
 * Service for game-related database queries
 */
export class GameService {
  /**
   * Check if registration is currently open for a game
   */
  isRegistrationOpen(game: Game): boolean {
    const now = new Date();
    const start = new Date(game.registration_window_start);
    const end = new Date(game.registration_window_end);

    return now >= start && now <= end && game.status === 'open';
  }

  /**
   * Get the next upcoming game
   */
  async getNextGame(): Promise<Game | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('games')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching next game:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Exception while fetching next game:', error);
      return null;
    }
  }

  /**
   * Get all upcoming games
   */
  async getUpcomingGames(limit: number = 10): Promise<Game[]> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('games')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(limit);

      if (error) {
        logger.error('Error fetching upcoming games:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Exception while fetching upcoming games:', error);
      return [];
    }
  }

  /**
   * Get currently open game (within registration window)
   */
  async getActiveGame(): Promise<Game | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('games')
        .select('*')
        .eq('status', 'open')
        .gte('registration_window_end', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error('Error fetching active game:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Exception while fetching active game:', error);
      return null;
    }
  }

  /**
   * Get game by ID
   */
  async getGameById(gameId: string): Promise<Game | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        logger.error('Error fetching game by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Exception while fetching game by ID:', error);
      return null;
    }
  }

  /**
   * Check if a player is already registered for a game
   */
  async isPlayerRegistered(playerId: string, gameId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('game_registrations')
        .select('id')
        .eq('player_id', playerId)
        .eq('game_id', gameId)
        .maybeSingle();

      if (error) {
        logger.error('Error checking player registration:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      logger.error('Exception while checking player registration:', error);
      return false;
    }
  }

  /**
   * Get player's game history with outcomes
   */
  async getPlayerGameHistory(playerId: string) {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('game_registrations')
        .select('game_id, team, games(outcome)')
        .eq('player_id', playerId)
        .eq('status', 'selected')
        .not('games.outcome', 'is', null);

      if (error) {
        logger.error('Error fetching player game history:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Exception while fetching player game history:', error);
      return null;
    }
  }
}

export const gameService = new GameService();
