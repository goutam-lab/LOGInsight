import Redis from "ioredis";

// Using your provided REDIS_URL from .env
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisOptions = {
  maxRetriesPerRequest: null, // REQUIRED for BullMQ to prevent crashes
  enableReadyCheck: false,
};

// Global variable to prevent multiple connections during Next.js reloads
const globalForRedis = global as unknown as { redis: Redis };

export const redis = globalForRedis.redis || new Redis(REDIS_URL, redisOptions);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;