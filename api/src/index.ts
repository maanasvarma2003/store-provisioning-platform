// Standalone API Server with In-Memory Database
// No PostgreSQL or Redis required!

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Bull from 'bull';

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// In-memory database
interface Store {
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

interface ProvisioningEvent {
    id: string;
    storeId: string;
    event: string;
    message?: string;
    metadata?: any;
    createdAt: string;
}

interface AuditLog {
    id: string;
    action: 'CREATE_STORE' | 'DELETE_STORE' | 'UPDATE_STORE';
    resourceId: string;
    resourceName: string;
    details: string;
    timestamp: string;
    status: 'SUCCESS' | 'FAILURE';
}

const MAX_STORES_PER_USER = 5;
const stores: Map<string, Store> = new Map();
const events: Map<string, ProvisioningEvent[]> = new Map();
const auditLogs: AuditLog[] = [];

// Initialize Bull queue for Orchestrator communication
const provisioningQueue = new Bull('provisioning', {
    redis: {
        host: 'localhost',
        port: 6379,
    }
});

// Helper function to queue provisioning job to Orchestrator
async function queueProvisioning(storeId: string, storeName: string, engine: string) {
    // Queue job for the Orchestrator to pick up
    await provisioningQueue.add('provision-store', {
        storeId,
        storeName,
        engine: engine.toUpperCase(),
    });

    console.log(`✅ Queued provisioning job for ${storeName} (${engine})`);

    // Update store to PROVISIONING - orchestrator will update to READY when done
    const store = stores.get(storeId);
    if (store) {
        store.status = 'PROVISIONING';
        store.updatedAt = new Date().toISOString();
    }
}

function generatePassword(): string {
    return Math.random().toString(36).slice(-12);
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Audit logs endpoint (new)
app.get('/api/audit-logs', (req, res) => {
    res.json({ logs: auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) });
});

// Get all stores
app.get('/api/stores', (req, res) => {
    const storeList = Array.from(stores.values());
    res.json({ stores: storeList });
});

// Get store by ID
app.get('/api/stores/:id', (req, res) => {
    const store = stores.get(req.params.id);
    if (!store) {
        return res.status(404).json({ error: 'Store not found' });
    }

    const storeEvents = events.get(req.params.id) || [];
    res.json({ store: { ...store, events: storeEvents } });
});

// Create store
app.post('/api/stores', async (req, res) => {
    const { name, engine, customDomain } = req.body;

    // Abuse Prevention: Max stores check
    if (stores.size >= MAX_STORES_PER_USER) {
        const error = `Store limit reached (${MAX_STORES_PER_USER}). Please upgrade your plan.`;
        auditLogs.push({
            id: uuidv4(),
            action: 'CREATE_STORE',
            resourceId: 'pending',
            resourceName: name || 'unknown',
            details: `Failed: ${error}`,
            timestamp: new Date().toISOString(),
            status: 'FAILURE'
        });
        return res.status(403).json({ error });
    }

    // Validation
    if (!name || !engine) {
        return res.status(400).json({ error: 'Name and engine are required' });
    }

    if (!/^[a-z0-9-]+$/.test(name)) {
        return res.status(400).json({ error: 'Name must contain only lowercase letters, numbers, and hyphens' });
    }

    // Check if store already exists
    const existingStore = Array.from(stores.values()).find(s => s.name === name);
    if (existingStore) {
        return res.status(409).json({ error: 'Store with this name already exists' });
    }

    const store: Store = {
        id: uuidv4(),
        name,
        engine: engine.toUpperCase() as 'WOOCOMMERCE' | 'MEDUSA',
        status: 'PROVISIONING',
        namespace: `store-${name}`,
        customDomain,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    stores.set(store.id, store);

    // Audit Log
    auditLogs.push({
        id: uuidv4(),
        action: 'CREATE_STORE',
        resourceId: store.id,
        resourceName: store.name,
        details: `Created ${store.engine} store customized with domain: ${customDomain || 'none'}`,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS'
    });

    // Add initial event
    events.set(store.id, [{
        id: uuidv4(),
        storeId: store.id,
        event: 'PROVISIONING_STARTED',
        message: 'Store provisioning initiated. Queuing job to Orchestrator...',
        createdAt: new Date().toISOString(),
    }]);

    // Queue REAL provisioning job to Orchestrator
    try {
        await queueProvisioning(store.id, store.name, store.engine);
    } catch (error: any) {
        console.error(`Failed to queue provisioning job:`, error);
        store.status = 'FAILED';
        store.failureReason = 'Failed to queue provisioning job';
    }

    console.log(`📦 Creating REAL store in Kubernetes: ${name} (${engine})`);

    res.status(201).json({ store });
});

// Update store (for orchestrator)
app.patch('/api/stores/:id', (req, res) => {
    const store = stores.get(req.params.id);
    if (!store) {
        return res.status(404).json({ error: 'Store not found' });
    }

    const { status, url, adminUrl, adminUser, adminPass, failureReason } = req.body;

    if (status) store.status = status;
    if (url) store.url = url;
    if (adminUrl) store.adminUrl = adminUrl;
    if (adminUser) store.adminUser = adminUser;
    if (adminPass) store.adminPass = adminPass;
    if (failureReason) store.failureReason = failureReason;

    store.updatedAt = new Date().toISOString();

    console.log(`✅ Updated store ${store.name}: status=${status || store.status}`);
    res.json({ store });
});

// Add event (for orchestrator)
app.post('/api/stores/:id/events', (req, res) => {
    const { event, message, metadata } = req.body;

    const storeEvents = events.get(req.params.id) || [];
    storeEvents.push({
        id: uuidv4(),
        storeId: req.params.id,
        event,
        message,
        metadata,
        createdAt: new Date().toISOString(),
    });
    events.set(req.params.id, storeEvents);

    res.status(201).json({ success: true });
});

// Delete store
app.delete('/api/stores/:id', (req, res) => {
    const store = stores.get(req.params.id);
    if (!store) {
        return res.status(404).json({ error: 'Store not found' });
    }

    store.status = 'DELETING';
    store.updatedAt = new Date().toISOString();

    auditLogs.push({
        id: uuidv4(),
        action: 'DELETE_STORE',
        resourceId: store.id,
        resourceName: store.name,
        details: 'Store deletion requested',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS'
    });

    // Simulate deletion
    setTimeout(() => {
        stores.delete(req.params.id);
        events.delete(req.params.id);
        console.log(`🗑️  Deleted store: ${store.name}`);
    }, 2000);

    res.json({ message: 'Store deletion initiated' });
});

// Get store events
app.get('/api/stores/:id/events', (req, res) => {
    const storeEvents = events.get(req.params.id) || [];
    res.json({ events: storeEvents });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`
# HELP stores_total Total number of stores
# TYPE stores_total gauge
stores_total ${stores.size}

# HELP stores_by_status Number of stores by status
# TYPE stores_by_status gauge
stores_by_status{status="PROVISIONING"} ${Array.from(stores.values()).filter(s => s.status === 'PROVISIONING').length}
stores_by_status{status="READY"} ${Array.from(stores.values()).filter(s => s.status === 'READY').length}
stores_by_status{status="FAILED"} ${Array.from(stores.values()).filter(s => s.status === 'FAILED').length}
stores_by_status{status="DELETING"} ${Array.from(stores.values()).filter(s => s.status === 'DELETING').length}
`.trim());
});

// Create some demo stores on startup
function createDemoStores() {
    console.log('📦 Creating demo stores...');

    const demoStore1: Store = {
        id: uuidv4(),
        name: 'demo-store-1',
        engine: 'WOOCOMMERCE',
        status: 'READY',
        namespace: 'store-demo-store-1',
        url: 'http://demo-store-1.127.0.0.1.nip.io',
        adminUrl: 'http://demo-store-1.127.0.0.1.nip.io/wp-admin',
        adminUser: 'admin',
        adminPass: 'demo-pass-123',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3000000).toISOString(),
    };

