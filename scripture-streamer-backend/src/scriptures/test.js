import {
    createClient,
    SCHEMA_FIELD_TYPE,
} from 'redis';
import dotenv from 'dotenv';

dotenv.config();

console.log('REDIS_USERNAME:', process.env.REDIS_USERNAME);
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD);
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT);



//connect to redis server
const client = createClient({
    username: process.env.REDIS_USERNAME,

    password: process.env.REDIS_PASSWORD,
    socket: {
        host: "redis-14008.c253.us-central1-1.gce.redns.redis-cloud.com",
        port: 14008
    }
});

client.on('error', err => console.log('Redis Client Error', err));
try {
    await client.connect();
    console.log('Redis Connected');
} catch (err) {
    console.log('Redis Connection Error', err);
}