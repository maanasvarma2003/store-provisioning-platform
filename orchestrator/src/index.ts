import dotenv from 'dotenv';
import logger from './logger';
import provisioningQueue from './worker';

// Load environment variables
dotenv.config();

async function main() {
    logger.info('Starting orchestrator service...');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    logger.info(`In-cluster: ${process.env.IN_CLUSTER || 'false'}`);

    // Graceful shutdown
    const gracefulShutdown = async () => {
        logger.info('Shutting down gracefully...');

        try {
            await provisioningQueue.close();
            logger.info('Queue closed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    logger.info('Orchestrator service started and listening for jobs');
}

main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
