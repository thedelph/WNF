import { supabaseService } from '../supabase-client';
import { logger } from '../utils/logger';
import { InteractionLogData } from '../types';

/**
 * Service for logging bot interactions to the database
 */
export class InteractionLogger {
  /**
   * Log an interaction to the bot_interactions table
   */
  async log(data: InteractionLogData): Promise<void> {
    try {
      const { error } = await supabaseService.getClient()
        .from('bot_interactions')
        .insert({
          player_id: data.playerId || null,
          phone_number: data.phoneNumber,
          interaction_type: data.type,
          command: data.command || null,
          message_content: data.messageContent || null,
          response: data.response || null,
          success: data.success,
          error_message: data.errorMessage || null
        });

      if (error) {
        logger.error('Failed to log interaction:', error);
        // Don't throw - we don't want logging failures to break the bot
      } else {
        logger.debug('Interaction logged:', {
          type: data.type,
          command: data.command,
          success: data.success
        });
      }
    } catch (error) {
      logger.error('Exception while logging interaction:', error);
      // Don't throw - we don't want logging failures to break the bot
    }
  }

  /**
   * Log a successful command interaction
   */
  async logCommand(
    playerId: string,
    phoneNumber: string,
    command: string,
    response: string
  ): Promise<void> {
    await this.log({
      playerId,
      phoneNumber,
      type: 'command',
      command,
      response,
      success: true
    });
  }

  /**
   * Log a failed command interaction
   */
  async logCommandError(
    phoneNumber: string,
    command: string,
    errorMessage: string,
    playerId?: string
  ): Promise<void> {
    await this.log({
      playerId,
      phoneNumber,
      type: 'command',
      command,
      success: false,
      errorMessage
    });
  }

  /**
   * Log a reaction interaction
   */
  async logReaction(
    playerId: string,
    phoneNumber: string,
    response: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      playerId,
      phoneNumber,
      type: 'reaction',
      response,
      success,
      errorMessage
    });
  }

  /**
   * Log a general message interaction
   */
  async logMessage(
    playerId: string,
    phoneNumber: string,
    messageContent: string,
    response: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      playerId,
      phoneNumber,
      type: 'message',
      messageContent,
      response,
      success,
      errorMessage
    });
  }
}

export const interactionLogger = new InteractionLogger();
