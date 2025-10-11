import { WhatsAppClient } from './whatsapp-client';
import { BotServer } from './server';
import { logger } from './utils/logger';
import config from './config';

async function main() {
  logger.info('🚀 Starting WNF WhatsApp Bot...');
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`📝 Log Level: ${config.logLevel}`);
  logger.info(`🔌 Port: ${config.port}`);

  try {
    // Initialize WhatsApp client
    logger.info('🔄 Initializing WhatsApp client...');
    const whatsappClient = new WhatsAppClient();
    await whatsappClient.initialize();

    // Start HTTP server for webhooks
    logger.info('🔄 Starting HTTP server...');
    const server = new BotServer(whatsappClient);
    server.start();

    logger.info('✅ Bot is running successfully!');
    logger.info('📱 If you see a QR code above, scan it with your WhatsApp to authenticate');
    logger.info('📊 Check health: curl http://localhost:3001/health');
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
  logger.info('⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the bot
main();
