import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from './config';
import { logger } from './utils/logger';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    logger.info('Supabase client initialized');
  }

  /**
   * Find player by WhatsApp phone number
   */
  async findPlayerByPhone(phone: string) {
    const { data, error } = await this.client
      .from('players')
      .select('id, friendly_name, whatsapp_mobile_number, user_id')
      .eq('whatsapp_mobile_number', phone)
      .maybeSingle();

    if (error) {
      logger.error('Error finding player by phone:', error);
      throw error;
    }

    return data;
  }

  /**
   * Register player for game
   */
  async registerPlayer(playerId: string, gameId: string, usingToken: boolean = false) {
    try {
      // Check if already registered
      const { data: existing } = await this.client
        .from('game_registrations')
        .select('id')
        .eq('player_id', playerId)
        .eq('game_id', gameId)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Already registered' };
      }

      // If using token, call RPC to use token first
      if (usingToken) {
        const { data: tokenResult, error: tokenError } = await this.client
          .rpc('use_player_token', {
            p_player_id: playerId,
            p_game_id: gameId
          });

        if (tokenError || !tokenResult) {
          logger.error('Token usage failed:', tokenError);
          return { success: false, error: 'Failed to use token' };
        }
      }

      // Create registration
      const { error } = await this.client
        .from('game_registrations')
        .insert({
          game_id: gameId,
          player_id: playerId,
          status: 'registered',
          using_token: usingToken
        });

      if (error) {
        logger.error('Error registering player:', error);
        return { success: false, error: error.message };
      }

      logger.info(`Player ${playerId} registered for game ${gameId}`, {
        usingToken
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Exception in registerPlayer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player stats
   */
  async getPlayerStats(playerId: string) {
    const { data, error } = await this.client
      .from('player_xp')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error) {
      logger.error('Error fetching player stats:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get token status
   */
  async getTokenStatus(playerId: string) {
    const { data, error } = await this.client
      .from('public_player_token_status')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching token status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get shield token status
   */
  async getShieldStatus(playerId: string) {
    const { data, error } = await this.client
      .from('player_shield_status')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching shield status:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get Supabase client for direct queries
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}

export const supabaseService = new SupabaseService();
