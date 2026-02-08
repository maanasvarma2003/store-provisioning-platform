import axios, { AxiosInstance } from 'axios';

interface Store {
    id: string;
    name: string;
    engine: 'WOOCOMMERCE' | 'MEDUSA';
    status: 'PROVISIONING' | 'READY' | 'FAILED' | 'DELETING';
    url?: string;
    adminUrl?: string;
    adminUser?: string;
    adminPass?: string;
    failureReason?: string;
    createdAt: string;
    updatedAt: string;
}

interface CreateStoreRequest {
    name: string;
    engine: 'WOOCOMMERCE' | 'MEDUSA';
}

export class ProvisioningAPIClient {
    private client: AxiosInstance;
    private readonly baseURL: string;

    constructor() {
        this.baseURL = process.env.API_URL || 'http://api.127.0.0.1.nip.io';
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Create a new store
     */
    async createStore(request: CreateStoreRequest): Promise<Store> {
        const response = await this.client.post<Store>('/api/stores', request);
        return response.data;
    }

    /**
     * Get store by ID
     */
    async getStore(storeId: string): Promise<Store> {
        const response = await this.client.get<Store>(`/api/stores/${storeId}`);
        return response.data;
    }

    /**
     * List all stores
     */
    async listStores(): Promise<Store[]> {
        const response = await this.client.get<Store[]>('/api/stores');
        return response.data;
    }

    /**
     * Delete a store
     */
    async deleteStore(storeId: string): Promise<void> {
        await this.client.delete(`/api/stores/${storeId}`);
    }

    /**
     * Wait for store to be ready
     */
    async waitForStoreReady(
        storeId: string,
        timeoutMs: number = 600000,
        pollIntervalMs: number = 5000
    ): Promise<Store> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const store = await this.getStore(storeId);

            if (store.status === 'READY') {
                console.log(`Store ${storeId} is ready!`);
                return store;
            }

            if (store.status === 'FAILED') {
                throw new Error(
                    `Store provisioning failed: ${store.failureReason || 'Unknown error'}`
                );
            }

            console.log(
                `Store ${storeId} status: ${store.status}. Waiting... (${Math.floor(
                    (Date.now() - startTime) / 1000
                )}s elapsed)`
            );

            await this.sleep(pollIntervalMs);
        }

        throw new Error(
            `Timeout waiting for store ${storeId} to be ready after ${timeoutMs}ms`
        );
    }

    /**
     * Wait for store to be deleted
     */
    async waitForStoreDeletion(
        storeId: string,
        timeoutMs: number = 300000,
        pollIntervalMs: number = 3000
    ): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            try {
                const store = await this.getStore(storeId);

                if (store.status === 'DELETING') {
                    console.log(`Store ${storeId} is being deleted...`);
                }
            } catch (error: any) {
                // If we get a 404, the store is deleted
                if (error.response?.status === 404) {
                    console.log(`Store ${storeId} successfully deleted`);
                    return;
                }
                throw error;
            }

            await this.sleep(pollIntervalMs);
        }

        throw new Error(
            `Timeout waiting for store ${storeId} to be deleted after ${timeoutMs}ms`
        );
    }

    /**
     * Create and wait for store to be ready
     */
    async provisionStore(request: CreateStoreRequest): Promise<Store> {
        console.log(`Creating ${request.engine} store: ${request.name}`);
        const store = await this.createStore(request);
        console.log(`Store created with ID: ${store.id}`);

        console.log('Waiting for store to be provisioned...');
        return await this.waitForStoreReady(store.id);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default ProvisioningAPIClient;
