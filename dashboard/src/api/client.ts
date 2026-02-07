import axios from 'axios';

/**
 * Resolve API base URL at runtime so the same build works locally and when deployed.
 * - Local dev (localhost / 127.0.0.1) → http://localhost:3001
 * - Deployed at dashboard.<domain> → http(s)://api.<domain>
 */
function getApiBaseUrl(): string {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    }
    if (typeof window === 'undefined') {
        return 'http://localhost:3001';
    }
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol === 'https:' ? 'https' : 'http'}://${hostname}:3001`;
    }
    if (hostname.startsWith('dashboard.')) {
        return `${protocol}//api.${hostname.slice('dashboard.'.length)}`;
    }
    return `${protocol}//api.${hostname}`;
}

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

export interface Store {
    id: string;
    name: string;
    engine: 'WOOCOMMERCE' | 'MEDUSA';
    status: 'PROVISIONING' | 'READY' | 'FAILED' | 'DELETING';
    namespace: string;
    url?: string;
    adminUrl?: string; // Add this back
    adminUser?: string;
    adminPass?: string; // Add this back
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

export const storeApi = {
    getStores: async (): Promise<{ stores: Store[] }> => {
        const response = await api.get('/stores');
        return response.data;
    },

    getStore: async (id: string): Promise<{ store: Store & { events: ProvisioningEvent[] } }> => {
        const response = await api.get(`/stores/${id}`);
        return response.data;
    },

    getAuditLogs: async (): Promise<{ logs: AuditLog[] }> => {
        const response = await api.get('/audit-logs');
        return response.data;
    },

    createStore: async (data: CreateStoreInput): Promise<{ store: Store }> => {
        const response = await api.post('/stores', data);
        return response.data;
    },

    deleteStore: async (id: string): Promise<void> => {
        await api.delete(`/stores/${id}`);
    },

    getStoreEvents: async (id: string): Promise<{ events: ProvisioningEvent[] }> => {
        const response = await api.get(`/stores/${id}/events`);
        return response.data;
    },
};
