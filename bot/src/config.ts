import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  logLevel: string;
  port: number;
  sessionPath: string;
  groupId: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  webhook: {
    secret: string;
  };
  admin: {
    phoneNumbers: string[];
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',
  port: parseInt(process.env.PORT || '3001', 10),
  sessionPath: process.env.WA_SESSION_PATH || path.join(__dirname, '../sessions'),
  groupId: process.env.WA_GROUP_ID || '',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'changeme'
  },
  admin: {
    phoneNumbers: (process.env.ADMIN_PHONE_NUMBERS || '')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
  }
};

// Validate required configuration
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}\n` +
    `Please check your .env file.`
  );
}

// Warn about optional but recommended variables
if (!config.groupId && config.nodeEnv === 'production') {
  console.warn('⚠️  WA_GROUP_ID not set - bot will not know which group to monitor');
}

if (config.webhook.secret === 'changeme' && config.nodeEnv === 'production') {
  console.warn('⚠️  WEBHOOK_SECRET not changed from default - please set a secure random value');
}

export default config;
