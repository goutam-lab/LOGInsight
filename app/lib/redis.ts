import Redis from "ioredis";

// Hardcoding your Upstash URL to ensure the worker always connects correctly
const REDIS_URL = "rediss://default:gQAAAAAAARl1AAIncDEyODkyNDc1ZWY4YTI0MDM5OTVjZDc3N2I4ZmUzZWM4YnAxNzIwNTM@concise-dassie-72053.upstash.io:6379";

const redisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  // TLS is mandatory for secure Upstash connections
  tls: { rejectUnauthorized: false }, 
  connectTimeout: 10000,
};

const globalForRedis = global as unknown as { redis: Redis };

// Initialize the Redis client using the hardcoded URL above
export const redis = globalForRedis.redis || new Redis(REDIS_URL, redisOptions);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;