import Redis from "ioredis";

// Use the exact same connection string for both Worker and App
const REDIS_URL = "rediss://default:gQAAAAAAARl1AAIncDEyODkyNDc1ZWY4YTI0MDM5OTVjZDc3N2I4ZmUzZWM4YnAxNzIwNTM@concise-dassie-72053.upstash.io:6379";

const redisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  tls: { rejectUnauthorized: false }, // Required for Upstash
  connectTimeout: 10000,
};

const globalForRedis = global as unknown as { redis: Redis };

export const redis = globalForRedis.redis || new Redis(REDIS_URL, redisOptions);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;