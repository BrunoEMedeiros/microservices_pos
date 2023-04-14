import Redis from 'ioredis';
import { promisify } from 'util';

//configs
export const redisClient = new Redis({
    host: '172.22.67.77',
    port: 6379,
    username: "default", // needs Redis >= 6
    password: "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
});

export function getRedis(value: any){
    const syncRedisGet = promisify(redisClient.get).bind(redisClient);
    return syncRedisGet(value);

    //redisClient.get("","")
}

export function setRedis(key: any, value: any){
    const syncRedisSet = promisify(redisClient.set).bind(redisClient);
    return syncRedisSet(key, value);

    //redisClient.set("","")redisClient.del
}

