import { database } from './config/database';
import { redisConnection } from './config/redis';
import { billzWorker } from './workers/billz.worker';
import { validateConfig, config } from './config';

class BillzMicroservice {
  constructor() {
    // Pure microservice - no HTTP server needed
  }

  public async initialize(): Promise<void> {
    try {
      console.log('Initializing Billz queue-based microservice...');

      // Validate configuration
      validateConfig();

      // Connect to database
      await database.connect();

      // Connect to Redis
      await redisConnection.connect();

      // Initialize worker to process incoming jobs from 'billz-operations' queue
      await billzWorker.initialize();

      console.log('Billz microservice initialized successfully - listening for queue jobs');
    } catch (error) {
      console.error('Failed to initialize microservice:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();

      console.log(`Billz microservice running in ${config.nodeEnv} mode`);
      console.log('Queue: billz-operations');
      console.log('Status: Listening for jobs...');

      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await this.shutdown();
      });

      process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await this.shutdown();
      });

    } catch (error) {
      console.error('Failed to start microservice:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      console.log('Shutting down microservice...');

      // Close worker
      await billzWorker.close();

      // Close database connection
      await database.disconnect();

      // Close Redis connection
      await redisConnection.disconnect();

      console.log('Microservice shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the microservice if this file is run directly
if (require.main === module) {
  const microservice = new BillzMicroservice();
  microservice.start().catch((error) => {
    console.error('Fatal error starting microservice:', error);
    process.exit(1);
  });
}

export default BillzMicroservice;
