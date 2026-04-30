const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
};

const redis = new Redis(redisConfig);
const pub = new Redis(redisConfig);
const sub = new Redis(redisConfig);

const BITMAP_KEY = 'checkboxes:state';
const CONFIG_KEY = 'checkboxes:config';
const UPDATE_CHANNEL = 'checkbox:updates';
const CONFIG_CHANNEL = 'checkbox:config_updates';

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

async function getCheckboxState(index) {
    return await redis.getbit(BITMAP_KEY, index);
}

async function setCheckboxState(index, value) {
    await redis.setbit(BITMAP_KEY, index, value);
    await pub.publish(UPDATE_CHANNEL, JSON.stringify({ index, value }));
}

async function getFullState() {
    const buffer = await redis.getBuffer(BITMAP_KEY);
    return buffer || Buffer.alloc(125000, 0); 
}

async function getCheckedCount() {
    return await redis.bitcount(BITMAP_KEY);
}

async function getGridConfig() {
    const config = await redis.hgetall(CONFIG_KEY);
    return {
        cols: parseInt(config.cols) || 1000,
        rows: parseInt(config.rows) || 1000
    };
}

async function setGridConfig(cols, rows) {
    await redis.hset(CONFIG_KEY, 'cols', cols, 'rows', rows);
    const count = await getCheckedCount();
    await pub.publish(CONFIG_CHANNEL, JSON.stringify({ type: 'RESIZE', cols, rows, count }));
}

async function resetGrid() {
    await redis.del(BITMAP_KEY);
    await pub.publish(UPDATE_CHANNEL, JSON.stringify({ type: 'RESET' }));
}

module.exports = {
    redis,
    pub,
    sub,
    UPDATE_CHANNEL,
    CONFIG_CHANNEL,
    getCheckboxState,
    setCheckboxState,
    getFullState,
    getCheckedCount,
    getGridConfig,
    setGridConfig,
    resetGrid
};