    const demoStore2: Store = {
        id: uuidv4(),
        name: 'demo-store-2',
        engine: 'WOOCOMMERCE',
        status: 'READY',
        namespace: 'store-demo-store-2',
        url: 'http://demo-store-2.127.0.0.1.nip.io',
        adminUrl: 'http://demo-store-2.127.0.0.1.nip.io/wp-admin',
        adminUser: 'admin',
        adminPass: 'demo-pass-456',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 6000000).toISOString(),
    };

    stores.set(demoStore1.id, demoStore1);
    stores.set(demoStore2.id, demoStore2);

    const demoStore3: Store = {
        id: uuidv4(),
        name: 'demo-medusa-store',
        engine: 'MEDUSA',
        status: 'READY',
        namespace: 'store-demo-medusa-store',
        url: 'http://demo-medusa-store.127.0.0.1.nip.io',
        adminUrl: 'http://demo-medusa-store.127.0.0.1.nip.io/app',
        adminUser: 'admin@medusajs.com',
        adminPass: 'medusa-pass-123',
        createdAt: new Date(Date.now() - 1000000).toISOString(),
        updatedAt: new Date(Date.now() - 500000).toISOString(),
    };
    stores.set(demoStore3.id, demoStore3);

    events.set(demoStore1.id, [
        {
            id: uuidv4(),
            storeId: demoStore1.id,
            event: 'PROVISIONING_STARTED',
            message: 'Store provisioning initiated',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: uuidv4(),
            storeId: demoStore1.id,
            event: 'PROVISIONING_COMPLETED',
            message: 'Store provisioned successfully',
            createdAt: new Date(Date.now() - 3000000).toISOString(),
        },
    ]);

    events.set(demoStore2.id, [
        {
            id: uuidv4(),
            storeId: demoStore2.id,
            event: 'PROVISIONING_STARTED',
            message: 'Store provisioning initiated',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
            id: uuidv4(),
            storeId: demoStore2.id,
            event: 'PROVISIONING_COMPLETED',
            message: 'Store provisioned successfully',
            createdAt: new Date(Date.now() - 6000000).toISOString(),
        },
    ]);

    events.set(demoStore3.id, [
        {
            id: uuidv4(),
            storeId: demoStore3.id,
            event: 'PROVISIONING_STARTED',
            message: 'Medusa store provisioning initiated',
            createdAt: new Date(Date.now() - 1000000).toISOString(),
        },
        {
            id: uuidv4(),
            storeId: demoStore3.id,
            event: 'PROVISIONING_COMPLETED',
            message: 'Medusa store provisioned successfully with sample products',
            createdAt: new Date(Date.now() - 500000).toISOString(),
        },
    ]);

    console.log('✅ Demo stores created!');
}

// Initialize demo data - DISABLED for real provisioning
// createDemoStores();
console.log('📦 Starting with empty store list. Ready for real provisioning!');

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 API Server running on http://localhost:${PORT}`);
        console.log(`✅ Health check: http://localhost:${PORT}/health`);
        console.log(`\nReady to handle requests.\n`);
    });
}

export default app;
