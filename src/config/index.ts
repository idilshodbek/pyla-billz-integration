import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  mongodb: {
    uri: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  billz: {
    token: string;
    shopId: string;
  };
  telegram: {
    botToken: string;
    groupId: string;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000'), // Not used in queue-only mode
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/billz_microservice',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  billz: {
    token: process.env.BILLZ_TOKEN || '',
    shopId: process.env.BILLZ_SHOP_ID || '',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    groupId: process.env.TELEGRAM_GROUP_ID || '',
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const requiredVars = [
    'BILLZ_TOKEN',
    'BILLZ_SHOP_ID',
  ];

  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}

export default config;
