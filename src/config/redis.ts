require('dotenv').config();

import Redis from 'ioredis';

export class RedisConnection {
  private static instance: RedisConnection;
  private redis: Redis | null = null;

  private constructor() {}

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<Redis> {
    if (this.redis && this.redis.status === 'ready') {
      return this.redis;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redis = new Redis(redisUrl, {
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // Handle connection events
      this.redis.on('connect', () => {
        console.log('Connected to Redis successfully');
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
      });

      this.redis.on('close', () => {
        console.log('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        console.log('Reconnecting to Redis...');
      });

      // Test the connection
      await this.redis.ping();
      
      return this.redis;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      console.log('Redis disconnected successfully');
    }
  }

  public getClient(): Redis | null {
    return this.redis;
  }

  public isConnected(): boolean {
    return this.redis ? this.redis.status === 'ready' : false;
  }
}

export const redisConnection = RedisConnection.getInstance();
