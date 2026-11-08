import IORedis from 'ioredis';
import { Queue } from 'bullmq';
const g = globalThis as unknown as { redis?: IORedis; queue?: Queue };
export function redis() { return g.redis ??= new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null, lazyConnect: true }); }
export function webhookQueue() { return g.queue ??= new Queue('mercado-notifications', { connection: redis(), defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 } }); }
