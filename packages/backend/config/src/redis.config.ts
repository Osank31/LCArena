import { createClient, RedisClientType } from 'redis';
import { InternalServerError } from '@LCArena/utils';
import {logger} from '@LCArena/utils';

let client: RedisClientType;

export const redisConnect = async () => {
    client = createClient({
        socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379')
        }
    });

    client.on('error', (err: Error) => {
        logger.error('Redis Client Error', err);
    });

    await client.connect();

    logger.info("Redis connected successfully");
};

export const getRedisClient = () => {
    if (!client) {
        throw new InternalServerError("Redis Client not found");
    }

    return client;
};