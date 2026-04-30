const { redis } = require('../services/redisService');

/**
 * Sliding Window Rate Limiter using Redis Sorted Sets
 * @param {string} key - Unique key for the rate limit (e.g., "rl:ip:127.0.0.1")
 * @param {number} limit - Max requests allowed
 * @param {number} windowSeconds - Time window in seconds
 */
async function isRateLimited(key, limit, windowSeconds) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const minScore = now - windowMs;

    const pipeline = redis.pipeline();

    // 1. Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, minScore);
    
    // 2. Add current request timestamp
    pipeline.zadd(key, now, now);
    
    // 3. Count entries in the window
    pipeline.zcard(key);
    
    // 4. Set expiry on the key to clean up eventually
    pipeline.expire(key, windowSeconds + 1);

    const results = await pipeline.exec();
    const count = results[2][1]; // result of zcard

    return count > limit;
}

/**
 * Middleware for HTTP Rate Limiting
 */
const httpRateLimiter = (limit, windowSeconds) => {
    return async (req, res, next) => {
        const identifier = req.user ? req.user.id : req.ip;
        const key = `rl:http:${identifier}`;

        try {
            const limited = await isRateLimited(key, limit, windowSeconds);
            if (limited) {
                return res.status(429).json({ error: 'Too many requests' });
            }
            next();
        } catch (err) {
            console.error('Rate limiter error:', err);
            next(); // Proceed anyway or handle as internal error
        }
    };
};

module.exports = {
    isRateLimited,
    httpRateLimiter
};
