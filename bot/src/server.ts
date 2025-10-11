import express, { Request, Response, NextFunction } from 'express';
import { WhatsAppClient } from './whatsapp-client';
import { logger } from './utils/logger';
import config from './config';

export class BotServer {
  private app: express.Application;
  private whatsappClient: WhatsAppClient;

  constructor(whatsappClient: WhatsAppClient) {
    this.app = express();
    this.whatsappClient = whatsappClient;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json());

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });

    // Authentication middleware (except for health check)
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // Skip auth for health check
      if (req.path === '/health') {
        return next();
      }

      const authHeader = req.headers.authorization;
      const expectedAuth = `Bearer ${config.webhook.secret}`;

      if (!authHeader || authHeader !== expectedAuth) {
        logger.warn('Unauthorized webhook request attempt');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        whatsappReady: this.whatsappClient.isClientReady(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        nodeEnv: config.nodeEnv
      });
    });

    // Send message endpoint (for Supabase Edge Function webhooks)
    this.app.post('/send', async (req: Request, res: Response) => {
      try {
        const { gameId, announcementType } = req.body;

        if (!gameId || !announcementType) {
          return res.status(400).json({
            error: 'Missing required parameters: gameId, announcementType'
          });
        }

        logger.info('Received announcement request:', { gameId, announcementType });

        // TODO Phase 3: Implement announcement generation
        // const message = await announcementService.generate(gameId, announcementType);
        // const messageId = await this.whatsappClient.sendMessage(config.groupId, message);

        // For now, just acknowledge the request
        res.json({
          success: true,
          message: 'Announcement endpoint ready (Phase 3 implementation pending)'
        });
      } catch (error: any) {
        logger.error('Error sending announcement:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Express error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  start(): void {
    this.app.listen(config.port, () => {
      logger.info(`🌐 Bot HTTP server listening on port ${config.port}`);
      logger.info(`📊 Health check: http://localhost:${config.port}/health`);
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
