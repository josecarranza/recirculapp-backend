import Redis from 'ioredis';
import util from 'util';

const redisURL = 'rediss://default:584d2592ca3c492da0dc76c94c315cdf@us1-loving-flea-40665.upstash.io:40665';
const redisClient = new Redis(redisURL, {
    connectTimeout: 2000, // Try to reconnect for 2 seconds before throwing an error
    maxRetriesPerRequest: 100, // Increase the number of retries
    enableAutoPipelining: true, // Enable auto-pipelining for better performance
    reconnectOnError: (err) => {
        const targetError = 'READONLY'; // Handle the "READONLY" error separately
        if (err.message.slice(0, targetError.length) === targetError) {
            // End reconnecting when a specific error is encountered.
            return false;
        }
        return true; // Reconnect for all other errors
    },
});

// Helper function to get data from Redis
export const redisGetData = async (key) => {
    const cachedResult = await redisClient.get(key);
    return JSON.parse(cachedResult);
};

// Helper function to set data in Redis with a TTL (time-to-live)
export const redisSetDataWithTTL = async (key, data, ttlInSeconds) => {
    await redisClient.setex(key, ttlInSeconds, JSON.stringify(data));
};

// Promisify Redis methods
export const asyncGet = util.promisify(redisClient.get).bind(redisClient);
export const asyncSetex = util.promisify(redisClient.setex).bind(redisClient);
