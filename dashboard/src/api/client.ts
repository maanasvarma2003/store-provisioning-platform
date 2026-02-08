import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Store {
    id: string;
    name: string;
    engine: 'WOOCOMMERCE' | 'MEDUSA';
    status: 'PROVISIONING' | 'READY' | 'FAILED' | 'DELETING';
    namespace: string;
    url?: string;
    adminUrl?: string;
    adminUser?: string;
    adminPass?: string;
    customDomain?: string;
    failureReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProvisioningEvent {
    id: string;
    storeId: string;
    event: string;
    message?: string;
    metadata?: any;
    createdAt: string;
}

export interface AuditLog {
    id: string;
    action: 'CREATE_STORE' | 'DELETE_STORE' | 'UPDATE_STORE';
    resourceId: string;
    resourceName: string;
    details: string;
    timestamp: string;
    status: 'SUCCESS' | 'FAILURE';
}

export interface CreateStoreInput {
    name: string;
    engine: 'WOOCOMMERCE' | 'MEDUSA';
    customDomain?: string;
}

// Demo mode mock data
const DEMO_STORES: Store[] = [
    {
        id: 'demo-1',
        name: 'fashion-boutique',
        engine: 'WOOCOMMERCE',
        status: 'READY',
        namespace: 'store-fashion-boutique',
        url: 'http://fashion-boutique.demo.store',
        adminUrl: 'http://fashion-boutique.demo.store/wp-admin',
        adminUser: 'admin',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        id: 'demo-2',
        name: 'tech-gadgets',
        engine: 'MEDUSA',
        status: 'READY',
        namespace: 'store-tech-gadgets',
        url: 'http://tech-gadgets.demo.store',
        adminUrl: 'http://tech-gadgets-admin.demo.store',
        adminUser: 'admin@tech-gadgets.com',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'demo-3',
        name: 'organic-foods',
        engine: 'WOOCOMMERCE',
        status: 'PROVISIONING',
        namespace: 'store-organic-foods',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
        id: 'demo-4',
        name: 'luxury-watches',
        engine: 'MEDUSA',
        status: 'READY',
        namespace: 'store-luxury-watches',
        url: 'http://luxury-watches.demo.store',
        adminUrl: 'http://luxury-watches-admin.demo.store',
        customDomain: 'watches.example.com',
        adminUser: 'admin@luxury-watches.com',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
        id: 'demo-5',
        name: 'home-decor',
        engine: 'WOOCOMMERCE',
        status: 'FAILED',
        namespace: 'store-home-decor',
        failureReason: 'Demo error: Namespace quota exceeded. This is a sample error for demonstration.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
    },
];

const DEMO_AUDIT_LOGS: AuditLog[] = [
    {
        id: 'log-1',
        action: 'CREATE_STORE',
        resourceId: 'demo-1',
        resourceName: 'fashion-boutique',
        details: 'WooCommerce store successfully provisioned',
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        status: 'SUCCESS',
    },
    {
        id: 'log-2',
        action: 'CREATE_STORE',
        resourceId: 'demo-2',
        resourceName: 'tech-gadgets',
        details: 'Medusa store successfully provisioned',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        status: 'SUCCESS',
    },
    {
        id: 'log-3',
        action: 'UPDATE_STORE',
        resourceId: 'demo-2',
        resourceName: 'tech-gadgets',
        details: 'Store configuration updated',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'SUCCESS',
    },
    {
        id: 'log-4',
        action: 'CREATE_STORE',
        resourceId: 'demo-3',
        resourceName: 'organic-foods',
        details: 'Store provisioning in progress',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'SUCCESS',
    },
    {
        id: 'log-5',
        action: 'CREATE_STORE',
        resourceId: 'demo-4',
        resourceName: 'luxury-watches',
        details: 'Medusa store with custom domain provisioned',
        timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
        status: 'SUCCESS',
    },
    {
        id: 'log-6',
        action: 'CREATE_STORE',
        resourceId: 'demo-5',
        resourceName: 'home-decor',
        details: 'Store provisioning failed: Namespace quota exceeded',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        status: 'FAILURE',
    },
];

// Check if backend is available
let demoMode = false;

export const storeApi = {
    getStores: async (): Promise<{ stores: Store[] }> => {
        try {
            const response = await api.get('/stores');
            demoMode = false;
            return response.data;
        } catch (error) {
            // Backend not available - use demo mode
            demoMode = true;
            console.log('✨ Demo Mode: Backend unavailable, showing sample data');
            return { stores: DEMO_STORES };
        }
    },

    getStore: async (id: string): Promise<{ store: Store & { events: ProvisioningEvent[] } }> => {
        try {
            const response = await api.get(`/stores/${id}`);
            return response.data;
        } catch (error) {
            const store = DEMO_STORES.find(s => s.id === id);
            if (!store) throw new Error('Store not found');
            return {
                store: {
                    ...store,
                    events: [
                        {
                            id: '1',
                            storeId: id,
                            event: 'PROVISIONING_STARTED',
                            message: 'Demo provisioning started',
                            createdAt: store.createdAt,
                        },
                    ],
                },
            };
        }
    },

    getAuditLogs: async (): Promise<{ logs: AuditLog[] }> => {
        try {
            const response = await api.get('/audit-logs');
            return response.data;
        } catch (error) {
            console.log('✨ Demo Mode: Showing sample audit logs');
            return { logs: DEMO_AUDIT_LOGS };
        }
    },

    createStore: async (data: CreateStoreInput): Promise<{ store: Store }> => {
        if (demoMode) {
            // In demo mode, show error or simulate creation
            throw new Error('Demo Mode: Backend required to create stores. Install Docker and run ./deploy-docker.ps1');
        }
        const response = await api.post('/stores', data);
        return response.data;
    },

    deleteStore: async (id: string): Promise<void> => {
        if (demoMode) {
            throw new Error('Demo Mode: Backend required to delete stores. Install Docker and run ./deploy-docker.ps1');
        }
        await api.delete(`/stores/${id}`);
    },

    getStoreEvents: async (id: string): Promise<{ events: ProvisioningEvent[] }> => {
        try {
            const response = await api.get(`/stores/${id}/events`);
            return response.data;
        } catch (error) {
            return {
                events: [
                    {
                        id: '1',
                        storeId: id,
                        event: 'DEMO_EVENT',
                        message: 'Demo event data',
                        createdAt: new Date().toISOString(),
                    },
                ],
            };
        }
    },
};
