import axios from 'axios';
import logger from './logger';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

class ApiClient {
    async updateStore(storeId: string, data: {
        status?: 'PROVISIONING' | 'READY' | 'FAILED' | 'DELETING';
        url?: string;
        adminUrl?: string;
        adminUser?: string;
        adminPass?: string;
        failureReason?: string;
    }) {
        try {
            logger.info(`Updating store ${storeId} via API:`, data);
            const response = await axios.patch(`${API_BASE_URL}/api/stores/${storeId}`, data);
            return response.data;
        } catch (error: any) {
            logger.error(`Failed to update store via API:`, error.message);
            throw error;
        }
    }

    async createEvent(storeId: string, event: string, message: string, metadata?: any) {
        try {
            logger.info(`Creating event for store ${storeId}: ${event}`);
            const response = await axios.post(`${API_BASE_URL}/api/stores/${storeId}/events`, {
                event,
                message,
                metadata,
            });
            return response.data;
        } catch (error: any) {
            logger.error(`Failed to create event via API:`, error.message);
            // Don't throw - events are nice-to-have, not critical
        }
    }
}

export default new ApiClient();
