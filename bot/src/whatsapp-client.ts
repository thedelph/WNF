import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from './utils/logger';
import config from './config';

export class WhatsAppClient {
  private client: Client;
  private isReady: boolean = false;

  constructor() {
    logger.info('Initializing WhatsApp client...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.sessionPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // QR Code for authentication
    this.client.on('qr', (qr) => {
      logger.info('📱 QR Code received! Scan with your WhatsApp:');
      console.log('\n');
      qrcode.generate(qr, { small: true });
      console.log('\n');
      logger.info('Waiting for authentication...');
    });

    // Ready event
    this.client.on('ready', () => {
      logger.info('✅ WhatsApp client is ready!');
      this.isReady = true;
    });

    // Authentication success
    this.client.on('authenticated', () => {
      logger.info('✅ WhatsApp client authenticated successfully');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      logger.error('❌ Authentication failure:', msg);
      this.isReady = false;
    });

    // Disconnection
    this.client.on('disconnected', (reason) => {
      logger.warn('⚠️  WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    // Message received
    this.client.on('message', async (msg: Message) => {
      await this.handleMessage(msg);
    });

    // Message reaction (for 👍 registration)
    this.client.on('message_reaction', async (reaction) => {
      await this.handleReaction(reaction);
    });

    // Loading screen
    this.client.on('loading_screen', (percent, message) => {
      logger.debug(`Loading: ${percent}% - ${message}`);
    });
  }

  private async handleMessage(msg: Message): Promise<void> {
    try {
      // Log message for debugging (will implement command handling in Phase 2)
      logger.debug('Message received:', {
        from: msg.from,
        body: msg.body?.substring(0, 50), // Truncate for privacy
        isGroup: msg.from.endsWith('@g.us')
      });

      // TODO Phase 2: Implement command handling
      // if (msg.body.startsWith('/')) {
      //   await commandHandler.handle(msg);
      // }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  private async handleReaction(reaction: any): Promise<void> {
    try {
      logger.debug('Reaction received:', {
        emoji: reaction.reaction,
        from: reaction.senderId
      });

      // TODO Phase 2: Implement reaction handling
      // if (reaction.reaction === '👍') {
      //   await reactionHandler.handleReaction(reaction);
      // }
    } catch (error) {
      logger.error('Error handling reaction:', error);
    }
  }

  async initialize(): Promise<void> {
    logger.info('Starting WhatsApp client initialization...');
    await this.client.initialize();
  }

  async sendMessage(chatId: string, message: string): Promise<string> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const msg = await this.client.sendMessage(chatId, message);
      logger.info(`✅ Message sent to ${chatId}`);
      return msg.id._serialized;
    } catch (error) {
      logger.error(`❌ Failed to send message to ${chatId}:`, error);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }

  isClientReady(): boolean {
    return this.isReady;
  }
}
