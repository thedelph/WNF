import { supabaseService } from '../supabase-client';
import { logger } from '../utils/logger';
import { MessageTrackingData } from '../types';

/**
 * Service for tracking bot messages in the database
 */
export class MessageTracker {
  /**
   * Track a sent message in the bot_messages table
   */
  async track(data: MessageTrackingData): Promise<void> {
    try {
      const { error } = await supabaseService.getClient()
        .from('bot_messages')
        .insert({
          message_id: data.messageId,
          game_id: data.gameId,
          message_type: data.messageType,
          message_content: data.messageContent,
          sent_to: data.sentTo,
          success: data.success,
          error_message: data.errorMessage || null
        });

      if (error) {
        logger.error('Failed to track message:', error);
      } else {
        logger.debug('Message tracked:', {
          messageId: data.messageId,
          type: data.messageType,
          success: data.success
        });
      }
    } catch (error) {
      logger.error('Exception while tracking message:', error);
    }
  }

  /**
   * Find which game a message belongs to
   */
  async findGameByMessageId(messageId: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from('bot_messages')
        .select('game_id')
        .eq('message_id', messageId)
        .eq('message_type', 'announcement')
        .maybeSingle();

      if (error) {
        logger.error('Error finding game by message ID:', error);
        return null;
      }

      return data?.game_id || null;
    } catch (error) {
      logger.error('Exception while finding game by message ID:', error);
      return null;
    }
  }

  /**
   * Track a successful message send
   */
  async trackSuccess(
    messageId: string,
    gameId: string | null,
    messageType: 'announcement' | 'player_selection' | 'team_announcement' | 'reminder',
    messageContent: string,
    sentTo: string
  ): Promise<void> {
    await this.track({
      messageId,
      gameId,
      messageType,
      messageContent,
      sentTo,
      success: true
    });
  }

  /**
   * Track a failed message send
   */
  async trackFailure(
    messageId: string,
    gameId: string | null,
    messageType: 'announcement' | 'player_selection' | 'team_announcement' | 'reminder',
    messageContent: string,
    sentTo: string,
    errorMessage: string
  ): Promise<void> {
    await this.track({
      messageId,
      gameId,
      messageType,
      messageContent,
      sentTo,
      success: false,
      errorMessage
    });
  }
}

export const messageTracker = new MessageTracker();
