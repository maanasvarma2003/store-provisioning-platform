import Bull from 'bull';
import Redis from 'ioredis';
import logger from './logger';
import { provisionWooCommerce } from './provisioners/woocommerce';
import { provisionMedusa } from './provisioners/medusa';
import { deleteStore } from './provisioners/cleanup';

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

const createClient = (type: string) => {
    const client = new Redis(redisConfig);
    client.on('error', (err) => logger.error(`Redis ${type} error:`, err));
    return client;
};

export const provisioningQueue = new Bull('provisioning', {
    createClient: (type) => createClient(type),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
    },
});

// Process provision-store jobs
provisioningQueue.process('provision-store', async (job) => {
    const { storeId, storeName, engine } = job.data;
    const namespace = `store-${storeName}`;

    logger.info(`Processing provision-store job for ${storeName} (${engine})`);

    try {
        if (engine === 'WOOCOMMERCE') {
            await provisionWooCommerce({ storeId, storeName, namespace });
        } else if (engine === 'MEDUSA') {
            await provisionMedusa({ storeId, storeName, namespace });
        } else {
            throw new Error(`Unknown engine: ${engine}`);
        }

        logger.info(`Successfully provisioned store ${storeName}`);
        return { success: true, storeId, storeName };
    } catch (error: any) {
        logger.error(`Failed to provision store ${storeName}:`, error);
        throw error;
    }
});

// Process delete-store jobs
provisioningQueue.process('delete-store', async (job) => {
    const { storeId, namespace } = job.data;

    logger.info(`Processing delete-store job for ${storeId}`);

    try {
        await deleteStore({ storeId, namespace });
        logger.info(`Successfully deleted store ${storeId}`);
        return { success: true, storeId };
    } catch (error: any) {
        logger.error(`Failed to delete store ${storeId}:`, error);
        throw error;
    }
});

provisioningQueue.on('error', (error) => {
    logger.error('Queue error:', error);
});

provisioningQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
});

provisioningQueue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
});

export default provisioningQueue;
